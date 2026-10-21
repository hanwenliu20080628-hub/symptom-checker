import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = fs.readFileSync(path.join(root, "src/lib/consent.ts"), "utf8").match(/export const CONSENT_VERSION = "([^"]+)"/)[1];
const CURRENT_CONSENT_KEY = `consent_${version}`;

// 执行真实 TS 模块和组件的生命周期；所有第三方请求隔离，不污染生产统计。
function setup({ hostname = "p7muvdem.qwenwork.host", pathname = "/", agreed = false, old = false, storageFails = false, storageWriteFails = false, appendFails = false, states = [], interactive = false } = {}) {
  const entries = new Map();
  if (agreed) entries.set(CURRENT_CONSENT_KEY, "agreed");
  if (old) {
    entries.set("consent_v1.1", "agreed");
    entries.set("consent_v1.2", "agreed");
    entries.set("consent_v1.3", "agreed");
    entries.set("consent_v1.4", "agreed");
    entries.set("consent_v1.5", "agreed");
  }
  const scripts = [];
  const warnings = [];
  const effects = [];
  const navigations = [];
  const window = new EventTarget();
  window.location = { hostname, pathname, replace: (target) => navigations.push(target), reload: () => navigations.push("reload") };
  const document = {
    getElementById: (id) => scripts.find((s) => s.id === id),
    createElement: () => ({}),
    head: { appendChild: (script) => { if (appendFails) throw Error("blocked"); scripts.push(script); } },
  };
  const storage = {
    getItem: (key) => { if (storageFails) throw Error("blocked"); return entries.get(key) ?? null; },
    setItem: (key, value) => { if (storageFails || storageWriteFails) throw Error("blocked"); entries.set(key, value); },
    removeItem: (key) => { if (storageFails) throw Error("blocked"); entries.delete(key); },
  };
  let networkCalls = 0;
  const requests = [];
  const hookStates = [];
  const hookRefs = [];
  let stateCursor = 0;
  let refCursor = 0;
  const context = vm.createContext({
    window, document, localStorage: storage, Event,
    console: { warn: (...args) => warnings.push(args) },
    fetch: (url, options) => { networkCalls++; requests.push({ url, options }); throw Error("Netlify and Supabase unavailable"); },
  });
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const mod = { exports: {} };
    cache.set(name, mod);
    const source = fs.readFileSync(path.join(root, name), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
    const localRequire = (id) => {
      if (id === "react") return {
        useEffect: (fn) => effects.push(fn),
        useCallback: (fn) => fn,
        useState: (initial) => {
          if (!interactive) return [states.length ? states.shift() : initial, () => {}];
          const index = stateCursor++;
          if (!(index in hookStates)) hookStates[index] = initial;
          return [hookStates[index], (value) => { hookStates[index] = typeof value === "function" ? value(hookStates[index]) : value; }];
        },
        useRef: (initial) => {
          const index = refCursor++;
          if (!(index in hookRefs)) hookRefs[index] = { current: initial };
          return hookRefs[index];
        },
      };
      if (id === "react/jsx-runtime") return require(id);
      if (id.startsWith("@/")) {
        const base = "src/" + id.slice(2);
        return load([base + ".ts", base + ".tsx"].find((p) => fs.existsSync(path.join(root, p))));
      }
      return require(id);
    };
    vm.runInContext(`(function(require,module,exports){${outputText}\n})`, context, { filename: name })(localRequire, mod, mod.exports);
    return mod.exports;
  }
  const consent = load("src/lib/consent.ts");
  const analytics = load("src/lib/baidu-analytics.ts");
  const renderFeedback = (props = {}) => {
    stateCursor = 0;
    refCursor = 0;
    return load("src/components/FeedbackSurvey.tsx").default({ bodyPartName: "隔离测试部位", assessmentId: "test-assessment", questionnaireUsed: true, outcome: "success", ...props });
  };
  return { consent, analytics, window, scripts, warnings, entries, effects, navigations, requests, load, renderFeedback, resetFeedback: () => { hookStates.length = 0; hookRefs.length = 0; }, networkCalls: () => networkCalls, commands: () => JSON.parse(JSON.stringify(window._hmt ?? [])) };
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  if (typeof tree.type === "function" && tree.type.name === "FeedbackForm") return findElement(tree.type(tree.props), predicate);
  for (const child of [tree.props?.children].flat(Infinity)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
}
function textOf(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  if (typeof tree.type === "function" && tree.type.name === "FeedbackForm") return textOf(tree.type(tree.props));
  return textOf(tree.props?.children);
}
const submitButton = (tree) => {
  const button = findElement(tree, (n) => n.type === "button" && textOf(n) === "提交评价");
  const form = findElement(tree, (n) => n.type === "form");
  return { ...button, props: { ...button.props, onClick: () => form.props.onSubmit({ preventDefault() {} }) } };
};
const shareCheckbox = (tree) => findElement(tree, (n) => n.type === "input" && n.props.type === "checkbox");
function chooseRating(t, model = "very_helpful", questionnaire = "somewhat_helpful", props = {}) {
  let tree = t.renderFeedback(props);
  findElement(tree, (n) => n.type === "input" && n.props.name === "inline-model" && n.props.value === model).props.onChange();
  tree = t.renderFeedback(props);
  if (props.questionnaireUsed !== false && questionnaire !== null) {
    findElement(tree, (n) => n.type === "input" && n.props.name === "inline-questionnaire" && n.props.value === questionnaire).props.onChange();
  }
  return t.renderFeedback(props);
}

const results = [];
function test(name, fn) {
  fn();
  results.push({ name, passed: true });
  console.log(`✅ ${name}`);
}

test("未同意不加载、不上报", () => {
  const t = setup();
  assert.equal(t.analytics.trackBaiduPageView(), false);
  assert.equal(t.scripts.length, 0);
  assert.deepEqual(t.commands(), []);
});
test("旧版本同意不能启动当前版本统计", () => {
  const t = setup({ old: true });
  assert.equal(t.consent.hasConsented(), false);
  assert.equal(t.analytics.trackBaiduPageView(), false);
});
test("目标域名首次加载仅一条手动 PV，自动 PV 关闭", () => {
  const t = setup({ agreed: true });
  assert.equal(t.analytics.trackBaiduPageView(), true);
  assert.deepEqual(t.commands(), [["_setAutoPageview", false], ["_trackPageview", "/"]]);
  assert.equal(t.scripts.length, 1);
  assert.equal(t.scripts[0].src, "https://hm.baidu.com/hm.js?2138d9c7fb6fa400bf733ee2e6f4da48");
  assert.equal(t.scripts[0].async, true);
});
test("同次加载重复调用不重复；新文档允许再计数", () => {
  const t = setup({ agreed: true });
  t.analytics.trackBaiduPageView();
  assert.equal(t.analytics.trackBaiduPageView(), false);
  assert.equal(t.commands().length, 2);
  const refreshed = setup({ agreed: true });
  assert.equal(refreshed.analytics.trackBaiduPageView(), true);
});
test("Netlify、本地和其他域名不启用", () => {
  for (const hostname of ["symptom-checker-app.netlify.app", "localhost", "other.qwenwork.host"]) {
    const t = setup({ hostname, agreed: true });
    assert.equal(t.analytics.trackBaiduPageView(), false);
    assert.equal(t.scripts.length, 0);
  }
});
test("统计页与免责声明页不计入", () => {
  for (const pathname of ["/stats", "/disclaimer"]) {
    const t = setup({ pathname, agreed: true });
    assert.equal(t.analytics.trackBaiduPageView(), false);
  }
});
test("真实 Tracker 等待同意，重复同意事件不重报", () => {
  const t = setup();
  t.load("src/components/BaiduTracker.tsx").default();
  const cleanup = t.effects[0]();
  assert.equal(t.scripts.length, 0);
  t.consent.markConsented();
  t.consent.markConsented();
  assert.equal(t.scripts.length, 1);
  assert.equal(t.commands().length, 2);
  cleanup();
});
test("Strict Mode effect清理重跑仍仅一条PV", () => {
  const t = setup({ agreed: true });
  t.load("src/components/BaiduTracker.tsx").default();
  const cleanup = t.effects[0]();
  cleanup();
  t.effects[0]();
  assert.equal(t.commands().length, 2);
  assert.equal(t.scripts.length, 1);
});
test("存储不可用时，本次同意仍生效", () => {
  const t = setup({ storageFails: true });
  t.load("src/components/BaiduTracker.tsx").default();
  t.effects[0]();
  t.consent.markConsented();
  assert.equal(t.consent.hasConsented(), true);
  assert.equal(t.scripts.length, 1);
});
test("Netlify/Supabase不可用不影响百度初始化", () => {
  const t = setup({ agreed: true });
  assert.equal(t.analytics.trackBaiduPageView(), true);
  assert.equal(t.networkCalls(), 0);
});
test("脚本被拦截仅诊断，不抛异常或自动重复重放", () => {
  const t = setup({ agreed: true });
  t.analytics.trackBaiduPageView();
  assert.doesNotThrow(() => t.scripts[0].onerror());
  assert.equal(t.warnings.length, 1);
  assert.equal(t.analytics.trackBaiduPageView(), false);
  const blocked = setup({ agreed: true, appendFails: true });
  assert.equal(blocked.analytics.trackBaiduPageView(), false);
  assert.equal(blocked.analytics.trackBaiduPageView(), false);
  assert.equal(blocked.warnings.length, 1);
});
test("撤回同意后新请求不启动，持久同意已清除", () => {
  const t = setup({ agreed: true });
  t.consent.revokeConsent();
  assert.equal(t.consent.hasConsented(), false);
  assert.equal(t.entries.has(CURRENT_CONSENT_KEY), false);
  assert.equal(t.analytics.trackBaiduPageView(), false);
});
test("AccessGate初始检查阶段不挂载统计子组件", () => {
  const t = setup();
  assert.equal(t.load("src/components/AccessGate.tsx").default({ children: "tracking children" }), null);
  const granted = setup({ states: ["granted", "", false] });
  assert.equal(granted.load("src/components/AccessGate.tsx").default({ children: "tracking children" }).props.children, "tracking children");
});
test("撤回按钮清除同意并离开当前文档", () => {
  const t = setup({ agreed: true });
  const button = t.load("src/components/ConsentSettings.tsx").default();
  button.props.onClick();
  assert.equal(t.consent.hasConsented(), false);
  assert.deepEqual(t.navigations, ["/"]);
});
test("其他页面撤回后，本页不能继续使用过期的内存同意", () => {
  const t = setup();
  t.consent.markConsented();
  // 模拟另一个页面或标签页移除同一同意记录。
  t.entries.delete(CURRENT_CONSENT_KEY);
  assert.equal(t.consent.hasConsented(), false);
  assert.equal(t.analytics.trackBaiduPageView(), false);
});
test("存储可读但写入失败，本次同意仍可计数", () => {
  const t = setup({ storageWriteFails: true });
  t.consent.markConsented();
  assert.equal(t.consent.hasConsented(), true);
  assert.equal(t.analytics.trackBaiduPageView(), true);
});
test("其他标签页撤回后重载当前页，重复通知只重载一次", () => {
  const t = setup();
  t.consent.markConsented();
  t.load("src/components/BaiduTracker.tsx").default();
  t.effects[0]();
  t.entries.delete(CURRENT_CONSENT_KEY);
  for (let i = 0; i < 2; i++) t.window.dispatchEvent(Object.assign(new Event("storage"), { key: CURRENT_CONSENT_KEY }));
  assert.deepEqual(t.navigations, ["reload"]);
});
test("后退缓存恢复时发现已撤回，重载并重新走门禁", () => {
  const t = setup();
  t.consent.markConsented();
  t.load("src/components/BaiduTracker.tsx").default();
  t.effects[0]();
  t.entries.delete(CURRENT_CONSENT_KEY);
  t.window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  assert.deepEqual(t.navigations, ["reload"]);
});
test("清空存储能撤回，无关存储变化与正常缓存恢复不误重载", () => {
  const t = setup({ agreed: true });
  t.load("src/components/BaiduTracker.tsx").default();
  t.effects[0]();
  t.window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  t.entries.delete(CURRENT_CONSENT_KEY);
  t.window.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated" }));
  assert.deepEqual(t.navigations, []);
  t.window.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
  assert.deepEqual(t.navigations, ["reload"]);
});
test("组件卸载后移除撤回监听，不触发多余导航", () => {
  const t = setup({ agreed: true });
  t.load("src/components/BaiduTracker.tsx").default();
  const cleanup = t.effects[0]();
  cleanup();
  t.entries.delete(CURRENT_CONSENT_KEY);
  t.window.dispatchEvent(Object.assign(new Event("storage"), { key: CURRENT_CONSENT_KEY }));
  t.window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  assert.deepEqual(t.navigations, []);
});
test("成功失败均显示两题，且无百度评分选项", () => {
  for (const outcome of ["success", "failure"]) {
    const t = setup({ agreed: true, interactive: true });
    const tree = t.renderFeedback({ outcome });
    for (const label of ["表达帮助评价", "位置与范围", "全面地描述", "很有帮助", "有一些帮助", "没有帮助"]) assert.ok(textOf(tree).includes(label));
    assert.equal(shareCheckbox(tree), undefined);
    assert.equal(submitButton(tree).props.disabled, true);
    assert.ok(findElement(tree, (n) => typeof n.type === "function" && n.type.name === "FeedbackDialog"));
  }
});
test("分析尚未结束不显示评价，结局到达后显示", () => {
  const t = setup({ agreed: true, interactive: true });
  assert.equal(t.renderFeedback({ outcome: null }), null);
  assert.ok(submitButton(t.renderFeedback({ outcome: "failure" })));
});
test("未完成适用题目，直接调用提交也不上报", () => {
  const t = setup({ agreed: true, interactive: true });
  submitButton(t.renderFeedback()).props.onClick();
  submitButton(chooseRating(t, "very_helpful", null)).props.onClick();
  assert.equal(t.networkCalls(), 0);
  assert.equal(t.entries.has("feedback_history"), false);
});
test("两题分别保存，成功失败的九种组合只发送自建统计", () => {
  for (const outcome of ["success", "failure"]) for (const model of ["very_helpful", "somewhat_helpful", "not_helpful"]) for (const q of ["very_helpful", "somewhat_helpful", "not_helpful"]) {
    const t = setup({ agreed: true, interactive: true });
    t.analytics.trackBaiduPageView(); const before = t.commands();
    submitButton(chooseRating(t, model, q, { outcome })).props.onClick();
    assert.equal(t.networkCalls(), 1);
    const payload = JSON.parse(t.requests[0].options.body);
    assert.equal(payload.rating, null);
    assert.equal(payload.answers.modelHelp, model);
    assert.equal(payload.answers.questionnaireHelp, q);
    assert.equal(payload.answers.aiOutcome, outcome);
    assert.equal(payload.answers.assessmentId, "test-assessment");
    assert.equal(payload.answers.feedbackVersion, "expression_help_v1");
    assert.deepEqual(t.commands(), before);
    assert.ok(textOf(t.renderFeedback()).includes("感谢你的评价"));
  }
});
test("跳过问卷时第二题不适用，只评价模型即可提交", () => {
  const t = setup({ agreed: true, interactive: true });
  const props = { questionnaireUsed: false };
  const tree = chooseRating(t, "not_helpful", null, props);
  assert.ok(textOf(tree).includes("本次未填写问卷"));
  assert.equal(findElement(tree, (n) => n.type === "input" && n.props.name === "inline-questionnaire"), undefined);
  assert.equal(submitButton(tree).props.disabled, false);
  submitButton(tree).props.onClick();
  const a = JSON.parse(t.requests[0].options.body).answers;
  assert.equal(a.questionnaireUsed, false); assert.equal(a.questionnaireHelp, null);
});
test("暂不评价不提交，答案保留且不重复弹出", () => {
  const t = setup({ agreed: true, interactive: true });
  const tree = chooseRating(t, "somewhat_helpful", "not_helpful");
  findElement(tree, (n) => n.type === "button" && textOf(n) === "暂不评价").props.onClick();
  const after = t.renderFeedback();
  assert.equal(t.networkCalls(), 0);
  assert.equal(findElement(after, (n) => typeof n.type === "function" && n.type.name === "FeedbackDialog"), undefined);
  assert.equal(findElement(after, (n) => n.type === "input" && n.props.name === "inline-model" && n.props.value === "somewhat_helpful").props.checked, true);
  assert.equal(findElement(after, (n) => n.type === "input" && n.props.name === "inline-questionnaire" && n.props.value === "not_helpful").props.checked, true);
  assert.equal(findElement(t.renderFeedback({ outcome: "failure" }), (n) => typeof n.type === "function" && n.type.name === "FeedbackDialog"), undefined);
});
test("同次双击和跨入口重复提交只有一条记录", () => {
  const t = setup({ agreed: true, interactive: true });
  const submit = submitButton(chooseRating(t)).props.onClick;
  submit(); submit();
  assert.equal(t.networkCalls(), 1);
  assert.equal(JSON.parse(t.entries.get("feedback_history")).length, 1);
});
test("新流程重置答案、评论和弹窗状态", () => {
  const t = setup({ agreed: true, interactive: true });
  const tree = chooseRating(t);
  findElement(tree, (n) => n.type === "textarea").props.onChange({ target: { value: "测试评论" } });
  submitButton(t.renderFeedback()).props.onClick();
  t.resetFeedback(); const next = t.renderFeedback({ assessmentId: "new-assessment" });
  assert.equal(submitButton(next).props.disabled, true);
  assert.equal(findElement(next, (n) => n.type === "textarea").props.value, "");
  assert.ok(findElement(next, (n) => typeof n.type === "function" && n.type.name === "FeedbackDialog"));
});
test("评论仅本地保存，网络载荷不含评论，历史单项记录保留", () => {
  const t = setup({ agreed: true, interactive: true });
  t.entries.set("feedback_history", JSON.stringify([{ rating: "good", comment: "旧评论" }]));
  findElement(chooseRating(t), (n) => n.type === "textarea").props.onChange({ target: { value: "新的隔离评论" } });
  submitButton(t.renderFeedback()).props.onClick();
  const history = JSON.parse(t.entries.get("feedback_history"));
  assert.equal(history[0].comment, "新的隔离评论"); assert.equal(history[1].rating, "good");
  assert.ok(!t.requests[0].options.body.includes("隔离评论"));
  assert.deepEqual(t.commands(), []);
});
test("存储不可用或格式损坏不阻塞评价", () => {
  for (const storageFails of [true, false]) {
    const t = setup({ storageFails, interactive: true }); t.consent.markConsented();
    if (!storageFails) t.entries.set("feedback_history", "{}");
    assert.doesNotThrow(() => submitButton(chooseRating(t)).props.onClick());
    assert.equal(t.networkCalls(), 1); assert.ok(textOf(t.renderFeedback()).includes("感谢你的评价"));
  }
});
test("自建统计异常仍完成界面，不声称数据库入库", () => {
  const t = setup({ agreed: true, interactive: true });
  t.load("src/lib/analytics.ts").trackSurvey = () => { throw Error("blocked"); };
  assert.doesNotThrow(() => submitButton(chooseRating(t)).props.onClick());
  const text = textOf(t.renderFeedback());
  assert.ok(text.includes("感谢你的评价")); assert.ok(!text.includes("已收录"));
});
test("提交前撤回同意，不保存或发送新评价", () => {
  const t = setup({ agreed: true, interactive: true });
  const submit = submitButton(chooseRating(t)).props.onClick;
  t.consent.revokeConsent(); submit();
  assert.equal(t.networkCalls(), 0); assert.equal(t.entries.has("feedback_history"), false);
});
test("百度脚本被拦截不影响两题评分", () => {
  const t = setup({ agreed: true, interactive: true });
  t.analytics.trackBaiduPageView(); const before = t.commands(); t.scripts[0].onerror();
  submitButton(chooseRating(t)).props.onClick();
  assert.equal(t.networkCalls(), 1); assert.deepEqual(t.commands(), before);
});
test("Netlify与本地仍仅发送自建统计", () => {
  for (const hostname of ["symptom-checker-app.netlify.app", "localhost"]) {
    const t = setup({ hostname, agreed: true, interactive: true });
    submitButton(chooseRating(t)).props.onClick();
    assert.equal(t.networkCalls(), 1); assert.deepEqual(t.commands(), []); assert.equal(t.scripts.length, 0);
  }
});
test("分题分母忽略不适用，三档分布和帮助比例正确", () => {
  const lib = setup().load("src/lib/feedback.ts");
  const data = lib.helpDistribution(["very_helpful", "somewhat_helpful", "not_helpful", null]);
  assert.equal(data.total, 3); assert.equal(data.helpfulRate, 67);
  assert.deepEqual(Array.from(data.entries, (x) => x.count), [1, 1, 1]);
  assert.equal(lib.helpDistribution([]).helpfulRate, null);
});
test("新评价识别排除旧评分、分诊、不完整及未知版本", () => {
  const lib = setup().load("src/lib/feedback.ts");
  const valid = { feedbackType: "expression_help", feedbackVersion: lib.FEEDBACK_VERSION, assessmentId: "x", modelHelp: "very_helpful", questionnaireUsed: false, questionnaireHelp: null, aiOutcome: "failure" };
  assert.equal(lib.isExpressionFeedback(valid), true);
  for (const bad of [{ rating: "good" }, { painRest: 1 }, { ...valid, questionnaireUsed: true }, { ...valid, feedbackVersion: "future" }, { ...valid, modelHelp: "good" }]) assert.equal(lib.isExpressionFeedback(bad), false);
});
test("CSV新旧分离，保留不适用与版本，正确转义且无评论", () => {
  const lib = setup().load("src/lib/feedback.ts");
  const answers = { feedbackType: "expression_help", feedbackVersion: lib.FEEDBACK_VERSION, assessmentId: "x", modelHelp: "not_helpful", questionnaireUsed: false, questionnaireHelp: null, aiOutcome: "failure", comment: "禁止导出" };
  const rows = [{ rating: null, answers, body_part: '左肩,"前侧"', ts: "2026-10-21" }, { rating: "good", body_part: "旧部位", ts: "2026-10-18" }];
  const csv = lib.feedbackCsv(rows, "expression");
  assert.ok(csv.includes('"左肩,""前侧"""')); assert.ok(csv.includes('"false","","failure"'));
  assert.ok(!csv.includes("旧部位")); assert.ok(!csv.includes("禁止导出"));
  const old = lib.feedbackCsv(rows, "legacy"); assert.ok(old.includes("旧部位")); assert.ok(!old.includes("expression_help_v1"));
});

test("前端返回结构检查拒绝空结果与缺字段，保留后端等级", () => {
  const lib = setup().load("src/lib/analyze-result.ts");
  const result = { symptomSummary:"测试", suggestions:"测试", disclaimer:"测试", possibleCauses:[], whenToSeeDoctor:[], questionsForDoctor:[], department:null, shouldSeeDoctor:true, severity:"low" };
  for (const severity of ["low","medium","high"]) assert.equal(lib.isAnalyzeResult({...result,severity}),true);
  for (const bad of [null,{}, { ...result,possibleCauses:{} }, { ...result,severity:"unknown" }]) assert.equal(lib.isAnalyzeResult(bad),false);
});

console.log(`\n结果：${results.length} 通过，0 失败`);
if (process.env.BAIDU_TEST_REPORT) fs.writeFileSync(process.env.BAIDU_TEST_REPORT, JSON.stringify(results, null, 2) + "\n");

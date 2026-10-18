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
        useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
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
    return load("src/components/FeedbackSurvey.tsx").default({ bodyPartName: "隔离测试部位", ...props });
  };
  return { consent, analytics, window, scripts, warnings, entries, effects, navigations, requests, load, renderFeedback, resetFeedback: () => { hookStates.length = 0; hookRefs.length = 0; }, networkCalls: () => networkCalls, commands: () => JSON.parse(JSON.stringify(window._hmt ?? [])) };
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
}
function textOf(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  return textOf(tree.props?.children);
}
const submitButton = (tree) => findElement(tree, (n) => n.type === "button" && textOf(n) === "提交反馈");
const shareCheckbox = (tree) => findElement(tree, (n) => n.type === "input" && n.props.type === "checkbox");
function chooseRating(t, label, props = {}) {
  const tree = t.renderFeedback(props);
  const button = findElement(tree, (n) => n.type === "button" && Array.isArray(n.props.children) && textOf(n.props.children[1]) === label);
  assert.ok(button);
  button.props.onClick();
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
test("未单独同意评分分享不创建百度队列或脚本", () => {
  const t = setup({ agreed: true });
  assert.equal(t.analytics.trackBaiduRating("good", false), false);
  assert.deepEqual(t.commands(), []);
  assert.equal(t.scripts.length, 0);
});
test("三种评分只发送固定四字段事件，不增加额外PV", () => {
  const t = setup({ agreed: true });
  t.analytics.trackBaiduPageView();
  for (const rating of ["good", "ok", "bad"]) assert.equal(t.analytics.trackBaiduRating(rating, true), true);
  assert.deepEqual(t.commands(), [["_setAutoPageview", false], ["_trackPageview", "/"], ...["good", "ok", "bad"].map((r) => ["_trackEvent", "使用体验", "提交评分", r])]);
  assert.equal(t.scripts.length, 1);
});
test("非法评分与非布尔同意不进入百度", () => {
  const t = setup({ agreed: true });
  for (const rating of [null, "GOOD", "unknown", { rating: "good" }]) assert.equal(t.analytics.trackBaiduRating(rating, true), false);
  assert.equal(t.analytics.trackBaiduRating("good", "true"), false);
  assert.deepEqual(t.commands(), []);
});
test("非目标域名、后台页及撤回后均拒绝评分事件", () => {
  for (const options of [{ hostname: "localhost" }, { hostname: "symptom-checker-app.netlify.app" }, { pathname: "/stats" }, { pathname: "/disclaimer" }]) {
    const t = setup({ agreed: true, ...options });
    assert.equal(t.analytics.trackBaiduRating("good", true), false);
    assert.deepEqual(t.commands(), []);
  }
  const t = setup({ agreed: true });t.consent.revokeConsent();
  assert.equal(t.analytics.trackBaiduRating("good", true), false);
});
test("成功和失败反馈文案正确，分享默认不勾选", () => {
  for (const outcome of ["success", "failure"]) {
    const t = setup({ agreed: true, interactive: true });
    const tree = t.renderFeedback({ outcome });
    assert.ok(textOf(tree).includes(outcome === "failure" ? "本次分析未能完成" : "本次体验如何"));
    assert.equal(shareCheckbox(tree).props.checked, false);
    assert.equal(submitButton(tree).props.disabled, true);
  }
});
test("没选评分即使触发提交也不上报", () => {
  const t = setup({ agreed: true, interactive: true });
  submitButton(t.renderFeedback()).props.onClick();
  assert.equal(t.networkCalls(), 0);
  assert.deepEqual(t.commands(), []);
  assert.equal(t.entries.has("feedback_history"), false);
});
test("切换选项不发送，未勾分享时只提交原统计", () => {
  const t = setup({ agreed: true, interactive: true });
  chooseRating(t, "好用");const tree = chooseRating(t, "一般");
  assert.equal(t.networkCalls(), 0);
  submitButton(tree).props.onClick();
  assert.equal(t.networkCalls(), 1);
  assert.equal(JSON.parse(t.requests[0].options.body).rating, "ok");
  assert.equal(JSON.parse(t.entries.get("feedback_history"))[0].rating, "ok");
  assert.deepEqual(t.commands(), []);
});
test("勾选分享后三种评分在两条链路中值一致", () => {
  for (const [label, rating] of [["好用", "good"], ["一般", "ok"], ["不好用", "bad"]]) {
    const t = setup({ agreed: true, interactive: true });
    const tree = chooseRating(t, label, { outcome: "failure" });
    shareCheckbox(tree).props.onChange({ target: { checked: true } });
    submitButton(t.renderFeedback({ outcome: "failure" })).props.onClick();
    assert.equal(t.networkCalls(), 1);
    assert.equal(JSON.parse(t.requests[0].options.body).rating, rating);
    assert.deepEqual(t.commands().at(-1), ["_trackEvent", "使用体验", "提交评分", rating]);
  }
});
test("取消分享后提交不发送百度评分", () => {
  const t = setup({ agreed: true, interactive: true });
  let tree = chooseRating(t, "好用");
  shareCheckbox(tree).props.onChange({ target: { checked: true } });
  tree = t.renderFeedback();shareCheckbox(tree).props.onChange({ target: { checked: false } });
  submitButton(t.renderFeedback()).props.onClick();
  assert.equal(t.networkCalls(), 1);
  assert.deepEqual(t.commands(), []);
});
test("同次连击只产生一条本地记录和两路各一次上报", () => {
  const t = setup({ agreed: true, interactive: true });
  const tree = chooseRating(t, "不好用");
  shareCheckbox(tree).props.onChange({ target: { checked: true } });
  const submit = submitButton(t.renderFeedback()).props.onClick;
  submit();submit();
  assert.equal(t.networkCalls(), 1);
  assert.equal(t.commands().filter((x) => x[0] === "_trackEvent").length, 1);
  assert.equal(JSON.parse(t.entries.get("feedback_history")).length, 1);
  assert.ok(textOf(t.renderFeedback()).includes("感谢您的反馈"));
});
test("新流程状态清空，分享不会沿用，仍可再提交", () => {
  const t = setup({ agreed: true, interactive: true });
  let tree = chooseRating(t, "好用");shareCheckbox(tree).props.onChange({ target: { checked: true } });
  submitButton(t.renderFeedback()).props.onClick();
  t.resetFeedback();tree = t.renderFeedback({ outcome: "failure" });
  assert.equal(shareCheckbox(tree).props.checked, false);
  assert.equal(submitButton(tree).props.disabled, true);
  assert.equal(findElement(tree, (n) => n.type === "textarea").props.value, "");
  submitButton(chooseRating(t, "一般")).props.onClick();
  assert.equal(t.networkCalls(), 2);
  assert.equal(t.commands().filter((x) => x[0] === "_trackEvent").length, 1);
});
test("评论仅存本地，不随百度或Supabase评分发送", () => {
  const t = setup({ agreed: true, interactive: true });
  let tree = chooseRating(t, "好用");
  findElement(tree, (n) => n.type === "textarea").props.onChange({ target: { value: "仅用于隔离验证的评论" } });
  tree = t.renderFeedback();shareCheckbox(tree).props.onChange({ target: { checked: true } });
  submitButton(t.renderFeedback()).props.onClick();
  assert.equal(JSON.parse(t.entries.get("feedback_history"))[0].comment, "仅用于隔离验证的评论");
  assert.ok(!JSON.stringify(t.commands()).includes("评论"));
  assert.ok(!t.requests[0].options.body.includes("仅用于隔离验证"));
  assert.ok(!JSON.stringify(t.commands()).includes("隔离测试部位"));
});
test("Supabase同步异常不影响百度与感谢界面", () => {
  const t = setup({ agreed: true, interactive: true });
  t.load("src/lib/analytics.ts").trackSurvey = () => { throw Error("blocked"); };
  const tree = chooseRating(t, "好用");shareCheckbox(tree).props.onChange({ target: { checked: true } });
  assert.doesNotThrow(() => submitButton(t.renderFeedback()).props.onClick());
  assert.equal(t.commands().filter((x) => x[0] === "_trackEvent").length, 1);
  assert.ok(textOf(t.renderFeedback()).includes("感谢您的反馈"));
});
test("百度同步异常不影响原统计与感谢界面", () => {
  const t = setup({ agreed: true, interactive: true });
  t.analytics.trackBaiduRating = () => { throw Error("blocked"); };
  const tree = chooseRating(t, "好用");shareCheckbox(tree).props.onChange({ target: { checked: true } });
  assert.doesNotThrow(() => submitButton(t.renderFeedback()).props.onClick());
  assert.equal(t.networkCalls(), 1);
  assert.ok(textOf(t.renderFeedback()).includes("感谢您的反馈"));
});
test("本地存储不可用时仍可提交，分享仍需本次勾选", () => {
  const t = setup({ storageFails: true, interactive: true });t.consent.markConsented();
  const tree = chooseRating(t, "好用");shareCheckbox(tree).props.onChange({ target: { checked: true } });
  assert.doesNotThrow(() => submitButton(t.renderFeedback()).props.onClick());
  assert.equal(t.networkCalls(), 1);
  assert.equal(t.commands().filter((x) => x[0] === "_trackEvent").length, 1);
});
test("提交前撤回总同意，不再发送任何评分", () => {
  const t = setup({ agreed: true, interactive: true });
  const tree = chooseRating(t, "好用");shareCheckbox(tree).props.onChange({ target: { checked: true } });
  const submit = submitButton(t.renderFeedback()).props.onClick;
  t.consent.revokeConsent();submit();
  assert.equal(t.networkCalls(), 0);assert.deepEqual(t.commands(), []);
});
test("非千问页面隐藏分享选项，原反馈仍可提交", () => {
  const t = setup({ hostname: "symptom-checker-app.netlify.app", agreed: true, interactive: true });
  const tree = chooseRating(t, "好用");assert.equal(shareCheckbox(tree), undefined);
  submitButton(tree).props.onClick();assert.equal(t.networkCalls(), 1);assert.deepEqual(t.commands(), []);
});

console.log(`\n结果：${results.length} 通过，0 失败`);
if (process.env.BAIDU_TEST_REPORT) fs.writeFileSync(process.env.BAIDU_TEST_REPORT, JSON.stringify(results, null, 2) + "\n");

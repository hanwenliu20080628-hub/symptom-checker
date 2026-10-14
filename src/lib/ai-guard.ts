import { AnalyzeResult } from "@/types";

/**
 * AI 输出校验层（后端第二道防线，prompt 之外的强制约束）。
 * 原则：等级只升不降；代码里不存在任何把等级降下来的路径。
 */

export const DISCLAIMER =
  "本内容为一般性健康信息，不构成医疗诊断或治疗建议。如有持续或加重的症状，请及时就医。";
export const HIGH_SUGGESTION =
  "描述中包含需要尽快由医生评估的情况，请先就医，由医生评估后再进行护理或活动。";
export const HIGH_FIRST_LINE =
  "建议尽快就医；如情况紧急，请立即拨打120或前往急诊。";

const LEVEL: Record<string, number> = { low: 0, medium: 1, high: 2 };

/** 从 symptoms 开头解析分诊等级（只认以【分诊问卷】开头的真实摘要，防止用户文本伪造标记） */
export function parseTriage(symptoms: string): {
  base: "low" | "medium";
  triaged: boolean;
  freeText: string;
} {
  // 前端拼接规则：有问卷时 symptoms 以 "【分诊问卷】\n" 开头；
  // 跳过问卷时 symptoms 是纯用户文本，其中手写的任何标记都不采信
  if (!symptoms.startsWith("【分诊问卷】")) {
    return { base: "medium", triaged: false, freeText: symptoms };
  }
  const idx = symptoms.indexOf("【症状描述】");
  if (idx === -1) return { base: "medium", triaged: false, freeText: symptoms };
  const header = symptoms.slice(0, idx);
  const freeText = symptoms.slice(idx + "【症状描述】".length);
  if (/分诊等级[:：]\s*绿色/.test(header))
    return { base: "low", triaged: true, freeText };
  if (/分诊等级[:：]\s*黄色/.test(header))
    return { base: "medium", triaged: true, freeText };
  return { base: "medium", triaged: false, freeText };
}

/** 危险信号关键词兜底（带否定词处理，只检查自由文本） */
const RED_KEYWORDS = [
  "变形",
  "错位",
  "站不起来",
  "不能走",
  "走不了",
  "无法行走",
  "无法站立",
  "不能承重",
  "肿得厉害",
  "剧痛",
  "疼得睡不着觉也动不了",
  "胸痛",
  "呼吸困难",
  // 注意：不用裸"大小便"（会误伤"大小便正常"），只匹配异常表述
  "大小便失禁",
  "大小便困难",
  "大小便控制",
  "小便失禁",
  "大便失禁",
  "发烧",
  "发热",
  "突然没力气",
  "说话不清",
];
const NEGATIONS = /(没有|没|无|不|未|并非|不是)$/;

export function hitRedFlag(text: string): boolean {
  return RED_KEYWORDS.some((kw) => {
    let i = text.indexOf(kw);
    while (i !== -1) {
      const before = text.slice(Math.max(0, i - 4), i);
      if (!NEGATIONS.test(before)) return true; // 前面没有否定词才算命中
      i = text.indexOf(kw, i + 1);
    }
    return false;
  });
}

/** 输出校验与修正：只升不降 + 固定字段 + high 内容收紧 + 数组兜底 */
export function enforce(
  result: Partial<AnalyzeResult>,
  symptoms: string
): AnalyzeResult {
  const { base, freeText } = parseTriage(symptoms);

  // 只升不降
  let sev: AnalyzeResult["severity"] =
    result.severity && LEVEL[result.severity] !== undefined
      ? result.severity
      : "medium";
  if (LEVEL[sev] < LEVEL[base]) sev = base;
  if (hitRedFlag(freeText)) sev = "high";

  const out: AnalyzeResult = {
    symptomSummary:
      typeof result.symptomSummary === "string" ? result.symptomSummary : "",
    possibleCauses: Array.isArray(result.possibleCauses)
      ? result.possibleCauses
      : [],
    severity: sev,
    suggestions:
      typeof result.suggestions === "string" ? result.suggestions : "",
    whenToSeeDoctor: Array.isArray(result.whenToSeeDoctor)
      ? result.whenToSeeDoctor
      : [],
    questionsForDoctor: Array.isArray(result.questionsForDoctor)
      ? result.questionsForDoctor
      : [],
    department: typeof result.department === "string" ? result.department : null,
    // 固定字段
    shouldSeeDoctor: true,
    disclaimer: DISCLAIMER,
  };

  // high 时统一收紧内容
  if (sev === "high") {
    out.possibleCauses = [];
    out.suggestions = HIGH_SUGGESTION;
    out.whenToSeeDoctor = [
      HIGH_FIRST_LINE,
      ...out.whenToSeeDoctor.filter((x) => x !== HIGH_FIRST_LINE),
    ];
    if (!String(out.department || "").startsWith("急诊科")) {
      out.department = "急诊科 / " + (out.department || "骨科");
    }
  }

  return out;
}

/**
 * 违禁用语检查（命中→重试一次→再命中用兜底文案）。
 * 注意：排除 symptomSummary——该字段本就是复述用户原话，
 * 用户自己写的"不太严重"不应触发拦截。
 */
const BANNED =
  /你患有|你可能是|比较像|符合.{0,10}表现|疑似|确诊|初步判断|不严重|问题不大|可以先观察|布洛芬|双氯芬酸|塞来昔布|扶他林|膏药/;
export function hasBanned(result: Partial<AnalyzeResult>): boolean {
  const { symptomSummary: _excluded, ...rest } = result;
  return BANNED.test(JSON.stringify(rest));
}

/** 解析失败 / 违禁重试仍命中时的固定兜底（不展示 AI 原文） */
export function fallbackResult(symptoms: string): AnalyzeResult {
  return enforce(
    {
      symptomSummary: "",
      possibleCauses: [],
      severity: "medium",
      suggestions:
        "暂时无法生成护理建议，请稍后重试。\n如过程中疼痛加重或出现不适，应停止并咨询专业人士。",
      whenToSeeDoctor: [
        "休息后症状不缓解或逐渐加重",
        "出现明显肿胀、麻木或无力",
        "影响日常活动或睡眠",
      ],
      questionsForDoctor: [],
      department: "骨科 / 运动医学科 / 康复医学科",
    },
    symptoms
  );
}

/** 从 AI 返回文本中提取 JSON 并校验；失败返回 null（由调用方决定重试或兜底） */
export function parseAIResponse(
  text: string,
  symptoms: string
): AnalyzeResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return enforce(parsed, symptoms);
    }
  } catch {
    // fallthrough
  }
  return null;
}

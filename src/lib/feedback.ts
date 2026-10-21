export const FEEDBACK_VERSION = "expression_help_v1";
export const HELP_OPTIONS = [
  { value: "very_helpful", label: "很有帮助" },
  { value: "somewhat_helpful", label: "有一些帮助" },
  { value: "not_helpful", label: "没有帮助" },
] as const;
export type HelpRating = (typeof HELP_OPTIONS)[number]["value"];
export type AIOutcome = "success" | "failure";
export interface ExpressionFeedback extends Record<string, unknown> {
  feedbackType: "expression_help";
  feedbackVersion: typeof FEEDBACK_VERSION;
  assessmentId: string;
  modelHelp: HelpRating;
  questionnaireUsed: boolean;
  questionnaireHelp: HelpRating | null;
  aiOutcome: AIOutcome;
}
export interface SurveyRow {
  rating: string | null;
  body_part: string | null;
  ts: string;
  answers?: unknown;
}
export const FEEDBACK_PRIVACY_NOTICE = "表达帮助评价：分别记录3D模型与问卷的帮助程度（很有帮助、有一些帮助、没有帮助），以及是否填写问卷、本轮评估编号、AI分析成功或失败状态和部位，用于原自建统计。未填写问卷不计为没有帮助。百度统计仅用于页面访问，不接收上述评价数据；文字评论仅保存在您的浏览器本地，不发送给百度或自建统计数据库。";
export function createAssessmentId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `assessment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function isHelpRating(value: unknown): value is HelpRating {
  return HELP_OPTIONS.some((option) => option.value === value);
}
export function isExpressionFeedback(value: unknown): value is ExpressionFeedback {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.feedbackType === "expression_help" && data.feedbackVersion === FEEDBACK_VERSION &&
    typeof data.assessmentId === "string" && data.assessmentId.length > 0 && isHelpRating(data.modelHelp) &&
    typeof data.questionnaireUsed === "boolean" &&
    (data.questionnaireUsed ? isHelpRating(data.questionnaireHelp) : data.questionnaireHelp === null) &&
    (data.aiOutcome === "success" || data.aiOutcome === "failure");
}
export function helpDistribution(values: (HelpRating | null)[]) {
  const valid = values.filter(isHelpRating);
  const entries = HELP_OPTIONS.map((option) => ({ ...option, count: valid.filter((value) => value === option.value).length }));
  const helpful = entries[0].count + entries[1].count;
  return { entries, total: valid.length, helpfulRate: valid.length ? Math.round((helpful / valid.length) * 100) : null };
}
export function feedbackCsv(rows: SurveyRow[], kind: "expression" | "legacy"): string {
  const lines: unknown[][] = kind === "expression"
    ? [["feedback_version", "assessment_id", "model_help", "questionnaire_used", "questionnaire_help", "ai_outcome", "body_part", "ts"]]
    : [["rating", "body_part", "ts"]];
  for (const row of rows) {
    if (kind === "expression") {
      if (!isExpressionFeedback(row.answers)) continue;
      const a = row.answers;
      lines.push([a.feedbackVersion, a.assessmentId, a.modelHelp, a.questionnaireUsed, a.questionnaireHelp, a.aiOutcome, row.body_part, row.ts]);
    } else if (["good", "ok", "bad"].includes(row.rating ?? "")) lines.push([row.rating, row.body_part, row.ts]);
  }
  return "\ufeff" + lines.map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
}

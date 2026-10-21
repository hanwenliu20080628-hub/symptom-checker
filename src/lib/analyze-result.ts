import type { AnalyzeResult } from "@/types";

/** 只检查前端能否显示返回结构，不改变后端分诊或内容规则。 */
export function isAnalyzeResult(value: unknown): value is AnalyzeResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const textFields = ["symptomSummary", "suggestions", "disclaimer"];
  const listFields = ["possibleCauses", "whenToSeeDoctor", "questionsForDoctor"];
  return textFields.every((key) => typeof data[key] === "string") &&
    listFields.every((key) => Array.isArray(data[key]) && data[key].every((item: unknown) => typeof item === "string")) &&
    ["low", "medium", "high"].includes(String(data.severity)) &&
    (data.department === null || typeof data.department === "string") &&
    data.shouldSeeDoctor === true;
}

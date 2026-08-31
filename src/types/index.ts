/** 身体部位 */
export interface BodyPart {
  id: string;
  name: string;
  meshNames: string[];
  category: "head" | "torso" | "arm" | "leg" | "other";
}

/** 症状查询请求 */
export interface AnalyzeRequest {
  bodyPart: string;
  bodyPartId: string;
  symptoms: string;
}

/** 分析结果 */
export interface AnalyzeResult {
  possibleCauses: string[];
  severity: "low" | "medium" | "high";
  suggestions: string;
  department: string | null;
  shouldSeeDoctor: boolean;
  disclaimer: string;
}

/** 应用状态 */
export type AppPhase =
  | "idle"
  | "selecting"
  | "analyzing"
  | "result"
  | "error";

export interface AppState {
  selectedPart: BodyPart | null;
  phase: AppPhase;
  result: AnalyzeResult | null;
  error: string | null;
}

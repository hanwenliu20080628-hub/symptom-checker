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

/** 分析结果（9 字段契约，与后端 enforce() 输出一致） */
export interface AnalyzeResult {
  /** 症状整理：客观复述，方便就诊时向医生说明 */
  symptomSummary: string;
  /** 科普性常见相关因素（泛指，非用户病因）；severity=high 时为空数组 */
  possibleCauses: string[];
  /** 就医紧迫程度（规则推导，不代表病情轻重） */
  severity: "low" | "medium" | "high";
  /** 一般性护理建议，换行分隔 */
  suggestions: string;
  /** 一般就医指征 */
  whenToSeeDoctor: string[];
  /** 就诊时可以问医生的问题 */
  questionsForDoctor: string[];
  /** 可咨询科室，" / "分隔；high 时最前为急诊科 */
  department: string | null;
  /** 固定为 true（契约兼容保留，勿用于判断是否展示就医建议） */
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

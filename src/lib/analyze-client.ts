import { AnalyzeResult } from "@/types";

const DISCLAIMER =
  "本内容由本地模拟分析生成，为一般性健康信息，不构成医疗诊断或治疗建议。如有持续或加重的症状，请及时就医。";
const HIGH_SUGGESTION =
  "描述中包含需要尽快由医生评估的情况，请先就医，由医生评估后再进行护理或活动。";
const HIGH_FIRST_LINE =
  "建议尽快就医；如情况紧急，请立即拨打120或前往急诊。";

/** 前端本地分析（替代 API，用于纯静态部署）。9 字段契约，与后端 enforce() 输出语义一致。 */
export function analyzeLocally(bodyPart: string, symptoms: string): AnalyzeResult {
  const s = symptoms.trim();

  // 就医紧迫度判断（本地简化版规则推导）
  let severity: AnalyzeResult["severity"] = "medium";
  if (
    /剧烈|无法忍受|持续加重|呼吸困难|胸闷|胸痛|高烧|昏迷|大出血|麻木无力|站不起来|无法行走|变形/.test(
      s
    )
  ) {
    severity = "high";
  } else if (/轻微|偶尔|隐隐|稍微|有一点/.test(s)) {
    severity = "low";
  }

  // 常见相关因素（科普泛指，结合部位）
  const partFactors: Record<string, string[]> = {
    头: ["精神压力或睡眠不足", "长时间用眼或颈部姿势不良", "该部位常见的相关问题还包括紧张性头部不适等，具体原因需医生评估"],
    颈: ["长时间低头或姿势不良", "受凉或睡眠姿势不当", "该部位常见的相关问题还包括颈部肌肉劳损等，具体原因需医生评估"],
    肩: ["重复性抬举动作或运动过量", "长期伏案姿势不良", "该部位常见的相关问题还包括肩部软组织劳损等，具体原因需医生评估"],
    臂: ["运动量突然增加或热身不足", "重复性动作引起的肌肉疲劳", "该部位常见的相关问题还包括肌腱劳损等，具体原因需医生评估"],
    肘: ["重复性抓握或旋转动作", "运动量突然增加", "该部位常见的相关问题还包括肌腱劳损等，具体原因需医生评估"],
    腕: ["长时间使用键盘鼠标", "重复性腕部动作", "该部位常见的相关问题还包括腕部软组织劳损等，具体原因需医生评估"],
    胸: ["剧烈运动或搬运重物", "姿势不良引起的胸壁肌肉疲劳", "如伴呼吸困难等全身表现请及时就医"],
    腹: ["饮食不规律", "腹部肌肉运动过量", "该部位常见的相关问题还包括腹部软组织劳损等，具体原因需医生评估"],
    背: ["久坐或姿势不良", "搬运重物姿势不当", "该部位常见的相关问题还包括背部肌肉劳损等，具体原因需医生评估"],
    腰: ["久坐或弯腰负重", "核心肌群力量不足", "该部位常见的相关问题还包括腰部肌肉劳损等，具体原因需医生评估"],
    膝: ["运动量突然增加", "体重负荷较大或下肢力线问题", "该部位常见的相关问题还包括膝关节劳损等，具体原因需医生评估"],
    腿: ["运动量突然增加或热身不足", "长时间站立或行走", "该部位常见的相关问题还包括肌肉疲劳或拉伤等，具体原因需医生评估"],
    踝: ["运动中急停变向", "鞋具不合适", "该部位常见的相关问题还包括踝部软组织损伤等，具体原因需医生评估"],
    足: ["长时间站立或行走", "鞋具不合适", "该部位常见的相关问题还包括足底软组织劳损等，具体原因需医生评估"],
  };

  let possibleCauses = [
    "姿势不当或过度使用引起的肌肉疲劳",
    "运动量突然增加或热身不足",
    "该部位常见的相关问题还包括轻微软组织劳损等，具体原因需医生评估",
  ];
  for (const [key, factors] of Object.entries(partFactors)) {
    if (bodyPart.includes(key)) {
      possibleCauses = factors;
      break;
    }
  }

  const suggestions =
    severity === "high"
      ? HIGH_SUGGESTION
      : severity === "low"
        ? "适当休息，避免引起不适的活动\n保持正确姿势，避免长时间维持同一动作\n症状缓解后可适度活动放松\n如过程中疼痛加重或出现不适，应停止并咨询专业人士。"
        : "适当休息，暂时减少引起不适的活动\n保持正确姿势，避免久坐久站\n如过程中疼痛加重或出现不适，应停止并咨询专业人士。";

  const whenToSeeDoctor = [
    "休息后症状不缓解或逐渐加重",
    "出现明显肿胀、关节卡住或打软腿",
    "出现麻木或无力",
    "影响日常活动或睡眠",
  ];
  if (severity === "high") {
    whenToSeeDoctor.unshift(HIGH_FIRST_LINE);
  }

  let department = bodyPart.includes("胸") || bodyPart.includes("头") || bodyPart.includes("颈")
    ? "骨科 / 神经内科"
    : bodyPart.includes("腹") || bodyPart.includes("腰")
      ? "骨科 / 消化内科"
      : "骨科 / 运动医学科 / 康复医学科";
  if (severity === "high" && !department.startsWith("急诊科")) {
    department = "急诊科 / " + department;
  }

  return {
    symptomSummary: "（本地模拟分析未生成症状整理，请以实际描述为准向医生说明。）",
    possibleCauses: severity === "high" ? [] : possibleCauses,
    severity,
    suggestions,
    whenToSeeDoctor,
    questionsForDoctor: [
      "需要做哪些检查来明确原因？",
      "恢复期间哪些活动需要避免？",
      "什么情况下需要复诊？",
    ],
    department,
    shouldSeeDoctor: true,
    disclaimer: DISCLAIMER,
  };
}

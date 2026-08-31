import { AnalyzeResult } from "@/types";

/** 前端本地分析（替代 API，用于纯静态部署） */
export function analyzeLocally(bodyPart: string, symptoms: string): AnalyzeResult {
  const s = symptoms.trim();

  // 严重程度判断
  let severity: AnalyzeResult["severity"] = "medium";
  if (/剧烈|无法忍受|持续加重|呼吸困难|胸闷|胸痛|高烧|昏迷|大出血|麻木无力/.test(s)) {
    severity = "high";
  } else if (/轻微|偶尔|隐隐|稍微|有一点|不太严重/.test(s)) {
    severity = "low";
  }

  // 可能原因（结合部位）
  const partCauses: Record<string, string[]> = {
    头: ["紧张性头痛：精神压力或睡眠不足所致", "颈椎问题牵涉性疼痛", "血压或眼压异常（如有伴随症状）"],
    颈: ["颈部肌肉劳损：长时间低头或姿势不良", "颈椎间盘问题", "落枕或受凉"],
    肩: ["肩周炎或肩袖损伤", "姿势性肌肉紧张", "颈椎病牵涉痛"],
    臂: ["肌肉拉伤或劳损", "神经压迫（如颈椎或肘部）", "腱鞘炎"],
    肘: ["网球肘/高尔夫球肘（肌腱劳损）", "关节滑囊炎", "过度使用损伤"],
    腕: ["腕管综合征", "腱鞘炎", "重复性劳损"],
    胸: ["胸壁肌肉拉伤", "肋间神经痛", "心肺问题（若伴呼吸困难需警惕）"],
    腹: ["胃肠功能紊乱", "腹壁肌肉劳损", "消化系统问题"],
    背: ["背部肌肉劳损", "腰椎间盘问题", "筋膜炎"],
    腰: ["腰肌劳损", "腰椎间盘突出", "肾脏问题（若伴尿路症状）"],
    膝: ["膝关节劳损或髌骨软化", "半月板或韧带损伤", "骨关节炎"],
    腿: ["肌肉疲劳或拉伤", "下肢血管问题", "神经压迫"],
    踝: ["踝关节扭伤", "韧带劳损", "跟腱炎"],
    足: ["足底筋膜炎", "扁平足或过度使用", "鞋子不合适所致"],
  };

  let possibleCauses = ["姿势不当或过度使用引起的肌肉疲劳", "轻度软组织损伤", "长期劳损累积所致"];
  for (const [key, causes] of Object.entries(partCauses)) {
    if (bodyPart.includes(key)) {
      possibleCauses = causes;
      break;
    }
  }

  const suggestions =
    "1. 适当休息，避免加重症状的活动\n" +
    "2. 急性期可冷敷、慢性期可热敷，每次 15-20 分钟\n" +
    "3. 保持正确姿势，避免长时间维持同一动作\n" +
    "4. 症状缓解后可适度拉伸放松\n" +
    "5. 若 3-5 天无缓解或症状加重，请及时就医";

  const department = bodyPart.includes("胸") || bodyPart.includes("头") || bodyPart.includes("颈")
    ? "骨科 / 神经内科"
    : bodyPart.includes("腹") || bodyPart.includes("腰")
      ? "骨科 / 消化内科"
      : "骨科 / 康复科";

  return {
    possibleCauses,
    severity,
    suggestions,
    department,
    shouldSeeDoctor: severity !== "low",
    disclaimer:
      "本内容由本地模拟分析生成，仅供参考，不能替代专业医疗诊断。如有持续或加重的症状，请及时就医。",
  };
}

/**
 * 分诊规则（triage）+ 23 题问卷数据模型
 *
 * triage() 与产品分诊伪代码严格一一对应：
 *
 * function triage(data) {
 *   // 红色
 *   if (data.severe_signs.includes('visible_deformity')) return 'RED';
 *   if (data.severe_signs.includes('unable_to_bear_weight')) return 'RED';
 *   if (data.heard_popping === 'yes' && data.severe_signs.includes('swelling')) return 'RED';
 *   if (data.pain_rest >= 7) return 'RED';
 *   if (data.daily_impact === 'severe') return 'RED';
 *   // 黄色
 *   if (data.injury_duration === 'over_3m') return 'YELLOW';
 *   if (data.pain_activity >= 7) return 'YELLOW';
 *   if (data.previous_injury === 'multiple') return 'YELLOW';
 *   if (['frequent_wake', 'cannot_sleep'].includes(data.sleep_impact)) return 'YELLOW';
 *   // 绿色
 *   return 'GREEN';
 * }
 *
 * 等级语义：
 * - 红色 RED：提示可能存在需要尽快线下评估的严重问题
 * - 黄色 YELLOW：提示存在需要进一步评估的风险因素或症状负担
 * - 绿色 GREEN：在现有信息下，可进入线上康复流程
 */

/** 分诊规则输入（字段名与伪代码保持一致） */
export interface TriageData {
  /** 严重体征（多选）：visible_deformity 可见畸形 / unable_to_bear_weight 无法承重 / swelling 明显肿胀 */
  severe_signs: string[];
  /** 受伤时是否听到“啪”的弹响 */
  heard_popping: "yes" | "no";
  /** 静息状态疼痛程度 0-10 */
  pain_rest: number;
  /** 对日常生活的影响 */
  daily_impact: "none" | "mild" | "moderate" | "severe";
  /** 损伤持续时间 */
  injury_duration: "under_2w" | "2w_to_3m" | "over_3m";
  /** 活动时疼痛程度 0-10 */
  pain_activity: number;
  /** 该部位既往受伤次数 */
  previous_injury: "none" | "once" | "multiple";
  /** 睡眠影响 */
  sleep_impact: "none" | "occasional_wake" | "frequent_wake" | "cannot_sleep";
}

export type TriageLevel = "RED" | "YELLOW" | "GREEN";

/** 分诊：红色任一命中即返回 → 黄色任一命中 → 否则绿色 */
export function triage(data: TriageData): TriageLevel {
  // 红色警示 - 任一命中即返回
  if (data.severe_signs.includes("visible_deformity")) return "RED";
  if (data.severe_signs.includes("unable_to_bear_weight")) return "RED";
  if (data.heard_popping === "yes" && data.severe_signs.includes("swelling"))
    return "RED";
  if (data.pain_rest >= 7) return "RED";
  if (data.daily_impact === "severe") return "RED";

  // 黄色警示
  if (data.injury_duration === "over_3m") return "YELLOW";
  if (data.pain_activity >= 7) return "YELLOW";
  if (data.previous_injury === "multiple") return "YELLOW";
  if (
    data.sleep_impact === "frequent_wake" ||
    data.sleep_impact === "cannot_sleep"
  )
    return "YELLOW";

  // 绿色 - 可线上康复
  return "GREEN";
}

// ================= 23 题问卷数据模型 =================

/** 完整问卷数据（23 题版，按六个分区组织） */
export interface QuestionnaireData {
  // 一、基础信息
  gender: "male" | "female" | "other";
  /** 身份（多选）：athlete 运动员 / student 学生 / other 其他（带 identitiesOther 文本） */
  identities: string[];
  identitiesOther: string; // 可空，identities 含 other 时的自定义文本
  age: "under_18" | "18_30" | "31_45" | "46_60" | "over_60";
  heightCm: string; // 可空
  weightKg: string; // 可空
  exerciseFrequency: "none" | "1_2" | "3_5" | "daily";
  sportTypes: string[]; // running/ball/strength/swimming/yoga/cycling/other
  sportOther: string;

  // 二、损伤详情
  injuryMechanism: "acute" | "chronic" | "no_cause" | "accident" | "other";
  injuryMechanismOther: string;
  injuryDuration: "under_3d" | "3d_2w" | "2w_6w" | "6w_3m" | "over_3m";
  heardPopping: "yes" | "no" | "unsure";
  postInjurySigns: string[]; // swelling/bruising/limited_motion/unable_weight/deformity/none

  // 三、疼痛评估
  painRest: number; // 0-10
  painActivity: number; // 0-10
  painNature: string[]; // stabbing/dull/sore/burning/numb/distending/unclear
  painWorse: string[]; // weight_bearing/specific_movement/same_posture/after_exercise/night/no_pattern
  painBetter: string[]; // rest/heat/cold/warm_up/massage/none

  // 四、功能影响
  dailyImpact: "none" | "mild" | "moderate" | "severe";
  sleepImpact: "none" | "occasional" | "frequent" | "cannot_sleep";

  // 五、既往史与风险筛查
  previousInjury: "none" | "once" | "multiple";
  comorbidities: string[]; // diabetes/osteoporosis/rheumatoid/gout/coagulation/cardiovascular/none
  medications: string[]; // anticoagulant/steroid/painkiller/none
  examinations: string[]; // none/xray/mri/ct/ultrasound/manual

  // 六、康复目标
  rehabGoals: string[]; // pain_free/return_sport/daily_activity/prevent_reinjury/performance
  recoveryExpectation: "asap" | "1_2w" | "1m" | "1_3m" | "no_rush";
}

/** 把 23 题问卷答案映射为分诊规则输入（triage() 规则保持不变） */
export function toTriageData(q: QuestionnaireData): TriageData {
  const severeSigns: string[] = [];
  if (q.postInjurySigns.includes("deformity"))
    severeSigns.push("visible_deformity");
  if (q.postInjurySigns.includes("unable_weight"))
    severeSigns.push("unable_to_bear_weight");
  if (q.postInjurySigns.includes("swelling")) severeSigns.push("swelling");

  // 损伤时长五档 → 规则三档
  let injuryDuration: TriageData["injury_duration"] = "under_2w";
  if (q.injuryDuration === "2w_6w" || q.injuryDuration === "6w_3m")
    injuryDuration = "2w_to_3m";
  if (q.injuryDuration === "over_3m") injuryDuration = "over_3m";

  const sleepMap: Record<
    QuestionnaireData["sleepImpact"],
    TriageData["sleep_impact"]
  > = {
    none: "none",
    occasional: "occasional_wake",
    frequent: "frequent_wake",
    cannot_sleep: "cannot_sleep",
  };

  return {
    severe_signs: severeSigns,
    // “不确定”按 no 处理（不触发弹响红色规则）
    heard_popping: q.heardPopping === "yes" ? "yes" : "no",
    pain_rest: q.painRest,
    daily_impact: q.dailyImpact,
    injury_duration: injuryDuration,
    pain_activity: q.painActivity,
    previous_injury: q.previousInjury,
    sleep_impact: sleepMap[q.sleepImpact],
  };
}

/** 分诊等级展示元数据 */
export const TRIAGE_META: Record<
  TriageLevel,
  {
    label: string;
    emoji: string;
    advice: string;
    /** 横幅样式（背景/边框/文字） */
    bannerClass: string;
    /** 徽标样式 */
    badgeClass: string;
  }
> = {
  RED: {
    label: "红色警示",
    emoji: "🔴",
    advice:
      "提示可能存在需要尽快线下评估的严重问题，建议尽快前往医院就诊。AI 分析仅供参考，请以医生面诊为准。",
    bannerClass: "bg-red-50 border-red-200 text-red-800",
    badgeClass: "bg-red-100 text-red-800",
  },
  YELLOW: {
    label: "黄色警示",
    emoji: "🟡",
    advice:
      "提示存在需要进一步评估的风险因素或症状负担，建议近期预约门诊评估。如症状持续或加重请及时就医。",
    bannerClass: "bg-amber-50 border-amber-200 text-amber-800",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  GREEN: {
    label: "绿色",
    emoji: "🟢",
    advice: "在现有信息下，可进入线上康复流程。",
    bannerClass: "bg-green-50 border-green-200 text-green-800",
    badgeClass: "bg-green-100 text-green-800",
  },
};

// ================= 问卷选项标签（用于生成 AI 摘要） =================

export const Q_LABELS = {
  gender: { male: "男", female: "女", other: "其他" } as Record<string, string>,
  identities: { athlete: "运动员", student: "学生" } as Record<string, string>,
  age: {
    under_18: "18岁以下",
    "18_30": "18–30岁",
    "31_45": "31–45岁",
    "46_60": "46–60岁",
    over_60: "60岁以上",
  } as Record<string, string>,
  exerciseFrequency: {
    none: "几乎不运动",
    "1_2": "每周1–2次",
    "3_5": "每周3–5次",
    daily: "几乎每天",
  } as Record<string, string>,
  sportTypes: {
    running: "跑步",
    ball: "球类",
    strength: "力量训练",
    swimming: "游泳",
    yoga: "瑜伽普拉提",
    cycling: "骑行",
  } as Record<string, string>,
  injuryMechanism: {
    acute: "运动中急性扭伤或拉伤",
    chronic: "运动后逐渐加重的慢性疼痛",
    no_cause: "无明显诱因，逐渐出现",
    accident: "意外事故",
  } as Record<string, string>,
  injuryDuration: {
    under_3d: "3天以内",
    "3d_2w": "3天–2周",
    "2w_6w": "2周–6周",
    "6w_3m": "6周–3个月",
    over_3m: "3个月以上",
  } as Record<string, string>,
  heardPopping: { yes: "是", no: "否", unsure: "不确定" } as Record<
    string,
    string
  >,
  postInjurySigns: {
    swelling: "明显肿胀",
    bruising: "大面积淤青",
    limited_motion: "关节无法活动或活动受限",
    unable_weight: "无法承重或站立",
    deformity: "局部明显变形",
  } as Record<string, string>,
  painNature: {
    stabbing: "刺痛",
    dull: "钝痛",
    sore: "酸痛",
    burning: "灼烧感",
    numb: "麻木感",
    distending: "胀痛",
    unclear: "说不清",
  } as Record<string, string>,
  painWorse: {
    weight_bearing: "负重",
    specific_movement: "特定动作",
    same_posture: "长时间保持同一姿势",
    after_exercise: "运动后",
    night: "夜间休息时",
    no_pattern: "无明显规律",
  } as Record<string, string>,
  painBetter: {
    rest: "休息",
    heat: "热敷",
    cold: "冷敷",
    warm_up: "活动开后",
    massage: "按摩",
    none: "无明显缓解方式",
  } as Record<string, string>,
  dailyImpact: {
    none: "无影响",
    mild: "轻微影响",
    moderate: "中度影响",
    severe: "严重影响",
  } as Record<string, string>,
  sleepImpact: {
    none: "不影响",
    occasional: "偶尔影响",
    frequent: "经常痛醒",
    cannot_sleep: "无法正常入睡",
  } as Record<string, string>,
  previousInjury: {
    none: "没有",
    once: "有，1次",
    multiple: "有，多次",
  } as Record<string, string>,
  comorbidities: {
    diabetes: "糖尿病",
    osteoporosis: "骨质疏松",
    rheumatoid: "类风湿关节炎",
    gout: "痛风",
    coagulation: "凝血功能异常",
    cardiovascular: "心血管疾病",
  } as Record<string, string>,
  medications: {
    anticoagulant: "抗凝药",
    steroid: "激素类药物",
    painkiller: "止痛药",
  } as Record<string, string>,
  examinations: {
    xray: "X光",
    mri: "MRI",
    ct: "CT",
    ultrasound: "超声",
    manual: "医生徒手检查",
  } as Record<string, string>,
  rehabGoals: {
    pain_free: "消除疼痛",
    return_sport: "恢复正常运动",
    daily_activity: "恢复日常活动能力",
    prevent_reinjury: "预防再次受伤",
    performance: "提升运动表现",
  } as Record<string, string>,
  recoveryExpectation: {
    asap: "越快越好",
    "1_2w": "1–2周",
    "1m": "1个月",
    "1_3m": "1–3个月",
    no_rush: "不着急",
  } as Record<string, string>,
};

/** 多选值 → 中文标签串（含 other 自定义文本；空返回 fallback） */
function labels(
  values: string[],
  map: Record<string, string>,
  other?: string,
  fallback = "无"
): string {
  const parts = values
    .filter((v) => v !== "none")
    .map((v) =>
      v === "other" ? `其他（${other || "未填写"}）` : (map[v] ?? v)
    );
  return parts.length > 0 ? parts.join("、") : fallback;
}

/** 生成完整问卷摘要文本（拼进症状描述发给 AI，作为分诊与背景上下文） */
export function buildQuestionnaireSummary(
  q: QuestionnaireData,
  level: TriageLevel
): string {
  const height = q.heightCm.trim() ? `${q.heightCm.trim()}cm` : "未填";
  const weight = q.weightKg.trim() ? `${q.weightKg.trim()}kg` : "未填";
  const mechanism =
    q.injuryMechanism === "other"
      ? `其他（${q.injuryMechanismOther || "未填写"}）`
      : Q_LABELS.injuryMechanism[q.injuryMechanism];

  return [
    `分诊等级：${TRIAGE_META[level].label}`,
    `【基础信息】性别：${Q_LABELS.gender[q.gender]}；身份：${labels(q.identities, Q_LABELS.identities, q.identitiesOther, "未填")}；年龄：${Q_LABELS.age[q.age]}；身高：${height}；体重：${weight}；运动频率：${Q_LABELS.exerciseFrequency[q.exerciseFrequency]}；运动类型：${labels(q.sportTypes, Q_LABELS.sportTypes, q.sportOther)}`,
    `【损伤详情】损伤机制：${mechanism}；持续时间：${Q_LABELS.injuryDuration[q.injuryDuration]}；听到弹响：${Q_LABELS.heardPopping[q.heardPopping]}；伤后情况：${labels(q.postInjurySigns, Q_LABELS.postInjurySigns, undefined, "以上都没有")}`,
    `【疼痛评估】静息疼痛：${q.painRest}/10；活动疼痛：${q.painActivity}/10；疼痛性质：${labels(q.painNature, Q_LABELS.painNature, undefined, "未选")}；加重因素：${labels(q.painWorse, Q_LABELS.painWorse, undefined, "未选")}；缓解因素：${labels(q.painBetter, Q_LABELS.painBetter, undefined, "未选")}`,
    `【功能影响】日常生活影响：${Q_LABELS.dailyImpact[q.dailyImpact]}；睡眠影响：${Q_LABELS.sleepImpact[q.sleepImpact]}`,
    `【既往史】同部位受伤：${Q_LABELS.previousInjury[q.previousInjury]}；基础疾病：${labels(q.comorbidities, Q_LABELS.comorbidities)}；长期用药：${labels(q.medications, Q_LABELS.medications)}；已做检查：${labels(q.examinations, Q_LABELS.examinations, undefined, "未做过检查")}`,
    `【康复目标】${labels(q.rehabGoals, Q_LABELS.rehabGoals, undefined, "未选")}；期望恢复时间：${Q_LABELS.recoveryExpectation[q.recoveryExpectation]}`,
  ].join("\n");
}

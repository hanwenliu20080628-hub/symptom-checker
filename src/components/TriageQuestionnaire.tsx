"use client";

import { useState } from "react";
import { QuestionnaireData } from "@/lib/triage";

interface TriageQuestionnaireProps {
  bodyPartName: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: QuestionnaireData) => void;
}

/** 单选/多选选项按钮 */
function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
        selected
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

/** 0-10 疼痛滑块 */
function PainSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-600"
      />
      <span
        className={`w-12 text-center text-sm font-semibold rounded-lg py-1 ${
          value >= 7
            ? "bg-red-100 text-red-700"
            : value >= 4
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
        }`}
      >
        {value}/10
      </span>
    </div>
  );
}

/** 分区标题 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2 pb-1 border-b border-gray-100">
      <h4 className="text-sm font-bold text-gray-900">{children}</h4>
    </div>
  );
}

/** 题目标题 */
function Q({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-800 mb-2">{children}</p>;
}

export default function TriageQuestionnaire({
  bodyPartName,
  isOpen,
  onClose,
  onComplete,
}: TriageQuestionnaireProps) {
  // 一、基础信息
  const [gender, setGender] = useState<QuestionnaireData["gender"] | null>(null);
  const [age, setAge] = useState<QuestionnaireData["age"] | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [exerciseFrequency, setExerciseFrequency] = useState<
    QuestionnaireData["exerciseFrequency"] | null
  >(null);
  const [sportTypes, setSportTypes] = useState<string[]>([]);
  const [sportOther, setSportOther] = useState("");

  // 二、损伤详情
  const [injuryMechanism, setInjuryMechanism] = useState<
    QuestionnaireData["injuryMechanism"] | null
  >(null);
  const [injuryMechanismOther, setInjuryMechanismOther] = useState("");
  const [injuryDuration, setInjuryDuration] = useState<
    QuestionnaireData["injuryDuration"] | null
  >(null);
  const [heardPopping, setHeardPopping] = useState<
    QuestionnaireData["heardPopping"] | null
  >(null);
  const [postInjurySigns, setPostInjurySigns] = useState<string[]>([]);

  // 三、疼痛评估
  const [painRest, setPainRest] = useState(0);
  const [painActivity, setPainActivity] = useState(0);
  const [painNature, setPainNature] = useState<string[]>([]);
  const [painWorse, setPainWorse] = useState<string[]>([]);
  const [painBetter, setPainBetter] = useState<string[]>([]);

  // 四、功能影响
  const [dailyImpact, setDailyImpact] = useState<
    QuestionnaireData["dailyImpact"] | null
  >(null);
  const [sleepImpact, setSleepImpact] = useState<
    QuestionnaireData["sleepImpact"] | null
  >(null);

  // 五、既往史与风险筛查
  const [previousInjury, setPreviousInjury] = useState<
    QuestionnaireData["previousInjury"] | null
  >(null);
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [examinations, setExaminations] = useState<string[]>([]);

  // 六、康复目标
  const [rehabGoals, setRehabGoals] = useState<string[]>([]);
  const [recoveryExpectation, setRecoveryExpectation] = useState<
    QuestionnaireData["recoveryExpectation"] | null
  >(null);

  if (!isOpen) return null;

  /** 普通多选切换 */
  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  /** 含“无/以上都没有/说不清”互斥项的多选切换 */
  const toggleWithNone = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    noneValue: string
  ) => {
    setter((prev) => {
      if (value === noneValue)
        return prev.includes(noneValue) ? [] : [noneValue];
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev.filter((v) => v !== noneValue), value];
      return next;
    });
  };

  // 单选题全部作答后才能提交（多选/填空留空视为无）
  const canSubmit =
    gender !== null &&
    age !== null &&
    exerciseFrequency !== null &&
    injuryMechanism !== null &&
    injuryDuration !== null &&
    heardPopping !== null &&
    dailyImpact !== null &&
    sleepImpact !== null &&
    previousInjury !== null &&
    recoveryExpectation !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      gender,
      age,
      heightCm,
      weightKg,
      exerciseFrequency,
      sportTypes,
      sportOther,
      injuryMechanism,
      injuryMechanismOther,
      injuryDuration,
      heardPopping,
      postInjurySigns,
      painRest,
      painActivity,
      painNature,
      painWorse,
      painBetter,
      dailyImpact,
      sleepImpact,
      previousInjury,
      comorbidities,
      medications,
      examinations,
      rehabGoals,
      recoveryExpectation,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">症状前问卷</h3>
            <p className="text-sm text-blue-600 mt-0.5">
              选中部位：{bodyPartName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 问题区（可滚动） */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
          {/* ========== 一、基础信息 ========== */}
          <SectionTitle>一、基础信息</SectionTitle>

          <div>
            <Q>1. 您的性别：</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={gender === "male"} onClick={() => setGender("male")}>男</OptionButton>
              <OptionButton selected={gender === "female"} onClick={() => setGender("female")}>女</OptionButton>
              <OptionButton selected={gender === "other"} onClick={() => setGender("other")}>其他</OptionButton>
            </div>
          </div>

          <div>
            <Q>2. 您的年龄：</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={age === "under_18"} onClick={() => setAge("under_18")}>18岁以下</OptionButton>
              <OptionButton selected={age === "18_30"} onClick={() => setAge("18_30")}>18–30岁</OptionButton>
              <OptionButton selected={age === "31_45"} onClick={() => setAge("31_45")}>31–45岁</OptionButton>
              <OptionButton selected={age === "46_60"} onClick={() => setAge("46_60")}>46–60岁</OptionButton>
              <OptionButton selected={age === "over_60"} onClick={() => setAge("over_60")}>60岁以上</OptionButton>
            </div>
          </div>

          <div>
            <Q>3. 您的身高和体重：<span className="text-gray-400 font-normal">（选填）</span></Q>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="身高"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">厘米</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="体重"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">千克</span>
              </div>
            </div>
          </div>

          <div>
            <Q>4. 您目前的运动频率：</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={exerciseFrequency === "none"} onClick={() => setExerciseFrequency("none")}>几乎不运动</OptionButton>
              <OptionButton selected={exerciseFrequency === "1_2"} onClick={() => setExerciseFrequency("1_2")}>每周1–2次</OptionButton>
              <OptionButton selected={exerciseFrequency === "3_5"} onClick={() => setExerciseFrequency("3_5")}>每周3–5次</OptionButton>
              <OptionButton selected={exerciseFrequency === "daily"} onClick={() => setExerciseFrequency("daily")}>几乎每天</OptionButton>
            </div>
          </div>

          <div>
            <Q>5. 您主要参与的运动类型：<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={sportTypes.includes("running")} onClick={() => toggle(setSportTypes, "running")}>跑步</OptionButton>
              <OptionButton selected={sportTypes.includes("ball")} onClick={() => toggle(setSportTypes, "ball")}>球类</OptionButton>
              <OptionButton selected={sportTypes.includes("strength")} onClick={() => toggle(setSportTypes, "strength")}>力量训练</OptionButton>
              <OptionButton selected={sportTypes.includes("swimming")} onClick={() => toggle(setSportTypes, "swimming")}>游泳</OptionButton>
              <OptionButton selected={sportTypes.includes("yoga")} onClick={() => toggle(setSportTypes, "yoga")}>瑜伽普拉提</OptionButton>
              <OptionButton selected={sportTypes.includes("cycling")} onClick={() => toggle(setSportTypes, "cycling")}>骑行</OptionButton>
              <OptionButton selected={sportTypes.includes("other")} onClick={() => toggle(setSportTypes, "other")}>其他</OptionButton>
            </div>
            {sportTypes.includes("other") && (
              <input
                type="text"
                value={sportOther}
                onChange={(e) => setSportOther(e.target.value)}
                placeholder="请填写其他运动类型"
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            )}
          </div>

          {/* ========== 二、损伤详情 ========== */}
          <SectionTitle>二、损伤详情</SectionTitle>

          <div>
            <Q>6. 这次损伤是怎么发生的？</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={injuryMechanism === "acute"} onClick={() => setInjuryMechanism("acute")}>运动中急性扭伤或拉伤</OptionButton>
              <OptionButton selected={injuryMechanism === "chronic"} onClick={() => setInjuryMechanism("chronic")}>运动后逐渐加重的慢性疼痛</OptionButton>
              <OptionButton selected={injuryMechanism === "no_cause"} onClick={() => setInjuryMechanism("no_cause")}>无明显诱因，逐渐出现</OptionButton>
              <OptionButton selected={injuryMechanism === "accident"} onClick={() => setInjuryMechanism("accident")}>意外事故</OptionButton>
              <OptionButton selected={injuryMechanism === "other"} onClick={() => setInjuryMechanism("other")}>其他</OptionButton>
            </div>
            {injuryMechanism === "other" && (
              <input
                type="text"
                value={injuryMechanismOther}
                onChange={(e) => setInjuryMechanismOther(e.target.value)}
                placeholder="请描述损伤原因"
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            )}
          </div>

          <div>
            <Q>7. 损伤发生多久了？</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={injuryDuration === "under_3d"} onClick={() => setInjuryDuration("under_3d")}>3天以内</OptionButton>
              <OptionButton selected={injuryDuration === "3d_2w"} onClick={() => setInjuryDuration("3d_2w")}>3天–2周</OptionButton>
              <OptionButton selected={injuryDuration === "2w_6w"} onClick={() => setInjuryDuration("2w_6w")}>2周–6周</OptionButton>
              <OptionButton selected={injuryDuration === "6w_3m"} onClick={() => setInjuryDuration("6w_3m")}>6周–3个月</OptionButton>
              <OptionButton selected={injuryDuration === "over_3m"} onClick={() => setInjuryDuration("over_3m")}>3个月以上</OptionButton>
            </div>
          </div>

          <div>
            <Q>8. 当时受伤时，是否听到“啪”或“撕裂”的声音？</Q>
            <div className="flex gap-2">
              <OptionButton selected={heardPopping === "yes"} onClick={() => setHeardPopping("yes")}>是</OptionButton>
              <OptionButton selected={heardPopping === "no"} onClick={() => setHeardPopping("no")}>否</OptionButton>
              <OptionButton selected={heardPopping === "unsure"} onClick={() => setHeardPopping("unsure")}>不确定</OptionButton>
            </div>
          </div>

          <div>
            <Q>9. 受伤后是否出现过以下情况？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={postInjurySigns.includes("swelling")} onClick={() => toggleWithNone(setPostInjurySigns, "swelling", "none")}>明显肿胀</OptionButton>
              <OptionButton selected={postInjurySigns.includes("bruising")} onClick={() => toggleWithNone(setPostInjurySigns, "bruising", "none")}>大面积淤青</OptionButton>
              <OptionButton selected={postInjurySigns.includes("limited_motion")} onClick={() => toggleWithNone(setPostInjurySigns, "limited_motion", "none")}>关节无法活动或活动受限</OptionButton>
              <OptionButton selected={postInjurySigns.includes("unable_weight")} onClick={() => toggleWithNone(setPostInjurySigns, "unable_weight", "none")}>无法承重或站立</OptionButton>
              <OptionButton selected={postInjurySigns.includes("deformity")} onClick={() => toggleWithNone(setPostInjurySigns, "deformity", "none")}>局部明显变形</OptionButton>
              <OptionButton selected={postInjurySigns.includes("none")} onClick={() => toggleWithNone(setPostInjurySigns, "none", "none")}>以上都没有</OptionButton>
            </div>
          </div>

          {/* ========== 三、疼痛评估 ========== */}
          <SectionTitle>三、疼痛评估</SectionTitle>

          <div>
            <Q>10. 您目前静息状态下的疼痛程度：<span className="text-gray-400 font-normal">（0 无痛，10 剧痛）</span></Q>
            <PainSlider value={painRest} onChange={setPainRest} />
          </div>

          <div>
            <Q>11. 您运动或活动时的疼痛程度：<span className="text-gray-400 font-normal">（0 无痛，10 剧痛）</span></Q>
            <PainSlider value={painActivity} onChange={setPainActivity} />
          </div>

          <div>
            <Q>12. 您的疼痛性质是？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={painNature.includes("stabbing")} onClick={() => toggleWithNone(setPainNature, "stabbing", "unclear")}>刺痛</OptionButton>
              <OptionButton selected={painNature.includes("dull")} onClick={() => toggleWithNone(setPainNature, "dull", "unclear")}>钝痛</OptionButton>
              <OptionButton selected={painNature.includes("sore")} onClick={() => toggleWithNone(setPainNature, "sore", "unclear")}>酸痛</OptionButton>
              <OptionButton selected={painNature.includes("burning")} onClick={() => toggleWithNone(setPainNature, "burning", "unclear")}>灼烧感</OptionButton>
              <OptionButton selected={painNature.includes("numb")} onClick={() => toggleWithNone(setPainNature, "numb", "unclear")}>麻木感</OptionButton>
              <OptionButton selected={painNature.includes("distending")} onClick={() => toggleWithNone(setPainNature, "distending", "unclear")}>胀痛</OptionButton>
              <OptionButton selected={painNature.includes("unclear")} onClick={() => toggleWithNone(setPainNature, "unclear", "unclear")}>说不清</OptionButton>
            </div>
          </div>

          <div>
            <Q>13. 什么情况下疼痛会加重？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={painWorse.includes("weight_bearing")} onClick={() => toggleWithNone(setPainWorse, "weight_bearing", "no_pattern")}>负重</OptionButton>
              <OptionButton selected={painWorse.includes("specific_movement")} onClick={() => toggleWithNone(setPainWorse, "specific_movement", "no_pattern")}>特定动作</OptionButton>
              <OptionButton selected={painWorse.includes("same_posture")} onClick={() => toggleWithNone(setPainWorse, "same_posture", "no_pattern")}>长时间保持同一姿势</OptionButton>
              <OptionButton selected={painWorse.includes("after_exercise")} onClick={() => toggleWithNone(setPainWorse, "after_exercise", "no_pattern")}>运动后</OptionButton>
              <OptionButton selected={painWorse.includes("night")} onClick={() => toggleWithNone(setPainWorse, "night", "no_pattern")}>夜间休息时</OptionButton>
              <OptionButton selected={painWorse.includes("no_pattern")} onClick={() => toggleWithNone(setPainWorse, "no_pattern", "no_pattern")}>无明显规律</OptionButton>
            </div>
          </div>

          <div>
            <Q>14. 什么情况下疼痛会减轻？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={painBetter.includes("rest")} onClick={() => toggleWithNone(setPainBetter, "rest", "none")}>休息</OptionButton>
              <OptionButton selected={painBetter.includes("heat")} onClick={() => toggleWithNone(setPainBetter, "heat", "none")}>热敷</OptionButton>
              <OptionButton selected={painBetter.includes("cold")} onClick={() => toggleWithNone(setPainBetter, "cold", "none")}>冷敷</OptionButton>
              <OptionButton selected={painBetter.includes("warm_up")} onClick={() => toggleWithNone(setPainBetter, "warm_up", "none")}>活动开后</OptionButton>
              <OptionButton selected={painBetter.includes("massage")} onClick={() => toggleWithNone(setPainBetter, "massage", "none")}>按摩</OptionButton>
              <OptionButton selected={painBetter.includes("none")} onClick={() => toggleWithNone(setPainBetter, "none", "none")}>无明显缓解方式</OptionButton>
            </div>
          </div>

          {/* ========== 四、功能影响 ========== */}
          <SectionTitle>四、功能影响</SectionTitle>

          <div>
            <Q>15. 受伤部位对您日常生活的影响程度：</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={dailyImpact === "none"} onClick={() => setDailyImpact("none")}>无影响</OptionButton>
              <OptionButton selected={dailyImpact === "mild"} onClick={() => setDailyImpact("mild")}>轻微影响</OptionButton>
              <OptionButton selected={dailyImpact === "moderate"} onClick={() => setDailyImpact("moderate")}>中度影响</OptionButton>
              <OptionButton selected={dailyImpact === "severe"} onClick={() => setDailyImpact("severe")}>严重影响</OptionButton>
            </div>
          </div>

          <div>
            <Q>16. 受伤后是否影响睡眠？</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={sleepImpact === "none"} onClick={() => setSleepImpact("none")}>不影响</OptionButton>
              <OptionButton selected={sleepImpact === "occasional"} onClick={() => setSleepImpact("occasional")}>偶尔影响</OptionButton>
              <OptionButton selected={sleepImpact === "frequent"} onClick={() => setSleepImpact("frequent")}>经常痛醒</OptionButton>
              <OptionButton selected={sleepImpact === "cannot_sleep"} onClick={() => setSleepImpact("cannot_sleep")}>无法正常入睡</OptionButton>
            </div>
          </div>

          {/* ========== 五、既往史与风险筛查 ========== */}
          <SectionTitle>五、既往史与风险筛查</SectionTitle>

          <div>
            <Q>17. 您以前是否在同一部位受过伤？</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={previousInjury === "none"} onClick={() => setPreviousInjury("none")}>没有</OptionButton>
              <OptionButton selected={previousInjury === "once"} onClick={() => setPreviousInjury("once")}>有，1次</OptionButton>
              <OptionButton selected={previousInjury === "multiple"} onClick={() => setPreviousInjury("multiple")}>有，多次</OptionButton>
            </div>
          </div>

          <div>
            <Q>18. 您是否有以下基础疾病？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={comorbidities.includes("diabetes")} onClick={() => toggleWithNone(setComorbidities, "diabetes", "none")}>糖尿病</OptionButton>
              <OptionButton selected={comorbidities.includes("osteoporosis")} onClick={() => toggleWithNone(setComorbidities, "osteoporosis", "none")}>骨质疏松</OptionButton>
              <OptionButton selected={comorbidities.includes("rheumatoid")} onClick={() => toggleWithNone(setComorbidities, "rheumatoid", "none")}>类风湿关节炎</OptionButton>
              <OptionButton selected={comorbidities.includes("gout")} onClick={() => toggleWithNone(setComorbidities, "gout", "none")}>痛风</OptionButton>
              <OptionButton selected={comorbidities.includes("coagulation")} onClick={() => toggleWithNone(setComorbidities, "coagulation", "none")}>凝血功能异常</OptionButton>
              <OptionButton selected={comorbidities.includes("cardiovascular")} onClick={() => toggleWithNone(setComorbidities, "cardiovascular", "none")}>心血管疾病</OptionButton>
              <OptionButton selected={comorbidities.includes("none")} onClick={() => toggleWithNone(setComorbidities, "none", "none")}>无</OptionButton>
            </div>
          </div>

          <div>
            <Q>19. 您是否长期服用以下药物？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={medications.includes("anticoagulant")} onClick={() => toggleWithNone(setMedications, "anticoagulant", "none")}>抗凝药</OptionButton>
              <OptionButton selected={medications.includes("steroid")} onClick={() => toggleWithNone(setMedications, "steroid", "none")}>激素类药物</OptionButton>
              <OptionButton selected={medications.includes("painkiller")} onClick={() => toggleWithNone(setMedications, "painkiller", "none")}>止痛药</OptionButton>
              <OptionButton selected={medications.includes("none")} onClick={() => toggleWithNone(setMedications, "none", "none")}>无</OptionButton>
            </div>
          </div>

          <div>
            <Q>20. 受伤后是否做过以下检查？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={examinations.includes("none")} onClick={() => toggleWithNone(setExaminations, "none", "none")}>未做过检查</OptionButton>
              <OptionButton selected={examinations.includes("xray")} onClick={() => toggleWithNone(setExaminations, "xray", "none")}>X光</OptionButton>
              <OptionButton selected={examinations.includes("mri")} onClick={() => toggleWithNone(setExaminations, "mri", "none")}>MRI</OptionButton>
              <OptionButton selected={examinations.includes("ct")} onClick={() => toggleWithNone(setExaminations, "ct", "none")}>CT</OptionButton>
              <OptionButton selected={examinations.includes("ultrasound")} onClick={() => toggleWithNone(setExaminations, "ultrasound", "none")}>超声</OptionButton>
              <OptionButton selected={examinations.includes("manual")} onClick={() => toggleWithNone(setExaminations, "manual", "none")}>医生徒手检查</OptionButton>
            </div>
          </div>

          {/* ========== 六、康复目标 ========== */}
          <SectionTitle>六、康复目标</SectionTitle>

          <div>
            <Q>21. 您希望通过康复达到什么目标？<span className="text-gray-400 font-normal">（可多选）</span></Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={rehabGoals.includes("pain_free")} onClick={() => toggle(setRehabGoals, "pain_free")}>消除疼痛</OptionButton>
              <OptionButton selected={rehabGoals.includes("return_sport")} onClick={() => toggle(setRehabGoals, "return_sport")}>恢复正常运动</OptionButton>
              <OptionButton selected={rehabGoals.includes("daily_activity")} onClick={() => toggle(setRehabGoals, "daily_activity")}>恢复日常活动能力</OptionButton>
              <OptionButton selected={rehabGoals.includes("prevent_reinjury")} onClick={() => toggle(setRehabGoals, "prevent_reinjury")}>预防再次受伤</OptionButton>
              <OptionButton selected={rehabGoals.includes("performance")} onClick={() => toggle(setRehabGoals, "performance")}>提升运动表现</OptionButton>
            </div>
          </div>

          <div>
            <Q>22. 您希望多久能恢复？</Q>
            <div className="flex flex-wrap gap-2">
              <OptionButton selected={recoveryExpectation === "asap"} onClick={() => setRecoveryExpectation("asap")}>越快越好</OptionButton>
              <OptionButton selected={recoveryExpectation === "1_2w"} onClick={() => setRecoveryExpectation("1_2w")}>1–2周</OptionButton>
              <OptionButton selected={recoveryExpectation === "1m"} onClick={() => setRecoveryExpectation("1m")}>1个月</OptionButton>
              <OptionButton selected={recoveryExpectation === "1_3m"} onClick={() => setRecoveryExpectation("1_3m")}>1–3个月</OptionButton>
              <OptionButton selected={recoveryExpectation === "no_rush"} onClick={() => setRecoveryExpectation("no_rush")}>不着急</OptionButton>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
              canSubmit
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {canSubmit ? "下一步：描述症状" : "请回答所有单选题后继续"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { QuestionnaireData, TRIAGE_META } from "@/lib/triage";

interface RedAlertPanelProps {
  bodyPartName: string;
  /** 问卷数据（用于提取触发红色警示的具体情况） */
  questionnaire: QuestionnaireData | null;
  onRestart: () => void;
}

/** 从问卷答案提取触发红色警示的具体原因 */
function getRedReasons(q: QuestionnaireData): string[] {
  const reasons: string[] = [];
  const signs = q.postInjurySigns;
  if (signs.includes("deformity")) reasons.push("局部明显变形");
  if (signs.includes("unable_weight")) reasons.push("无法承重或站立");
  if (q.heardPopping === "yes" && signs.includes("swelling"))
    reasons.push("受伤时听到弹响，并伴有明显肿胀");
  if (q.painRest >= 7) reasons.push(`静息疼痛评分达到 ${q.painRest}/10`);
  if (q.dailyImpact === "severe") reasons.push("受伤部位严重影响日常生活");
  return reasons;
}

export default function RedAlertPanel({
  bodyPartName,
  questionnaire,
  onRestart,
}: RedAlertPanelProps) {
  const reasons = questionnaire ? getRedReasons(questionnaire) : [];
  const meta = TRIAGE_META.RED;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden animate-fade-in">
      {/* 头部 */}
      <div className="px-6 py-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
        <span className="text-3xl">{meta.emoji}</span>
        <div>
          <h3 className="text-lg font-bold text-red-700">{meta.label}</h3>
          <p className="text-sm text-red-600 mt-0.5">部位：{bodyPartName}</p>
        </div>
      </div>

      {/* 警示说明 */}
      <div className="px-6 py-5">
        <p className="text-sm text-gray-700 leading-relaxed">{meta.advice}</p>
      </div>

      {/* 触发原因 */}
      {reasons.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            ⚠️ 触发红色警示的情况
          </h4>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-medium mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 就医指引 */}
      <div className="px-6 py-4 border-t border-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">🏥 建议</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          您的症状存在需要尽快线下评估的严重信号，线上康复流程不适用于当前情况。
          请尽快前往医院就诊，并向医生说明受伤经过与上述情况。
        </p>
      </div>

      {/* 免责声明 */}
      <div className="px-6 py-3 bg-amber-50">
        <p className="text-xs text-amber-700">
          ⚠️ 本内容仅供参考，不构成医疗诊断。如有不适，请及时就医。
        </p>
      </div>

      {/* 底部按钮 */}
      <div className="px-6 py-4">
        <button
          onClick={onRestart}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] transition-all"
        >
          重新查询
        </button>
      </div>
    </div>
  );
}

"use client";

import { AnalyzeResult } from "@/types";
import { TRIAGE_META, TriageLevel } from "@/lib/triage";
import { useState } from "react";

interface ResultPanelProps {
  result: AnalyzeResult;
  bodyPartName: string;
  onNewQuery: () => void;
  /** 分诊等级（来自症状前问卷，可选） */
  triageLevel?: TriageLevel | null;
}

/** 徽章文案：就医紧迫度（不代表病情轻重） */
const severityConfig = {
  low: {
    label: "就医紧迫度：较低",
    color: "bg-green-100 text-green-800",
    dot: "bg-green-500",
  },
  medium: {
    label: "一般护理参考",
    color: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  high: {
    label: "建议尽快就医",
    color: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
};

export default function ResultPanel({
  result,
  bodyPartName,
  onNewQuery,
  triageLevel,
}: ResultPanelProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const sev = severityConfig[result.severity];
  const isHigh = result.severity === "high";

  const handleSave = () => {
    try {
      const history = JSON.parse(
        localStorage.getItem("symptom_history") || "[]"
      );
      history.unshift({
        bodyPart: bodyPartName,
        result,
        timestamp: Date.now(),
      });
      // 只保留最近 50 条
      localStorage.setItem(
        "symptom_history",
        JSON.stringify(history.slice(0, 50))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // localStorage 不可用
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(result.symptomSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用（非安全上下文等）
    }
  };

  /** 圆点列表（不用编号，避免视觉排名感） */
  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
          {item}
        </li>
      ))}
    </ul>
  );

  // 各卡片定义（high 时就医指征置顶）
  const symptomSummaryCard = result.symptomSummary ? (
    <div key="summary" className="px-6 py-4 border-b border-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">📝 症状整理</h4>
        <button
          onClick={handleCopySummary}
          className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {copied ? "✓ 已复制" : "复制"}
        </button>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">
        {result.symptomSummary}
      </p>
      <p className="text-xs text-gray-400 mt-2">就诊时可直接向医生出示此概述</p>
    </div>
  ) : null;

  const whenToSeeDoctorCard =
    result.whenToSeeDoctor.length > 0 ? (
      <div
        key="when"
        className={`px-6 py-4 border-b ${
          isHigh ? "border-red-100 bg-red-50/50" : "border-gray-50"
        }`}
      >
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          {isHigh ? "🏥 建议尽快就医" : "🏥 出现以下情况时建议就医"}
        </h4>
        <BulletList items={result.whenToSeeDoctor} />
        {result.department && (
          <p className="text-sm text-gray-600 mt-3">
            {isHigh ? "可咨询科室：" : "如需就诊，可咨询："}
            <span className="font-medium">{result.department}</span>
          </p>
        )}
      </div>
    ) : null;

  const possibleCausesCard =
    result.possibleCauses.length > 0 ? (
      <div key="causes" className="px-6 py-4 border-b border-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          📋 常见相关因素
        </h4>
        <BulletList items={result.possibleCauses} />
        <p className="text-xs text-gray-400 mt-3">
          以上为该类不适的一般性科普，不代表个人具体情况
        </p>
      </div>
    ) : null;

  const suggestionsCard = result.suggestions ? (
    <div key="suggestions" className="px-6 py-4 border-b border-gray-50">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        💡 日常护理参考
      </h4>
      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
        {result.suggestions}
      </div>
    </div>
  ) : null;

  const questionsCard =
    result.questionsForDoctor.length > 0 ? (
      <div key="questions" className="px-6 py-4 border-b border-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          {isHigh ? "❓ 就诊时可以问医生" : "❓ 如果就诊，可以问医生"}
        </h4>
        <BulletList items={result.questionsForDoctor} />
      </div>
    ) : null;

  // high：就医指征置顶；其余：症状整理在前
  const cards = isHigh
    ? [whenToSeeDoctorCard, symptomSummaryCard, suggestionsCard, questionsCard]
    : [
        symptomSummaryCard,
        possibleCausesCard,
        suggestionsCard,
        whenToSeeDoctorCard,
        questionsCard,
      ];

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">分析结果</h3>
          <p className="text-sm text-gray-500 mt-0.5">部位：{bodyPartName}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sev.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      {/* 分诊等级横幅（来自症状前问卷） */}
      {triageLevel && (
        <div
          className={`px-6 py-3 border-b text-sm ${TRIAGE_META[triageLevel].bannerClass}`}
        >
          <span className="font-semibold">
            {TRIAGE_META[triageLevel].emoji} 分诊：
            {TRIAGE_META[triageLevel].label}
          </span>
          <span className="ml-2">{TRIAGE_META[triageLevel].advice}</span>
        </div>
      )}

      {cards}

      {/* 免责声明 */}
      <div className="px-6 py-3 bg-amber-50">
        <p className="text-xs text-amber-700">⚠️ {result.disclaimer}</p>
      </div>

      {/* 底部按钮 */}
      <div className="px-6 py-4 flex gap-3">
        <button
          onClick={handleSave}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            saved
              ? "bg-green-100 text-green-700"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {saved ? "✓ 已保存" : "保存结果"}
        </button>
        <button
          onClick={onNewQuery}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          重新查询
        </button>
      </div>
    </div>
  );
}

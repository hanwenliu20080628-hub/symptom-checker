"use client";

import { AnalyzeResult } from "@/types";
import { useState } from "react";

interface ResultPanelProps {
  result: AnalyzeResult;
  bodyPartName: string;
  onNewQuery: () => void;
}

const severityConfig = {
  low: { label: "较轻", color: "bg-green-100 text-green-800", dot: "bg-green-500" },
  medium: {
    label: "中等",
    color: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  high: {
    label: "较重",
    color: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
};

export default function ResultPanel({
  result,
  bodyPartName,
  onNewQuery,
}: ResultPanelProps) {
  const [saved, setSaved] = useState(false);

  const sev = severityConfig[result.severity];

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

      {/* 可能原因 */}
      <div className="px-6 py-4 border-b border-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          📋 可能原因
        </h4>
        <ol className="space-y-2">
          {result.possibleCauses.map((cause, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-gray-600"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium mt-0.5">
                {i + 1}
              </span>
              {cause}
            </li>
          ))}
        </ol>
      </div>

      {/* 康复建议 */}
      <div className="px-6 py-4 border-b border-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          💊 康复与护理建议
        </h4>
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {result.suggestions}
        </div>
      </div>

      {/* 就医建议 */}
      {result.shouldSeeDoctor && (
        <div className="px-6 py-4 border-b border-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            🏥 就医建议
          </h4>
          <p className="text-sm text-gray-600">
            建议前往{result.department || "相关科室"}就诊。请携带症状描述以便医生参考。
          </p>
        </div>
      )}

      {/* 免责声明 */}
      <div className="px-6 py-3 bg-amber-50">
        <p className="text-xs text-amber-700">
          ⚠️ {result.disclaimer}
        </p>
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
          {saved ? "✓ 已保存" : "保存康复建议"}
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

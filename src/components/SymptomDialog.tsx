"use client";

import { useState, useEffect } from "react";

interface SymptomDialogProps {
  bodyPartName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (symptoms: string) => void;
  isAnalyzing: boolean;
}

export default function SymptomDialog({
  bodyPartName,
  isOpen,
  onClose,
  onSubmit,
  isAnalyzing,
}: SymptomDialogProps) {
  const [symptoms, setSymptoms] = useState("");

  // 每次弹窗打开时清空输入
  useEffect(() => {
    if (isOpen) {
      setSymptoms("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = symptoms.trim().length >= 5 && !isAnalyzing;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(symptoms.trim());
    setSymptoms("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              描述您的症状
            </h3>
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

        {/* 输入区 */}
        <div className="px-6 py-4">
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请描述您的不适感受，例如：上下楼梯时疼痛，有轻微肿胀感，持续约3天..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm leading-relaxed"
            autoFocus
            disabled={isAnalyzing}
          />
          <p className="text-xs text-gray-400 mt-2">
            {symptoms.trim().length < 5
              ? `至少需要输入 5 个字（当前 ${symptoms.trim().length} 字）`
              : `已输入 ${symptoms.trim().length} 字`}
          </p>
        </div>

        {/* 按钮 */}
        <div className="px-6 pb-5 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
              canSubmit
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                分析中...
              </span>
            ) : (
              "提交分析"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

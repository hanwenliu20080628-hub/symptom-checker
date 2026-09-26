"use client";

import { useState } from "react";

type Rating = "good" | "ok" | "bad";

interface FeedbackSurveyProps {
  bodyPartName: string;
}

const RATING_OPTIONS = [
  {
    value: "good" as Rating,
    label: "好用",
    emoji: "😊",
    active: "border-green-400 bg-green-50 text-green-700",
  },
  {
    value: "ok" as Rating,
    label: "一般",
    emoji: "😐",
    active: "border-amber-400 bg-amber-50 text-amber-700",
  },
  {
    value: "bad" as Rating,
    label: "不好用",
    emoji: "😞",
    active: "border-red-400 bg-red-50 text-red-700",
  },
];

export default function FeedbackSurvey({ bodyPartName }: FeedbackSurveyProps) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!rating) return;
    try {
      const history = JSON.parse(
        localStorage.getItem("feedback_history") || "[]"
      );
      history.unshift({
        rating,
        comment: comment.trim(),
        bodyPart: bodyPartName,
        timestamp: Date.now(),
      });
      // 只保留最近 100 条
      localStorage.setItem(
        "feedback_history",
        JSON.stringify(history.slice(0, 100))
      );
    } catch {
      // localStorage 不可用
    }
    setSubmitted(true);
  };

  // 提交成功态
  if (submitted) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-4 bg-green-50 border border-green-200 rounded-2xl px-6 py-5 flex items-center gap-3 animate-fade-in">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-700">感谢您的反馈！</p>
          <p className="text-xs text-green-600 mt-0.5">
            您的意见将帮助我们不断改进这个工具。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">
          💬 使用体验反馈
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          本次体验如何？您的反馈将帮助我们改进
        </p>
      </div>

      <div className="px-6 py-4">
        {/* 三选一评分 */}
        <div className="grid grid-cols-3 gap-3">
          {RATING_OPTIONS.map((opt) => {
            const isActive = rating === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setRating(opt.value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? opt.active + " shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`text-2xl transition-transform ${
                    isActive ? "scale-110" : ""
                  }`}
                >
                  {opt.emoji}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* 可选详细反馈 */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            详细反馈
            <span className="text-xs font-normal text-gray-400">（可选）</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="如果您愿意，可以告诉我们更多使用感受或改进建议..."
            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm leading-relaxed"
          />
        </div>

        {/* 提交 */}
        <button
          onClick={handleSubmit}
          disabled={!rating}
          className={`mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            rating
              ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          提交反馈
        </button>
      </div>
    </div>
  );
}

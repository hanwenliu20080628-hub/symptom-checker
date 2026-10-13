"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ACCESS_CODE, hasAccess, grantAccess } from "@/lib/access";

/**
 * 访问码门禁（受邀制）。
 * - 未通过验证：全屏显示访问码输入页，不渲染任何子内容
 * - 通过验证：渲染 children（含 ConsentGate、Tracker、主界面等）
 * - 放在 ConsentGate 外层，保证顺序：访问码 → 免责声明弹窗 → 主界面
 */
type Status = "checking" | "pending" | "granted";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setStatus(hasAccess() ? "granted" : "pending");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      grantAccess();
      setStatus("granted");
    } else {
      setError(true);
    }
  };

  // 初始检查 / 已通过：渲染子内容
  if (status === "checking" || status === "granted") {
    return <>{children}</>;
  }

  // pending：访问码输入页（全屏阻断）
  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 px-8 py-10 shadow-lg">
        <div className="text-center">
          <div className="text-4xl">🔐</div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">访问码验证</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            本网站仅供受邀参与者使用，请输入访问码进入。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="请输入访问码"
            autoFocus
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center tracking-[0.3em]"
          />
          {error && (
            <p className="text-sm text-red-600 text-center">访问码不正确，请重试</p>
          )}
          <button
            type="submit"
            disabled={!code.trim()}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
              code.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            进入
          </button>
        </form>
      </div>
    </div>
  );
}

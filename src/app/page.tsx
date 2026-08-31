"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import DisclaimerBar from "@/components/DisclaimerBar";
import SymptomDialog from "@/components/SymptomDialog";
import ResultPanel from "@/components/ResultPanel";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkerEditor from "@/components/MarkerEditor";
import { AnalyzeResult, BodyPart } from "@/types";
import { findBodyPartByMesh } from "@/lib/body-parts";

// 动态导入 Three.js 组件，避免 SSR 问题
const BodyModel = dynamic(() => import("@/components/BodyModel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gradient-to-b from-blue-50 to-white rounded-xl border border-gray-200 flex items-center justify-center">
      <div className="text-gray-400">加载 3D 模型中...</div>
    </div>
  ),
});

type Phase = "idle" | "selecting" | "analyzing" | "result" | "error";

export default function Home() {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"rotate" | "pan">("rotate");
  const [resetSignal, setResetSignal] = useState(0);

  const handlePartClick = useCallback((meshName: string, customName?: string) => {
    const part = findBodyPartByMesh(meshName);
    if (part) {
      // 红点改名后，点击应显示改名后的名称（customName 优先）
      setSelectedPart(customName ? { ...part, name: customName } : part);
    } else if (customName) {
      // 自定义标记点：直接使用自定义名称
      setSelectedPart({
        id: meshName,
        name: customName,
        meshNames: [],
        category: "other",
      });
    } else {
      return;
    }
    setPhase("selecting");
    setResult(null);
    setError(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    if (phase === "selecting") {
      setPhase("idle");
      setSelectedPart(null);
    }
  }, [phase]);

  const handleSubmit = useCallback(
    async (symptoms: string) => {
      if (!selectedPart) return;

      setPhase("analyzing");
      setError(null);

      try {
        // 调用后端分析接口（NEXT_PUBLIC_API_URL 指向 Railway 后端；未配置则用相对路径，适用于本地 Next.js API 路由）
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiBase}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bodyPart: selectedPart.name, symptoms }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `分析失败（${response.status}）`);
        }

        const data = await response.json();
        setResult(data);
        setPhase("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
        setPhase("error");
      }
    },
    [selectedPart]
  );

  const handleNewQuery = useCallback(() => {
    setPhase("idle");
    setSelectedPart(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <>
      <DisclaimerBar />

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-5xl mx-auto w-full">
        {/* 标题区 */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            人体症状自诊助手
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            点击 3D 人体模型上的部位，描述症状，获取 AI 初步分析参考
          </p>
        </div>

        {/* 3D 模型区（右上角悬浮：调整标记点 / 旋转·平移模式 / 回到初始位置） */}
        <div className="w-full flex-1 flex items-start justify-center relative">
          <BodyModel onPartClick={handlePartClick} interactionMode={interactionMode} resetSignal={resetSignal} />
          <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-2">
            <button
              onClick={() => setEditorOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                调整标记点
              </span>
            </button>
            <button
              onClick={() => setInteractionMode((m) => (m === "rotate" ? "pan" : "rotate"))}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm inline-flex items-center gap-1.5 ${
                interactionMode === "pan"
                  ? "text-blue-700 bg-blue-50 border-blue-300"
                  : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
              title={
                interactionMode === "rotate"
                  ? "当前：可旋转 + 平移 + 缩放。点击切换为「仅平移 + 缩放」"
                  : "当前：仅平移 + 缩放（不可旋转）。点击切换为「旋转 + 平移 + 缩放」"
              }
            >
              {interactionMode === "rotate" ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
                  <polyline points="21 4 21 8 17 8" />
                  <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
                  <polyline points="3 20 3 16 7 16" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <polyline points="9 5 12 2 15 5" />
                  <polyline points="9 19 12 22 15 19" />
                  <polyline points="5 9 2 12 5 15" />
                  <polyline points="19 9 22 12 19 15" />
                </svg>
              )}
              {interactionMode === "rotate" ? "旋转模式" : "平移模式"}
            </button>
            <button
              onClick={() => setResetSignal((s) => s + 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm inline-flex items-center gap-1.5"
              title="回到初始视角"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              回到初始位置
            </button>
          </div>
        </div>

        {/* 状态提示 */}
        {phase === "idle" && !selectedPart && (
          <p className="mt-2 text-sm text-gray-400 text-center">
            💡 点击人体模型上的任意部位开始
          </p>
        )}

        {phase === "selecting" && selectedPart && (
          <p className="mt-2 text-sm text-blue-600 text-center font-medium">
            已选中：{selectedPart.name}
          </p>
        )}

        {/* 加载中 */}
        {phase === "analyzing" && <LoadingSpinner />}

        {/* 错误 */}
        {phase === "error" && (
          <div className="w-full max-w-md mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-700 text-sm mb-3">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleNewQuery}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {/* 结果 */}
        {phase === "result" && result && selectedPart && (
          <ResultPanel
            result={result}
            bodyPartName={selectedPart.name}
            onNewQuery={handleNewQuery}
          />
        )}
      </main>

      {/* 底部 */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        本工具仅供信息参考，不构成医疗诊断。如有不适，请及时就医。
      </footer>

      {/* 症状输入弹窗 */}
      <SymptomDialog
        key={selectedPart?.id ?? "empty"}
        bodyPartName={selectedPart?.name || ""}
        isOpen={phase === "selecting"}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        isAnalyzing={false}
      />

      {/* 标记点编辑面板 */}
      <MarkerEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} />
    </>
  );
}

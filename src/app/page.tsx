"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import DisclaimerBar from "@/components/DisclaimerBar";
import SymptomDialog from "@/components/SymptomDialog";
import ResultPanel from "@/components/ResultPanel";
import RedAlertPanel from "@/components/RedAlertPanel";
import FeedbackSurvey from "@/components/FeedbackSurvey";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkerEditor from "@/components/MarkerEditor";
import TriageQuestionnaire from "@/components/TriageQuestionnaire";
import Tracker from "@/components/Tracker";
import { AnalyzeResult, BodyPart } from "@/types";
import { findBodyPartByMesh } from "@/lib/body-parts";
import {
  triage,
  toTriageData,
  buildQuestionnaireSummary,
  QuestionnaireData,
  TriageLevel,
} from "@/lib/triage";

// 动态导入 Three.js 组件，避免 SSR 问题
const BodyModel = dynamic(() => import("@/components/BodyModel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gradient-to-b from-blue-50 to-white rounded-xl border border-gray-200 flex items-center justify-center">
      <div className="text-gray-400">加载 3D 模型中...</div>
    </div>
  ),
});

type Phase =
  | "idle"
  | "triage"
  | "selecting"
  | "analyzing"
  | "result"
  | "blocked"
  | "error";

export default function Home() {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"rotate" | "pan">("rotate");
  const [resetSignal, setResetSignal] = useState(0);
  // 多选模式：multiSelect 开关 + 已选部位列表（id 用于蓝点渲染，name 用于提交）
  const [multiSelect, setMultiSelect] = useState(false);
  const [multiParts, setMultiParts] = useState<{ id: string; name: string }[]>([]);
  // 分诊问卷：23 题问卷数据 + 分诊等级（问卷完成后进入症状描述）
  const [triageData, setTriageData] = useState<QuestionnaireData | null>(null);
  const [triageLevel, setTriageLevel] = useState<TriageLevel | null>(null);

  const handlePartClick = useCallback((meshName: string, customName?: string) => {
    // 多选模式：切换该部位的选中状态（再点一次取消），不打开症状对话框
    if (multiSelect) {
      setMultiParts((prev) => {
        const exists = prev.some((p) => p.id === meshName);
        if (exists) return prev.filter((p) => p.id !== meshName);
        const part = findBodyPartByMesh(meshName);
        const name = customName ?? part?.name ?? meshName;
        return [...prev, { id: meshName, name }];
      });
      return;
    }
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
    // 选中部位后先进入分诊问卷，问卷完成后再描述症状
    setPhase("triage");
    setResult(null);
    setError(null);
  }, [multiSelect]);

  const handleCloseDialog = useCallback(() => {
    if (phase === "selecting") {
      setPhase("idle");
      setSelectedPart(null);
      setTriageData(null);
      setTriageLevel(null);
    }
  }, [phase]);

  // 问卷完成：映射为分诊规则输入并计算等级
  const handleTriageComplete = useCallback((data: QuestionnaireData) => {
    const level = triage(toTriageData(data));
    setTriageData(data);
    setTriageLevel(level);
    // 上报分诊问卷选项（仅预设选项，不含自由文本）
    try {
      const vid = localStorage.getItem("vid") || "";
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: vid,
          rating: null,
          bodyPart: null,
          answers: data,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* 忽略上报失败 */
    }
    // 红色警示：存在需尽快线下评估的严重信号，终止康复流程，不进入症状描述
    if (level === "RED") {
      setPhase("blocked");
    } else {
      setPhase("selecting");
    }
  }, []);

  // 问卷跳过：不做分诊，直接进入症状描述（triageData/triageLevel 保持 null，摘要不拼接）
  const handleTriageSkip = useCallback(() => {
    setTriageData(null);
    setTriageLevel(null);
    setPhase("selecting");
  }, []);

  // 问卷关闭：回到初始状态
  const handleTriageClose = useCallback(() => {
    setPhase("idle");
    setSelectedPart(null);
    setTriageData(null);
    setTriageLevel(null);
  }, []);

  const handleSubmit = useCallback(
    async (symptoms: string) => {
      if (!selectedPart) return;

      setPhase("analyzing");
      setError(null);

      try {
        // 调用后端分析接口：生产构建默认指向 Netlify Functions（任何平台重新构建都不丢失），
        // 本地 dev 用相对路径走 Next.js API 路由；NEXT_PUBLIC_API_URL 可覆盖二者
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ??
          (process.env.NODE_ENV === "development"
            ? ""
            : "https://symptom-checker-app.netlify.app");
        // 分诊问卷摘要拼在症状描述前，作为 AI 分析上下文（不改变 API 契约）
        const fullSymptoms =
          triageData && triageLevel
            ? `【分诊问卷】\n${buildQuestionnaireSummary(triageData, triageLevel)}\n【症状描述】${symptoms}`
            : symptoms;
        const response = await fetch(`${apiBase}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bodyPart: selectedPart.name, symptoms: fullSymptoms }),
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
    [selectedPart, triageData, triageLevel]
  );

  const handleNewQuery = useCallback(() => {
    setPhase("idle");
    setSelectedPart(null);
    setResult(null);
    setError(null);
    setTriageData(null);
    setTriageLevel(null);
  }, []);

  // 多选按钮：进入多选模式 / 点击「完成」提交所选部位
  const handleMultiSelectToggle = useCallback(() => {
    if (!multiSelect) {
      // 进入多选模式：清空选择，并收起可能打开的单选对话框/问卷/警示卡片
      setMultiSelect(true);
      setMultiParts([]);
      if (phase === "selecting" || phase === "triage" || phase === "blocked") {
        setPhase("idle");
        setSelectedPart(null);
        setTriageData(null);
        setTriageLevel(null);
      }
      return;
    }
    // 点击「完成」：把已选部位合并为一个查询对象，跳转到分诊问卷（之后才是症状描述）
    if (multiParts.length > 0) {
      setSelectedPart({
        id: multiParts.map((p) => p.id).join(","),
        name: multiParts.map((p) => p.name).join("、"),
        meshNames: [],
        category: "other",
      });
      setResult(null);
      setError(null);
      setPhase("triage");
    }
    // 退出多选模式并清空蓝点（按钮文字随 multiSelect 变回「多选」）
    setMultiSelect(false);
    setMultiParts([]);
  }, [multiSelect, multiParts, phase]);

  return (
    <>
      <Tracker />
      <DisclaimerBar />

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-5xl mx-auto w-full">
        {/* 标题区 */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            PinPoint: A 3D Body Map for Sports Injury Learning
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            点击 3D 人体模型上的部位，描述症状，获取 AI 初步分析参考
          </p>
        </div>

        {/* 3D 模型区（右上角悬浮：调整标记点 / 旋转·平移模式 / 回到初始位置） */}
        <div className="w-full flex-1 flex items-start justify-center relative">
          <BodyModel onPartClick={handlePartClick} interactionMode={interactionMode} resetSignal={resetSignal} selectedIds={multiParts.map((p) => p.id)} />
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
            <button
              onClick={handleMultiSelectToggle}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm inline-flex items-center gap-1.5 ${
                multiSelect
                  ? "text-blue-700 bg-blue-50 border-blue-300"
                  : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
              title={
                multiSelect
                  ? "点击完成，进入症状描述"
                  : "进入多选模式，可连续点选多个部位"
              }
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {multiSelect ? `完成${multiParts.length > 0 ? `(${multiParts.length})` : ""}` : "多选"}
            </button>
          </div>
        </div>

        {/* 状态提示 */}
        {multiSelect ? (
          <p className="mt-2 text-sm text-blue-600 text-center font-medium">
            多选模式：点击模型上的部位点进行选择，已选 {multiParts.length} 个，选完点右上角「完成」
          </p>
        ) : (
          phase === "idle" && !selectedPart && (
            <p className="mt-2 text-sm text-gray-400 text-center">
              💡 点击人体模型上的任意部位开始
            </p>
          )
        )}

        {(phase === "selecting" || phase === "triage") && selectedPart && (
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
          <>
            <ResultPanel
              result={result}
              bodyPartName={selectedPart.name}
              onNewQuery={handleNewQuery}
              triageLevel={triageLevel}
            />
            {/* 使用完网站后：用户反馈调查 */}
            <FeedbackSurvey bodyPartName={selectedPart.name} />
          </>
        )}

        {/* 红色警示（分诊为红色：终止康复流程，不进入症状描述） */}
        {phase === "blocked" && selectedPart && (
          <RedAlertPanel
            bodyPartName={selectedPart.name}
            questionnaire={triageData}
            onRestart={handleNewQuery}
          />
        )}
      </main>

      {/* 底部 */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 space-y-1">
        <div>本工具仅供信息参考，不构成医疗诊断。如有不适，请及时就医。</div>
        <div>
          <a
            href="/disclaimer"
            className="underline hover:text-gray-600 dark:hover:text-gray-300"
          >
            查看完整免责声明
          </a>
        </div>
      </footer>

      {/* 分诊问卷弹窗（选部位后、描述症状前） */}
      <TriageQuestionnaire
        key={`triage-${selectedPart?.id ?? "empty"}`}
        bodyPartName={selectedPart?.name || ""}
        isOpen={phase === "triage"}
        onClose={handleTriageClose}
        onComplete={handleTriageComplete}
        onSkip={handleTriageSkip}
      />

      {/* 症状输入弹窗 */}
      <SymptomDialog
        key={selectedPart?.id ?? "empty"}
        bodyPartName={selectedPart?.name || ""}
        isOpen={phase === "selecting"}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        isAnalyzing={false}
        triageLevel={triageLevel}
      />

      {/* 标记点编辑面板 */}
      <MarkerEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} />
    </>
  );
}

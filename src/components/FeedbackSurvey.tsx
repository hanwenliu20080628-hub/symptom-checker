"use client";

import { useCallback, useRef, useState } from "react";
import { trackSurvey } from "@/lib/analytics";
import { hasConsented } from "@/lib/consent";
import { FEEDBACK_VERSION, HELP_OPTIONS, type AIOutcome, type ExpressionFeedback, type HelpRating } from "@/lib/feedback";
import FeedbackDialog from "@/components/FeedbackDialog";
import FeedbackShortcut from "@/components/FeedbackShortcut";

interface FeedbackSurveyProps {
  bodyPartName: string;
  assessmentId: string;
  questionnaireUsed: boolean;
  outcome: AIOutcome | null;
}
interface FeedbackFormProps {
  surface: "inline" | "dialog";
  outcome: AIOutcome;
  questionnaireUsed: boolean;
  modelHelp: HelpRating | null;
  questionnaireHelp: HelpRating | null;
  comment: string;
  onModelHelp: (value: HelpRating) => void;
  onQuestionnaireHelp: (value: HelpRating) => void;
  onComment: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function FeedbackForm(props: FeedbackFormProps) {
  const { surface, outcome, questionnaireUsed, modelHelp, questionnaireHelp, comment } = props;
  const question = (kind: "model" | "questionnaire", text: string, value: HelpRating | null, onChange: (value: HelpRating) => void) => (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-relaxed text-gray-800">{text}</legend>
      <div className="grid grid-cols-3 gap-2">
        {HELP_OPTIONS.map((option) => (
          <label key={option.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 px-1 py-2 text-center text-xs sm:text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${value === option.value ? "border-blue-500 bg-blue-50 font-medium text-blue-800" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
            <input type="radio" name={`${surface}-${kind}`} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <form onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }}>
      <div className={`border-b border-gray-100 px-5 py-4 ${surface === "dialog" ? "pr-14" : ""}`}>
        <h2 id={`feedback-${surface}-title`} className="text-base font-semibold text-gray-900">表达帮助评价</h2>
        <p id={`feedback-${surface}-description`} className="mt-1 text-xs leading-relaxed text-gray-500">
          {outcome === "failure"
            ? "本次 AI 分析未能完成，你仍可以评价之前使用的 3D 人体模型和问卷，对你表达问题的帮助。"
            : "请评价刚才使用的 3D 人体模型和问卷，对你表达问题有多大帮助。"}
        </p>
      </div>
      <div className="space-y-5 px-5 py-4">
        {question("model", "1. 3D 人体模型对你清楚地表达不适的位置与范围有多大帮助？", modelHelp, props.onModelHelp)}
        {questionnaireUsed ? question("questionnaire", "2. 问卷对你全面地描述症状和相关情况有多大帮助？", questionnaireHelp, props.onQuestionnaireHelp) : (
          <div className="space-y-2">
            <p className="text-sm font-medium leading-relaxed text-gray-800">2. 问卷对你全面地描述症状和相关情况有多大帮助？</p>
            <p className="rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-500">本次未填写问卷，无需评价此项。</p>
          </div>
        )}
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer py-1">补充意见（可选）</summary>
          <label htmlFor={`feedback-${surface}-comment`} className="sr-only">补充意见（仅保存在当前浏览器）</label>
          <textarea id={`feedback-${surface}-comment`} value={comment} onChange={(event) => props.onComment(event.target.value)} rows={2} placeholder="可以告诉我们更多使用感受或改进建议" className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-2 focus:outline-blue-500" />
          <p className="mt-1 text-xs text-gray-400">文字评论仅保存在当前浏览器。</p>
        </details>
        <div className="flex gap-3">
          {surface === "dialog" && <button type="button" onClick={props.onClose} className="min-h-11 flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">暂不评价</button>}
          <button type="submit" disabled={!modelHelp || (questionnaireUsed && !questionnaireHelp)} className="min-h-11 flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400">提交评价</button>
        </div>
      </div>
    </form>
  );
}

export default function FeedbackSurvey({ bodyPartName, assessmentId, questionnaireUsed, outcome }: FeedbackSurveyProps) {
  const [modelHelp, setModelHelp] = useState<HelpRating | null>(null);
  const [questionnaireHelp, setQuestionnaireHelp] = useState<HelpRating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // 按评估编号挂载；关闭后保持 false，分析状态变化不再自动弹出。
  const [dialogOpen, setDialogOpen] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const submissionLock = useRef(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const handleSubmit = () => {
    if (!modelHelp || (questionnaireUsed && !questionnaireHelp) || !outcome || submissionLock.current || !hasConsented()) return;
    submissionLock.current = true;
    const answers: ExpressionFeedback = {
      feedbackType: "expression_help", feedbackVersion: FEEDBACK_VERSION, assessmentId,
      modelHelp, questionnaireUsed, questionnaireHelp: questionnaireUsed ? questionnaireHelp : null, aiOutcome: outcome,
    };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("feedback_history") || "[]");
      const history = Array.isArray(saved) ? saved : [];
      history.unshift({ ...answers, comment: comment.trim(), bodyPart: bodyPartName, timestamp: Date.now() });
      localStorage.setItem("feedback_history", JSON.stringify(history.slice(0, 100)));
    } catch {
      // 本地存储不可用不阻塞本次评价。
    }
    try {
      trackSurvey({ rating: null, bodyPart: bodyPartName, answers });
    } catch {
      console.warn("自建评价上报失败，不影响界面操作。");
    }
    setSubmitted(true);
    setDialogOpen(false);
  };
  if (!outcome) return null;
  const formProps = { outcome, questionnaireUsed, modelHelp, questionnaireHelp, comment, onModelHelp: setModelHelp, onQuestionnaireHelp: setQuestionnaireHelp, onComment: setComment, onSubmit: handleSubmit, onClose: closeDialog };
  return (
    <>
      <div ref={sectionRef} id="feedback-section" role="region" aria-label="表达帮助评价" tabIndex={-1} className="mt-4 w-full max-w-2xl scroll-mt-6 rounded-2xl border border-gray-200 bg-white shadow-lg focus:outline-none">
        {submitted ? (
          <div role="status" className="rounded-2xl bg-green-50 px-6 py-5">
            <p className="text-sm font-semibold text-green-700">感谢你的评价！</p>
            <p className="mt-1 text-xs text-green-600">你的意见将帮助我们改进表达体验。</p>
          </div>
        ) : <FeedbackForm {...formProps} surface="inline" />}
      </div>
      {!submitted && dialogOpen && <FeedbackDialog onClose={closeDialog} returnFocusRef={sectionRef}><FeedbackForm {...formProps} surface="dialog" /></FeedbackDialog>}
      {!submitted && !dialogOpen && <FeedbackShortcut targetRef={sectionRef} />}
    </>
  );
}

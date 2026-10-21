"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sbCount, sbSelect } from "@/lib/analytics";
import { feedbackCsv, helpDistribution, isExpressionFeedback, type AIOutcome, type HelpRating, type SurveyRow } from "@/lib/feedback";

const ROW_LIMIT = 2000;
function DistributionCard({ title, values }: { title: string; values: (HelpRating | null)[] }) {
  const data = helpDistribution(values);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">有效回答 {data.total} 条 · 有帮助比例 {data.helpfulRate == null ? "—" : `${data.helpfulRate}%`}</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-gray-500"><tr><th className="py-2">帮助程度</th><th>数量</th><th>占比</th></tr></thead>
        <tbody>{data.entries.map((entry) => <tr key={entry.value} className="border-t border-gray-100"><td className="py-2">{entry.label}</td><td>{entry.count}</td><td>{data.total ? `${Math.round(entry.count / data.total * 100)}%` : "—"}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

export default function StatsPage() {
  const [pv, setPv] = useState<number | null>(null);
  const [uv, setUv] = useState<number | null>(null);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [outcome, setOutcome] = useState<"all" | AIOutcome>("all");
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      sbCount("page_views", "id"), sbCount("visitors", "visitor_id"),
      sbSelect<SurveyRow>("survey_responses", "rating,body_part,ts,answers", ROW_LIMIT),
    ]).then(([p, u, r]) => {
      if (cancelled) return;
      setPv(p); setUv(u); setRows(r); setLoaded(true);
    }).catch((error) => { if (!cancelled) setErr(String(error)); });
    return () => { cancelled = true; };
  }, []);
  const expressionRows = rows.filter((row) => isExpressionFeedback(row.answers));
  const filteredRows = expressionRows.filter((row) => isExpressionFeedback(row.answers) && (outcome === "all" || row.answers.aiOutcome === outcome));
  const answers = filteredRows.flatMap((row) => isExpressionFeedback(row.answers) ? [row.answers] : []);
  const legacyRows = rows.filter((row) => ["good", "ok", "bad"].includes(row.rating ?? ""));
  const legacyGood = legacyRows.filter((row) => row.rating === "good").length;
  const exportCsv = (kind: "expression" | "legacy") => {
    const content = feedbackCsv(kind === "expression" ? filteredRows : legacyRows, kind);
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
    link.href = url; link.download = `${kind}_${date}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 返回网站</Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">站长统计</h1>
        <p className="mt-1 text-xs text-gray-400">仅站长查看 · 请勿公开此地址</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{ label: "总浏览量 PV", value: pv }, { label: "独立访客 UV", value: uv }, { label: "本次读取的新评价", value: loaded ? expressionRows.length : null }, { label: "本次读取的旧评分", value: loaded ? legacyRows.length : null }].map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white py-5 text-center"><div className="text-3xl font-bold text-blue-600">{card.value ?? "—"}</div><div className="mt-1 text-xs text-gray-500">{card.label}</div></div>
          ))}
        </div>
        {err ? <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">读取失败：{err}。当前未展示统计结果，请检查连接后刷新。</p> : !loaded ? <p className="mt-6 text-sm text-gray-500">正在读取统计数据…</p> : <>
          <p className="mt-5 text-xs leading-relaxed text-gray-500">评价读取范围：按时间倒序最多请求 {ROW_LIMIT} 条分诊问卷与评价记录，本次实际返回 {rows.length} 条（数据库可能限制单次返回量）。以下评价数量、比例和导出均基于本次返回记录，不代表全部历史总量。PV、UV 为独立的全表计数。</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm text-gray-700">新版评价筛选：<select value={outcome} onChange={(event) => setOutcome(event.target.value as "all" | AIOutcome)} className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-2"><option value="all">全部 AI 结局</option><option value="success">AI 分析成功</option><option value="failure">AI 分析失败</option></select></label>
            <button onClick={() => exportCsv("expression")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">导出新版评价 CSV</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">当前筛选 {answers.length} 条评价。关闭弹窗或暂不评价不计为负面评分。</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DistributionCard title="3D 模型表达帮助" values={answers.map((answer) => answer.modelHelp)} />
            <DistributionCard title="问卷表达帮助" values={answers.filter((answer) => answer.questionnaireUsed).map((answer) => answer.questionnaireHelp)} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">有帮助比例＝（很有帮助＋有一些帮助）／该题有效回答数。问卷未填写时不进入第二题分母。这些数据是用户自报的表达帮助程度，不代表诊断准确率或已经证明的客观表达改善。</p>
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">最近新版评价</h2>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-gray-500"><tr><th className="py-2">模型帮助</th><th>问卷帮助</th><th>AI 结局</th><th>部位</th><th>时间（北京时间）</th></tr></thead>
              <tbody>{filteredRows.slice(0, 50).map((row, index) => {
                if (!isExpressionFeedback(row.answers)) return null;
                const a = row.answers;
                const label = (value: HelpRating | null) => value === "very_helpful" ? "很有帮助" : value === "somewhat_helpful" ? "有一些帮助" : value === "not_helpful" ? "没有帮助" : "未填写问卷";
                return <tr key={`${a.assessmentId}-${index}`} className="border-t border-gray-100"><td className="py-2">{label(a.modelHelp)}</td><td>{label(a.questionnaireHelp)}</td><td>{a.aiOutcome === "success" ? "成功" : "失败"}</td><td>{row.body_part || "—"}</td><td>{new Date(row.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</td></tr>;
              })}</tbody>
            </table></div>
            {!filteredRows.length && <p className="py-3 text-sm text-gray-400">暂无符合条件的新版评价</p>}
          </section>
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-gray-900">历史使用体验评分</h2><button onClick={() => exportCsv("legacy")} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">导出历史评分 CSV</button></div>
            <p className="mt-2 text-sm text-gray-500">本次读取 {legacyRows.length} 条 · 原好评率 {legacyRows.length ? `${Math.round(legacyGood / legacyRows.length * 100)}%` : "—"}。旧评分不受上方 AI 结局筛选影响，不与新版两题混算。</p>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-gray-700">{[["good", "好用"], ["ok", "一般"], ["bad", "不好用"]].map(([value, label]) => <span key={value}>{label}：{legacyRows.filter((row) => row.rating === value).length}</span>)}</div>
            <h3 className="mt-5 text-sm font-medium text-gray-800">各部位历史反馈数</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">{Array.from(new Set(legacyRows.map((row) => row.body_part).filter(Boolean))).map((part) => <span key={part}>{part}：{legacyRows.filter((row) => row.body_part === part).length}</span>)}</div>
            <h3 className="mt-5 text-sm font-medium text-gray-800">最近历史评分</h3>
            <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead className="text-gray-500"><tr><th className="py-2">评分</th><th>部位</th><th>时间（北京时间）</th></tr></thead><tbody>{legacyRows.slice(0, 50).map((row, index) => <tr key={index} className="border-t border-gray-100"><td className="py-2">{row.rating === "good" ? "好用" : row.rating === "ok" ? "一般" : "不好用"}</td><td>{row.body_part || "—"}</td><td>{new Date(row.ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</td></tr>)}</tbody></table></div>
          </section>
        </>}
      </div>
    </div>
  );
}

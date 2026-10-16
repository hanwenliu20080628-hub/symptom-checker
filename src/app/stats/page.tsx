"use client";

import { useEffect, useState } from "react";
import { sbCount, sbSelect } from "@/lib/analytics";

interface SurveyRow {
  rating: string | null;
  body_part: string | null;
  ts: string;
}

function dist(rows: SurveyRow[], key: "rating" | "body_part") {
  const m: Record<string, number> = {};
  rows.forEach((r) => {
    const k = r[key];
    if (k == null) return;
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export default function StatsPage() {
  const [pv, setPv] = useState<number | null>(null);
  const [uv, setUv] = useState<number | null>(null);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([
      sbCount("page_views", "id"),
      sbCount("visitors", "visitor_id"),
      sbSelect<SurveyRow>("survey_responses", "rating,body_part,ts"),
    ])
      .then(([p, u, r]) => {
        setPv(p);
        setUv(u);
        setRows(r);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  // 分诊问卷与体验反馈共用一张表，仅有效评分参与反馈统计。
  const feedbackRows = rows.filter(
    (r) => r.rating === "good" || r.rating === "ok" || r.rating === "bad"
  );
  const total = feedbackRows.length;
  const good = feedbackRows.filter((r) => r.rating === "good").length;
  const goodRate = total ? Math.round((good / total) * 100) : null;
  const ratingDist = dist(feedbackRows, "rating");
  const partDist = dist(feedbackRows, "body_part");

  const exportCsv = () => {
    const lines = ["rating,body_part,ts"];
    feedbackRows.forEach((r) =>
      lines.push(`"${r.rating || ""}","${r.body_part || ""}","${r.ts}"`)
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `survey_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const Table = ({
    title,
    entries,
    total,
  }: {
    title: string;
    entries: [string, number][];
    total: number;
  }) => (
    <div className="mt-6">
      <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
      <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2">项</th>
            <th className="px-3 py-2">数量</th>
            <th className="px-3 py-2">占比</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-2 text-gray-400">
                暂无数据
              </td>
            </tr>
          )}
          {entries.map(([k, v]) => (
            <tr key={k} className="border-t border-gray-100">
              <td className="px-3 py-2">{k}</td>
              <td className="px-3 py-2">{v}</td>
              <td className="px-3 py-2">
                {total ? Math.round((v / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← 返回网站
        </a>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">站长统计</h1>
        <p className="text-xs text-gray-400 mt-1">
          仅站长查看 · 请勿公开此地址
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: "总浏览量 PV", value: pv },
            { label: "独立访客 UV", value: uv },
            { label: "问卷反馈数", value: total },
            { label: "好评率", value: goodRate == null ? null : `${goodRate}%` },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white border border-gray-200 rounded-2xl py-5 text-center"
            >
              <div className="text-3xl font-bold text-blue-600">
                {c.value ?? "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <Table title="评分分布" entries={ratingDist} total={total} />
        <Table title="各部位反馈数" entries={partDist} total={partDist.reduce((s, e) => s + e[1], 0)} />

        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            最近问卷明细
          </h2>
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2">评分</th>
                <th className="px-3 py-2">部位</th>
                <th className="px-3 py-2">时间</th>
              </tr>
            </thead>
            <tbody>
              {feedbackRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-gray-400">
                    暂无数据
                  </td>
                </tr>
              )}
              {feedbackRows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.rating || "-"}</td>
                  <td className="px-3 py-2">{r.body_part || "-"}</td>
                  <td className="px-3 py-2">
                    {new Date(r.ts).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={exportCsv}
          className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
        >
          导出 CSV
        </button>

        <p className="mt-6 text-xs text-gray-400">
          口径：PV=每次页面加载（含刷新）；UV=去重浏览器；反馈统计仅含好用/一般/不好用评分，不含分诊问卷。
        </p>
        {err && <p className="mt-2 text-sm text-red-600">读取失败：{err}</p>}
      </div>
    </div>
  );
}

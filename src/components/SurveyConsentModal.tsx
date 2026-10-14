"use client";

import { useState } from "react";

interface SurveyConsentModalProps {
  bodyPartName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SurveyConsentModal({
  bodyPartName,
  onConfirm,
  onCancel,
}: SurveyConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h3 className="text-base font-semibold text-gray-900">
            数据分享同意
          </h3>
        </div>

        {/* 内容区（可滚动） */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {bodyPartName && (
            <p className="text-xs text-blue-600 mb-2">
              已选中部位：{bodyPartName}
            </p>
          )}

          {/* 精简版 */}
          <p className="text-sm text-gray-700 leading-relaxed">
            点击「同意」后将进入分诊问卷。您填写的
            <strong className="text-gray-900">问卷选项</strong>会上传至
            <strong className="text-gray-900">新加坡 Supabase</strong>
            用于匿名统计；<strong className="text-gray-900">问卷摘要、症状描述与点选部位</strong>
            将发送给 <strong className="text-gray-900">DeepSeek（境外）</strong>
            生成诊断。症状描述
            <strong className="text-gray-900">不落库</strong>、不收集身份信息。
          </p>

          {/* 可折叠全文 */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <span
              className={`inline-block transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            查看完整说明
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-xs text-gray-600 leading-relaxed">
              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  一、本次会收集什么
                </h4>
                <p>依次收集：点选部位名称、分诊问卷选项（疼痛程度、严重体征、是否听到弹响、损伤持续时间、睡眠影响、既往受伤、日常影响）、症状描述（自由文本）。不收集姓名、手机号、IP、设备信息。</p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  二、数据去哪里
                </h4>
                <table className="w-full text-left border-collapse my-1">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="font-normal py-1 pr-2">数据</th>
                      <th className="font-normal py-1 pr-2">去向</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 pr-2 align-top">分诊问卷选项</td>
                      <td className="py-1 pr-2">Supabase（新加坡）统计</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 align-top">问卷摘要 + 症状描述 + 部位</td>
                      <td className="py-1 pr-2">DeepSeek（境外）生成诊断</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1">
                  ⚠️ 症状描述属健康相关信息，会发给境外 DeepSeek 生成诊断，
                  <strong>不会存入数据库</strong>，生成回复后即丢弃。
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  三、数据用途
                </h4>
                <p>问卷选项用于统计各部位分诊分布、评估工具有效性；症状描述与问卷摘要作为 DeepSeek 输入生成诊断参考与康复建议。不会用于商业营销，不会分享给第三方。</p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  四、保存期限
                </h4>
                <p>Supabase 问卷选项保存至 2027 年 12 月 31 日，到期手动删除。症状描述不落库，生成回复后即丢弃。</p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  五、撤回与删除
                </h4>
                <p>因不收集身份信息，无法定位单条记录。如需删除相关问卷统计记录，请联系 peterLiu（18828010203）说明大致使用时间，7 天内处理。</p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-800 mb-1">
                  六、点击「同意」的含义
                </h4>
                <p>点击「同意」即表示您已阅读并理解本说明，同意将问卷选项上传至新加坡 Supabase 用于匿名统计，同意将问卷摘要、症状描述与点选部位发送给 DeepSeek（境外）生成诊断回复，并知晓症状描述不落库、生成回复后即丢弃。</p>
              </section>

              <p className="text-gray-400 pt-1">
                项目方：peterLiu　|　联系方式：18828010203
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            同意，开始问卷
          </button>
        </div>
      </div>
    </div>
  );
}

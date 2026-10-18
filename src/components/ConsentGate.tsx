"use client";

import { useEffect, useState } from "react";
import { CONSENT_VERSION, CONSENT_EFFECTIVE_DATE, hasConsented, markConsented } from "@/lib/consent";
import { BAIDU_PRIVACY_URL } from "@/config/analytics";

/**
 * 强制同意弹窗（参与说明与免责声明，版本以 consent.ts 为准）
 * - 首次访问（或声明版本升级后）弹出，必须做出选择才能使用网站
 * - 「同意并进入」：三个勾选项全部勾选后才可点击，记录同意并不再弹出
 * - 「不同意，退出」：显示阻断页面（浏览器不允许脚本关闭非脚本打开的
 *   标签页，故以阻断页代替退出）
 * - 声明内容更新：修改下方 SECTIONS / CONSENT_CHECKS，并升级
 *   src/lib/consent.ts 中的 CONSENT_VERSION
 */

type Block = { type: "p" | "li"; text: string };
type Section = { title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    title: "一、项目性质",
    blocks: [
      { type: "p", text: "本网站是 peterLiu 个人的学习实验项目，用于学习运动康复、物理治疗知识以及人工智能技术的应用。本网站：" },
      { type: "li", text: "不是医疗机构，不提供医疗服务；" },
      { type: "li", text: "不面向公众开放，仅供受邀参与者使用；" },
      { type: "li", text: "完全免费，不涉及任何收费或商业用途。" },
    ],
  },
  {
    title: "二、内容性质与重要提醒",
    blocks: [
      { type: "li", text: "本网站的所有回复均由人工智能自动生成，未经执业医师或治疗师审核，可能存在错误、遗漏或不适用于您的情况。" },
      { type: "li", text: "所有内容仅供学习参考，不构成医疗诊断、治疗建议或康复处方，不能替代医生、康复治疗师的面诊和专业判断。" },
      { type: "li", text: "请勿根据本网站内容自行用药、停药，或进行可能加重损伤的训练和拉伸。" },
      { type: "li", text: "如出现以下情况，请立即停止使用并尽快就医：胸痛或胸闷、肢体麻木或无力、大小便失禁、发热伴疼痛、夜间疼痛加重、外伤后剧烈疼痛或肿胀变形、头痛伴呕吐、不明原因体重下降，或疼痛持续加重、长期不缓解。" },
      { type: "li", text: "如遇紧急情况，请拨打 120。" },
    ],
  },
  {
    title: "三、我们会收集哪些信息",
    blocks: [
      { type: "p", text: "为完成学习实验，本网站会收集并保存以下匿名信息：" },
      { type: "li", text: "您在 3D 人体模型上点选的部位名称；" },
      { type: "li", text: "您填写的问卷选项（问卷为可选，不填写也可正常使用）；" },
      { type: "li", text: "使用体验反馈中的评分与部位；" },
      { type: "li", text: "提交时间（仅精确到日）。" },
      { type: "p", text: "自建数据库不主动保存您的姓名、手机号、邮箱、账号、IP 地址、地理位置或设备信息。千问站点另外使用百度统计，其 Cookie、网络及设备信息处理规则见下文与百度隐私政策。" },
      { type: "p", text: "特别说明：您填写的不适描述和提问内容仅用于生成 AI 回复，本网站不会将其保存到服务器（详见第四节）。" },
      { type: "p", text: "请不要在输入内容中填写姓名、联系方式、工作单位等可以识别您身份的信息。" },
      { type: "p", text: "请注意：您的问卷选项可能涉及健康相关信息。勾选同意即表示您同意我们为上述目的处理这些信息。" },
    ],
  },
  {
    title: "四、信息如何使用和存储",
    blocks: [
      { type: "li", text: "用途：仅用于本人学习实验、改进网站功能。目前不用于论文发表或商业比赛；如后续用途变更，将另行告知并重新取得您的同意。" },
      { type: "li", text: "AI 处理：您的点选部位、不适描述和问卷选项会发送给 DeepSeek（深度求索公司，国内大模型服务）生成回复。因本网站托管于 Netlify，相关内容在传输时会经过 Netlify 的境外服务器中转。AI 回复生成后，本网站不保存您的原始症状描述。" },
      { type: "li", text: "存储位置：匿名统计与问卷数据存储于 Supabase 云数据库，服务器位于新加坡（境外）。" },
      { type: "li", text: "跨境说明：如上所述，您的信息在 AI 处理与数据存储环节会传输至境外（Netlify 与 Supabase 服务器）。勾选同意即表示您知悉并同意上述跨境传输。" },
      { type: "li", text: "百度统计：仅在千问独立托管站点、您同意后加载，用于统计页面访问人次。同一个浏览器再次打开或刷新可以再次计数。百度可能使用 Cookie，并处理 IP、浏览器及设备等信息；本站不主动向百度发送身体部位、症状、问卷答案或文字评论。" },
      { type: "li", text: "体验评分分享：提交反馈时，您可另行勾选同意将本次“好用、一般、不好用”三种体验评分发送给百度，用于统计满意度，不附带健康明细或评论。该选项默认不勾选，不同意分享也可提交原有反馈、继续使用网站；仅授权本次评分，下次不会自动勾选。" },
      { type: "li", text: "平台日志：自建数据库不主动保存您的 IP，但网站托管平台（千问或 Netlify）和数据库服务商（Supabase）的服务器可能自动生成访问日志。" },
      { type: "li", text: "保存期限：上述数据将保存至 2027 年 12 月 31 日，到期后全部删除。" },
      { type: "li", text: "第三方处理：除上述 AI、存储、托管和百度统计服务所需的信息处理外，不主动对外出售或公开您的信息。百度统计的数据处理与保存规则以其隐私政策及实际服务设置为准，不适用上述自建数据库保存期限。" },
    ],
  },
  {
    title: "五、您的权利",
    blocks: [
      { type: "li", text: "自愿参与：参与完全自愿，您可以随时停止使用，不会产生任何影响。" },
      { type: "li", text: "撤回同意：可从网站底部的“隐私与同意设置”进入，选择“撤回同意并重新选择”。页面将重新打开，重新同意前不会加载百度统计；此操作不会自动删除已发送至百度的历史数据或 Cookie。" },
      { type: "li", text: "删除数据：本网站不保存您的症状描述、不收集身份信息，无法也不会定位到您的某一次具体提交。如您仍希望删除与您浏览器相关的匿名统计记录，请通过 18828010203 联系本人说明，本人将在 7 天内处理。" },
      { type: "li", text: "疑问咨询：如对本项目有任何疑问，请联系 18828010203。" },
    ],
  },
  {
    title: "六、使用限制",
    blocks: [
      { type: "li", text: "本网站仅限年满 18 周岁的受邀参与者使用。" },
      { type: "li", text: "请勿将访问码和链接转发给他人。" },
    ],
  },
  {
    title: "七、责任说明",
    blocks: [
      { type: "p", text: "本网站内容仅为学习交流用途。请您结合自身情况审慎判断，涉及健康问题以医生和康复治疗师的专业意见为准。本人不对因使用或依赖本网站内容而产生的后果承担责任，但法律另有规定的除外。" },
    ],
  },
];

/** 三个同意勾选项（默认不勾选，全部勾选后才能进入） */
const CONSENT_CHECKS = [
  "我已阅读并理解以上全部内容，知晓本网站内容由 AI 生成、仅供学习参考、不构成医疗建议，并同意上述健康相关信息处理及千问站点的百度访问统计与 Cookie 等信息处理。",
  "我同意本网站将我的点选部位、症状描述和问卷选项发送给 DeepSeek（深度求索）生成回复，并同意相关匿名数据存储于新加坡（境外）的 Supabase 数据库（即同意上述跨境传输）。",
  "我确认已年满 18 周岁。",
];

type Status = "checking" | "pending" | "declined" | "agreed";

export default function ConsentGate() {
  // 初始 checking：挂载后再读 localStorage，避免 SSR/hydration 状态不一致
  const [status, setStatus] = useState<Status>("checking");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const allChecked = checks.every(Boolean);

  useEffect(() => {
    if (hasConsented()) setStatus("agreed");
    else setStatus("pending");
  }, []);

  const handleAgree = () => {
    if (!allChecked) return;
    markConsented();
    setStatus("agreed");
  };

  // 已同意或仍在检查：不渲染
  if (status === "checking" || status === "agreed") return null;

  // 不同意：阻断页面
  if (status === "declined") {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 px-8 py-10 text-center shadow-lg">
          <div className="text-4xl">👋</div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            您已选择不参与本项目
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            感谢您的到访，您可以关闭此页面离开。
            <br />
            如改变主意，可点击下方按钮重新查看声明。
          </p>
          <button
            onClick={() => setStatus("pending")}
            className="mt-6 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            重新查看声明
          </button>
        </div>
      </div>
    );
  }

  // 强制同意弹窗
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* 遮罩：不可点击关闭（必须做出选择） */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            参与说明与免责声明
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            版本 {CONSENT_VERSION} · 生效日期：{CONSENT_EFFECTIVE_DATE}
          </p>
          <p className="text-sm text-gray-500 mt-1.5">
            欢迎参与本项目。在使用前，请仔细阅读以下内容。
          </p>
        </div>

        {/* 正文（可滚动） */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                {s.title}
              </h4>
              <div className="space-y-1.5">
                {s.blocks.map((b, i) =>
                  b.type === "li" ? (
                    <p
                      key={i}
                      className="text-sm text-gray-600 leading-relaxed flex gap-2"
                    >
                      <span className="text-gray-400 flex-shrink-0">•</span>
                      <span>{b.text}</span>
                    </p>
                  ) : (
                    <p
                      key={i}
                      className="text-sm text-gray-600 leading-relaxed"
                    >
                      {b.text}
                    </p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <a href={BAIDU_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="px-6 pb-2 text-sm text-blue-600 hover:underline">
          查看百度统计隐私政策
        </a>

        {/* 勾选项 + 按钮（固定底部） */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
          {CONSENT_CHECKS.map((label, i) => (
            <label
              key={i}
              className="flex items-start gap-2.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() =>
                  setChecks((prev) => prev.map((c, j) => (j === i ? !c : c)))
                }
                className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                {label}
              </span>
            </label>
          ))}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setStatus("declined")}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              不同意，退出
            </button>
            <button
              onClick={handleAgree}
              disabled={!allChecked}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                allChecked
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              同意并进入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

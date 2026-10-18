import type { Metadata } from "next";
import ConsentSettings from "@/components/ConsentSettings";
import { BAIDU_PRIVACY_URL } from "@/config/analytics";

export const metadata: Metadata = {
  title: "免责声明 - PinPoint: A 3D Body Map for Sports Injury Learning",
  description: "PinPoint 免责声明与使用条款",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "一、性质说明",
    body: [
      "本工具（PinPoint: A 3D Body Map for Sports Injury Learning）提供的全部内容，包括症状分析、部位提示、康复建议等，均为人工智能生成的参考信息，仅用于健康科普与自我了解之目的，不构成任何形式的医疗建议、诊断或治疗依据。",
    ],
  },
  {
    title: "二、不能替代专业诊疗",
    body: [
      "本工具不能替代执业医师、医疗机构的面对面问诊、体格检查与医学检验。任何健康决策请以正规医疗机构的诊断为准。请勿依据本工具的内容自行用药、停药或改变治疗方案。",
    ],
  },
  {
    title: "三、信息准确性局限",
    body: [
      "人工智能分析基于您主动输入的有限信息生成，可能存在遗漏、偏差或错误。本工具不对分析结果的完整性、准确性、时效性作出任何保证。",
    ],
  },
  {
    title: "四、紧急情形提示",
    body: [
      "如您出现以下任一情况，请立即停止使用本工具并拨打急救电话（120）或前往最近医院急诊：",
      "胸痛、呼吸困难、意识模糊、抽搐；大量出血、严重外伤、高热不退；任何您认为危及生命的紧急状况。",
    ],
  },
  {
    title: "五、不形成医患关系",
    body: [
      "使用本工具不构成您与任何医生、医疗机构或本工具运营方之间的医患关系、服务合同关系。",
    ],
  },
  {
    title: "六、责任限制",
    body: [
      "在法律允许的最大范围内，本工具运营方不对因使用或信赖本工具内容而导致的任何直接、间接损失或健康损害承担责任。您应自行判断并承担使用本工具的风险。",
    ],
  },
  {
    title: "七、数据与隐私",
    body: [
      "自建统计数据库记录浏览器匿名编号、访问和问卷选项等数据，用于产品改进，不主动保存姓名、联系方式、IP或原始健康描述。托管和数据库平台可能自动生成网络日志。",
      "千问独立托管站点在您同意后使用百度统计记录页面访问人次，百度可能使用Cookie并处理IP、浏览器及设备信息。本站不主动向百度发送身体部位、症状、问卷答案或文字评论；百度的数据处理与保存规则见其隐私政策。我们不会主动出售您的数据。",
      "体验评分分享：提交反馈时，您可另行勾选同意将本次“好用、一般、不好用”三种体验评分发送给百度，用于统计满意度，不附带健康明细或评论。该选项默认不勾选，不同意分享也可提交原有反馈、继续使用网站；仅授权本次评分，下次不会自动勾选。",
      "您可在下方撤回同意并重新选择，重新同意前不会加载百度统计。此操作不会自动删除百度已经处理的历史数据或Cookie。",
    ],
  },
  {
    title: "八、未成年人使用",
    body: ["未成年人应在监护人陪同下使用本工具。"],
  },
  {
    title: "九、条款更新",
    body: ["本免责声明可能不时更新，更新后于本页面公布即生效。继续使用视为接受更新后的条款。"],
  },
];

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← 返回工具
        </a>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">免责声明</h1>
        <p className="mt-2 text-sm text-gray-500">
          请在使用本工具前仔细阅读以下条款。使用本工具即视为您已阅读并同意本声明。
        </p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-6">
          <a href={BAIDU_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">
            百度统计隐私政策
          </a>
          <ConsentSettings />
        </div>
        <p className="mt-10 text-xs text-gray-400 text-center">
          本工具仅供健康参考，不构成医疗诊断；如有不适请及时就医。
        </p>
      </div>
    </div>
  );
}

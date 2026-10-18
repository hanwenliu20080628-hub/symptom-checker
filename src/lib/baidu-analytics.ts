import { BAIDU_ANALYTICS } from "@/config/analytics";
import { hasConsented } from "@/lib/consent";

export type BaiduRating = "good" | "ok" | "bad";

type BaiduCommand =
  | ["_setAutoPageview", boolean]
  | ["_trackPageview", string]
  | ["_trackEvent", "使用体验", "提交评分", BaiduRating];

declare global {
  interface Window {
    _hmt?: { push: (command: BaiduCommand) => unknown };
  }
}

// 仅本次文档加载防重，刷新后重新计数；不按访客或日期去重。
let trackedDocument: Document | null = null;
const SCRIPT_ID = "pinpoint-baidu-analytics";

/** 供统计和分享选项共用；站点配置固化在源码。 */
export function isBaiduAnalyticsPage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    BAIDU_ANALYTICS.enabled &&
    window.location.hostname === BAIDU_ANALYTICS.hostname &&
    window.location.pathname === BAIDU_ANALYTICS.pathname &&
    /^[a-f0-9]{32}$/.test(BAIDU_ANALYTICS.siteId)
  );
}

/** 成功仅表示已排入百度队列，不代表百度后台已经收录。 */
export function trackBaiduPageView(): boolean {
  if (!isBaiduAnalyticsPage() || !hasConsented() || trackedDocument === document) {
    return false;
  }

  trackedDocument = document;
  try {
    const queue = window._hmt ?? ([] as BaiduCommand[]);
    window._hmt = queue;
    queue.push(["_setAutoPageview", false]);
    queue.push(["_trackPageview", "/"]);

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://hm.baidu.com/hm.js?${BAIDU_ANALYTICS.siteId}`;
      script.onerror = () => console.warn("百度统计脚本加载失败，不影响网站使用。");
      document.head.appendChild(script);
    }
    return true;
  } catch {
    console.warn("百度统计初始化失败，不影响网站使用。");
    return false;
  }
}

/** 仅本次已同意分享的三选一评分；不接受部位、评论或错误详情。 */
export function trackBaiduRating(rating: BaiduRating, shareConsented: boolean): boolean {
  if (
    shareConsented !== true ||
    !isBaiduAnalyticsPage() ||
    !hasConsented() ||
    (rating !== "good" && rating !== "ok" && rating !== "bad")
  ) {
    return false;
  }
  try {
    // 复用同一脚本和本页PV防重，不为每次评分额外生成PV。
    trackBaiduPageView();
    if (!window._hmt) return false;
    window._hmt.push(["_trackEvent", "使用体验", "提交评分", rating]);
    return true;
  } catch {
    console.warn("百度评分上报失败，不影响反馈提交。");
    return false;
  }
}

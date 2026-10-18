import { BAIDU_ANALYTICS } from "@/config/analytics";
import { hasConsented } from "@/lib/consent";

type BaiduCommand =
  | ["_setAutoPageview", boolean]
  | ["_trackPageview", string];

declare global {
  interface Window {
    _hmt?: { push: (command: BaiduCommand) => unknown };
  }
}

// 仅本次文档加载防重，刷新后重新计数；不按访客或日期去重。
let trackedDocument: Document | null = null;
const SCRIPT_ID = "pinpoint-baidu-analytics";

/** 仅允许配置的千问首页统计访问；站点配置固化在源码。 */
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

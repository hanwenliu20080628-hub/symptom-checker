"use client";

import { useEffect } from "react";
import { CONSENT_KEY, hasConsented } from "@/lib/consent";
import { trackBaiduPageView } from "@/lib/baidu-analytics";

/** 挂载于访问码门禁内；同意后独立计数，不等待 Supabase 或 AI。 */
export default function BaiduTracker() {
  useEffect(() => {
    let hadConsent = hasConsented();
    let reloading = false;
    const report = () => {
      hadConsent = hasConsented();
      if (hadConsent) trackBaiduPageView();
    };
    const refreshIfWithdrawn = () => {
      if (hadConsent && !hasConsented() && !reloading) {
        reloading = true;
        // 已执行的百度脚本不能仅靠删标签停止，重载后重新走同意门禁。
        window.location.reload();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY || event.key === null) refreshIfWithdrawn();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshIfWithdrawn();
    };

    if (hadConsent) report();
    else window.addEventListener("consent-granted", report, { once: true });
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("consent-granted", report);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}

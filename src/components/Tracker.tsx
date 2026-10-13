"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import { hasConsented } from "@/lib/consent";

/**
 * 隐形访问上报（自托管统计，Supabase）。
 * 页面加载后记录一次浏览：UV 按浏览器匿名编号去重，PV 每次加载 +1（含刷新）。
 * 不显示任何 UI；不采集 IP 与自由文本。
 * 上报前置条件：用户已在参与说明弹窗中同意（未同意不上报，同意后立即补报）。
 */
export default function Tracker() {
  useEffect(() => {
    const report = () => trackPageView(location.pathname);

    if (hasConsented()) {
      report();
      return;
    }

    // 尚未同意：等待 ConsentGate 发出的同意事件后再上报（本次页面加载仍计入 PV）
    const onGranted = () => {
      window.removeEventListener("consent-granted", onGranted);
      report();
    };
    window.addEventListener("consent-granted", onGranted);
    return () => window.removeEventListener("consent-granted", onGranted);
  }, []);

  return null;
}

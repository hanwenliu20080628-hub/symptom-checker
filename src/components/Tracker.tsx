"use client";

import { useEffect } from "react";

/**
 * 隐形访问上报组件（自托管计数）。
 * 页面加载时向同域 /api/track 发送一次浏览记录，不显示任何 UI。
 * visitorId 存于 localStorage，用于 UV 去重；不采集 IP 与任何健康信息。
 */
export default function Tracker() {
  useEffect(() => {
    try {
      let vid = localStorage.getItem("vid");
      if (!vid) {
        vid =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("vid", vid);
      }
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: vid, path: location.pathname }),
        keepalive: true,
      }).catch(() => {
        /* 上报失败静默忽略，不影响页面 */
      });
    } catch {
      /* localStorage 不可用时跳过 */
    }
  }, []);

  return null;
}

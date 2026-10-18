"use client";

import { revokeConsent } from "@/lib/consent";

export default function ConsentSettings() {
  return (
    <button
      type="button"
      onClick={() => {
        revokeConsent();
        // 离开当前文档，结束已经运行的第三方脚本。
        window.location.replace("/");
      }}
      className="mt-4 text-sm text-blue-600 hover:underline"
    >
      撤回同意并重新选择
    </button>
  );
}

"use client";

export default function DisclaimerBar() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
      <p className="text-amber-800 text-sm">
        <span className="font-semibold">⚠️ 免责声明：</span>
        本工具仅供参考，不能替代专业医疗诊断。如有严重或持续症状，请及时就医。
      </p>
    </div>
  );
}

"use client";

export default function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-100 rounded-full" />
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 text-sm">
        {text || "正在分析中，请稍候..."}
      </p>
    </div>
  );
}

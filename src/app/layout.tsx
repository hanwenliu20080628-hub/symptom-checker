import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人体症状自诊助手",
  description:
    "点击3D人体模型部位，描述症状，AI为您提供初步分析参考与康复建议",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出（前端部署到 Netlify，后端独立部署到 Railway）
  output: "export",
  // Three.js 等包需要转译
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // 静态导出需禁用图片优化
  images: {
    unoptimized: true,
    domains: [],
  },
};

export default nextConfig;

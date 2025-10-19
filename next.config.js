/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发模式下不使用静态导出
  ...(process.env.NODE_ENV === "production" && {
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
  }),

  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 环境变量注入 - 自动生成版本号
  env: {
    BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hour = String(now.getHours()).padStart(2, "0");
      const minute = String(now.getMinutes()).padStart(2, "0");
      return `${year}.${month}.${day}.${hour}${minute}`;
    })(),
    NEXT_PUBLIC_GIT_COMMIT:
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "local",
  },
  webpack: (config) => {
    // 确保 JSON 文件能够被正确处理并支持热重载
    config.module.rules.push({
      test: /\.json$/,
      type: "json",
    });

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/wiki/:path*",
        destination: "/api/wiki?title=:path*",
      },
    ];
  },
};

module.exports = nextConfig;

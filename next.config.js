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

  cacheComponents: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 环境变量注入 - 自动生成版本号
  env: {
    BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: (() => {
      // 使用北京时间 (UTC+8)
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const year = beijingTime.getUTCFullYear();
      const month = String(beijingTime.getUTCMonth() + 1).padStart(2, "0");
      const day = String(beijingTime.getUTCDate()).padStart(2, "0");
      const hour = String(beijingTime.getUTCHours()).padStart(2, "0");
      const minute = String(beijingTime.getUTCMinutes()).padStart(2, "0");
      return `${year}.${month}.${day}.${hour}${minute}`;
    })(),
    NEXT_PUBLIC_GIT_COMMIT:
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "local",
  },
  // turbopack: (config) => {
  //   // 确保 JSON 文件能够被正确处理并支持热重载
  //   config.module.rules.push({
  //     test: /\.json$/,
  //     type: "json",
  //   });

  //   return config;
  // },
  async rewrites() {
    return [
      {
        source: "/wiki/:path*",
        destination: "/api/wiki?title=:path*",
      },
    ];
  },

  reactCompiler: true,
};

module.exports = nextConfig;

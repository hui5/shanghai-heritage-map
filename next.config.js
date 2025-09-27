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

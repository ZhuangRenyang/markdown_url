/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ---------- Vercel 部署优化 ----------
  // 线上通过 Cloudflare Worker (HTMLFETCH_API) 或 Browserless (BROWSERLESS_KEY) 抓取网页，
  // 不需要把本地 Puppeteer / Chromium 打进 Serverless Function（否则会超过 250MB 体积上限）。
  experimental: {
    outputFileTracingExcludes: {
      "/api/tomd": [
        "node_modules/puppeteer/**",
        "node_modules/puppeteer-core/**",
        "node_modules/@puppeteer/**",
        "node_modules/devtools-protocol/**",
      ],
    },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // puppeteer 保持为外部依赖，只在使用时按需 require
      config.externals = [
        ...(config.externals || []),
        "puppeteer",
        "puppeteer-core",
      ];
    }
    return config;
  },
};

export default nextConfig;

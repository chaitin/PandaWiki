import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'dist',
  reactStrictMode: false,
  allowedDevOrigins: ['10.10.18.71'],
  output: 'standalone',
  assetPrefix: '/panda-wiki-app-assets',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['mermaid'],
  async headers() {
    return [
      {
        source: '/cap@0.0.6/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      // 只有当环境变量存在且是完整 URL 时才添加 rewrite
      if (process.env.STATIC_FILE_TARGET) {
        const staticFileTarget = process.env.STATIC_FILE_TARGET.trim();
        // 确保是完整的 URL（以 http:// 或 https:// 开头）
        if (
          staticFileTarget.startsWith('http://') ||
          staticFileTarget.startsWith('https://')
        ) {
          rewritesPath.push({
            source: '/static-file/:path*',
            destination: `${staticFileTarget}/static-file/:path*`,
            basePath: false as const,
          });
        }
      }
      if (process.env.TARGET) {
        const target = process.env.TARGET.trim();
        // 确保是完整的 URL（以 http:// 或 https:// 开头）
        if (target.startsWith('http://') || target.startsWith('https://')) {
          rewritesPath.push(
            {
              source: '/share/v1/:path*',
              destination: `${target}/share/v1/:path*`,
              basePath: false as const,
            },
            {
              source: '/api/v1/:path*',
              destination: `${target}/api/v1/:path*`,
              basePath: false as const,
            },
          );
        }
      }
    }
    return rewritesPath;
  },
};

// 在开发环境下跳过 Sentry 配置
const isDevelopment = process.env.NODE_ENV === 'development';

export default isDevelopment
  ? nextConfig
  : withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: 'sentry',

      project: 'pandawiki-app',
      sentryUrl: 'https://sentry.baizhi.cloud/',

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js proxy, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: '/monitoring',

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,
    });

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'dist',
  reactStrictMode: false,
  allowedDevOrigins: ['10.10.18.71'],
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      rewritesPath.push(
        ...[
          {
            source: '/static-file/:path*',
            destination: `${process.env.TARGET}/static-file/:path*`,
            basePath: false as const,
          },
          {
            source: '/share/v1/:path*',
            destination: `${process.env.TARGET}/share/v1/:path*`,
            basePath: false as const,
          },
        ]
      );
    }
    return rewritesPath;
  },
};

export default nextConfig;

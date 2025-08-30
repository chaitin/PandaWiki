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
      rewritesPath.push(
        ...[
          {
            source: '/static-file/:path*',
            destination: `${process.env.STATIC_FILE_TARGET}/static-file/:path*`,
            basePath: false as const,
          },
          {
            source: '/share/v1/:path*',
            destination: `${process.env.TARGET}/share/v1/:path*`,
            basePath: false as const,
          },
        ],
      );
    }
    return rewritesPath;
  },
};

export default nextConfig;

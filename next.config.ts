import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // references 폴더를 빌드에서 제외
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/references/**'],
    };
    return config;
  },
};

export default nextConfig;

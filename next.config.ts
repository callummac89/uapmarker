// next.config.ts

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    turbo: false,
  },
  webpack(config: any, _context: any) {
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);
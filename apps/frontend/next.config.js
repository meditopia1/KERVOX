const path = require('path')
const dotenv = require('dotenv')

// Next.js loads apps/frontend/.env.local automatically. In this monorepo the
// server-only Supabase key may instead live in the repository root .env.local.
// Fill missing values from there without overriding deployment environment.
dotenv.config({ path: path.resolve(__dirname, '../..', '.env.local'), override: false, quiet: true })

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the dev server's assets separate from production builds. Running
  // `next build` must not invalidate CSS served by a running `next dev`.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  webpack: (config, { isServer }) => {
    // Exclude jest from webpack bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'jest-runtime': 'jest-runtime',
        '@jest/globals': '@jest/globals',
      });

      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        ws: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig

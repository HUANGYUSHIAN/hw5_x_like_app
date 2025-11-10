import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  },
  webpack: (config, { isServer }) => {
    // Exclude Prisma from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        '@prisma/client': false,
        '.prisma/client': false,
      }
    }
    
    // Ignore Prisma WASM warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /\.prisma\/client\/wasm\.js$/ },
      { module: /query_engine_bg\.js$/ },
      { module: /query_engine_bg\.wasm$/ },
    ]
    
    return config
  },
};

export default nextConfig;

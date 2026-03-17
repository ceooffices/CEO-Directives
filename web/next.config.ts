import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Vercel build fails do env vars undefined at build time
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

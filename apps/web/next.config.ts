import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@pgatour-ai/ai",
    "@pgatour-ai/config",
    "@pgatour-ai/domain",
    "@pgatour-ai/ui",
  ],
};

export default nextConfig;

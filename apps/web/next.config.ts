import { loadWorkspaceEnv } from "@pgatour-ai/config/workspace-env";
import type { NextConfig } from "next";

loadWorkspaceEnv({
  dev: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  transpilePackages: [
    "@pgatour-ai/ai",
    "@pgatour-ai/config",
    "@pgatour-ai/domain",
    "@pgatour-ai/ui",
  ],
};

export default nextConfig;

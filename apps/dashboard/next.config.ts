import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@observatory/shared"],
  output: "standalone",
  // Monorepo root, so the standalone build traces workspace-hoisted
  // node_modules and the built @observatory/shared package correctly.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

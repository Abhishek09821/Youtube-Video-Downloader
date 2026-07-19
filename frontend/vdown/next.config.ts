import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — several lockfiles exist above this folder.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

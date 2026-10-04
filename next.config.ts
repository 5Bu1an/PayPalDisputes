import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // A stray package-lock.json in the home folder confuses root detection; pin it here.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

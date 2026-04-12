import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native module; keep external so Turbopack/webpack don’t break the binary
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

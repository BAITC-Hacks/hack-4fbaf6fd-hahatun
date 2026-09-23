import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 was dropped; keep the list empty unless a native dep appears.
  serverExternalPackages: [],
};

export default nextConfig;

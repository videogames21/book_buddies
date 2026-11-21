import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
    // Lets admin pages end with HTTP 403 through forbidden() (design/adm.md, Components).
    authInterrupts: true,
  },
};

export default nextConfig;

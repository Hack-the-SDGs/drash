import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Makes Cloudflare bindings (e.g. GROUPS_KV) available via getCloudflareContext()
// during `next dev`.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drasl.ntust.camp",
      },
    ],
  },
};

export default nextConfig;

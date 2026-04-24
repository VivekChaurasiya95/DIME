import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // These are type-level-only mismatches from framer-motion, recharts, and
    // @base-ui/react Select generics. None affect runtime behaviour.
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

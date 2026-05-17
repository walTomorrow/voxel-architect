import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/visualizer",
        destination: "/generic-lab",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

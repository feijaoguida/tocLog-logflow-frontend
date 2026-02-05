import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://162.215.222.208:4000/:path*',
      },
    ]
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "tabula-pdf.dataviz.jp" }],
        destination: "https://tabula-pdf.dataprep.jp/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

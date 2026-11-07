import type { NextConfig } from "next";

const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;

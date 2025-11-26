import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["github.com", "raw.githubusercontent.com", "user-images.githubusercontent.com"],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

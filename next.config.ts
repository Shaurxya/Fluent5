import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip static page generation for routes that need Supabase auth
  // These will be server-rendered on-demand instead
  output: undefined,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Our workspace packages ship raw TypeScript (no build step), so Next must compile them.
  transpilePackages: ["@msb/schema", "@msb/components"],
};

export default nextConfig;

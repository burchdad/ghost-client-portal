import type { NextConfig } from "next";
import { securityHeaders } from "@/lib/security";

const nextConfig: NextConfig = {
  headers: securityHeaders,
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;

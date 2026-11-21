import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // System prompts are read from disk at runtime; make sure Vercel ships them with the routes.
  outputFileTracingIncludes: {
    "/api/analyze": ["./prompts/**"],
    "/api/chat": ["./prompts/**"],
  },
  serverExternalPackages: ["unpdf", "ai", "@ai-sdk/anthropic", "@ai-sdk/provider-utils"],
};

export default nextConfig;

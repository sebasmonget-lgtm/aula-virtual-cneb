import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/*": ["./knowledge/**/*", "./assets/**/*", "./biblioteca-talleres/**/*", "./skills/**/*", "./docs/auditoria-biblioteca-fichas-inventario.json", "./experiments/jev-competency-classifier/config/**/*", "./experiments/jev-competency-classifier/src/current-v2.mjs"],
    "/health": ["./knowledge/**/*", "./assets/**/*", "./biblioteca-talleres/**/*", "./skills/**/*", "./docs/auditoria-biblioteca-fichas-inventario.json", "./experiments/jev-competency-classifier/config/**/*", "./experiments/jev-competency-classifier/src/current-v2.mjs"],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Editing masters stay in the repository; runtime image selection reads the
  // optimised `file` in the image index, never its full-resolution `master`.
  outputFileTracingExcludes: {
    "/api/*": ["./assets/project-images/masters/**/*"],
    "/health": ["./assets/project-images/masters/**/*"],
  },
  outputFileTracingIncludes: {
    "/api/*": ["./knowledge/**/*", "./assets/**/*", "./public/workshops/**/*", "./public/competencies/compact/*.svg", "./public/project-illustrations/*.webp", "./biblioteca-talleres/**/*", "./skills/**/*", "./docs/auditoria-biblioteca-fichas-inventario.json", "./experiments/jev-competency-classifier/config/**/*", "./experiments/jev-competency-classifier/src/current-v2.mjs"],
    "/health": ["./knowledge/**/*", "./assets/**/*", "./public/workshops/**/*", "./public/competencies/compact/*.svg", "./public/project-illustrations/*.webp", "./biblioteca-talleres/**/*", "./skills/**/*", "./docs/auditoria-biblioteca-fichas-inventario.json", "./experiments/jev-competency-classifier/config/**/*", "./experiments/jev-competency-classifier/src/current-v2.mjs"],
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ayni Aula",
    short_name: "Ayni",
    description: "Asistente pedagógico para docentes de Educación Inicial",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#173d3a",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

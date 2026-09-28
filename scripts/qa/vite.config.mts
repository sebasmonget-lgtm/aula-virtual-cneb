// Isolated UI QA: the ordinary Cloudflare dev emulator stalls before listen on this Windows host.
// The app and local-auth plugin are unchanged; API authorization still belongs to the QA backend.
import { defineConfig } from "vite";
import vinext from "vinext";
import { sites } from "../../build/sites-vite-plugin";
if (process.env.AYNI_QA_WEB !== "1") throw new Error("Esta configuración es solo para QA local.");
export default defineConfig({ plugins: [vinext(), sites({ mockAuth: true })],
  server: { host: "localhost", port: 5176, strictPort: true } });

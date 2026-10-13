import { Readable } from "node:stream";
import { measureSetupPhase, withSetupPerformance } from "../src/lib/setup-performance.mjs";

/** Adapt the existing Node HTTP API to a Next.js route without a listening port. */
export async function handleServerlessRequest(webRequest) {
  const pathname = new URL(webRequest.url).pathname;
  const saveOperation = ["POST", "PUT", "PATCH"].includes(webRequest.method) && (
    ["/api/pilot/setup", "/api/qa/setup-benchmark", "/api/students/import", "/api/diagnostics/spontaneous-observations", "/api/diagnostics/experience-observations", "/api/diagnostics/group-review/suggest"].includes(pathname)
    || /^\/api\/students\/[0-9a-f-]{36}\/(details|photo)$/.test(pathname)
    || /^\/api\/diagnostics\/students\/[0-9a-f-]{36}\/family-interview(?:\/(save-and-confirm|confirm))?$/.test(pathname));
  if (saveOperation) {
    const measured = await withSetupPerformance(() => adaptRequest(webRequest));
    measured.result.headers.set("server-timing", measured.timing);
    return measured.result;
  }
  return adaptRequest(webRequest);
}

async function adaptRequest(webRequest) {
  process.env.AYNI_SERVERLESS = "1";
  const { handleApiRequest } = await measureSetupPhase("bootstrap", () => import("./local-db-server.mjs"));
  const body = ["GET", "HEAD"].includes(webRequest.method) ? null : await measureSetupPhase("body_read", async () => Buffer.from(await webRequest.arrayBuffer()));
  if (body && body.length > 11_000_000) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  const request = Readable.from(body ? [body] : []);
  request.method = webRequest.method;
  request.url = new URL(webRequest.url).pathname + new URL(webRequest.url).search;
  request.headers = Object.fromEntries(webRequest.headers.entries());
  const headers = new Headers();
  let status = 200;
  let payload = Buffer.alloc(0);
  let ended = false;
  const response = {
    setHeader(name, value) {
      headers.delete(name);
      for (const item of Array.isArray(value) ? value : [value]) headers.append(name, String(item));
    },
    hasHeader(name) { return headers.has(name); },
    writeHead(code, values = {}) {
      status = code;
      for (const [name, value] of Object.entries(values)) this.setHeader(name, value);
    },
    end(value) {
      if (value !== undefined && value !== null) payload = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
      ended = true;
    },
  };
  await handleApiRequest(request, response);
  if (!ended) return Response.json({ error: "Respuesta incompleta." }, { status: 500 });
  return new Response(status === 204 ? null : payload, { status, headers });
}

import { Readable } from "node:stream";

/** Adapt the existing Node HTTP API to a Next.js route without a listening port. */
export async function handleServerlessRequest(webRequest) {
  process.env.AYNI_SERVERLESS = "1";
  const { handleApiRequest } = await import("./local-db-server.mjs");
  const body = ["GET", "HEAD"].includes(webRequest.method) ? null : Buffer.from(await webRequest.arrayBuffer());
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

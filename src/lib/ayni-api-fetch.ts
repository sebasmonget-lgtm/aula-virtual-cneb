import { createApiTransport } from "./api-transport.mjs";
const transport = createApiTransport();
// One transport for every browser call to Ayni's API. Cookies remain HTTP-only.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const response = await transport(input, init) as Response;
  if (response.status === 401 && typeof window !== "undefined") {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/api/auth/")) window.dispatchEvent(new Event("ayni:auth-required"));
  }
  return response;
}
export async function apiJson<T>(response:Response):Promise<T> {
  try{return await response.json() as T;}
  catch{throw new Error("La conexión se interrumpió antes de recibir la respuesta. Estamos conservando lo guardado; puedes retomarlo.");}
}

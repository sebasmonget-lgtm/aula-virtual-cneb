// One transport for every browser call to Ayni's API. Cookies remain HTTP-only.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, { ...init, credentials: "include" });
  if (response.status === 401 && typeof window !== "undefined") {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/api/auth/")) window.dispatchEvent(new Event("ayni:auth-required"));
  }
  return response;
}

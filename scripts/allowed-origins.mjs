/** Deployment origins come from server configuration, never request headers. */
export function configuredOrigins(authMode, env = process.env) {
  const origins = new Set([
    ...(authMode === "local" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
    ...(env.AYNI_ALLOWED_ORIGIN ? [env.AYNI_ALLOWED_ORIGIN] : []),
  ]);
  if (env.VERCEL === "1" && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(env.VERCEL_URL ?? "")) {
    origins.add(`https://${env.VERCEL_URL.toLowerCase()}`);
  }
  return origins;
}

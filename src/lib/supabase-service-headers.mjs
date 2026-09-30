/** Opaque Supabase secret keys belong in apikey; legacy service_role JWTs also use Bearer. */
export function supabaseServiceHeaders(key) {
  return key.startsWith("sb_secret_")
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
}

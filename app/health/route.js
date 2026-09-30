export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { handleServerlessRequest } = await import("../../scripts/serverless-bridge.mjs");
  return handleServerlessRequest(request);
}

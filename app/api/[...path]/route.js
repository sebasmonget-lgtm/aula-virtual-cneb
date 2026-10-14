export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { after } from "next/server";

async function handle(request) {
  const { handleServerlessRequest } = await import("../../../scripts/serverless-bridge.mjs");
  return handleServerlessRequest(request, { after });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };

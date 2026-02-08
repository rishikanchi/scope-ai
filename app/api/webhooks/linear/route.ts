import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { ingestSignalTask } from "@/trigger/ingest-signal";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // TODO: Verify Linear webhook signature
  // const signature = req.headers.get("linear-signature");

  const scopeId = payload.scopeId;
  if (!scopeId) {
    return Response.json({ error: "Missing scopeId" }, { status: 400 });
  }

  await tasks.trigger<typeof ingestSignalTask>("ingest-signal", {
    source: "linear",
    payload,
    scopeId,
  });

  return Response.json({ ok: true });
}

import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { ingestSignalTask } from "@/trigger/ingest-signal";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Handle Slack URL verification challenge
  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  // TODO: Verify Slack request signature
  // const signature = req.headers.get("x-slack-signature");

  const scopeId = payload.scopeId;
  if (!scopeId) {
    return Response.json({ error: "Missing scopeId" }, { status: 400 });
  }

  await tasks.trigger<typeof ingestSignalTask>("ingest-signal", {
    source: "slack",
    payload,
    scopeId,
  });

  return Response.json({ ok: true });
}

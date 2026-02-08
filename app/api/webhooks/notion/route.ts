import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { ingestSignalTask } from "@/trigger/ingest-signal";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Handle Notion webhook verification challenge
  if (payload.type === "url_verification" || payload.verification_token) {
    console.log("Notion verification token:", payload.verification_token);
    return Response.json({ challenge: payload.challenge });
  }

  // TODO: Verify Notion webhook signature

  const scopeId = payload.scopeId;
  if (!scopeId) {
    return Response.json({ error: "Missing scopeId" }, { status: 400 });
  }

  await tasks.trigger<typeof ingestSignalTask>("ingest-signal", {
    source: "notion",
    payload,
    scopeId,
  });

  return Response.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: connections } = await supabase
    .from("connections")
    .select("provider, metadata, created_at, updated_at")
    .eq("user_id", user.id);

  // Build a map of provider → connection info
  const connected: Record<string, { metadata: Record<string, unknown>; connectedAt: string }> = {};
  for (const conn of connections ?? []) {
    connected[conn.provider] = {
      metadata: conn.metadata,
      connectedAt: conn.created_at,
    };
  }

  return NextResponse.json({ connected });
}

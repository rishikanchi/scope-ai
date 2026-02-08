import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeId = searchParams.get("scopeId");
  const source = searchParams.get("source");
  const kind = searchParams.get("kind");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  if (!scopeId) {
    return Response.json({ error: "scopeId required" }, { status: 400 });
  }

  let query = supabase
    .from("signals")
    .select("*")
    .eq("scope_id", scopeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (source) query = query.eq("source", source);
  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ signals: data });
}

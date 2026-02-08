import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PROVIDERS } from "@/lib/integrations/providers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!PROVIDERS[provider]) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

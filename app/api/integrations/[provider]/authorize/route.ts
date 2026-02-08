import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PROVIDERS, getCallbackUrl } from "@/lib/integrations/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = PROVIDERS[provider];

  if (!config) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (!config.clientId) {
    return NextResponse.json(
      { error: `${config.name} OAuth is not configured. Set ${provider.toUpperCase()}_CLIENT_ID in env.` },
      { status: 500 }
    );
  }

  // Verify the user is authenticated
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build state param with user ID for CSRF-like protection
  const state = Buffer.from(JSON.stringify({ userId: user.id, provider })).toString("base64url");

  const authParams = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getCallbackUrl(provider),
    state,
    ...(config.scopes ? { scope: config.scopes } : {}),
    ...config.extraAuthParams,
  });

  // For providers that don't set response_type in extraAuthParams, default to "code"
  if (!authParams.has("response_type")) {
    authParams.set("response_type", "code");
  }

  const authUrl = `${config.authUrl}?${authParams.toString()}`;
  return NextResponse.redirect(authUrl);
}

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
    return respondWithError("Unknown provider");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return respondWithError(`Authorization denied: ${error}`);
  }

  if (!code || !state) {
    return respondWithError("Missing code or state parameter");
  }

  // Decode and validate state
  let stateData: { userId: string; provider: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return respondWithError("Invalid state parameter");
  }

  if (stateData.provider !== provider) {
    return respondWithError("State mismatch");
  }

  // Verify the user is authenticated and matches state
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== stateData.userId) {
    return respondWithError("Authentication mismatch");
  }

  // Exchange code for token
  const tokenBody: Record<string, string> = {
    code,
    redirect_uri: getCallbackUrl(provider),
    grant_type: "authorization_code",
  };

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.useBasicAuth) {
    // Notion uses Basic auth header
    headers["Authorization"] =
      "Basic " + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    headers["Content-Type"] = "application/json";
  } else {
    tokenBody.client_id = config.clientId;
    tokenBody.client_secret = config.clientSecret;
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers,
      body: config.useBasicAuth
        ? JSON.stringify(tokenBody)
        : new URLSearchParams(tokenBody).toString(),
    });
  } catch (err) {
    return respondWithError(`Failed to exchange token: ${err}`);
  }

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    return respondWithError(
      tokenData.error_description ?? tokenData.error ?? "Token exchange failed"
    );
  }

  // Parse provider-specific response
  const parsed = config.parseTokenResponse(tokenData);

  if (!parsed.access_token) {
    return respondWithError("No access token received");
  }

  // Upsert connection in database
  const { error: dbError } = await supabase.from("connections").upsert(
    {
      user_id: user.id,
      provider,
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token ?? null,
      token_expires_at: parsed.expires_in
        ? new Date(Date.now() + parsed.expires_in * 1000).toISOString()
        : null,
      scope: parsed.scope ?? null,
      metadata: parsed.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (dbError) {
    return respondWithError(`Failed to save connection: ${dbError.message}`);
  }

  // Return HTML that closes the popup and notifies the opener
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "oauth_complete", provider: "${provider}" }, "*");
    window.close();
  } else {
    window.location.href = "/onboarding";
  }
</script>
<p>Connected to ${config.name}! You can close this window.</p>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

function respondWithError(message: string) {
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Connection Error</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "oauth_error", error: ${JSON.stringify(message)} }, "*");
    setTimeout(() => window.close(), 3000);
  }
</script>
<p style="color: red; font-family: sans-serif;">Error: ${message}</p>
<p style="font-family: sans-serif;">This window will close automatically.</p>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

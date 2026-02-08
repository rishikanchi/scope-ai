import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface Resource {
  id: string;
  provider: string;
  label: string;
  type: string;
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use admin client to read connections (bypasses RLS, always works)
  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("connections")
    .select("provider, access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ resources: [] });
  }

  const resources: Resource[] = [];

  const fetchers = connections.map(async (conn) => {
    try {
      // Refresh expired tokens (Gmail/Google)
      let token = conn.access_token;
      if (conn.token_expires_at && conn.refresh_token) {
        const expiresAt = new Date(conn.token_expires_at).getTime();
        const now = Date.now();
        // Refresh if expired or expiring within 5 minutes
        if (now > expiresAt - 5 * 60 * 1000) {
          const refreshed = await refreshGoogleToken(conn.refresh_token);
          if (refreshed) {
            token = refreshed.access_token;
            // Update stored token in DB
            await admin
              .from("connections")
              .update({
                access_token: refreshed.access_token,
                token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)
              .eq("provider", conn.provider);
            console.log(`[resources] Refreshed ${conn.provider} token`);
          } else {
            console.error(`[resources] Failed to refresh ${conn.provider} token`);
            return [];
          }
        }
      }

      switch (conn.provider) {
        case "slack":
          return await fetchSlackResources(token);
        case "github":
          return await fetchGitHubResources(token);
        case "linear":
          return await fetchLinearResources(token);
        case "notion":
          return await fetchNotionResources(token);
        case "gmail":
          return await fetchGmailResources(token);
        default:
          return [];
      }
    } catch (err) {
      console.error(`[resources] Exception for ${conn.provider}:`, err);
      return [];
    }
  });

  const results = await Promise.all(fetchers);
  for (const result of results) {
    resources.push(...result);
  }

  return NextResponse.json({ resources });
}

// ── Token refresh ──

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[resources] Google token refresh failed:", res.status, errData);
      return null;
    }

    const data = await res.json();
    return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
  } catch (err) {
    console.error("[resources] Google token refresh exception:", err);
    return null;
  }
}

// ── Resource fetchers ──

async function fetchSlackResources(token: string): Promise<Resource[]> {
  const res = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100&exclude_archived=true", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("[resources] Slack API error:", data.error);
    return [];
  }

  return (data.channels ?? [])
    .filter((ch: any) => !ch.is_archived)
    .map((ch: any) => ({
      id: `slack:${ch.id}`,
      provider: "slack",
      label: `#${ch.name}`,
      type: ch.is_private ? "private channel" : "channel",
    }));
}

async function fetchGitHubResources(token: string): Promise<Resource[]> {
  const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator,organization_member", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    console.error("[resources] GitHub API error:", res.status, res.statusText);
    return [];
  }
  const repos = await res.json();

  return (repos ?? []).map((repo: any) => ({
    id: `github:${repo.full_name}`,
    provider: "github",
    label: repo.full_name,
    type: "repo",
  }));
}

async function fetchLinearResources(token: string): Promise<Resource[]> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{
        teams { nodes { id name } }
        projects { nodes { id name } }
      }`,
    }),
  });
  if (!res.ok) {
    console.error("[resources] Linear API error:", res.status, res.statusText);
    return [];
  }
  const data = await res.json();

  const resources: Resource[] = [];

  for (const team of data.data?.teams?.nodes ?? []) {
    resources.push({
      id: `linear:team:${team.id}`,
      provider: "linear",
      label: `${team.name} (team)`,
      type: "team",
    });
  }

  for (const project of data.data?.projects?.nodes ?? []) {
    resources.push({
      id: `linear:project:${project.id}`,
      provider: "linear",
      label: `${project.name} (project)`,
      type: "project",
    });
  }

  return resources;
}

async function fetchNotionResources(token: string): Promise<Resource[]> {
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "database" },
      page_size: 20,
    }),
  });
  if (!res.ok) {
    console.error("[resources] Notion API error:", res.status, res.statusText);
    return [];
  }
  const data = await res.json();

  const resources: Resource[] = [];

  for (const db of data.results ?? []) {
    const title = db.title?.[0]?.plain_text ?? "Untitled";
    resources.push({
      id: `notion:db:${db.id}`,
      provider: "notion",
      label: title,
      type: "database",
    });
  }

  // Also fetch top-level pages
  const pagesRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      page_size: 20,
    }),
  });
  if (pagesRes.ok) {
    const pagesData = await pagesRes.json();
    for (const page of pagesData.results ?? []) {
      const title =
        page.properties?.title?.title?.[0]?.plain_text ??
        page.properties?.Name?.title?.[0]?.plain_text ??
        "Untitled page";
      resources.push({
        id: `notion:page:${page.id}`,
        provider: "notion",
        label: title,
        type: "page",
      });
    }
  }

  return resources;
}

async function fetchGmailResources(token: string): Promise<Resource[]> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[resources] Gmail API error:", res.status, res.statusText);
    return [];
  }
  const data = await res.json();

  // System labels to show (useful ones)
  const showSystemLabels = new Set(["INBOX", "SENT", "STARRED", "IMPORTANT"]);
  // System labels to hide (noise)
  const hideLabels = new Set(["SPAM", "TRASH", "DRAFT", "CHAT", "UNREAD", "CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_UPDATES", "CATEGORY_FORUMS", "CATEGORY_PROMOTIONS"]);

  return (data.labels ?? [])
    .filter((l: any) => {
      if (hideLabels.has(l.id)) return false;
      if (l.type === "system") return showSystemLabels.has(l.id);
      return true;
    })
    .map((l: any) => ({
      id: `gmail:${l.id}`,
      provider: "gmail",
      label: l.name,
      type: l.type === "system" ? "folder" : "label",
    }));
}

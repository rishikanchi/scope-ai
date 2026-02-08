import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { scopeId, addedDatasources, removedDatasources } = await req.json();

  // 1. Authenticate
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const errors: string[] = [];
  let insertedCount = 0;

  // 2. Delete signals from removed datasources
  if (removedDatasources && removedDatasources.length > 0) {
    const { error } = await admin
      .from("signals")
      .delete()
      .eq("scope_id", scopeId)
      .in("datasource_id", removedDatasources);
    if (error) errors.push(`Delete failed: ${error.message}`);
  }

  // 3. Backfill signals from added datasources
  if (addedDatasources && addedDatasources.length > 0) {
    // Get user's access tokens via admin client (bypasses RLS)
    const { data: connections, error: connError } = await admin
      .from("connections")
      .select("provider, access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id);

    if (connError) {
      return Response.json(
        { ok: false, error: `Failed to read connections: ${connError.message}`, insertedCount: 0 },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return Response.json({
        ok: false,
        error: "No integrations connected. Go to Settings to connect GitHub, Slack, etc.",
        insertedCount: 0,
      });
    }

    // Build token map, refreshing expired tokens (Gmail)
    const tokenMap: Record<string, string> = {};
    for (const c of connections) {
      let token = c.access_token;
      if (c.token_expires_at && c.refresh_token) {
        const expiresAt = new Date(c.token_expires_at).getTime();
        if (Date.now() > expiresAt - 5 * 60 * 1000) {
          const refreshed = await refreshGoogleToken(c.refresh_token);
          if (refreshed) {
            token = refreshed.access_token;
            await admin
              .from("connections")
              .update({
                access_token: refreshed.access_token,
                token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)
              .eq("provider", c.provider);
          } else {
            errors.push(`${c.provider} token expired and refresh failed`);
            continue;
          }
        }
      }
      tokenMap[c.provider] = token;
    }

    // Group datasources by provider
    const byProvider: Record<string, string[]> = {};
    for (const ds of addedDatasources) {
      const provider = ds.split(":")[0];
      if (!byProvider[provider]) byProvider[provider] = [];
      byProvider[provider].push(ds);
    }

    const signals: any[] = [];

    for (const [provider, dsIds] of Object.entries(byProvider)) {
      const token = tokenMap[provider];
      if (!token) {
        errors.push(`No ${provider} token found — connect ${provider} in Settings first`);
        continue;
      }

      try {
        switch (provider) {
          case "github":
            signals.push(...(await fetchGitHub(token, dsIds, scopeId)));
            break;
          case "slack":
            signals.push(...(await fetchSlack(token, dsIds, scopeId)));
            break;
          case "linear":
            signals.push(...(await fetchLinear(token, dsIds, scopeId)));
            break;
          case "notion":
            signals.push(...(await fetchNotion(token, dsIds, scopeId)));
            break;
          case "gmail":
            signals.push(...(await fetchGmail(token, dsIds, scopeId)));
            break;
        }
      } catch (err: any) {
        errors.push(`${provider} fetch failed: ${err.message}`);
      }
    }

    console.log(`[sync] Fetched ${signals.length} signals for scope ${scopeId}`);

    if (signals.length > 0) {
      // Insert signals one by one to handle partial failures gracefully
      for (const sig of signals) {
        const { error: insertErr } = await admin
          .from("signals")
          .insert(sig);

        if (insertErr) {
          // 23505 = unique_violation (duplicate) — skip silently
          if (insertErr.code === "23505") {
            continue;
          }
          // 42703 = undefined_column — likely datasource_id column missing
          if (insertErr.code === "42703" && sig.datasource_id !== undefined) {
            const { datasource_id: _, ...sigWithout } = sig;
            const { error: fallbackErr } = await admin.from("signals").insert(sigWithout);
            if (!fallbackErr) {
              insertedCount++;
              continue;
            }
          }
          console.error(`[sync] Insert failed for ${sig.external_id}: [${insertErr.code}] ${insertErr.message}`);
          // Only push the first unique error message to avoid flooding
          if (!errors.includes(insertErr.message)) {
            errors.push(insertErr.message);
          }
        } else {
          insertedCount++;
        }
      }
    } else if (errors.length === 0) {
      errors.push("No signals found from the selected data sources");
    }
  }

  console.log(`[sync] Done: ${insertedCount} inserted, ${errors.length} errors`);

  return Response.json({
    ok: errors.length === 0,
    insertedCount,
    errors: errors.length > 0 ? errors : undefined,
  });
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
    if (!res.ok) return null;
    const data = await res.json();
    return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
  } catch {
    return null;
  }
}

// ── Fetchers ──

async function fetchGitHub(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

  for (const ds of dsIds) {
    const repo = ds.replace("github:", "");

    const [issuesRes, prsRes, commitsRes, readmeRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/issues?state=all&sort=updated&per_page=10&direction=desc`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&per_page=10&direction=desc`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=30`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/readme`, { headers }),
      fetch(`https://api.github.com/repos/${repo}`, { headers }),
    ]);

    // Issues
    if (issuesRes.ok) {
      const issues = await issuesRes.json();
      for (const issue of issues) {
        if (issue.pull_request) continue;
        signals.push({
          scope_id: scopeId,
          source: "github",
          kind: "ticket",
          severity: null,
          title: issue.title,
          body: issue.body?.slice(0, 2000) ?? null,
          url: issue.html_url,
          metadata: { author: issue.user?.login, repo, labels: issue.labels?.map((l: any) => l.name) },
          external_id: `github-issue-${issue.id}`,
          source_ts: issue.created_at,
          datasource_id: ds,
        });
      }
    } else {
      console.error(`[sync] GitHub issues failed for ${repo}: ${issuesRes.status} ${issuesRes.statusText}`);
    }

    // Pull requests
    if (prsRes.ok) {
      const prs = await prsRes.json();
      for (const pr of prs) {
        signals.push({
          scope_id: scopeId,
          source: "github",
          kind: "pr",
          severity: null,
          title: pr.title,
          body: pr.body?.slice(0, 2000) ?? null,
          url: pr.html_url,
          metadata: { author: pr.user?.login, repo, state: pr.state, merged: pr.merged },
          external_id: `github-pr-${pr.id}`,
          source_ts: pr.created_at,
          datasource_id: ds,
        });
      }
    } else {
      console.error(`[sync] GitHub PRs failed for ${repo}: ${prsRes.status} ${prsRes.statusText}`);
    }

    // Recent commits
    if (commitsRes.ok) {
      const commits = await commitsRes.json();
      for (const c of commits) {
        const msg = c.commit?.message ?? "";
        signals.push({
          scope_id: scopeId,
          source: "github",
          kind: "commit",
          severity: null,
          title: msg.split("\n")[0].slice(0, 200),
          body: msg.slice(0, 2000),
          url: c.html_url,
          metadata: { author: c.commit?.author?.name ?? c.author?.login, sha: c.sha, repo },
          external_id: `github-commit-${c.sha}`,
          source_ts: c.commit?.author?.date ?? null,
          datasource_id: ds,
        });
      }
    } else {
      console.error(`[sync] GitHub commits failed for ${repo}: ${commitsRes.status} ${commitsRes.statusText}`);
    }

    // README
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      let readmeContent: string | null = null;
      if (readmeData.content) {
        try {
          readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8").slice(0, 4000);
        } catch { /* ignore decode errors */ }
      }
      signals.push({
        scope_id: scopeId,
        source: "github",
        kind: "doc",
        severity: null,
        title: `README — ${repo}`,
        body: readmeContent,
        url: readmeData.html_url,
        metadata: { repo, path: readmeData.path },
        external_id: `github-readme-${repo.replace("/", "-")}`,
        source_ts: null,
        datasource_id: ds,
      });
    }

    // Repo metadata
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      signals.push({
        scope_id: scopeId,
        source: "github",
        kind: "metadata",
        severity: null,
        title: repoData.full_name,
        body: repoData.description ?? null,
        url: repoData.html_url,
        metadata: {
          language: repoData.language,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          topics: repoData.topics,
          default_branch: repoData.default_branch,
          open_issues_count: repoData.open_issues_count,
          created_at: repoData.created_at,
          pushed_at: repoData.pushed_at,
        },
        external_id: `github-repo-${repoData.id}`,
        source_ts: repoData.pushed_at,
        datasource_id: ds,
      });
    }
  }

  return signals;
}

async function fetchSlack(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];

  for (const ds of dsIds) {
    const channelId = ds.replace("slack:", "");

    const res = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (!data.ok) {
      console.error(`[sync] Slack API error for ${channelId}:`, data.error);
      continue;
    }

    for (const msg of data.messages ?? []) {
      if (msg.subtype) continue;
      signals.push({
        scope_id: scopeId,
        source: "slack",
        kind: "message",
        severity: null,
        title: null,
        body: msg.text?.slice(0, 2000) ?? null,
        url: null,
        metadata: { channel: channelId, user: msg.user, thread_ts: msg.thread_ts },
        external_id: `slack-${channelId}-${msg.ts}`,
        source_ts: new Date(Number(msg.ts) * 1000).toISOString(),
        datasource_id: ds,
      });
    }
  }

  return signals;
}

async function fetchLinear(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];

  const teamIds = dsIds.filter((d) => d.includes(":team:")).map((d) => d.split(":")[2]);
  const projectIds = dsIds.filter((d) => d.includes(":project:")).map((d) => d.split(":")[2]);

  const filters: string[] = [];
  if (teamIds.length > 0) filters.push(`{ team: { id: { in: [${teamIds.map((id) => `"${id}"`).join(",")}] } } }`);
  if (projectIds.length > 0) filters.push(`{ project: { id: { in: [${projectIds.map((id) => `"${id}"`).join(",")}] } } }`);

  if (filters.length === 0) return signals;

  const query = `{
    issues(
      first: 20
      orderBy: updatedAt
      filter: { or: [${filters.join(",")}] }
    ) {
      nodes {
        id title description url priority createdAt
        state { name }
        assignee { name }
        team { id name }
        project { id name }
        labels { nodes { name } }
      }
    }
  }`;

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`[sync] Linear API failed: ${res.status} ${res.statusText}`);
    return signals;
  }
  const data = await res.json();

  for (const issue of data.data?.issues?.nodes ?? []) {
    let dsId = dsIds[0];
    if (issue.team?.id && teamIds.includes(issue.team.id)) dsId = `linear:team:${issue.team.id}`;
    else if (issue.project?.id && projectIds.includes(issue.project.id)) dsId = `linear:project:${issue.project.id}`;

    signals.push({
      scope_id: scopeId,
      source: "linear",
      kind: "ticket",
      severity: issue.priority <= 1 ? "high" : issue.priority === 2 ? "medium" : "low",
      title: issue.title,
      body: issue.description?.slice(0, 2000) ?? null,
      url: issue.url,
      metadata: {
        assignee: issue.assignee?.name,
        status: issue.state?.name,
        labels: issue.labels?.nodes?.map((l: any) => l.name),
        team: issue.team?.name,
        project: issue.project?.name,
      },
      external_id: `linear-${issue.id}`,
      source_ts: issue.createdAt,
      datasource_id: dsId,
    });
  }

  return signals;
}

async function fetchNotion(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  for (const ds of dsIds) {
    const parts = ds.split(":");
    const type = parts[1];
    const id = parts[2];

    if (type === "db") {
      const res = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ page_size: 20, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] }),
      });
      if (!res.ok) continue;
      const data = await res.json();

      // Fetch body content for first 5 pages to avoid rate limits
      const pages = data.results ?? [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const body = i < 5 ? await fetchNotionPageBody(page.id, headers) : null;
        signals.push({
          scope_id: scopeId,
          source: "notion",
          kind: "doc",
          severity: null,
          title: extractNotionTitle(page),
          body,
          url: page.url,
          metadata: { parent_db: id, last_edited_by: page.last_edited_by?.name },
          external_id: `notion-${page.id}`,
          source_ts: page.last_edited_time,
          datasource_id: ds,
        });
      }
    } else if (type === "page") {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers });
      if (!res.ok) continue;
      const page = await res.json();
      const body = await fetchNotionPageBody(page.id, headers);
      signals.push({
        scope_id: scopeId,
        source: "notion",
        kind: "doc",
        severity: null,
        title: extractNotionTitle(page),
        body,
        url: page.url,
        metadata: { last_edited_by: page.last_edited_by?.name },
        external_id: `notion-${page.id}`,
        source_ts: page.last_edited_time,
        datasource_id: ds,
      });
    }
  }

  return signals;
}

async function fetchNotionPageBody(pageId: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers });
    if (!res.ok) return null;
    const data = await res.json();

    const textParts: string[] = [];
    for (const block of data.results ?? []) {
      const richTexts =
        block.paragraph?.rich_text ??
        block.heading_1?.rich_text ??
        block.heading_2?.rich_text ??
        block.heading_3?.rich_text ??
        block.bulleted_list_item?.rich_text ??
        block.numbered_list_item?.rich_text ??
        block.to_do?.rich_text ??
        block.toggle?.rich_text ??
        block.callout?.rich_text ??
        block.quote?.rich_text;

      if (richTexts) {
        const text = richTexts.map((rt: any) => rt.plain_text).join("");
        if (text) textParts.push(text);
      }
    }

    const body = textParts.join("\n").slice(0, 3000);
    return body || null;
  } catch {
    return null;
  }
}

function extractNotionTitle(page: any): string {
  const props = page.properties ?? {};
  for (const key of Object.keys(props)) {
    if (props[key]?.type === "title" && props[key].title?.[0]?.plain_text) {
      return props[key].title[0].plain_text;
    }
  }
  return "Untitled";
}

async function fetchGmail(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];
  const headers = { Authorization: `Bearer ${token}` };

  for (const ds of dsIds) {
    const labelId = ds.replace("gmail:", "");

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=10`,
      { headers }
    );
    if (!listRes.ok) continue;
    const listData = await listRes.json();

    for (const item of listData.messages ?? []) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const getHeader = (name: string) =>
        msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

      signals.push({
        scope_id: scopeId,
        source: "gmail",
        kind: "email",
        severity: null,
        title: getHeader("Subject"),
        body: msg.snippet?.slice(0, 2000) ?? null,
        url: null,
        metadata: { from: getHeader("From"), label: labelId, thread_id: msg.threadId },
        external_id: `gmail-${msg.id}`,
        source_ts: getHeader("Date") ? new Date(getHeader("Date")).toISOString() : null,
        datasource_id: ds,
      });
    }
  }

  return signals;
}

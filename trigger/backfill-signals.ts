import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const backfillSignalsTask = schemaTask({
  id: "backfill-signals",
  schema: z.object({
    scopeId: z.string().uuid(),
    userId: z.string().uuid(),
    datasources: z.array(z.string()),
  }),
  maxDuration: 120,
  run: async ({ scopeId, userId, datasources }) => {
    const supabase = createAdminClient();

    // Get user's connections (access tokens)
    const { data: connections } = await supabase
      .from("connections")
      .select("provider, access_token")
      .eq("user_id", userId);

    if (!connections || connections.length === 0) return { inserted: 0 };

    const tokenMap: Record<string, string> = {};
    for (const c of connections) tokenMap[c.provider] = c.access_token;

    // Group datasources by provider
    const byProvider: Record<string, string[]> = {};
    for (const ds of datasources) {
      const provider = ds.split(":")[0];
      if (!byProvider[provider]) byProvider[provider] = [];
      byProvider[provider].push(ds);
    }

    const signals: any[] = [];

    for (const [provider, dsIds] of Object.entries(byProvider)) {
      const token = tokenMap[provider];
      if (!token) continue;

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
      } catch (err) {
        console.error(`Backfill failed for ${provider}:`, err);
      }
    }

    if (signals.length === 0) return { inserted: 0 };

    // Batch upsert (dedup on external_id)
    const { data } = await supabase
      .from("signals")
      .upsert(signals, { onConflict: "external_id" })
      .select("id");

    return { inserted: data?.length ?? 0 };
  },
});

// ── Fetchers ──

async function fetchGitHub(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];

  for (const ds of dsIds) {
    // ds format: "github:owner/repo"
    const repo = ds.replace("github:", "");
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

    // Fetch recent issues
    const issuesRes = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&sort=updated&per_page=10&direction=desc`,
      { headers }
    );
    if (issuesRes.ok) {
      const issues = await issuesRes.json();
      for (const issue of issues) {
        if (issue.pull_request) continue; // skip PRs in issues endpoint
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
    }

    // Fetch recent PRs
    const prsRes = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&per_page=10&direction=desc`,
      { headers }
    );
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
    }
  }

  return signals;
}

async function fetchSlack(token: string, dsIds: string[], scopeId: string) {
  const signals: any[] = [];

  for (const ds of dsIds) {
    // ds format: "slack:C0123ABCDEF"
    const channelId = ds.replace("slack:", "");

    const res = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (!data.ok) continue;

    for (const msg of data.messages ?? []) {
      if (msg.subtype) continue; // skip join/leave/etc
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

  // Build filter
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
  if (!res.ok) return signals;
  const data = await res.json();

  for (const issue of data.data?.issues?.nodes ?? []) {
    // Determine which datasource this belongs to
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
    // ds formats: "notion:db:UUID" or "notion:page:UUID"
    const parts = ds.split(":");
    const type = parts[1];
    const id = parts[2];

    if (type === "db") {
      // Query database for recent entries
      const res = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ page_size: 20, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] }),
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const page of data.results ?? []) {
        const title = extractNotionTitle(page);
        signals.push({
          scope_id: scopeId,
          source: "notion",
          kind: "doc",
          severity: null,
          title,
          body: null,
          url: page.url,
          metadata: { parent_db: id, last_edited_by: page.last_edited_by?.name },
          external_id: `notion-${page.id}`,
          source_ts: page.last_edited_time,
          datasource_id: ds,
        });
      }
    } else if (type === "page") {
      // Fetch the page itself
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers });
      if (!res.ok) continue;
      const page = await res.json();
      const title = extractNotionTitle(page);
      signals.push({
        scope_id: scopeId,
        source: "notion",
        kind: "doc",
        severity: null,
        title,
        body: null,
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
    // ds format: "gmail:LABEL_ID"
    const labelId = ds.replace("gmail:", "");

    // List recent message IDs for this label
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=10`,
      { headers }
    );
    if (!listRes.ok) continue;
    const listData = await listRes.json();

    for (const item of listData.messages ?? []) {
      // Fetch individual message metadata
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

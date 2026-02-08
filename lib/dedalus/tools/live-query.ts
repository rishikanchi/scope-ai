import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creates a tool function compatible with Dedalus SDK's schema extraction.
 */
function defineTool(
  name: string,
  description: string,
  paramNames: string[],
  impl: (args: Record<string, any>) => any
) {
  let wrapper: any;
  if (paramNames.length === 1) {
    const p = paramNames[0];
    wrapper = new Function(
      "__impl__",
      `return function ${name}(${p}) { ` +
        `if (typeof ${p} === "object" && ${p} !== null && "${p}" in ${p}) { return __impl__(${p}); } ` +
        `return __impl__({ ${p}: ${p} }); }`
    )(impl);
  } else {
    const paramList = paramNames.join(", ");
    const body = `return __impl__({ ${paramNames.map((p) => `${p}: ${p}`).join(", ")} })`;
    wrapper = new Function("__impl__", `return function ${name}(${paramList}) { ${body} }`)(impl);
  }
  wrapper.description = description;
  return wrapper;
}

async function getToken(userId: string, provider: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  if (!data) return null;

  // Refresh expired Google tokens
  if (data.token_expires_at && data.refresh_token) {
    const expiresAt = new Date(data.token_expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID ?? "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            refresh_token: data.refresh_token,
            grant_type: "refresh_token",
          }).toString(),
        });
        if (res.ok) {
          const refreshed = await res.json();
          await admin
            .from("connections")
            .update({
              access_token: refreshed.access_token,
              token_expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("provider", provider);
          return refreshed.access_token;
        }
      } catch { /* fall through to use existing token */ }
    }
  }

  return data.access_token;
}

export function createLiveQueryTools(userId: string) {
  const query_github = defineTool(
    "query_github",
    "Query GitHub API live using the user's connected GitHub account. The repo arg is 'owner/name'. The endpoint arg is one of: commits, pulls, issues, readme, tree, or a file path like 'contents/src/index.ts'. Returns raw API response.",
    ["repo", "endpoint"],
    async (args) => {
      const token = await getToken(userId, "github");
      if (!token) return { error: "GitHub not connected. Connect GitHub in Settings first." };

      const repo = args.repo;
      const endpoint = args.endpoint || "readme";
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

      let url: string;
      switch (endpoint) {
        case "commits":
          url = `https://api.github.com/repos/${repo}/commits?per_page=20`;
          break;
        case "pulls":
          url = `https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&per_page=20`;
          break;
        case "issues":
          url = `https://api.github.com/repos/${repo}/issues?state=all&sort=updated&per_page=20`;
          break;
        case "readme":
          url = `https://api.github.com/repos/${repo}/readme`;
          break;
        case "tree": {
          // First get default branch, then tree
          const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers });
          if (!repoRes.ok) return { error: `Failed to fetch repo: ${repoRes.status}` };
          const repoData = await repoRes.json();
          url = `https://api.github.com/repos/${repo}/git/trees/${repoData.default_branch}?recursive=1`;
          break;
        }
        default:
          // Treat as a file path: contents/path/to/file
          if (endpoint.startsWith("contents/")) {
            url = `https://api.github.com/repos/${repo}/${endpoint}`;
          } else {
            url = `https://api.github.com/repos/${repo}/contents/${endpoint}`;
          }
      }

      const res = await fetch(url, { headers });
      if (!res.ok) return { error: `GitHub API ${res.status}: ${res.statusText}` };
      const data = await res.json();

      // Decode base64 file content if present
      if (data.content && data.encoding === "base64") {
        try {
          data.decoded_content = Buffer.from(data.content, "base64").toString("utf-8").slice(0, 8000);
          delete data.content; // Remove raw base64 to save tokens
        } catch { /* keep original */ }
      }

      // Trim large arrays to avoid token overflow
      if (Array.isArray(data)) {
        return data.slice(0, 30).map((item: any) => {
          if (item.commit) {
            return { sha: item.sha, message: item.commit.message, author: item.commit.author?.name, date: item.commit.author?.date, url: item.html_url };
          }
          if (item.title) {
            return { id: item.id, title: item.title, state: item.state, user: item.user?.login, url: item.html_url, created_at: item.created_at };
          }
          // Tree entries
          if (item.path) {
            return { path: item.path, type: item.type, size: item.size };
          }
          return item;
        });
      }

      // Trim tree response
      if (data.tree && Array.isArray(data.tree)) {
        data.tree = data.tree.slice(0, 100).map((t: any) => ({ path: t.path, type: t.type, size: t.size }));
        data.truncated_by_tool = data.tree.length > 100;
      }

      return data;
    }
  );

  const query_slack = defineTool(
    "query_slack",
    "Search Slack messages in a channel using the user's connected Slack account. Pass channel_id (e.g. C01234ABC) and an optional query to filter messages by text. Returns recent messages.",
    ["channel_id", "query"],
    async (args) => {
      const token = await getToken(userId, "slack");
      if (!token) return { error: "Slack not connected. Connect Slack in Settings first." };

      const channelId = args.channel_id;
      const query = args.query || "";

      const res = await fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { error: `Slack API ${res.status}` };
      const data = await res.json();
      if (!data.ok) return { error: `Slack error: ${data.error}` };

      let messages = (data.messages ?? [])
        .filter((m: any) => !m.subtype)
        .map((m: any) => ({
          user: m.user,
          text: m.text?.slice(0, 500),
          ts: m.ts,
          thread_ts: m.thread_ts,
          reactions: m.reactions?.map((r: any) => `${r.name}(${r.count})`),
        }));

      // Client-side text filter
      if (query) {
        const q = query.toLowerCase();
        messages = messages.filter((m: any) => m.text?.toLowerCase().includes(q));
      }

      return { channel: channelId, message_count: messages.length, messages: messages.slice(0, 30) };
    }
  );

  const query_notion = defineTool(
    "query_notion",
    "Fetch the full content of a Notion page using the user's connected Notion account. Pass the page_id (UUID). Returns the page title and all text content from blocks.",
    ["page_id"],
    async (args) => {
      const token = await getToken(userId, "notion");
      if (!token) return { error: "Notion not connected. Connect Notion in Settings first." };

      const pageId = args.page_id;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      };

      // Fetch page metadata
      const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
      if (!pageRes.ok) return { error: `Notion API ${pageRes.status}` };
      const page = await pageRes.json();

      // Extract title
      let title = "Untitled";
      const props = page.properties ?? {};
      for (const key of Object.keys(props)) {
        if (props[key]?.type === "title" && props[key].title?.[0]?.plain_text) {
          title = props[key].title[0].plain_text;
          break;
        }
      }

      // Fetch block children for body content
      const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers });
      if (!blocksRes.ok) return { title, body: null, url: page.url };
      const blocksData = await blocksRes.json();

      const textParts: string[] = [];
      for (const block of blocksData.results ?? []) {
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

      return { title, body: textParts.join("\n").slice(0, 5000), url: page.url };
    }
  );

  // ── Write Tools ──

  const create_linear_issue = defineTool(
    "create_linear_issue",
    "Create a new issue in Linear. Pass linear_id (the ID from datasources — can be a team ID or project ID, both work). Pass title and description. Optional: priority (0=none,1=urgent,2=high,3=medium,4=low).",
    ["linear_id", "title", "description", "priority"],
    async (args) => {
      const token = await getToken(userId, "linear");
      if (!token) return { error: "Linear not connected. Connect Linear in Settings first." };

      const headers = { Authorization: token, "Content-Type": "application/json" };
      let teamId = args.linear_id;

      // If this is a project ID, resolve it to a team ID
      // Try fetching as a project first to get its team
      const projectQuery = `query { project(id: "${teamId}") { id teams(first: 1) { nodes { id name } } } }`;
      try {
        const projRes = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers,
          body: JSON.stringify({ query: projectQuery }),
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          const resolvedTeam = projData.data?.project?.teams?.nodes?.[0]?.id;
          if (resolvedTeam) {
            teamId = resolvedTeam;
          }
        }
      } catch { /* Not a project ID or API error — use as-is (likely already a team ID) */ }

      const variables: Record<string, any> = {
        teamId,
        title: args.title,
        description: args.description || "",
      };
      if (args.priority && args.priority !== "") {
        variables.priority = parseInt(args.priority) || 0;
      }

      const mutation = `mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int) {
        issueCreate(input: { teamId: $teamId, title: $title, description: $description, priority: $priority }) {
          success
          issue { id identifier title url state { name } priority }
        }
      }`;

      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: mutation, variables }),
      });
      if (!res.ok) return { error: `Linear API ${res.status}: ${res.statusText}` };
      const data = await res.json();
      if (data.errors) return { error: data.errors[0]?.message ?? "Linear mutation failed" };
      return data.data?.issueCreate?.issue ?? { error: "No issue returned" };
    }
  );

  const post_slack_message = defineTool(
    "post_slack_message",
    "Post a message to a Slack channel. Pass channel_id (e.g. C01234ABC from datasources) and the message text.",
    ["channel_id", "text"],
    async (args) => {
      const token = await getToken(userId, "slack");
      if (!token) return { error: "Slack not connected. Connect Slack in Settings first." };

      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: args.channel_id, text: args.text }),
      });
      if (!res.ok) return { error: `Slack API ${res.status}` };
      const data = await res.json();
      if (!data.ok) return { error: `Slack error: ${data.error}` };
      return { ok: true, channel: data.channel, ts: data.ts, message: data.message?.text };
    }
  );

  const create_github_issue = defineTool(
    "create_github_issue",
    "Create a new issue on a GitHub repository. Pass repo (owner/name), title, and body (markdown).",
    ["repo", "title", "body"],
    async (args) => {
      const token = await getToken(userId, "github");
      if (!token) return { error: "GitHub not connected. Connect GitHub in Settings first." };

      const res = await fetch(`https://api.github.com/repos/${args.repo}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: args.title, body: args.body || "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: `GitHub API ${res.status}: ${err.message ?? res.statusText}` };
      }
      const issue = await res.json();
      return { id: issue.id, number: issue.number, title: issue.title, url: issue.html_url, state: issue.state };
    }
  );

  const create_notion_page = defineTool(
    "create_notion_page",
    "Create a new page in a Notion database. Pass database_id (from datasources, the ID after 'notion:db:'), title, and content (plain text body).",
    ["database_id", "title", "content"],
    async (args) => {
      const token = await getToken(userId, "notion");
      if (!token) return { error: "Notion not connected. Connect Notion in Settings first." };

      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          parent: { database_id: args.database_id },
          properties: {
            Name: { title: [{ text: { content: args.title } }] },
          },
          children: args.content ? [
            {
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: [{ type: "text", text: { content: args.content } }] },
            },
          ] : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: `Notion API ${res.status}: ${err.message ?? res.statusText}` };
      }
      const page = await res.json();
      return { id: page.id, url: page.url };
    }
  );

  return [
    query_github, query_slack, query_notion,
    create_linear_issue, post_slack_message, create_github_issue, create_notion_page,
  ];
}

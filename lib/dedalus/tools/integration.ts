import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creates a tool function compatible with Dedalus SDK's schema extraction.
 *
 * Dedalus uses fn.name for the tool name, fn.description for the description,
 * and parses the function source to extract parameter names.
 * When fn.length === 1, exec passes the whole args object as the first param.
 * When fn.length > 1, exec spreads Object.values(args) as positional params.
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

// ── Data Tools ──

const search_signals = defineTool(
  "search_signals",
  "Search for signals in the current scope by keyword. Returns matching signals with title, source, body, and metadata. Use this when the user asks about specific topics.",
  ["scope_id", "query"],
  (args) => {
    const supabase = createAdminClient();
    return supabase
      .from("signals")
      .select("id, title, source, kind, severity, body, url, metadata, source_ts")
      .eq("scope_id", args.scope_id)
      .ilike("title", `%${args.query}%`)
      .limit(20);
  }
);

const get_signals_by_scope = defineTool(
  "get_signals_by_scope",
  "Get all signals for a scope, ordered by most recent. Optionally filter by source (github, slack, linear, notion, gmail). Use this to get an overview of all data in a scope.",
  ["scope_id", "source"],
  (args) => {
    const supabase = createAdminClient();
    let query = supabase
      .from("signals")
      .select("id, title, source, kind, severity, body, url, metadata, source_ts")
      .eq("scope_id", args.scope_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (args.source && args.source !== "") {
      query = query.eq("source", args.source);
    }

    return query;
  }
);

const get_artifact = defineTool(
  "get_artifact",
  "Fetch a single artifact by its ID. Artifacts are saved outputs from synthesis, drafting, or orchestration workflows.",
  ["artifact_id"],
  (args) => {
    const supabase = createAdminClient();
    return supabase
      .from("artifacts")
      .select("*")
      .eq("id", args.artifact_id)
      .single();
  }
);

const update_artifact = defineTool(
  "update_artifact",
  "Update an existing artifact. Can change title, content (JSON object), or status. Pass empty string for fields you do not want to change.",
  ["artifact_id", "title", "content", "status"],
  (args) => {
    const supabase = createAdminClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (args.title && args.title !== "") updates.title = args.title;
    if (args.content && args.content !== "") {
      try {
        updates.content = typeof args.content === "string" ? JSON.parse(args.content) : args.content;
      } catch {
        updates.content = args.content;
      }
    }
    if (args.status && args.status !== "") updates.status = args.status;
    return supabase
      .from("artifacts")
      .update(updates)
      .eq("id", args.artifact_id)
      .select()
      .single();
  }
);

const list_artifacts = defineTool(
  "list_artifacts",
  "List all artifacts in a scope. Optionally filter by kind (synthesis, draft, orchestration_plan). Returns id, kind, title, status, and timestamps. Pass empty string for kind to list all.",
  ["scope_id", "kind"],
  (args) => {
    const supabase = createAdminClient();
    let query = supabase
      .from("artifacts")
      .select("id, kind, title, status, created_at, updated_at")
      .eq("scope_id", args.scope_id)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (args.kind && args.kind !== "") query = query.eq("kind", args.kind);
    return query;
  }
);

const get_scope_datasources = defineTool(
  "get_scope_datasources",
  "Get the list of datasources (GitHub repos, Slack channels, Linear teams, Notion pages, Gmail labels) configured for a scope. Returns each datasource's provider and resource identifier. Use this to discover what data sources are available before querying them.",
  ["scope_id"],
  async (args) => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("scopes")
      .select("datasources")
      .eq("id", args.scope_id)
      .single();
    if (!data) return { datasources: [] };
    const datasources = (data.datasources as string[] ?? []).map((id: string) => {
      const [provider, ...rest] = id.split(":");
      return { id, provider, resource: rest.join(":") };
    });
    return { datasources };
  }
);

export const integrationTools = [
  search_signals,
  get_signals_by_scope,
  get_artifact,
  update_artifact,
  list_artifacts,
  get_scope_datasources,
];

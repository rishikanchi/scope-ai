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

const render_insight_card = defineTool(
  "render_insight_card",
  "Display an insight card with severity, description, and inline evidence. evidence_json is a JSON array of objects with source (github/slack/linear/notion), title (the specific issue/PR/message name), and optional severity (high/medium/low). Each piece of evidence shows where this insight comes from. Evidence can be reused across multiple insight cards.",
  ["title", "description", "severity", "signal_count", "evidence_json"],
  (args) => {
    let evidence = args.evidence_json;
    if (typeof evidence === "string") {
      try { evidence = JSON.parse(evidence); } catch { evidence = []; }
    }
    if (!Array.isArray(evidence)) evidence = [];
    return {
      component: "insight_card",
      props: {
        title: args.title,
        description: args.description,
        severity: args.severity,
        signalCount: parseInt(args.signal_count) || 0,
        evidence,
      },
    };
  }
);

const render_linear_card = defineTool(
  "render_linear_card",
  "Display a Linear ticket card with status, assignee, and priority info. Pass empty string for optional fields.",
  ["ticket_id", "title", "status", "assignee", "priority"],
  (args) => ({
    component: "linear_card",
    props: {
      ticketId: args.ticket_id,
      title: args.title,
      status: args.status,
      assignee: args.assignee || undefined,
      priority: args.priority ? parseInt(args.priority) : undefined,
    },
  })
);

const render_signal_list = defineTool(
  "render_signal_list",
  "Display a list of signals as a table. Pass signals_json as a JSON string array of objects, each with source, title, and optional severity fields.",
  ["signals_json"],
  (args) => {
    let signals = args.signals_json;
    if (typeof signals === "string") {
      try { signals = JSON.parse(signals); } catch { signals = []; }
    }
    return { component: "signal_list", props: { signals } };
  }
);

const render_action_plan = defineTool(
  "render_action_plan",
  "Display an action plan with cross-service actions. Pass actions_json as a JSON string array of objects, each with service, title, description, and optional payload fields.",
  ["actions_json"],
  (args) => {
    let actions = args.actions_json;
    if (typeof actions === "string") {
      try { actions = JSON.parse(actions); } catch { actions = []; }
    }
    return { component: "action_plan", props: { actions } };
  }
);

const render_draft_card = defineTool(
  "render_draft_card",
  "Display a structured document with collapsible sections. Pass sections_json as a JSON string array of objects, each with heading and content fields. Status should be draft or final.",
  ["title", "sections_json", "status", "artifact_id"],
  (args) => {
    let sections = args.sections_json;
    if (typeof sections === "string") {
      try { sections = JSON.parse(sections); } catch { sections = []; }
    }
    return {
      component: "draft_card",
      props: {
        title: args.title,
        sections,
        status: args.status || "draft",
        artifactId: args.artifact_id || undefined,
      },
    };
  }
);

const render_form = defineTool(
  "render_form",
  "Display an editable confirmation form to the user BEFORE executing any write action. The user can review and edit all fields, then click Confirm. Pass title, description, action (the write tool to execute, e.g. 'create_linear_issue'), and fields_json as a JSON string array of objects with name, label, value, and optional type (text/textarea/select) and options (for select).",
  ["title", "description", "action", "fields_json"],
  (args) => {
    let fields = args.fields_json;
    if (typeof fields === "string") {
      try { fields = JSON.parse(fields); } catch { fields = []; }
    }
    return {
      component: "form",
      props: {
        title: args.title,
        description: args.description || undefined,
        action: args.action,
        fields,
      },
    };
  }
);

export const uiTools = [
  render_insight_card,
  render_linear_card,
  render_signal_list,
  render_action_plan,
  render_draft_card,
  render_form,
];

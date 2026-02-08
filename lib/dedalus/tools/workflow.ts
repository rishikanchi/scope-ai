import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { synthesizeTask } from "@/trigger/synthesize";
import type { orchestrateTask } from "@/trigger/orchestrate";
import type { draftTask } from "@/trigger/draft";

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

export function createWorkflowTools(scopeId: string, userId: string) {
  const run_synthesis = defineTool(
    "run_synthesis",
    "Analyze and synthesize all signals in the scope. Finds patterns, clusters related signals, and produces structured insights. Use when the user asks to analyze, summarize, or find patterns in their data.",
    ["query"],
    async (args) => {
      const query = args.query || "Analyze and synthesize all signals in this scope";
      const handle = await tasks.trigger<typeof synthesizeTask>("synthesize", {
        scopeId,
        query,
        userId,
      });
      const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
      return completed;
    }
  );

  const run_drafting = defineTool(
    "run_drafting",
    "Write a structured product document (PRD, spec, proposal, RFC). Reads signals for context and produces a multi-section document with Problem Statement, Impact, Proposed Solution, and Action Items.",
    ["prompt"],
    async (args) => {
      const prompt = args.prompt || "Write a product document based on the signals in this scope";
      const handle = await tasks.trigger<typeof draftTask>("draft", {
        scopeId,
        prompt,
        userId,
      });
      const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
      return completed;
    }
  );

  const run_orchestration = defineTool(
    "run_orchestration",
    "Execute actions across external services. Pass actions_json as a JSON string array of objects, each with service (linear/slack/notion/github), action (create_issue/post_message/etc), and payload (key-value pairs) fields.",
    ["actions_json"],
    async (args) => {
      let actions = args.actions_json;
      if (typeof actions === "string") {
        try { actions = JSON.parse(actions); } catch { return { error: "Invalid actions JSON" }; }
      }
      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        return { error: "No actions provided" };
      }
      const handle = await tasks.trigger<typeof orchestrateTask>("orchestrate", {
        scopeId,
        userId,
        actions,
      });
      const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
      return completed;
    }
  );

  return [run_synthesis, run_drafting, run_orchestration];
}

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import dedalus from "@/lib/dedalus/client";

export const ingestSignalTask = schemaTask({
  id: "ingest-signal",
  schema: z.object({
    source: z.enum(["linear", "github", "slack", "gmail", "notion"]),
    payload: z.record(z.any()),
    scopeId: z.string().uuid(),
    datasourceId: z.string().optional(),
  }),
  run: async ({ source, payload, scopeId, datasourceId }) => {
    const supabase = createAdminClient();

    // 1. Parse webhook payload into signal shape
    const signal = parseWebhookPayload(source, payload);

    // 2. Generate embedding via Dedalus/OpenAI
    const textToEmbed = `${signal.title ?? ""} ${signal.body ?? ""}`.trim();
    let embedding: number[] | null = null;

    if (textToEmbed) {
      const embeddingResponse = await dedalus.embeddings.create({
        model: "text-embedding-3-small",
        input: textToEmbed,
      });
      embedding = embeddingResponse.data[0].embedding as number[];
    }

    // 3. Upsert into signals table (dedup on external_id)
    const { data } = await supabase
      .from("signals")
      .upsert(
        {
          scope_id: scopeId,
          source,
          kind: signal.kind,
          severity: signal.severity,
          title: signal.title,
          body: signal.body,
          url: signal.url,
          metadata: signal.metadata,
          external_id: signal.external_id,
          datasource_id: datasourceId ?? null,
          embedding,
          source_ts: signal.source_ts,
        },
        { onConflict: "external_id" }
      )
      .select("id")
      .single();

    return { signalId: data?.id, source };
  },
});

function parseWebhookPayload(
  source: string,
  payload: Record<string, any>
): {
  kind: string;
  severity: string | null;
  title: string | null;
  body: string | null;
  url: string | null;
  metadata: Record<string, any>;
  external_id: string | null;
  source_ts: string | null;
} {
  switch (source) {
    case "linear":
      return {
        kind: "ticket",
        severity: payload.data?.priority <= 1 ? "high" : payload.data?.priority === 2 ? "medium" : "low",
        title: payload.data?.title ?? null,
        body: payload.data?.description ?? null,
        url: payload.url ?? null,
        metadata: {
          assignee: payload.data?.assignee?.name,
          status: payload.data?.state?.name,
          labels: payload.data?.labels?.map((l: any) => l.name),
        },
        external_id: payload.data?.id ?? null,
        source_ts: payload.data?.createdAt ?? null,
      };

    case "github":
      return {
        kind: payload.pull_request ? "pr" : "ticket",
        severity: null,
        title: (payload.pull_request ?? payload.issue)?.title ?? null,
        body: (payload.pull_request ?? payload.issue)?.body ?? null,
        url: (payload.pull_request ?? payload.issue)?.html_url ?? null,
        metadata: {
          author: payload.sender?.login,
          action: payload.action,
          repo: payload.repository?.full_name,
        },
        external_id: String((payload.pull_request ?? payload.issue)?.id ?? ""),
        source_ts: (payload.pull_request ?? payload.issue)?.created_at ?? null,
      };

    case "slack":
      return {
        kind: "message",
        severity: null,
        title: null,
        body: payload.event?.text ?? null,
        url: null,
        metadata: {
          channel: payload.event?.channel,
          user: payload.event?.user,
          thread_ts: payload.event?.thread_ts,
        },
        external_id: payload.event?.ts ?? null,
        source_ts: payload.event?.ts
          ? new Date(Number(payload.event.ts) * 1000).toISOString()
          : null,
      };

    case "gmail":
      return {
        kind: "email",
        severity: null,
        title: payload.subject ?? null,
        body: payload.snippet ?? null,
        url: null,
        metadata: {
          from: payload.from,
          to: payload.to,
          thread_id: payload.threadId,
        },
        external_id: payload.id ?? null,
        source_ts: payload.date ?? null,
      };

    case "notion":
      return {
        kind: "doc",
        severity: null,
        title: payload.page?.title ?? null,
        body: null,
        url: payload.page?.url ?? null,
        metadata: {
          last_edited_by: payload.page?.last_edited_by?.name,
          parent_type: payload.page?.parent?.type,
        },
        external_id: payload.page?.id ?? null,
        source_ts: payload.page?.last_edited_time ?? null,
      };

    default:
      return {
        kind: "unknown",
        severity: null,
        title: null,
        body: JSON.stringify(payload),
        url: null,
        metadata: payload,
        external_id: null,
        source_ts: null,
      };
  }
}

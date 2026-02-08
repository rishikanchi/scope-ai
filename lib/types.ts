export interface Scope {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  datasources: string[];
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: string;
  scope_id: string;
  source: string;
  kind: string;
  severity: string | null;
  title: string | null;
  body: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
  external_id: string | null;
  datasource_id: string | null;
  source_ts: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  scope_id: string;
  kind: string;
  title: string;
  content: Record<string, unknown>;
  signal_ids: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  scope_id: string;
  title: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string | null;
  tool_calls: ToolCallResult[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ToolCallResult {
  component: string;
  props: Record<string, unknown>;
}

export interface InsightCardProps {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  signalCount: number;
  evidence?: { source: string; title: string; severity?: string }[];
}

export interface LinearCardProps {
  ticketId: string;
  title: string;
  status: string;
  assignee?: string;
  priority?: string;
}

export interface SignalListProps {
  signals: {
    source: string;
    severity: string;
    title: string;
  }[];
}

export interface ActionPlanProps {
  actions: {
    service: string;
    title: string;
    description: string;
  }[];
}

export interface DraftCardProps {
  title: string;
  sections: { heading: string; content: string }[];
  status: "draft" | "final";
  artifactId?: string;
}

export type ChatMode = "chat" | "synthesize" | "draft" | "orchestrate";

export interface FormCardProps {
  title: string;
  description?: string;
  action: string;
  fields: {
    name: string;
    label: string;
    value: string;
    type?: "text" | "textarea" | "select";
    options?: string[];
  }[];
}

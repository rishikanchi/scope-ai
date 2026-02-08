export interface ProviderConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  /** How scopes are joined in the auth URL (space or comma) */
  scopeSeparator: string;
  /** Extra query params for the authorize URL */
  extraAuthParams?: Record<string, string>;
  /** Whether token exchange uses Basic auth header instead of body params */
  useBasicAuth?: boolean;
  /** How to extract access_token from the token response */
  parseTokenResponse: (data: any) => {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    metadata?: Record<string, unknown>;
  };
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getCallbackUrl(provider: string) {
  return `${getBaseUrl()}/api/integrations/${provider}/callback`;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  github: {
    name: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    scopes: "repo read:org read:user",
    scopeSeparator: " ",
    parseTokenResponse: (data) => ({
      access_token: data.access_token,
      scope: data.scope,
      metadata: { token_type: data.token_type },
    }),
  },

  linear: {
    name: "Linear",
    authUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    clientId: process.env.LINEAR_CLIENT_ID ?? "",
    clientSecret: process.env.LINEAR_CLIENT_SECRET ?? "",
    scopes: "read,write",
    scopeSeparator: ",",
    extraAuthParams: { response_type: "code", prompt: "consent" },
    parseTokenResponse: (data) => ({
      access_token: data.access_token,
      expires_in: data.expires_in,
      scope: data.scope,
    }),
  },

  slack: {
    name: "Slack",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
    scopes: "channels:history,channels:read,chat:write,users:read",
    scopeSeparator: ",",
    parseTokenResponse: (data) => ({
      access_token: data.access_token,
      scope: data.scope,
      metadata: {
        team_id: data.team?.id,
        team_name: data.team?.name,
        bot_user_id: data.bot_user_id,
      },
    }),
  },

  notion: {
    name: "Notion",
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientId: process.env.NOTION_CLIENT_ID ?? "",
    clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
    scopes: "",
    scopeSeparator: " ",
    extraAuthParams: { response_type: "code", owner: "user" },
    useBasicAuth: true,
    parseTokenResponse: (data) => ({
      access_token: data.access_token,
      metadata: {
        workspace_name: data.workspace_name,
        workspace_icon: data.workspace_icon,
        workspace_id: data.workspace_id,
        bot_id: data.bot_id,
      },
    }),
  },

  gmail: {
    name: "Gmail",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    scopes: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    scopeSeparator: " ",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    parseTokenResponse: (data) => ({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
    }),
  },
};

/**
 * Integration framework — connector interface + registry.
 * No live accounts are connected in v1.0; each connector declares auth,
 * scopes, and data mapping so wiring real OAuth later is additive.
 * ALL external write actions route through the approval engine.
 */

export type ConnectorScope = "read" | "write";

export interface ConnectorSpec {
  slug: string;
  name: string;
  category: "productivity" | "finance" | "shopping" | "communication" | "fitness";
  authType: "oauth2" | "api_key" | "none";
  scopes: { name: string; kind: ConnectorScope; description: string }[];
  status: "planned" | "connected" | "error";
}

export interface Connector<TQuery = unknown, TResult = unknown> {
  spec: ConnectorSpec;
  isConfigured(): boolean;
  read(query: TQuery): Promise<TResult>;
  /** Write actions must carry an approvalId proving human sign-off. */
  write(action: string, payload: unknown, approvalId: string): Promise<{ ok: boolean; detail: string }>;
}

function stub(spec: ConnectorSpec): Connector {
  return {
    spec,
    isConfigured: () => false,
    async read() {
      throw new Error(`${spec.name} is not connected yet. Configure credentials in Settings.`);
    },
    async write(action: string, _payload: unknown, approvalId: string) {
      if (!approvalId) throw new Error("Write actions require an approved approval id");
      throw new Error(`${spec.name} is not connected yet.`);
    },
  };
}

export const connectors: Record<string, Connector> = {
  google_calendar: stub({
    slug: "google_calendar", name: "Google Calendar", category: "productivity", authType: "oauth2",
    scopes: [
      { name: "calendar.events.read", kind: "read", description: "View events" },
      { name: "calendar.events.write", kind: "write", description: "Create/update events (approval required)" },
    ],
    status: "planned",
  }),
  gmail: stub({
    slug: "gmail", name: "Gmail", category: "communication", authType: "oauth2",
    scopes: [
      { name: "gmail.read", kind: "read", description: "Read messages" },
      { name: "gmail.send", kind: "write", description: "Send email (approval required)" },
    ],
    status: "planned",
  }),
  banking: stub({
    slug: "banking", name: "Banking (Plaid)", category: "finance", authType: "api_key",
    scopes: [{ name: "transactions.read", kind: "read", description: "Read-only transactions. No transfers, ever (risk level 4)." }],
    status: "planned",
  }),
  shopping: stub({
    slug: "shopping", name: "Shopping Search", category: "shopping", authType: "api_key",
    scopes: [{ name: "products.search", kind: "read", description: "Product research and price comparison" }],
    status: "planned",
  }),
  fitness: stub({
    slug: "fitness", name: "Fitness (Apple Health export)", category: "fitness", authType: "none",
    scopes: [{ name: "health.read", kind: "read", description: "Imported wellness metrics" }],
    status: "planned",
  }),
};

export function listConnectors(): ConnectorSpec[] {
  return Object.values(connectors).map((c) => c.spec);
}

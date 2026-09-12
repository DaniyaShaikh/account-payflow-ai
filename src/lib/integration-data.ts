import type { Tone } from "@/components/payflow-ui";
import type { Client, ConnectionState, DataSource } from "./payflow-data";

export type IntegrationCategory = "Data Source" | "Communication" | "Payments" | "Future";

export type IntegrationStatus =
  | "Connected"
  | "Attention Required"
  | "Disconnected"
  | "Configuration Pending"
  | "Testing"
  | "Coming Later";

export interface IntegrationIssue {
  at: string;
  summary: string;
}

export interface Integration {
  id: string;
  /** Operational name shown to users — never a vendor name. */
  name: string;
  category: IntegrationCategory;
  /** Null for platform-wide entries such as the future WhatsApp channel. */
  clientId: string | null;
  clientName: string;
  status: IntegrationStatus;
  /** Relative label for the directory table. */
  lastActivity: string;
  /** Absolute demo timestamp for the detail view. */
  lastSuccessful: string | null;
  purpose: string;
  /** CRM / ACE integrations reuse the client onboarding data mapping. */
  dataSource: DataSource | null;
  issues: IntegrationIssue[];
}

export const integrationStatuses: IntegrationStatus[] = [
  "Connected",
  "Attention Required",
  "Configuration Pending",
  "Testing",
  "Disconnected",
  "Coming Later",
];

export function integrationTone(status: IntegrationStatus): Tone {
  switch (status) {
    case "Connected":
      return "success";
    case "Attention Required":
      return "danger";
    case "Configuration Pending":
      return "warning";
    case "Testing":
      return "info";
    default:
      return "neutral";
  }
}

function statusFromConnection(connection: ConnectionState): IntegrationStatus {
  switch (connection) {
    case "Connected":
      return "Connected";
    case "Connecting":
      return "Testing";
    case "Connection Failed":
      return "Attention Required";
    default:
      return "Configuration Pending";
  }
}

/** Deterministic demo activity labels, keyed so server and client render alike. */
const activityLabels: Record<string, string> = {
  "paypal-source": "2 min ago",
  "paypal-email": "1 min ago",
  "paypal-sms": "3 min ago",
  "canadian-tire-source": "8 min ago",
  "canadian-tire-email": "6 min ago",
  "canadian-tire-sms": "4 min ago",
  "northstar-utilities-source": "11 min ago",
  "northstar-utilities-email": "9 min ago",
  "northstar-utilities-sms": "1 hr 12 min ago",
};

const syncLabels: Record<string, string> = {
  "paypal-source": "12 Sep 2026 · 10:42",
  "paypal-email": "12 Sep 2026 · 10:43",
  "paypal-sms": "12 Sep 2026 · 10:41",
  "canadian-tire-source": "12 Sep 2026 · 10:36",
  "canadian-tire-email": "12 Sep 2026 · 10:38",
  "canadian-tire-sms": "12 Sep 2026 · 10:40",
  "northstar-utilities-source": "12 Sep 2026 · 10:33",
  "northstar-utilities-email": "12 Sep 2026 · 10:35",
  "northstar-utilities-sms": "12 Sep 2026 · 09:42",
};

/** Demo integrations currently requiring operational attention. */
const attention: Record<string, IntegrationIssue[]> = {
  "northstar-utilities-sms": [
    {
      at: "12 Sep 2026 · 10:18",
      summary: "Recent SMS messages were not confirmed as delivered by the messaging service.",
    },
    {
      at: "12 Sep 2026 · 09:51",
      summary: "Delivery confirmations delayed for a batch of reminders.",
    },
  ],
};

export function buildIntegrations(clients: Client[]): Integration[] {
  const list: Integration[] = [];

  for (const client of clients) {
    const base = { clientId: client.id, clientName: client.name };

    if (client.config.dataSource) {
      const id = `${client.id}-source`;
      list.push({
        ...base,
        id,
        name: client.config.dataSource,
        category: "Data Source",
        status: attention[id]
          ? "Attention Required"
          : statusFromConnection(client.config.connection),
        lastActivity: activityLabels[id] ?? "Today",
        lastSuccessful: syncLabels[id] ?? null,
        purpose: `Customer and account records for ${client.name} arrive from the ${client.config.dataSource} system. Each client uses one primary operational data source.`,
        dataSource: client.config.dataSource,
        issues: attention[id] ?? [],
      });
    } else {
      list.push({
        ...base,
        id: `${client.id}-source`,
        name: "Data Source",
        category: "Data Source",
        status: "Configuration Pending",
        lastActivity: "—",
        lastSuccessful: null,
        purpose: `${client.name} has not selected a primary operational data source yet.`,
        dataSource: null,
        issues: [],
      });
    }

    if (client.config.channels.email) {
      const id = `${client.id}-email`;
      list.push({
        ...base,
        id,
        name: "Email",
        category: "Communication",
        status: attention[id] ? "Attention Required" : "Connected",
        lastActivity: activityLabels[id] ?? "Today",
        lastSuccessful: syncLabels[id] ?? null,
        purpose: `Email collection communications for ${client.name} are executed through this channel connection.`,
        dataSource: null,
        issues: attention[id] ?? [],
      });
    }

    if (client.config.channels.sms) {
      const id = `${client.id}-sms`;
      list.push({
        ...base,
        id,
        name: "SMS",
        category: "Communication",
        status: attention[id] ? "Attention Required" : "Connected",
        lastActivity: activityLabels[id] ?? "Today",
        lastSuccessful: syncLabels[id] ?? null,
        purpose: `SMS collection communications for ${client.name} are executed through this channel connection.`,
        dataSource: null,
        issues: attention[id] ?? [],
      });
    }

    list.push({
      ...base,
      id: `${client.id}-payments`,
      name: "Payment Provider",
      category: "Payments",
      status: "Configuration Pending",
      lastActivity: "—",
      lastSuccessful: null,
      purpose: `The payment provider for ${client.name} is not finalised. The customer payment experience remains provider neutral until it is selected.`,
      dataSource: null,
      issues: [],
    });
  }

  list.push({
    id: "whatsapp",
    name: "WhatsApp",
    category: "Future",
    clientId: null,
    clientName: "All Clients",
    status: "Coming Later",
    lastActivity: "—",
    lastSuccessful: null,
    purpose: "WhatsApp collection communications arrive in a later phase and are not active.",
    dataSource: null,
    issues: [],
  });

  return list;
}

export const integrationCategories: IntegrationCategory[] = [
  "Data Source",
  "Communication",
  "Payments",
  "Future",
];

export function integrationSummary(list: Integration[]) {
  return {
    connected: list.filter((i) => i.status === "Connected").length,
    attention: list.filter((i) => i.status === "Attention Required").length,
    disconnected: list.filter((i) => i.status === "Disconnected").length,
    pending: list.filter((i) => i.status === "Configuration Pending").length,
  };
}

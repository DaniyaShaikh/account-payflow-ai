import type { Tone } from "@/components/payflow-ui";

export type PortfolioStatus = "Active" | "Onboarding" | "Paused";

export interface Portfolio {
  id: string;
  clientId: string;
  name: string;
  /** Illustrative portfolio reference — not a technical standard. */
  code: string;
  status: PortfolioStatus;
  description: string;
  accounts: number;
  cases: number;
  outstanding: number;
  /** Strategy id currently applied to this portfolio, when one is active. */
  activeStrategyId: string | null;
  lastFileReceived: string;
}

export const portfolioStatuses: PortfolioStatus[] = ["Active", "Onboarding", "Paused"];

export function portfolioStatusTone(status: PortfolioStatus): Tone {
  if (status === "Active") return "success";
  if (status === "Onboarding") return "info";
  return "neutral";
}

export const seedPortfolios: Portfolio[] = [
  {
    id: "pp-loans",
    clientId: "paypal",
    name: "PayPal Loans",
    code: "PP-PF-01",
    status: "Active",
    description: "Instalment lending balances placed for first-party collection.",
    accounts: 4820,
    cases: 910,
    outstanding: 2100000,
    activeStrategyId: "pp-loans-early-recovery",
    lastFileReceived: "14 Sep 2026",
  },
  {
    id: "pp-finance",
    clientId: "paypal",
    name: "PayPal Finance",
    code: "PP-PF-02",
    status: "Active",
    description: "Revolving credit balances with longer delinquency profiles.",
    accounts: 3610,
    cases: 720,
    outstanding: 1450000,
    activeStrategyId: "pp-finance-engaged-sms",
    lastFileReceived: "14 Sep 2026",
  },
  {
    id: "pp-third-party",
    clientId: "paypal",
    name: "PayPal Third Party",
    code: "PP-PF-03",
    status: "Active",
    description: "Accounts collected under the PayFlow collection-operator brand.",
    accounts: 2450,
    cases: 380,
    outstanding: 890000,
    activeStrategyId: null,
    lastFileReceived: "13 Sep 2026",
  },
  {
    id: "pp-portfolio-1",
    clientId: "paypal",
    name: "PayPal Portfolio 1",
    code: "PP-PF-04",
    status: "Onboarding",
    description: "New placement being validated before strategies are applied.",
    accounts: 1600,
    cases: 130,
    outstanding: 360000,
    activeStrategyId: null,
    lastFileReceived: "12 Sep 2026",
  },
  {
    id: "ct-triangle-cards",
    clientId: "canadian-tire",
    name: "Canadian Tire Triangle Cards",
    code: "CT-PF-01",
    status: "Active",
    description: "Retail card balances with seasonal spending patterns.",
    accounts: 5210,
    cases: 980,
    outstanding: 1980000,
    activeStrategyId: "ct-seasonal-recovery",
    lastFileReceived: "14 Sep 2026",
  },
  {
    id: "ct-auto-service",
    clientId: "canadian-tire",
    name: "Canadian Tire Auto Service",
    code: "CT-PF-02",
    status: "Paused",
    description: "Service account balances, placement paused at the client.",
    accounts: 3005,
    cases: 480,
    outstanding: 1120000,
    activeStrategyId: null,
    lastFileReceived: "05 Sep 2026",
  },
  {
    id: "ns-residential",
    clientId: "northstar-utilities",
    name: "Northstar Residential",
    code: "NS-PF-01",
    status: "Active",
    description: "Residential utility arrears accumulated over winter billing.",
    accounts: 3980,
    cases: 610,
    outstanding: 1180000,
    activeStrategyId: "ns-winter-arrears",
    lastFileReceived: "14 Sep 2026",
  },
  {
    id: "ns-commercial",
    clientId: "northstar-utilities",
    name: "Northstar Commercial",
    code: "NS-PF-02",
    status: "Onboarding",
    description: "Small-business arrears with higher average balances.",
    accounts: 1360,
    cases: 230,
    outstanding: 520000,
    activeStrategyId: null,
    lastFileReceived: "11 Sep 2026",
  },
];

/* ---------------------------------------------------------------------------
 * Sub-client / portfolio filtering helpers
 *
 * Accounts, communications and reviews in this prototype are illustrative and
 * carry no stored portfolio column, so a stable deterministic mapping assigns
 * each record to one of its client's sub-client portfolios. The mapping is
 * consistent for the same record across every screen.
 * ------------------------------------------------------------------------- */

export const ALL_SUB_CLIENTS = "All Sub-Clients";

export function portfoliosForClientId(clientId: string): Portfolio[] {
  return seedPortfolios.filter((p) => p.clientId === clientId);
}

export function portfolioByName(name: string): Portfolio | undefined {
  return seedPortfolios.find((p) => p.name === name);
}

function stableIndex(key: string, length: number) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % length;
}

/** Deterministic sub-client portfolio for a record belonging to a client. */
export function subClientNameFor(clientId: string, key: string): string {
  const list = portfoliosForClientId(clientId);
  if (list.length === 0) return "—";
  return list[stableIndex(key, list.length)]!.name;
}

export function matchesSubClient(clientId: string, key: string, selected: string): boolean {
  if (selected === ALL_SUB_CLIENTS) return true;
  return subClientNameFor(clientId, key) === selected;
}

/** Multi-select variant: an empty selection means every sub-client. */
export function matchesSubClients(clientId: string, key: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(subClientNameFor(clientId, key));
}

/** Sub-client names for exactly one selected client name (no "All …" entry). */
export function subClientNamesForClient(
  clients: { id: string; name: string }[],
  selectedClient: string,
): string[] {
  const owner = clients.find((c) => c.name === selectedClient);
  if (!owner) return [];
  return seedPortfolios.filter((p) => p.clientId === owner.id).map((p) => p.name);
}

/** True when a single client is selected (i.e. not an "All …" option). */
export function isSingleClientSelected(selectedClient?: string | null): boolean {
  return !!selectedClient && !selectedClient.startsWith("All ");
}

/**
 * Sub-client options for the clients in scope, narrowed to one client when a
 * client filter is applied.
 */
export function subClientOptions(
  clients: { id: string; name: string }[],
  selectedClient?: string | null,
): string[] {
  const scoped =
    selectedClient && !selectedClient.startsWith("All ")
      ? clients.filter((c) => c.name === selectedClient)
      : clients;
  const ids = scoped.map((c) => c.id);
  return [
    ALL_SUB_CLIENTS,
    ...seedPortfolios.filter((p) => ids.includes(p.clientId)).map((p) => p.name),
  ];
}

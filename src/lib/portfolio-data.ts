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

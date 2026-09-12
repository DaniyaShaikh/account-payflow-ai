export type AiMode = "Autopilot" | "Supervised AI";
export type CollectionStatus =
  | "Active"
  | "Promise to Pay"
  | "Payment Plan"
  | "Human Review"
  | "Resolved";

export type ClientStatus = "Active" | "Onboarding" | "Paused" | "Draft";
export type ClientType = "First Party" | "Third Party";
export type DataSource = "CRM" | "ACE";
export type ConnectionState = "Not Connected" | "Connecting" | "Connected" | "Connection Failed";
export type MappingStatus = "Mapped" | "Needs Attention" | "Unmapped" | "Validated";

export interface FieldMapping {
  sourceField: string;
  payflowField: string;
  sampleValue: string;
  status: MappingStatus;
}

export interface ClientConfig {
  code: string;
  clientType: ClientType;
  useCase: string;
  dataSource: DataSource | null;
  connection: ConnectionState;
  mappings: FieldMapping[];
  brandName: string;
  senderName: string;
  emailFrom: string;
  smsSenderId: string;
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  governanceRules: string[];
  permissions: string[];
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  accounts: number;
  activeCases: number;
  aiMode: AiMode;
  supervisors: string[];
  status: ClientStatus;
  outstanding: number;
  recovered: number;
  reviewsPending: number;
  attention?: string;
  config: ClientConfig;
}

export const supervisorDirectory = ["Zeeshan", "Sarah", "Ahmed"] as const;
export const supervisors = supervisorDirectory;

export const payflowFields = [
  "Customer ID",
  "Customer Name",
  "Email",
  "Mobile Number",
  "Account Reference",
  "Outstanding Balance",
  "Due Date",
  "Original Balance",
  "Language",
  "— Not mapped —",
];

export const defaultMappings: FieldMapping[] = [
  {
    sourceField: "customer_id",
    payflowField: "Customer ID",
    sampleValue: "CUST-10482",
    status: "Mapped",
  },
  {
    sourceField: "customer_name",
    payflowField: "Customer Name",
    sampleValue: "John Smith",
    status: "Mapped",
  },
  {
    sourceField: "email_address",
    payflowField: "Email",
    sampleValue: "john@example.com",
    status: "Mapped",
  },
  {
    sourceField: "mobile",
    payflowField: "Mobile Number",
    sampleValue: "+1 xxx xxx xxxx",
    status: "Mapped",
  },
  {
    sourceField: "account_reference",
    payflowField: "Account Reference",
    sampleValue: "PP-10482",
    status: "Mapped",
  },
  {
    sourceField: "balance_due",
    payflowField: "Outstanding Balance",
    sampleValue: "$4,250",
    status: "Mapped",
  },
  {
    sourceField: "due_date",
    payflowField: "Due Date",
    sampleValue: "05 Sep 2026",
    status: "Mapped",
  },
];

export const governanceRuleLibrary = [
  "High Balance Human Review",
  "Repeated Attempts Escalation",
  "Low Confidence Review",
  "Dispute Detected Review",
  "Settlement Offer Approval",
];

export const clientPermissions = [
  "View Client",
  "View Customer Accounts",
  "View Collection Cases",
  "View Journeys",
  "View Communications",
  "View Human Reviews",
  "Approve Human Reviews",
  "View Analytics",
  "View Rules",
  "Create / Edit Client Rules",
];

export const defaultPermissions = [
  "View Client",
  "View Customer Accounts",
  "View Collection Cases",
  "View Journeys",
  "View Communications",
  "View Human Reviews",
  "View Analytics",
];

export function makeConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    code: "",
    clientType: "Third Party",
    useCase: "Collections",
    dataSource: null,
    connection: "Not Connected",
    mappings: defaultMappings.map((m) => ({ ...m })),
    brandName: "",
    senderName: "",
    emailFrom: "collections@payflow.io",
    smsSenderId: "PAYFLOW",
    channels: { email: true, sms: true, whatsapp: false },
    governanceRules: [],
    permissions: [...defaultPermissions],
    ...overrides,
  };
}

export const clients: Client[] = [
  {
    id: "paypal",
    name: "PayPal",
    industry: "Payments",
    accounts: 12480,
    activeCases: 2140,
    aiMode: "Autopilot",
    supervisors: ["Zeeshan"],
    status: "Active",
    outstanding: 4800000,
    recovered: 1200000,
    reviewsPending: 14,
    attention: "12 escalated cases awaiting supervisor decision",
    config: makeConfig({
      code: "PP-CLT-001",
      clientType: "Third Party",
      dataSource: "CRM",
      connection: "Connected",
      brandName: "PayPal",
      senderName: "PayPal Collections",
      emailFrom: "collections@paypal.com",
      smsSenderId: "PAYPAL",
      permissions: [...defaultPermissions, "Approve Human Reviews"],
    }),
  },
  {
    id: "canadian-tire",
    name: "Canadian Tire",
    industry: "Retail",
    accounts: 8215,
    activeCases: 1460,
    aiMode: "Supervised AI",
    supervisors: ["Zeeshan"],
    status: "Active",
    outstanding: 3100000,
    recovered: 860000,
    reviewsPending: 9,
    attention: "Promise-to-pay follow-ups overdue on 38 accounts",
    config: makeConfig({
      code: "CT-CLT-002",
      clientType: "First Party",
      dataSource: "ACE",
      connection: "Connected",
      brandName: "Canadian Tire",
      senderName: "Canadian Tire Billing",
      emailFrom: "billing@canadiantire.ca",
      smsSenderId: "CDNTIRE",
      governanceRules: ["High Balance Human Review", "Repeated Attempts Escalation"],
      permissions: [...defaultPermissions, "Approve Human Reviews"],
    }),
  },
  {
    id: "northstar-utilities",
    name: "Northstar Utilities",
    industry: "Utilities",
    accounts: 5340,
    activeCases: 840,
    aiMode: "Supervised AI",
    supervisors: ["Sarah"],
    status: "Active",
    outstanding: 1700000,
    recovered: 420000,
    reviewsPending: 5,
    attention: "SMS delivery rate down 6% week over week",
    config: makeConfig({
      code: "NS-CLT-003",
      clientType: "First Party",
      dataSource: "CRM",
      connection: "Connected",
      brandName: "Northstar Utilities",
      senderName: "Northstar Billing",
      emailFrom: "billing@northstar.com",
      smsSenderId: "NORTHSTAR",
      governanceRules: ["Low Confidence Review", "Dispute Detected Review"],
    }),
  },
];

export interface CustomerAccount {
  id: string;
  clientId: string;
  customer: string;
  reference: string;
  originalBalance: number;
  outstanding: number;
  recovered: number;
  status: CollectionStatus;
  journey: string;
  lastAction: string;
  nextAction: string;
  humanReview: boolean;
  timeline: { label: string; detail: string; at: string }[];
}

export const accounts: CustomerAccount[] = [
  {
    id: "pp-10482",
    clientId: "paypal",
    customer: "John Smith",
    reference: "PP-10482",
    originalBalance: 5400,
    outstanding: 4250,
    recovered: 1150,
    status: "Active",
    journey: "Early Stage Collection",
    lastAction: "Email reminder sent",
    nextAction: "Reassess in 48 hours",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "31 days past due", at: "Aug 12" },
      { label: "Customer assessed", detail: "Low risk, email preferred", at: "Aug 13" },
      { label: "Email reminder sent", detail: "Early stage template", at: "Aug 14" },
      { label: "Email delivered", detail: "Opened after 2 hours", at: "Aug 14" },
      { label: "Payment link clicked", detail: "Checkout opened", at: "Aug 15" },
      { label: "Partial payment received", detail: "$1,150", at: "Aug 15" },
      { label: "Balance updated", detail: "Outstanding $4,250", at: "Aug 15" },
      { label: "Next reassessment scheduled", detail: "In 48 hours", at: "Aug 16" },
    ],
  },
  {
    id: "pp-11021",
    clientId: "paypal",
    customer: "Sarah Khan",
    reference: "PP-11021",
    originalBalance: 9600,
    outstanding: 8900,
    recovered: 700,
    status: "Promise to Pay",
    journey: "Promise-to-Pay Follow-Up",
    lastAction: "SMS sent",
    nextAction: "Review after promise date",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "48 days past due", at: "Jul 30" },
      { label: "Customer assessed", detail: "Responsive on SMS", at: "Aug 01" },
      { label: "Promise to pay captured", detail: "$8,900 by Aug 28", at: "Aug 05" },
      { label: "SMS sent", detail: "Promise reminder", at: "Aug 20" },
      { label: "Next reassessment scheduled", detail: "After promise date", at: "Aug 28" },
    ],
  },
  {
    id: "pp-12098",
    clientId: "paypal",
    customer: "Michael Brown",
    reference: "PP-12098",
    originalBalance: 3600,
    outstanding: 2100,
    recovered: 1500,
    status: "Payment Plan",
    journey: "Payment Plan Monitoring",
    lastAction: "Installment received",
    nextAction: "Next installment in 7 days",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "22 days past due", at: "Jul 18" },
      { label: "Payment plan agreed", detail: "6 monthly installments", at: "Jul 25" },
      { label: "Installment received", detail: "$500", at: "Aug 18" },
      { label: "Balance updated", detail: "Outstanding $2,100", at: "Aug 18" },
      { label: "Next installment scheduled", detail: "In 7 days", at: "Aug 25" },
    ],
  },
  {
    id: "pp-88831",
    clientId: "paypal",
    customer: "David Lee",
    reference: "PP-88831",
    originalBalance: 12500,
    outstanding: 12500,
    recovered: 0,
    status: "Human Review",
    journey: "Escalated Collection",
    lastAction: "AI recommendation created",
    nextAction: "Awaiting supervisor",
    humanReview: true,
    timeline: [
      { label: "Account became overdue", detail: "96 days past due", at: "Jun 02" },
      { label: "Customer assessed", detail: "High balance, no contact", at: "Jun 04" },
      { label: "Escalation triggered", detail: "No response after 4 attempts", at: "Aug 10" },
      { label: "AI recommendation created", detail: "Settlement offer proposed", at: "Aug 19" },
      { label: "Awaiting supervisor decision", detail: "Queued for human review", at: "Aug 19" },
    ],
  },
  {
    id: "ct-20394",
    clientId: "canadian-tire",
    customer: "Emily Jones",
    reference: "CT-20394",
    originalBalance: 7800,
    outstanding: 7300,
    recovered: 500,
    status: "Active",
    journey: "Progressive Reminder",
    lastAction: "SMS sent",
    nextAction: "Reassess tomorrow",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "27 days past due", at: "Aug 01" },
      { label: "Customer assessed", detail: "SMS preferred", at: "Aug 02" },
      { label: "SMS sent", detail: "Reminder 2 of 4", at: "Aug 19" },
      { label: "Next reassessment scheduled", detail: "Tomorrow", at: "Aug 20" },
    ],
  },
  {
    id: "ct-21877",
    clientId: "canadian-tire",
    customer: "Robert Chen",
    reference: "CT-21877",
    originalBalance: 4100,
    outstanding: 1900,
    recovered: 2200,
    status: "Payment Plan",
    journey: "Payment Plan Monitoring",
    lastAction: "Installment received",
    nextAction: "Next installment in 12 days",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "40 days past due", at: "Jul 09" },
      { label: "Payment plan agreed", detail: "4 installments", at: "Jul 21" },
      { label: "Installment received", detail: "$1,100", at: "Aug 14" },
      { label: "Balance updated", detail: "Outstanding $1,900", at: "Aug 14" },
    ],
  },
  {
    id: "ct-22540",
    clientId: "canadian-tire",
    customer: "Priya Nair",
    reference: "CT-22540",
    originalBalance: 3200,
    outstanding: 3200,
    recovered: 0,
    status: "Human Review",
    journey: "Escalated Collection",
    lastAction: "Dispute flagged by customer",
    nextAction: "Awaiting supervisor",
    humanReview: true,
    timeline: [
      { label: "Account became overdue", detail: "62 days past due", at: "Jun 25" },
      { label: "Email reminder sent", detail: "Progressive reminder", at: "Jul 30" },
      { label: "Dispute flagged by customer", detail: "Charge disputed via reply", at: "Aug 18" },
      { label: "Awaiting supervisor decision", detail: "Queued for human review", at: "Aug 18" },
    ],
  },
  {
    id: "ns-30112",
    clientId: "northstar-utilities",
    customer: "Laura Fitzgerald",
    reference: "NS-30112",
    originalBalance: 2600,
    outstanding: 2450,
    recovered: 150,
    status: "Active",
    journey: "Early Stage Collection",
    lastAction: "Email reminder sent",
    nextAction: "Reassess in 72 hours",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "18 days past due", at: "Aug 06" },
      { label: "Customer assessed", detail: "First-time delinquency", at: "Aug 07" },
      { label: "Email reminder sent", detail: "Soft reminder", at: "Aug 16" },
    ],
  },
  {
    id: "ns-31450",
    clientId: "northstar-utilities",
    customer: "Marcus Webb",
    reference: "NS-31450",
    originalBalance: 5900,
    outstanding: 5400,
    recovered: 500,
    status: "Promise to Pay",
    journey: "Promise-to-Pay Follow-Up",
    lastAction: "Promise captured on call",
    nextAction: "Review after promise date",
    humanReview: false,
    timeline: [
      { label: "Account became overdue", detail: "55 days past due", at: "Jul 02" },
      { label: "Promise to pay captured", detail: "$5,400 by Sep 01", at: "Aug 12" },
      { label: "Next reassessment scheduled", detail: "After promise date", at: "Sep 01" },
    ],
  },
];

export const activity = [
  {
    clientId: "paypal",
    text: "Settlement recommendation created for David Lee (PP-88831)",
    at: "12 min ago",
  },
  {
    clientId: "canadian-tire",
    text: "Dispute flagged on Priya Nair (CT-22540), routed to human review",
    at: "48 min ago",
  },
  { clientId: "paypal", text: "Partial payment of $1,150 received on PP-10482", at: "2 hours ago" },
  {
    clientId: "northstar-utilities",
    text: "Early stage reminder batch sent to 412 accounts",
    at: "3 hours ago",
  },
  {
    clientId: "canadian-tire",
    text: "Installment of $1,100 received on CT-21877",
    at: "5 hours ago",
  },
  { clientId: "paypal", text: "Promise-to-pay follow-up SMS sent to 186 accounts", at: "Yesterday" },
];

export const journeys = [
  "Early Stage Collection",
  "Progressive Reminder",
  "Promise-to-Pay Follow-Up",
  "Payment Plan Monitoring",
  "Escalated Collection",
];

export const collectionStatuses: CollectionStatus[] = [
  "Active",
  "Promise to Pay",
  "Payment Plan",
  "Human Review",
  "Resolved",
];

function trim(value: number, digits: number) {
  return value
    .toFixed(digits)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

// Deterministic compact formatting (identical on server and client — Intl
// compact notation differs between ICU builds and breaks hydration).
export function formatCurrency(value: number, compact = false) {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000, 2)}M`;
    if (abs >= 1_000) return `${sign}$${trim(abs / 1_000, abs < 10_000 ? 1 : 0)}K`;
    return `${sign}$${Math.round(abs)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function clientName(clientId: string) {
  return clients.find((c) => c.id === clientId)?.name ?? clientId;
}

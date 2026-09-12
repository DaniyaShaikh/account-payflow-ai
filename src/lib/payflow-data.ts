export type AiMode = "Autopilot" | "Supervised AI";
export type CollectionStatus =
  | "Active"
  | "Promise to Pay"
  | "Payment Plan"
  | "Human Review"
  | "Resolved";

export interface Client {
  id: string;
  name: string;
  industry: string;
  accounts: number;
  activeCases: number;
  aiMode: AiMode;
  supervisors: string[];
  status: "Active" | "Onboarding" | "Paused";
  outstanding: number;
  recovered: number;
  reviewsPending: number;
  attention?: string;
}

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

export const supervisors = ["Zeeshan", "Sarah"] as const;

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
    outstanding: 18420000,
    recovered: 4210000,
    reviewsPending: 14,
    attention: "12 escalated cases awaiting supervisor decision",
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
    outstanding: 11260000,
    recovered: 2740000,
    reviewsPending: 9,
    attention: "Promise-to-pay follow-ups overdue on 38 accounts",
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
    outstanding: 6480000,
    recovered: 1180000,
    reviewsPending: 5,
    attention: "SMS delivery rate down 6% week over week",
  },
];

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

export function formatCurrency(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function clientName(clientId: string) {
  return clients.find((c) => c.id === clientId)?.name ?? clientId;
}

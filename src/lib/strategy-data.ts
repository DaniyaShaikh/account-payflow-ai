import type { Tone } from "@/components/payflow-ui";

export type StrategyStatus = "AI Proposed" | "Under Review" | "Approved" | "Active" | "Inactive";

export type StrategyNodeKind =
  | "Trigger"
  | "Communication"
  | "Wait"
  | "Condition"
  | "Payment Action"
  | "Case Action"
  | "Human Review"
  | "AI Reassessment"
  | "Outcome";

export type NodeOrigin = "AI Proposed" | "Human Modified";

export interface NodeConfig {
  channel?: string;
  purpose?: string;
  referenceEvent?: string;
  amount?: number;
  unit?: string;
  direction?: string;
  attribute?: string;
  operator?: string;
  value?: string;
  action?: string;
  outcome?: string;
  note?: string;
  /** Message template used for Communication steps. */
  templateId?: string;
}

export interface StrategyNode {
  id: string;
  kind: StrategyNodeKind;
  title: string;
  origin: NodeOrigin;
  disabled?: boolean;
  config: NodeConfig;
  /** Linear path */
  next?: string | null;
  /** Condition branches */
  yes?: string | null;
  no?: string | null;
}

export interface StrategyVersion {
  version: string;
  date: string;
  note: string;
}

export interface Strategy {
  id: string;
  name: string;
  clientId: string;
  portfolioId: string;
  status: StrategyStatus;
  origin: NodeOrigin;
  version: string;
  lastUpdated: string;
  /** Accounts / cases the strategy covers or is proposed for. */
  coverage: number;
  summary: string;
  /** Operational, non-sensitive context PayFlow used to propose the strategy. */
  aiContext: { label: string; value: string }[];
  approvedBy?: string;
  approvalDate?: string;
  entryNodeId: string;
  nodes: Record<string, StrategyNode>;
  versions: StrategyVersion[];
  /** Which accounts the strategy applies to. Operational attributes only. */
  segment?: StrategySegment;
}

/**
 * Segment scope for a strategy. Only operational and geographic attributes are
 * permitted — protected demographic attributes are never used for targeting.
 */
export interface StrategySegment {
  ageBand: string;
  postalRegion: string;
  balanceBand: string;
  delinquency: string;
  language: string;
  tenure: string;
}

export const strategyStatuses: StrategyStatus[] = [
  "AI Proposed",
  "Under Review",
  "Approved",
  "Active",
  "Inactive",
];

export function strategyStatusTone(status: StrategyStatus): Tone {
  switch (status) {
    case "AI Proposed":
      return "ai";
    case "Under Review":
      return "warning";
    case "Approved":
      return "info";
    case "Active":
      return "success";
    default:
      return "neutral";
  }
}

export function nodeTone(kind: StrategyNodeKind): Tone {
  switch (kind) {
    case "Trigger":
      return "neutral";
    case "Communication":
      return "info";
    case "Condition":
      return "warning";
    case "Payment Action":
      return "success";
    case "Human Review":
      return "danger";
    case "AI Reassessment":
      return "ai";
    default:
      return "neutral";
  }
}

/* ---------- permitted values for structured node configuration ---------- */

export const channels = ["Email", "SMS"];
export const messagePurposes = [
  "Payment Reminder",
  "Firm Reminder",
  "Payment Link",
  "Promise-to-Pay Reminder",
  "Payment Plan Reminder",
  "Contact Details Update Request",
];
export const referenceEvents = [
  "Case Received",
  "Due Date",
  "Previous Action",
  "Previous Email",
  "Previous SMS",
  "Payment Link Sent",
  "Promise-to-Pay Date",
  "Broken Promise-to-Pay",
  "Last Customer Response",
];
export const timeUnits = ["Hours", "Days", "Weeks"];
export const timeDirections = ["After", "Before"];
export const conditionAttributes = [
  "Payment Status",
  "Email Delivery",
  "SMS Delivery",
  "Email Address",
  "Mobile Number",
  "Payment Link",
  "Promise-to-Pay",
  "Customer Response",
  "Outstanding Balance",
];
export const conditionOperators = ["Equals", "Not Equals", "Greater Than", "Less Than"];
export const conditionValues: Record<string, string[]> = {
  "Payment Status": ["Unpaid", "Paid In Full", "Partial Payment", "Payment Plan Active"],
  "Email Delivery": ["Delivered", "Failed", "Bounced"],
  "SMS Delivery": ["Delivered", "Failed"],
  "Email Address": ["Valid", "Invalid", "Missing"],
  "Mobile Number": ["Valid", "Invalid", "Missing"],
  "Payment Link": ["Clicked", "Not Clicked"],
  "Promise-to-Pay": ["Created", "Kept", "Broken", "None"],
  "Customer Response": ["Received", "None", "Dispute Raised"],
  "Outstanding Balance": ["1,000", "5,000", "10,000"],
};
export const caseActions = [
  "Move Case To Escalated Treatment",
  "Hold Automated Contact",
  "Request Contact Details Update",
  "Close Case",
];
export const paymentActions = [
  "Send Secure Payment Link",
  "Offer Payment Plan",
  "Record Promise To Pay",
];
export const outcomes = [
  "Paid In Full",
  "Payment Plan Active",
  "Promise To Pay Recorded",
  "No Contactable Channel",
  "Case Closed",
];

/** Human-readable timing that always states the reference point. */
export function timingLabel(node: StrategyNode): string | undefined {
  const { referenceEvent, amount, unit, direction } = node.config;
  if (!referenceEvent) return undefined;
  if (amount === undefined || amount === 0)
    return `Immediately when ${referenceEvent.toLowerCase()} occurs`;
  const label = amount === 1 ? (unit ?? "Days").replace(/s$/, "") : (unit ?? "Days");
  return `${amount} ${label} ${direction ?? "After"} ${referenceEvent}`;
}

export function conditionLabel(node: StrategyNode): string | undefined {
  const { attribute, operator, value } = node.config;
  if (!attribute) return undefined;
  return `${attribute} ${(operator ?? "Equals").toLowerCase()} ${value ?? ""}`.trim();
}

/* ---------------------------- seeded strategies --------------------------- */

function n(node: StrategyNode): StrategyNode {
  return node;
}

const loanNodes: StrategyNode[] = [
  n({
    id: "t1",
    kind: "Trigger",
    title: "Case received from source file",
    origin: "AI Proposed",
    config: { referenceEvent: "Case Received", amount: 0, unit: "Days", direction: "After" },
    next: "c1",
  }),
  n({
    id: "c1",
    kind: "Communication",
    title: "Send email reminder",
    origin: "AI Proposed",
    config: {
      channel: "Email",
      purpose: "Payment Reminder",
      referenceEvent: "Case Received",
      amount: 0,
      unit: "Days",
      direction: "After",
    },
    next: "w1",
  }),
  n({
    id: "w1",
    kind: "Wait",
    title: "Observe response",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Email", amount: 3, unit: "Days", direction: "After" },
    next: "q1",
  }),
  n({
    id: "q1",
    kind: "Condition",
    title: "Payment received?",
    origin: "AI Proposed",
    config: { attribute: "Payment Status", operator: "Equals", value: "Paid In Full" },
    yes: "o1",
    no: "q2",
  }),
  n({
    id: "o1",
    kind: "Outcome",
    title: "Case closed — paid",
    origin: "AI Proposed",
    config: { outcome: "Paid In Full" },
  }),
  n({
    id: "q2",
    kind: "Condition",
    title: "Email delivered?",
    origin: "AI Proposed",
    config: { attribute: "Email Delivery", operator: "Equals", value: "Delivered" },
    yes: "c2",
    no: "q3",
  }),
  n({
    id: "c2",
    kind: "Communication",
    title: "Send SMS reminder",
    origin: "AI Proposed",
    config: {
      channel: "SMS",
      purpose: "Payment Link",
      referenceEvent: "Previous Email",
      amount: 2,
      unit: "Days",
      direction: "After",
    },
    next: "r1",
  }),
  n({
    id: "q3",
    kind: "Condition",
    title: "Valid mobile number?",
    origin: "AI Proposed",
    config: { attribute: "Mobile Number", operator: "Equals", value: "Valid" },
    yes: "c3",
    no: "ca1",
  }),
  n({
    id: "c3",
    kind: "Communication",
    title: "SMS requesting email update",
    origin: "AI Proposed",
    config: {
      channel: "SMS",
      purpose: "Contact Details Update Request",
      referenceEvent: "Previous Action",
      amount: 1,
      unit: "Days",
      direction: "After",
    },
    next: "r1",
  }),
  n({
    id: "ca1",
    kind: "Case Action",
    title: "Request contact details update",
    origin: "AI Proposed",
    config: { action: "Request Contact Details Update" },
    next: "o2",
  }),
  n({
    id: "o2",
    kind: "Outcome",
    title: "No contactable channel",
    origin: "AI Proposed",
    config: { outcome: "No Contactable Channel" },
  }),
  n({
    id: "r1",
    kind: "AI Reassessment",
    title: "Reassess next best action",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Action", amount: 2, unit: "Days", direction: "After" },
    next: "p1",
  }),
  n({
    id: "p1",
    kind: "Payment Action",
    title: "Offer payment plan",
    origin: "AI Proposed",
    config: { action: "Offer Payment Plan" },
    next: "o3",
  }),
  n({
    id: "o3",
    kind: "Outcome",
    title: "Payment plan active",
    origin: "AI Proposed",
    config: { outcome: "Payment Plan Active" },
  }),
];

const financeNodes: StrategyNode[] = [
  n({
    id: "t1",
    kind: "Trigger",
    title: "Balance overdue after due date",
    origin: "AI Proposed",
    config: { referenceEvent: "Due Date", amount: 3, unit: "Days", direction: "After" },
    next: "c1",
  }),
  n({
    id: "c1",
    kind: "Communication",
    title: "Send SMS with payment link",
    origin: "AI Proposed",
    config: {
      channel: "SMS",
      purpose: "Payment Link",
      referenceEvent: "Due Date",
      amount: 3,
      unit: "Days",
      direction: "After",
    },
    next: "w1",
  }),
  n({
    id: "w1",
    kind: "Wait",
    title: "Observe link engagement",
    origin: "AI Proposed",
    config: { referenceEvent: "Payment Link Sent", amount: 2, unit: "Days", direction: "After" },
    next: "q1",
  }),
  n({
    id: "q1",
    kind: "Condition",
    title: "Payment link clicked?",
    origin: "AI Proposed",
    config: { attribute: "Payment Link", operator: "Equals", value: "Clicked" },
    yes: "r1",
    no: "c2",
  }),
  n({
    id: "r1",
    kind: "AI Reassessment",
    title: "Reassess engaged customer",
    origin: "AI Proposed",
    config: { referenceEvent: "Last Customer Response", amount: 1, unit: "Days", direction: "After" },
    next: "o1",
  }),
  n({
    id: "o1",
    kind: "Outcome",
    title: "Paid in full",
    origin: "AI Proposed",
    config: { outcome: "Paid In Full" },
  }),
  n({
    id: "c2",
    kind: "Communication",
    title: "Send firm email reminder",
    origin: "Human Modified",
    config: {
      channel: "Email",
      purpose: "Firm Reminder",
      referenceEvent: "Previous SMS",
      amount: 3,
      unit: "Days",
      direction: "After",
    },
    next: "h1",
  }),
  n({
    id: "h1",
    kind: "Human Review",
    title: "Supervisor review before escalation",
    origin: "AI Proposed",
    config: { note: "Client governance requires a decision before escalated treatment." },
    next: "ca1",
  }),
  n({
    id: "ca1",
    kind: "Case Action",
    title: "Move case to escalated treatment",
    origin: "AI Proposed",
    config: { action: "Move Case To Escalated Treatment" },
  }),
];

const seasonalNodes: StrategyNode[] = [
  n({
    id: "t1",
    kind: "Trigger",
    title: "Seasonal retail balance placed",
    origin: "AI Proposed",
    config: { referenceEvent: "Case Received", amount: 0, unit: "Days", direction: "After" },
    next: "c1",
  }),
  n({
    id: "c1",
    kind: "Communication",
    title: "Send soft email reminder",
    origin: "AI Proposed",
    config: {
      channel: "Email",
      purpose: "Payment Reminder",
      referenceEvent: "Case Received",
      amount: 1,
      unit: "Days",
      direction: "After",
    },
    next: "w1",
  }),
  n({
    id: "w1",
    kind: "Wait",
    title: "Observe response",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Email", amount: 4, unit: "Days", direction: "After" },
    next: "q1",
  }),
  n({
    id: "q1",
    kind: "Condition",
    title: "Promise to pay created?",
    origin: "AI Proposed",
    config: { attribute: "Promise-to-Pay", operator: "Equals", value: "Created" },
    yes: "c2",
    no: "c3",
  }),
  n({
    id: "c2",
    kind: "Communication",
    title: "Promise reminder before due date",
    origin: "AI Proposed",
    config: {
      channel: "SMS",
      purpose: "Promise-to-Pay Reminder",
      referenceEvent: "Promise-to-Pay Date",
      amount: 1,
      unit: "Days",
      direction: "Before",
    },
    next: "o1",
  }),
  n({
    id: "o1",
    kind: "Outcome",
    title: "Promise to pay recorded",
    origin: "AI Proposed",
    config: { outcome: "Promise To Pay Recorded" },
  }),
  n({
    id: "c3",
    kind: "Communication",
    title: "Send SMS reminder",
    origin: "AI Proposed",
    config: {
      channel: "SMS",
      purpose: "Payment Reminder",
      referenceEvent: "Previous Email",
      amount: 4,
      unit: "Days",
      direction: "After",
    },
    next: "r1",
  }),
  n({
    id: "r1",
    kind: "AI Reassessment",
    title: "Reassess treatment",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Action", amount: 3, unit: "Days", direction: "After" },
  }),
];

const winterNodes: StrategyNode[] = [
  n({
    id: "t1",
    kind: "Trigger",
    title: "Winter arrears case received",
    origin: "AI Proposed",
    config: { referenceEvent: "Case Received", amount: 0, unit: "Days", direction: "After" },
    next: "c1",
  }),
  n({
    id: "c1",
    kind: "Communication",
    title: "Send email reminder with plan option",
    origin: "AI Proposed",
    config: {
      channel: "Email",
      purpose: "Payment Plan Reminder",
      referenceEvent: "Case Received",
      amount: 1,
      unit: "Days",
      direction: "After",
    },
    next: "w1",
  }),
  n({
    id: "w1",
    kind: "Wait",
    title: "Observe response",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Email", amount: 5, unit: "Days", direction: "After" },
    next: "q1",
  }),
  n({
    id: "q1",
    kind: "Condition",
    title: "Payment status still unpaid?",
    origin: "AI Proposed",
    config: { attribute: "Payment Status", operator: "Equals", value: "Unpaid" },
    yes: "p1",
    no: "o1",
  }),
  n({
    id: "p1",
    kind: "Payment Action",
    title: "Offer instalment plan",
    origin: "AI Proposed",
    config: { action: "Offer Payment Plan" },
    next: "r1",
  }),
  n({
    id: "r1",
    kind: "AI Reassessment",
    title: "Reassess after plan offer",
    origin: "AI Proposed",
    config: { referenceEvent: "Previous Action", amount: 4, unit: "Days", direction: "After" },
  }),
  n({
    id: "o1",
    kind: "Outcome",
    title: "Paid in full",
    origin: "AI Proposed",
    config: { outcome: "Paid In Full" },
  }),
];

function nodeMap(list: StrategyNode[]): Record<string, StrategyNode> {
  return Object.fromEntries(list.map((node) => [node.id, node]));
}

export const seedStrategies: Strategy[] = [
  {
    id: "pp-loans-early-recovery",
    name: "PayPal Loans Early Recovery",
    clientId: "paypal",
    portfolioId: "pp-loans",
    status: "Active",
    origin: "AI Proposed",
    version: "v2.0",
    lastUpdated: "12 Sep 2026",
    coverage: 910,
    summary:
      "Email-first recovery with delivery and contactability checks before any further contact is attempted.",
    aiContext: [
      { label: "Portfolio", value: "PayPal Loans" },
      { label: "Balance range", value: "$500 – $6,000" },
      { label: "Delinquency", value: "Mostly 30 – 60 days past due" },
      { label: "Payment behaviour", value: "Partial payments common after a first reminder" },
      { label: "Communication engagement", value: "Email open rate 62%" },
      { label: "Channel availability", value: "Email valid on 94% of accounts" },
      { label: "Previous outcomes", value: "Early email contact recovered 41% within 14 days" },
    ],
    approvedBy: "Zeeshan",
    approvalDate: "12 Sep 2026",
    entryNodeId: "t1",
    nodes: nodeMap(loanNodes),
    versions: [
      { version: "v2.0", date: "12 Sep 2026", note: "Approved after supervisor timing change" },
      { version: "v1.0", date: "02 Sep 2026", note: "Proposed by PayFlow AI" },
    ],
  },
  {
    id: "pp-finance-engaged-sms",
    name: "PayPal Finance SMS-Led Recovery",
    clientId: "paypal",
    portfolioId: "pp-finance",
    status: "Under Review",
    origin: "Human Modified",
    version: "v1.1",
    lastUpdated: "14 Sep 2026",
    coverage: 720,
    summary:
      "SMS-led strategy for customers who reliably read messages and click payment links, with a supervisor decision before escalation.",
    aiContext: [
      { label: "Portfolio", value: "PayPal Finance" },
      { label: "Balance range", value: "$1,200 – $12,000" },
      { label: "Delinquency", value: "60 – 90 days past due" },
      { label: "Payment behaviour", value: "Link-driven payments within 48 hours" },
      { label: "Communication engagement", value: "SMS click-through 21%, email 6%" },
      { label: "Promise-to-pay history", value: "68% of promises kept" },
      { label: "Channel availability", value: "Valid mobile on 88% of accounts" },
    ],
    entryNodeId: "t1",
    nodes: nodeMap(financeNodes),
    versions: [
      { version: "v1.1", date: "14 Sep 2026", note: "Supervisor replaced second SMS with a firm email" },
      { version: "v1.0", date: "13 Sep 2026", note: "Proposed by PayFlow AI" },
    ],
  },
  {
    id: "pp-third-party-proposal",
    name: "PayPal Third Party Contact Recovery",
    clientId: "paypal",
    portfolioId: "pp-third-party",
    status: "AI Proposed",
    origin: "AI Proposed",
    version: "v1.0",
    lastUpdated: "14 Sep 2026",
    coverage: 380,
    summary:
      "Proposed for third-party placed accounts where contact details are incomplete and deliverability must be confirmed early.",
    aiContext: [
      { label: "Portfolio", value: "PayPal Third Party" },
      { label: "Balance range", value: "$300 – $4,500" },
      { label: "Delinquency", value: "90+ days past due at placement" },
      { label: "Payment behaviour", value: "Low prior payment activity" },
      { label: "Communication engagement", value: "No engagement history at placement" },
      { label: "Channel availability", value: "Email valid on 71%, mobile valid on 84%" },
      { label: "Previous outcomes", value: "Contactability checks lifted reach by 18%" },
    ],
    entryNodeId: "t1",
    nodes: nodeMap(loanNodes),
    versions: [{ version: "v1.0", date: "14 Sep 2026", note: "Proposed by PayFlow AI" }],
  },
  {
    id: "ct-seasonal-recovery",
    name: "Canadian Tire Seasonal Recovery",
    clientId: "canadian-tire",
    portfolioId: "ct-triangle-cards",
    status: "AI Proposed",
    origin: "AI Proposed",
    version: "v1.0",
    lastUpdated: "14 Sep 2026",
    coverage: 980,
    summary:
      "Light seasonal reminder strategy that follows promise-to-pay behaviour instead of adding contact volume.",
    aiContext: [
      { label: "Portfolio", value: "Canadian Tire Triangle Cards" },
      { label: "Balance range", value: "$200 – $3,800" },
      { label: "Delinquency", value: "27 – 45 days past due" },
      { label: "Payment behaviour", value: "Seasonal catch-up payments after pay cycles" },
      { label: "Communication engagement", value: "Email open rate 48%, SMS reply rate 9%" },
      { label: "Promise-to-pay history", value: "Promise volume higher than portfolio average" },
      { label: "Previous outcomes", value: "Additional reminders produced no measurable lift" },
    ],
    entryNodeId: "t1",
    nodes: nodeMap(seasonalNodes),
    versions: [{ version: "v1.0", date: "14 Sep 2026", note: "Proposed by PayFlow AI" }],
  },
  {
    id: "ns-winter-arrears",
    name: "Northstar Winter Arrears Plan Recovery",
    clientId: "northstar-utilities",
    portfolioId: "ns-residential",
    status: "Approved",
    origin: "Human Modified",
    version: "v1.2",
    lastUpdated: "11 Sep 2026",
    coverage: 610,
    summary:
      "Plan-led recovery for larger winter balances where customers are contactable but need affordability options.",
    aiContext: [
      { label: "Portfolio", value: "Northstar Residential" },
      { label: "Balance range", value: "$400 – $2,900" },
      { label: "Delinquency", value: "18 – 40 days past due" },
      { label: "Payment behaviour", value: "Instalment plans complete at 72%" },
      { label: "Communication engagement", value: "Email open rate 57%" },
      { label: "Channel availability", value: "Email valid on 91% of accounts" },
    ],
    approvedBy: "Sarah",
    approvalDate: "11 Sep 2026",
    entryNodeId: "t1",
    nodes: nodeMap(winterNodes),
    versions: [
      { version: "v1.2", date: "11 Sep 2026", note: "Approved by supervisor" },
      { version: "v1.0", date: "09 Sep 2026", note: "Proposed by PayFlow AI" },
    ],
  },
];

/* ------------------------- message templates library ------------------------ */

export interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  purpose: string;
  subject?: string;
  body: string;
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: "em-reminder",
    name: "Email — Friendly Payment Reminder",
    channel: "Email",
    purpose: "Payment Reminder",
    subject: "A friendly reminder about your balance",
    body: "Hi {{first_name}},\n\nOur records show an outstanding balance of {{outstanding_balance}} on account {{account_reference}}. You can settle it securely online at any time.\n\n{{payment_link}}\n\nIf you have already paid, please ignore this message.\n\n{{brand_name}}",
  },
  {
    id: "em-firm",
    name: "Email — Firm Reminder",
    channel: "Email",
    purpose: "Firm Reminder",
    subject: "Action required on account {{account_reference}}",
    body: "Hi {{first_name}},\n\nYour balance of {{outstanding_balance}} remains unpaid. Please arrange payment or set up a payment plan using the secure link below.\n\n{{payment_link}}\n\nIf you need support with affordability, reply to this email and we will help.\n\n{{brand_name}}",
  },
  {
    id: "em-plan",
    name: "Email — Payment Plan Option",
    channel: "Email",
    purpose: "Payment Plan Reminder",
    subject: "Spread your balance over time",
    body: "Hi {{first_name}},\n\nYou can pay {{outstanding_balance}} in daily, weekly or monthly instalments that suit you.\n\nSet up your plan: {{payment_link}}\n\n{{brand_name}}",
  },
  {
    id: "em-link",
    name: "Email — Secure Payment Link",
    channel: "Email",
    purpose: "Payment Link",
    subject: "Your secure payment link",
    body: "Hi {{first_name}},\n\nHere is your secure link to settle {{outstanding_balance}}:\n\n{{payment_link}}\n\nThe link is unique to account {{account_reference}}.\n\n{{brand_name}}",
  },
  {
    id: "sms-link",
    name: "SMS — Payment Link",
    channel: "SMS",
    purpose: "Payment Link",
    body: "{{brand_name}}: balance {{outstanding_balance}} on {{account_reference}}. Pay securely: {{payment_link}}. Reply STOP to opt out.",
  },
  {
    id: "sms-reminder",
    name: "SMS — Payment Reminder",
    channel: "SMS",
    purpose: "Payment Reminder",
    body: "{{brand_name}}: a reminder that {{outstanding_balance}} is outstanding. Pay or set up a plan: {{payment_link}}. Reply STOP to opt out.",
  },
  {
    id: "sms-promise",
    name: "SMS — Promise-to-Pay Reminder",
    channel: "SMS",
    purpose: "Promise-to-Pay Reminder",
    body: "{{brand_name}}: your promised payment of {{promise_amount}} is due {{promise_date}}. Pay now: {{payment_link}}. Reply STOP to opt out.",
  },
  {
    id: "sms-plan",
    name: "SMS — Payment Plan Option",
    channel: "SMS",
    purpose: "Payment Plan Reminder",
    body: "{{brand_name}}: you can spread {{outstanding_balance}} into instalments. Choose a plan: {{payment_link}}. Reply STOP to opt out.",
  },
  {
    id: "sms-contact",
    name: "SMS — Contact Details Update",
    channel: "SMS",
    purpose: "Contact Details Update Request",
    body: "{{brand_name}}: we could not reach you by email regarding {{account_reference}}. Update your details: {{payment_link}}. Reply STOP to opt out.",
  },
  {
    id: "em-contact",
    name: "Email — Contact Details Update",
    channel: "Email",
    purpose: "Contact Details Update Request",
    subject: "Please confirm your contact details",
    body: "Hi {{first_name}},\n\nWe were unable to reach you about account {{account_reference}}. Please confirm your email and mobile number so we can keep you updated.\n\n{{payment_link}}\n\n{{brand_name}}",
  },
];

export function templatesFor(channel?: string, purpose?: string): MessageTemplate[] {
  const byChannel = messageTemplates.filter((t) => !channel || t.channel === channel);
  const exact = byChannel.filter((t) => !purpose || t.purpose === purpose);
  return exact.length > 0 ? exact : byChannel;
}

export function templateForNode(node: StrategyNode): MessageTemplate | undefined {
  if (node.kind !== "Communication") return undefined;
  const byId = node.config.templateId
    ? messageTemplates.find((t) => t.id === node.config.templateId)
    : undefined;
  return byId ?? templatesFor(node.config.channel, node.config.purpose)[0];
}

/* ------------------------------ segment scope ----------------------------- */

export const ageBands = [
  "All ages",
  "18 – 24",
  "25 – 34",
  "35 – 49",
  "50 – 64",
  "65 and over",
];
export const postalRegions = [
  "All regions",
  "Ontario (M, L, K, N, P)",
  "Quebec (H, J, G)",
  "British Columbia (V)",
  "Alberta (T)",
  "Atlantic (A, B, C, E)",
  "Prairies (R, S)",
];
export const balanceBands = [
  "All balances",
  "Under $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000 and over",
];
export const delinquencyBands = [
  "All stages",
  "1 – 29 days past due",
  "30 – 59 days past due",
  "60 – 89 days past due",
  "90+ days past due",
];
export const languagePreferences = ["All languages", "English", "French", "English + French"];
export const tenureBands = [
  "All customers",
  "New customer (under 6 months)",
  "Established (6 – 24 months)",
  "Long-standing (2 years+)",
];

/** Attributes PayFlow never targets on, shown in the UI for transparency. */
export const excludedTargetingAttributes = [
  "Ethnicity",
  "Religion",
  "Gender",
  "Health status",
  "Marital status",
];

export const defaultSegment: StrategySegment = {
  ageBand: "All ages",
  postalRegion: "All regions",
  balanceBand: "All balances",
  delinquency: "All stages",
  language: "All languages",
  tenure: "All customers",
};

export function segmentEntries(segment: StrategySegment): { label: string; value: string }[] {
  return [
    { label: "Age band", value: segment.ageBand },
    { label: "Postal region", value: segment.postalRegion },
    { label: "Balance band", value: segment.balanceBand },
    { label: "Delinquency stage", value: segment.delinquency },
    { label: "Language", value: segment.language },
    { label: "Customer tenure", value: segment.tenure },
  ];
}

const seedSegments: Record<string, StrategySegment> = {
  "pp-loans-early-recovery": {
    ageBand: "25 – 34",
    postalRegion: "Ontario (M, L, K, N, P)",
    balanceBand: "$500 – $1,500",
    delinquency: "30 – 59 days past due",
    language: "English",
    tenure: "Established (6 – 24 months)",
  },
  "pp-finance-engaged-sms": {
    ageBand: "35 – 49",
    postalRegion: "All regions",
    balanceBand: "$1,500 – $5,000",
    delinquency: "60 – 89 days past due",
    language: "English + French",
    tenure: "Long-standing (2 years+)",
  },
  "pp-third-party-proposal": {
    ageBand: "All ages",
    postalRegion: "All regions",
    balanceBand: "Under $500",
    delinquency: "90+ days past due",
    language: "All languages",
    tenure: "New customer (under 6 months)",
  },
  "ct-seasonal-recovery": {
    ageBand: "25 – 34",
    postalRegion: "Prairies (R, S)",
    balanceBand: "$500 – $1,500",
    delinquency: "1 – 29 days past due",
    language: "English",
    tenure: "Established (6 – 24 months)",
  },
  "ns-winter-arrears": {
    ageBand: "50 – 64",
    postalRegion: "Atlantic (A, B, C, E)",
    balanceBand: "$1,500 – $5,000",
    delinquency: "30 – 59 days past due",
    language: "English + French",
    tenure: "Long-standing (2 years+)",
  },
};

for (const strategy of seedStrategies) {
  strategy.segment = seedSegments[strategy.id] ?? defaultSegment;
}

/* --------------------- AI-assisted starter flow for humans -------------------- */

/**
 * Starter flow suggested by PayFlow when a person creates a new strategy.
 * The human keeps full control of every step afterwards.
 */
export function suggestedNodes(segment: StrategySegment): Record<string, StrategyNode> {
  const smsFirst = segment.balanceBand === "Under $500" || segment.delinquency === "90+ days past due";
  const first: StrategyNode = {
    id: "c1",
    kind: "Communication",
    title: smsFirst ? "Send SMS with payment link" : "Send email reminder",
    origin: "AI Proposed",
    config: {
      channel: smsFirst ? "SMS" : "Email",
      purpose: smsFirst ? "Payment Link" : "Payment Reminder",
      templateId: smsFirst ? "sms-link" : "em-reminder",
      referenceEvent: "Case Received",
      amount: 0,
      unit: "Days",
      direction: "After",
    },
    next: "w1",
  };
  const list: StrategyNode[] = [
    {
      id: "t1",
      kind: "Trigger",
      title: "Case received from source file",
      origin: "AI Proposed",
      config: { referenceEvent: "Case Received", amount: 0, unit: "Days", direction: "After" },
      next: "c1",
    },
    first,
    {
      id: "w1",
      kind: "Wait",
      title: "Observe response",
      origin: "AI Proposed",
      config: {
        referenceEvent: smsFirst ? "Previous SMS" : "Previous Email",
        amount: 3,
        unit: "Days",
        direction: "After",
      },
      next: "q1",
    },
    {
      id: "q1",
      kind: "Condition",
      title: "Payment received?",
      origin: "AI Proposed",
      config: { attribute: "Payment Status", operator: "Equals", value: "Paid In Full" },
      yes: "o1",
      no: "c2",
    },
    {
      id: "o1",
      kind: "Outcome",
      title: "Case closed — paid",
      origin: "AI Proposed",
      config: { outcome: "Paid In Full" },
    },
    {
      id: "c2",
      kind: "Communication",
      title: smsFirst ? "Send email reminder" : "Send SMS with payment link",
      origin: "AI Proposed",
      config: {
        channel: smsFirst ? "Email" : "SMS",
        purpose: "Payment Link",
        templateId: smsFirst ? "em-link" : "sms-link",
        referenceEvent: smsFirst ? "Previous SMS" : "Previous Email",
        amount: 2,
        unit: "Days",
        direction: "After",
      },
      next: "r1",
    },
    {
      id: "r1",
      kind: "AI Reassessment",
      title: "Reassess next best action",
      origin: "AI Proposed",
      config: { referenceEvent: "Previous Action", amount: 2, unit: "Days", direction: "After" },
      next: "p1",
    },
    {
      id: "p1",
      kind: "Payment Action",
      title: "Offer payment plan",
      origin: "AI Proposed",
      config: { action: "Offer Payment Plan" },
      next: "o2",
    },
    {
      id: "o2",
      kind: "Outcome",
      title: "Payment plan active",
      origin: "AI Proposed",
      config: { outcome: "Payment Plan Active" },
    },
  ];
  return Object.fromEntries(list.map((node) => [node.id, node]));
}

/** Short, plain-language suggestions shown while a person builds a strategy. */
export function aiSuggestions(segment: StrategySegment): string[] {
  const tips: string[] = [];
  tips.push(
    segment.balanceBand === "$5,000 and over"
      ? "Larger balances respond better to a payment plan offer early in the flow."
      : "Start with the cheapest contactable channel and confirm delivery before adding contact.",
  );
  if (segment.delinquency === "90+ days past due")
    tips.push("At 90+ days past due, confirm contactability first — reach is the main constraint.");
  if (segment.language === "French" || segment.language === "English + French")
    tips.push("Send in the customer's preferred language to lift response rates.");
  if (segment.ageBand === "18 – 24" || segment.ageBand === "25 – 34")
    tips.push("Younger age bands engage more with SMS payment links than with email.");
  if (segment.ageBand === "65 and over")
    tips.push("Allow longer observation windows between contacts for this age band.");
  tips.push("Add a supervisor review step before any escalated treatment.");
  return tips;
}

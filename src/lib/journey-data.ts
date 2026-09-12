import type { Tone } from "@/components/payflow-ui";

export type JourneyType = "Approved Workflow" | "AI-Adapted Workflow" | "AI-Created Workflow";

export type JourneyStatus = "Draft" | "Active" | "Awaiting Approval" | "Inactive" | "Archived";

export type JourneyStepKind =
  | "Entry"
  | "Communication"
  | "Wait"
  | "Reassess"
  | "Condition"
  | "Governance"
  | "Payment"
  | "Escalation"
  | "Outcome"
  | "Stop";

export interface JourneyStep {
  kind: JourneyStepKind;
  title: string;
  detail?: string;
  channel?: "Email" | "SMS";
  timing?: string;
}

export interface JourneyVersion {
  version: string;
  date: string;
  note: string;
}

export interface Journey {
  id: string;
  name: string;
  /** "Global" or the client name */
  scope: string;
  clientId: string | null;
  type: JourneyType;
  version: string;
  status: JourneyStatus;
  accountsAssigned: number;
  /** Demo outcome figure */
  recoveryRate: number;
  recoveryNote: string;
  source: string;
  lastUpdated: string;
  /** Business-readable reason this collection workflow exists / is used */
  reasoning: string;
  steps: JourneyStep[];
  versions: JourneyVersion[];
  /** Set when the journey is awaiting a supervisor decision */
  reviewId?: string;
}

export const journeyTypes: JourneyType[] = [
  "Approved Workflow",
  "AI-Adapted Workflow",
  "AI-Created Workflow",
];

export const journeyStatuses: JourneyStatus[] = [
  "Draft",
  "Active",
  "Awaiting Approval",
  "Inactive",
  "Archived",
];

export const journeySources = ["Collections Policy Team", "PayFlow AI", "Supervisor"];

export function journeyTypeTone(type: JourneyType): Tone {
  if (type === "AI-Adapted Workflow") return "info";
  if (type === "AI-Created Workflow") return "ai";
  return "neutral";
}

export function journeyStatusTone(status: JourneyStatus): Tone {
  switch (status) {
    case "Active":
      return "success";
    case "Awaiting Approval":
      return "warning";
    case "Draft":
      return "info";
    default:
      return "neutral";
  }
}

export function journeyStepTone(kind: JourneyStepKind): Tone {
  switch (kind) {
    case "Communication":
      return "info";
    case "Reassess":
      return "ai";
    case "Governance":
      return "warning";
    case "Payment":
      return "success";
    case "Escalation":
      return "danger";
    default:
      return "neutral";
  }
}

const earlyStageSteps: JourneyStep[] = [
  { kind: "Entry", title: "Account enters collection workflow", detail: "Early-stage overdue balance" },
  {
    kind: "Communication",
    title: "Initial reminder",
    channel: "Email",
    timing: "Day 0",
    detail: "Client-branded reminder with secure payment link",
  },
  { kind: "Wait", title: "Wait / observe", timing: "2 days", detail: "Observation period" },
  { kind: "Reassess", title: "Reassess customer", detail: "Engagement, payment and contact context" },
  {
    kind: "Communication",
    title: "Follow-up reminder",
    channel: "SMS",
    timing: "If appropriate",
    detail: "Sent only where reassessment supports further contact",
  },
  { kind: "Outcome", title: "Observe outcome", detail: "Payment, no response or other event" },
  { kind: "Reassess", title: "Reassess", detail: "Determine next best action" },
  { kind: "Stop", title: "Stop condition", detail: "Balance settled or case moved to another treatment" },
];

const progressiveSteps: JourneyStep[] = [
  { kind: "Entry", title: "Account enters collection workflow", detail: "Overdue after early-stage contact" },
  { kind: "Communication", title: "First reminder", channel: "Email", timing: "Day 0" },
  { kind: "Wait", title: "Wait / observe", timing: "3 days" },
  { kind: "Reassess", title: "Reassess customer", detail: "Channel preference and engagement" },
  { kind: "Communication", title: "Second reminder", channel: "SMS", timing: "Day 3" },
  { kind: "Condition", title: "If no meaningful response", detail: "Create no-response event" },
  { kind: "Governance", title: "Governance check", detail: "Applicable client rules evaluated" },
  { kind: "Communication", title: "Firm reminder", channel: "Email", timing: "Day 7" },
  { kind: "Outcome", title: "Observe outcome", detail: "Payment, promise to pay or no response" },
  { kind: "Escalation", title: "Escalation point", detail: "Only where governance requires it" },
];

const promiseSteps: JourneyStep[] = [
  { kind: "Entry", title: "Promise to pay captured", detail: "Customer committed to a date" },
  { kind: "Wait", title: "Wait until promise date", timing: "Per commitment" },
  { kind: "Communication", title: "Promise reminder", channel: "SMS", timing: "1 day before" },
  { kind: "Reassess", title: "Reassess on promise date", detail: "Kept, partial or broken promise" },
  { kind: "Payment", title: "Payment received", detail: "Balance updated, collection workflow stops" },
  { kind: "Condition", title: "Broken promise", detail: "Update context and reassess treatment" },
];

const paymentPlanSteps: JourneyStep[] = [
  { kind: "Entry", title: "Payment plan agreed", detail: "Installment schedule active" },
  { kind: "Communication", title: "Installment reminder", channel: "Email", timing: "2 days before" },
  { kind: "Payment", title: "Installment received", detail: "Plan progresses" },
  { kind: "Condition", title: "Missed installment", detail: "Update context and reassess" },
  { kind: "Reassess", title: "Reassess plan health", detail: "After each installment cycle" },
];

const escalatedSteps: JourneyStep[] = [
  { kind: "Entry", title: "Account enters collection workflow", detail: "No response after repeated attempts" },
  { kind: "Reassess", title: "Assess situation", detail: "Balance, contactability, dispute signals" },
  { kind: "Governance", title: "Governance check", detail: "High balance and escalation rules" },
  { kind: "Escalation", title: "Human review", detail: "Supervisor decision required" },
  { kind: "Communication", title: "Approved outreach", channel: "Email", timing: "After approval" },
  { kind: "Outcome", title: "Observe outcome", detail: "Feeds back into case context" },
];

const highEngagementSteps: JourneyStep[] = [
  { kind: "Entry", title: "Account enters collection workflow", detail: "Consistent SMS engagement observed" },
  { kind: "Communication", title: "Short SMS reminder", channel: "SMS", timing: "Day 0" },
  { kind: "Wait", title: "Wait / observe", timing: "1 day" },
  { kind: "Reassess", title: "Reassess customer", detail: "Click and payment behaviour" },
  { kind: "Communication", title: "Payment link nudge", channel: "SMS", timing: "Day 1" },
  { kind: "Payment", title: "Payment initiated", detail: "Client-branded payment experience" },
  { kind: "Reassess", title: "Reassess", detail: "Stop or continue based on outcome" },
];

const ctVariationSteps: JourneyStep[] = [
  { kind: "Entry", title: "Account enters collection workflow", detail: "Retail seasonal balances" },
  { kind: "Communication", title: "Soft reminder", channel: "Email", timing: "Day 0" },
  { kind: "Wait", title: "Wait / observe", timing: "4 days" },
  { kind: "Reassess", title: "Reassess customer", detail: "No existing collection workflow fitted this segment" },
  { kind: "Communication", title: "SMS reminder", channel: "SMS", timing: "Day 4" },
  { kind: "Governance", title: "Governance check", detail: "Client requires approval of AI-created collection workflows" },
  { kind: "Outcome", title: "Observe outcome", detail: "Recovery measured against baseline" },
];

export const journeyLibrary: Journey[] = [
  {
    id: "early-stage-collection",
    name: "Early Stage Collection",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v2.0",
    status: "Active",
    accountsAssigned: 4820,
    recoveryRate: 0.41,
    recoveryNote: "41% recovered within 14 days",
    source: "Collections Policy Team",
    lastUpdated: "10 Sep 2026",
    reasoning:
      "This collection workflow is commonly used for early-stage overdue accounts with no previous failed collection attempts. Contact is light, email-first and stops as soon as payment is received.",
    steps: earlyStageSteps,
    versions: [
      { version: "v2.0", date: "10 Sep 2026", note: "Added reassessment before the follow-up reminder" },
      { version: "v1.1", date: "18 Jul 2026", note: "Observation window extended to 2 days" },
      { version: "v1.0", date: "02 Apr 2026", note: "Initial approved collection workflow" },
    ],
  },
  {
    id: "progressive-collection",
    name: "Progressive Collection",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v1.1",
    status: "Active",
    accountsAssigned: 2410,
    recoveryRate: 0.33,
    recoveryNote: "33% recovered within 30 days",
    source: "Collections Policy Team",
    lastUpdated: "04 Sep 2026",
    reasoning:
      "Used where an early-stage reminder has not produced payment. Contact steps become progressively firmer, with a reassessment between each step so contact stops when it is no longer appropriate.",
    steps: progressiveSteps,
    versions: [
      { version: "v1.1", date: "04 Sep 2026", note: "Governance check added before the firm reminder" },
      { version: "v1.0", date: "12 May 2026", note: "Initial approved collection workflow" },
    ],
  },
  {
    id: "progressive-reminder",
    name: "Progressive Reminder",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v1.0",
    status: "Active",
    accountsAssigned: 1180,
    recoveryRate: 0.29,
    recoveryNote: "29% recovered within 30 days",
    source: "Collections Policy Team",
    lastUpdated: "28 Aug 2026",
    reasoning:
      "A lighter reminder sequence for accounts that engage but have not yet paid. Reminder volume is deliberately limited.",
    steps: progressiveSteps.slice(0, 6),
    versions: [{ version: "v1.0", date: "28 Aug 2026", note: "Initial approved collection workflow" }],
  },
  {
    id: "promise-to-pay-follow-up",
    name: "Promise-to-Pay Follow-Up",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v1.2",
    status: "Active",
    accountsAssigned: 740,
    recoveryRate: 0.58,
    recoveryNote: "58% of promises kept",
    source: "Collections Policy Team",
    lastUpdated: "01 Sep 2026",
    reasoning:
      "Applied once a customer has committed to a payment date. Contact is limited to a single reminder before the promise date, then the outcome is reassessed.",
    steps: promiseSteps,
    versions: [
      { version: "v1.2", date: "01 Sep 2026", note: "Broken promise now reassesses instead of escalating" },
      { version: "v1.0", date: "20 Mar 2026", note: "Initial approved collection workflow" },
    ],
  },
  {
    id: "payment-plan-monitoring",
    name: "Payment Plan Monitoring",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v1.0",
    status: "Active",
    accountsAssigned: 610,
    recoveryRate: 0.72,
    recoveryNote: "72% of plans on schedule",
    source: "Collections Policy Team",
    lastUpdated: "22 Aug 2026",
    reasoning:
      "Monitors accounts on an agreed installment plan. Only installment reminders are sent while the plan remains on schedule.",
    steps: paymentPlanSteps,
    versions: [{ version: "v1.0", date: "22 Aug 2026", note: "Initial approved collection workflow" }],
  },
  {
    id: "escalated-collection",
    name: "Escalated Collection",
    scope: "Global",
    clientId: null,
    type: "Approved Workflow",
    version: "v1.1",
    status: "Active",
    accountsAssigned: 265,
    recoveryRate: 0.18,
    recoveryNote: "18% recovered after escalation",
    source: "Collections Policy Team",
    lastUpdated: "15 Aug 2026",
    reasoning:
      "Used for high-balance or unresponsive accounts where governance requires a supervisor decision before further action.",
    steps: escalatedSteps,
    versions: [
      { version: "v1.1", date: "15 Aug 2026", note: "Dispute signals now block automated outreach" },
      { version: "v1.0", date: "09 Feb 2026", note: "Initial approved collection workflow" },
    ],
  },
  {
    id: "paypal-high-engagement-recovery",
    name: "PayPal High Engagement Recovery",
    scope: "PayPal",
    clientId: "paypal",
    type: "AI-Adapted Workflow",
    version: "v1.1",
    status: "Active",
    accountsAssigned: 380,
    recoveryRate: 0.47,
    recoveryNote: "47% recovered within 7 days",
    source: "PayFlow AI",
    lastUpdated: "11 Sep 2026",
    reasoning:
      "Adapted from Progressive Collection for PayPal customers who reliably read SMS and click payment links. Steps are shorter and SMS-first because email added no measurable lift for this segment.",
    steps: highEngagementSteps,
    versions: [
      { version: "v1.1", date: "11 Sep 2026", note: "Observation window shortened to 1 day" },
      { version: "v1.0", date: "26 Aug 2026", note: "Adapted from Progressive Collection v1.1" },
    ],
  },
  {
    id: "canadian-tire-recovery-variation",
    name: "Canadian Tire Recovery Variation",
    scope: "Canadian Tire",
    clientId: "canadian-tire",
    type: "AI-Created Workflow",
    version: "v1.0",
    status: "Awaiting Approval",
    accountsAssigned: 120,
    recoveryRate: 0.26,
    recoveryNote: "26% recovered in pilot group",
    source: "PayFlow AI",
    lastUpdated: "12 Sep 2026",
    reasoning:
      "Created because no existing collection workflow suited seasonal retail balances with low early engagement. Canadian Tire governance requires supervisor approval before an AI-created collection workflow becomes active.",
    steps: ctVariationSteps,
    versions: [{ version: "v1.0", date: "12 Sep 2026", note: "Created by PayFlow AI, awaiting approval" }],
    reviewId: "rev-1042",
  },
  {
    id: "northstar-winter-arrears",
    name: "Northstar Winter Arrears",
    scope: "Northstar Utilities",
    clientId: "northstar-utilities",
    type: "AI-Adapted Workflow",
    version: "v1.0",
    status: "Draft",
    accountsAssigned: 0,
    recoveryRate: 0,
    recoveryNote: "Not yet in use",
    source: "PayFlow AI",
    lastUpdated: "09 Sep 2026",
    reasoning:
      "Adapted from Early Stage Collection for utility arrears accumulated over winter billing, where balances are larger but customers are usually contactable.",
    steps: earlyStageSteps.slice(0, 6),
    versions: [{ version: "v1.0", date: "09 Sep 2026", note: "Draft adaptation of Early Stage Collection" }],
  },
];

export function journeyById(id: string) {
  return journeyLibrary.find((j) => j.id === id);
}

export function journeyByName(name: string) {
  return journeyLibrary.find((j) => j.name === name);
}

/** Global journeys in use plus journeys specific to this client. */
export function journeysForClient(clientId: string) {
  return journeyLibrary.filter((j) => j.clientId === null || j.clientId === clientId);
}

export interface AccountJourneyState {
  journeyId: string;
  stage: string;
  startedAt: string;
  nextAction: string;
  whySelected: string;
}

const accountJourneyStates: Record<string, AccountJourneyState> = {
  "pp-10482": {
    journeyId: "early-stage-collection",
    stage: "Follow-Up Reminder",
    startedAt: "14 Aug 2026",
    nextAction: "Customer reassessment in 48 hours",
    whySelected:
      "First overdue period with no previous failed attempts, and the customer has a valid email address.",
  },
  "pp-11021": {
    journeyId: "promise-to-pay-follow-up",
    stage: "Promise Reminder",
    startedAt: "05 Aug 2026",
    nextAction: "Reassess after the promised payment date",
    whySelected: "The customer committed to a payment date, so reminder volume is deliberately limited.",
  },
  "pp-12098": {
    journeyId: "payment-plan-monitoring",
    stage: "Installment Reminder",
    startedAt: "25 Jul 2026",
    nextAction: "Installment reminder 2 days before the next due date",
    whySelected: "An installment plan is active and on schedule, so only plan reminders are appropriate.",
  },
  "pp-88831": {
    journeyId: "escalated-collection",
    stage: "Human Review",
    startedAt: "10 Aug 2026",
    nextAction: "Awaiting supervisor decision",
    whySelected:
      "High balance with no response after repeated attempts, which the client's governance requires a supervisor to review.",
  },
  "ct-20394": {
    journeyId: "progressive-collection",
    stage: "Second Reminder",
    startedAt: "02 Aug 2026",
    nextAction: "Customer reassessment in 24 hours",
    whySelected:
      "The early-stage reminder produced no payment, and the customer engages more reliably on SMS.",
  },
  "ct-21877": {
    journeyId: "payment-plan-monitoring",
    stage: "Installment Reminder",
    startedAt: "21 Jul 2026",
    nextAction: "Installment reminder before the next due date",
    whySelected: "A four-installment plan is active and payments have been received on time.",
  },
  "ct-22540": {
    journeyId: "escalated-collection",
    stage: "Human Review",
    startedAt: "18 Aug 2026",
    nextAction: "Awaiting supervisor decision on the disputed charge",
    whySelected: "The customer raised a dispute, so automated outreach is held pending review.",
  },
  "ns-30112": {
    journeyId: "early-stage-collection",
    stage: "Initial Reminder",
    startedAt: "16 Aug 2026",
    nextAction: "Customer reassessment in 72 hours",
    whySelected: "First-time delinquency with a small balance and an active email address.",
  },
  "ns-31450": {
    journeyId: "promise-to-pay-follow-up",
    stage: "Wait Until Promise Date",
    startedAt: "12 Aug 2026",
    nextAction: "Reassess after the promised payment date",
    whySelected: "A promise to pay was captured on a call, so no further contact is scheduled before that date.",
  },
};

export function journeyStateForAccount(
  accountId: string,
  journeyName?: string,
): (AccountJourneyState & { journey: Journey | undefined }) | undefined {
  const state = accountJourneyStates[accountId];
  if (state) return { ...state, journey: journeyById(state.journeyId) };
  if (!journeyName) return undefined;
  const journey = journeyByName(journeyName);
  if (!journey) return undefined;
  return {
    journeyId: journey.id,
    stage: journey.steps[1]?.title ?? "In progress",
    startedAt: "—",
    nextAction: "Customer reassessment scheduled",
    whySelected: journey.reasoning,
    journey,
  };
}

export function accountsAssignedToJourney(journeyId: string) {
  return Object.entries(accountJourneyStates)
    .filter(([, state]) => state.journeyId === journeyId)
    .map(([accountId, state]) => ({ accountId, ...state }));
}

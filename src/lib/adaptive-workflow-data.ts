import type { NodeConfig, Strategy, StrategyNode } from "./strategy-data";
import { initialCommunicationVersions } from "./communication-versions";

export type Occurrence = "first" | "repeat";
export const occurrenceLabel: Record<Occurrence, string> = { first: "First Time", repeat: "Repeat" };

export interface AdaptiveFollowup {
  id: string;
  name: string;
  trigger: string;
  waiting?: string;
  /** First Time communication set. */
  config: NodeConfig;
  /** Repeat communication set — a different approach for subsequent occurrences. */
  repeat?: NodeConfig;
}

/** Each communication set as an independently validated pseudo-node. */
export function followupSets(f: AdaptiveFollowup): { occurrence: Occurrence; config: NodeConfig }[] {
  return [
    { occurrence: "first", config: f.config },
    { occurrence: "repeat", config: f.repeat ?? { communicationVersions: [] } },
  ];
}

export const standardFollowups = [
  {
    id: "not-opened",
    waiting: "48 hours",
    name: "Not Opened",
    trigger: "No email open recorded within 48 hours of delivery.",
  },
  {
    id: "opened-not-paid",
    waiting: "48 hours",
    name: "Opened, Not Paid",
    trigger: "Email opened; no payment activity within 48 hours of the open.",
  },
  {
    id: "no-engagement",
    waiting: "72 hours",
    name: "No Engagement",
    trigger:
      "No observable open, click or payment activity within 72 hours of the last communication.",
  },
  {
    id: "payment-not-finished",
    waiting: "24 hours",
    name: "Payment Not Finished",
    trigger: "Payment page accessed; no completed payment within 24 hours.",
  },
  {
    id: "payment-failed",
    waiting: "2 hours",
    name: "Payment Failed",
    trigger: "Verified payment failure; reassess after 2 hours before another contact.",
  },
  {
    id: "part-paid",
    waiting: "24 hours",
    name: "Part Paid",
    trigger: "Confirmed partial payment; reassess remaining balance after 24 hours.",
  },
  {
    id: "plan-setup-not-finished",
    waiting: "Pending configuration",
    name: "Plan Setup Not Finished",
    trigger: "Customer started setting up a payment plan but did not complete it.",
  },
];

/** Progressive mock content: Repeat takes a different approach, never a rephrase. */
const progressiveContent: Record<string, Record<Occurrence, { subject: string; body: string; sms: string }>> = {
  "not-opened": {
    first: { subject: "A quick reminder about your account", body: "Hi {{first_name}},\n\nThis is a reminder that a balance remains on account {{account_reference}}. You can review and pay securely online.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: A balance remains on {{account_reference}}. Pay securely: {{payment_link}}" },
    repeat: { subject: "We're here to help with your account", body: "Hi {{first_name}},\n\nIf now isn't a good time, that's okay. Our team can help you find an option that works for you, or you can review your account at your own pace.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Need help with {{account_reference}}? We can find an option that works for you: {{payment_link}}" },
  },
  "opened-not-paid": {
    first: { subject: "How to complete your payment", body: "Hi {{first_name}},\n\nPaying takes a few minutes: open the secure link, confirm your balance and choose your payment method.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Pay {{account_reference}} in a few steps: {{payment_link}}" },
    repeat: { subject: "Options that may suit you better", body: "Hi {{first_name}},\n\nIf paying the full balance isn't possible, you may be able to pay part now or set up a payment plan, where available for your account.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Other options may be available for {{account_reference}}: {{payment_link}}" },
  },
  "no-engagement": {
    first: { subject: "A friendly reminder from {{brand_name}}", body: "Hi {{first_name}},\n\nJust a friendly reminder that your account {{account_reference}} is still open.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Friendly reminder about {{account_reference}}: {{payment_link}}" },
    repeat: { subject: "Let's resolve your account together", body: "Hi {{first_name}},\n\nWe'd like to help you resolve this. Reply through the secure page or contact our team, and we'll walk you through the available choices.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: We'd like to help resolve {{account_reference}}. See your choices: {{payment_link}}" },
  },
  "payment-not-finished": {
    first: { subject: "Finish your payment in a few steps", body: "Hi {{first_name}},\n\nYour payment wasn't completed. You can return to the secure page and finish where you left off.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Finish your payment for {{account_reference}}: {{payment_link}}" },
    repeat: { subject: "Other ways to pay, or get help", body: "Hi {{first_name}},\n\nIf something got in the way, you can try another available payment method, or contact our team and we'll help you complete it.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Try another payment method or get help for {{account_reference}}: {{payment_link}}" },
  },
  "payment-failed": {
    first: { subject: "Your payment didn't go through", body: "Hi {{first_name}},\n\nYour recent payment could not be processed. Please check your details and try again using the secure link.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Your payment didn't go through. Retry securely: {{payment_link}}" },
    repeat: { subject: "Try a different payment method", body: "Hi {{first_name}},\n\nIf the same method keeps failing, you can choose another available method, or our team can help you find an alternative.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Use another payment method or get help: {{payment_link}}" },
  },
  "part-paid": {
    first: { subject: "Thank you for your payment", body: "Hi {{first_name}},\n\nThank you — we received your payment. A remaining balance of {{balance}} is still open on {{account_reference}}.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Thanks for your payment. Remaining balance: {{balance}}. {{payment_link}}" },
    repeat: { subject: "Arrangements for your remaining balance", body: "Hi {{first_name}},\n\nTo settle the remaining {{balance}}, you can pay in parts or set up a payment plan, where available for your account.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Arrange the remaining {{balance}} on your terms: {{payment_link}}" },
  },
  "plan-setup-not-finished": {
    first: { subject: "Complete your payment plan setup", body: "Hi {{first_name}},\n\nYou started setting up a payment plan. Choose your frequency and amount to finish — it only takes a minute.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Finish setting up your payment plan: {{payment_link}}" },
    repeat: { subject: "Setting up a plan, made simple", body: "Hi {{first_name}},\n\nJust pick how often you'd like to pay and the amount each time — we'll show your dates. Prefer help? Our team can set it up with you.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Pick a frequency and amount to set up your plan, or ask us for help: {{payment_link}}" },
  },
};

export function followupNode(followup: AdaptiveFollowup): StrategyNode {
  return {
    id: followup.id,
    title: followup.name,
    kind: "Communication",
    origin: "AI Proposed",
    config: followup.config,
  };
}

export function writeFollowup(
  strategy: Strategy,
  followup: AdaptiveFollowup,
  only?: Occurrence,
): AdaptiveFollowup {
  const write = (occurrence: Occurrence) => writeSet(strategy, followup, occurrence);
  return {
    ...followup,
    config: only === "repeat" ? followup.config : write("first"),
    repeat: only === "first" ? (followup.repeat ?? { communicationVersions: [] }) : write("repeat"),
  };
}

function writeSet(strategy: Strategy, followup: AdaptiveFollowup, occurrence: Occurrence): NodeConfig {
  const source = Object.values(strategy.nodes).find((node) => node.kind === "Communication");
  const base =
    source?.config.communicationVersions ?? initialCommunicationVersions(followupNode(followup));
  const copy = progressiveContent[followup.id]?.[occurrence];
  return {
      channel: "Email",
      purpose: "Payment Reminder",
      reminderStage: followup.name,
      ...(source?.config.communicationSegments
        ? { communicationSegments: source.config.communicationSegments }
        : {}),
      communicationVersions: base.map((version) => ({
        ...version,
        subject: copy?.subject ?? `Your account — ${followup.name.toLowerCase()}`,
        // Progressive intros keep each version's protected approved copy unchanged.
        ...(copy
          ? {
              emailBody: `${copy.body.split("\n\n{{payment_link}}")[0]?.replace(/^Hi \{\{first_name\}\},\n\n/, "")}\n\n${version.protectedEmail}`,
              smsContent: `${copy.sms.replace(/^\{\{brand_name\}\}: /, "").replace(/:?\s*\{\{payment_link\}\}$/, ".")} ${version.protectedSms}`,
            }
          : {}),
        status: "Modified",
        hasUnsavedChanges: false,
        explanation: `Simulated AI reasoning (${occurrenceLabel[occurrence]}): ${followup.trigger} ${occurrence === "repeat" ? "First-time content was already sent, so take a different, more supportive approach with assistance or available arrangements." : "Initial occurrence: a clear, direct next step."} Replace the next eligible reminder rather than add contact volume; mandatory protections still apply.`,
      })),
  };
}

export function seedAdaptiveWorkflow(strategy: Strategy): Strategy {
  const enabled = ["pp-loans-early-recovery", "pp-third-party-proposal"].includes(strategy.id);
  const finalized = strategy.status === "Active" || strategy.status === "Approved";
  const followups = standardFollowups.map((scenario, index) => {
    const followup: AdaptiveFollowup = {
      ...scenario,
      config: { channel: "Email", purpose: "Payment Reminder", communicationVersions: [] },
      repeat: { channel: "Email", purpose: "Payment Reminder", communicationVersions: [] },
    };
    if (!finalized && index === 2) return followup;
    const written = writeFollowup(strategy, followup);
    const final = (c: NodeConfig | undefined): NodeConfig => ({
      ...c,
      communicationVersions:
        c?.communicationVersions?.map((v) => ({ ...v, status: "Final" as const })) ?? [],
    });
    return finalized ? { ...written, config: final(written.config), repeat: final(written.repeat) } : written;
  });
  return { ...strategy, adaptiveEnabled: enabled, adaptiveFollowups: followups };
}

export type AdaptiveStatus = "Active" | "Disabled" | "Paused" | "Completed" | "Requires Review";
export type DecisionStatus =
  | "Approved"
  | "Pending"
  | "Rejected"
  | "Modified"
  | "Applied"
  | "Superseded"
  | "Cancelled"
  | "Deferred"
  | "Blocked"
  | "Expired";
export const adaptiveActions = [
  "Keep existing plan",
  "Replace planned communication",
  "Reschedule communication",
  "Switch communication channel",
  "Wait for further activity",
  "Pause workflow",
  "Cancel scheduled communication",
  "Stop workflow",
  "Route for Operations review",
];
export interface AdaptiveEvent {
  at: string;
  label: string;
  detail: string;
  status?: DecisionStatus;
}
export interface AdaptiveDecision {
  id: string;
  status: DecisionStatus;
  action: string;
  followupId: string;
  channel: string;
  scheduled: string;
  source: "AI" | "Rule-Based" | "Manual Reassessment";
  trigger: string;
  explanation: string;
  confidence?: number;
  compliance: "Eligible — mock checks passed" | "Blocked — contact restriction";
  requiresApproval: boolean;
  expiresAt: string;
  at: string;
  subject: string;
  body: string;
  sms: string;
  occurrence?: Occurrence;
  contentVersion?: string;
  replaces?: string;
}
export type UsageStatus = "Available" | "Scheduled" | "Sent" | "Not Written Yet" | "Not Applicable";
export interface UsageEntry {
  status: "Scheduled" | "Sent" | "Not Applicable";
  at?: string;
  replaced?: string;
}
export type FollowupUsage = Record<string, Partial<Record<Occurrence, UsageEntry>>>;

/** Scheduled content is not consumed until sent; cancelled/superseded entries are simply removed. */
export function usageStatus(
  usage: FollowupUsage | undefined,
  followup: AdaptiveFollowup,
  occurrence: Occurrence,
): UsageStatus {
  const entry = usage?.[followup.id]?.[occurrence];
  if (entry) return entry.status;
  const set = occurrence === "first" ? followup.config : followup.repeat;
  return set?.communicationVersions?.length ? "Available" : "Not Written Yet";
}
export function isExhausted(usage: FollowupUsage | undefined, followupId: string): boolean {
  return usage?.[followupId]?.first?.status === "Sent" && usage[followupId]?.repeat?.status === "Sent";
}
/** Next eligible, approved, unused content for a follow-up (First Time before Repeat). */
export function nextOccurrence(
  usage: FollowupUsage | undefined,
  followup: AdaptiveFollowup,
): Occurrence | null {
  return (["first", "repeat"] as const).find((o) => usageStatus(usage, followup, o) === "Available") ?? null;
}
export function sentLabel(name: string, occurrence: Occurrence, replaced: string, version: string) {
  return `Follow-up: ${name} · ${occurrenceLabel[occurrence]} (Replaced ${replaced}) · ${version}`;
}
export interface AdaptiveCase {
  accountId: string;
  strategyId: string;
  status: AdaptiveStatus;
  engagement: string;
  originalStep: string;
  originalChannel: string;
  originalScheduled: string;
  decision: AdaptiveDecision;
  history: AdaptiveEvent[];
  usage?: FollowupUsage;
}

export function canReviewDecision(
  decision: AdaptiveDecision,
  authorized: boolean,
  now: string,
): boolean {
  return (
    authorized &&
    decision.requiresApproval &&
    decision.status === "Pending" &&
    decision.compliance !== "Blocked — contact restriction" &&
    Date.parse(decision.expiresAt) > Date.parse(now)
  );
}

const journeyHistory: AdaptiveEvent[] = [
  {
    at: "2026-11-16T14:00:00Z",
    label: "Day 1 · Initial email sent",
    detail: "Original workflow step: Reminder 1 · Main / Default · Email delivered.",
  },
  {
    at: "2026-11-18T14:00:00Z",
    label: "Day 3 · No open after 48 hours",
    detail: "Rule-Based: Not Opened selected to replace Reminder 2; waiting for approval.",
    status: "Pending",
  },
  {
    at: "2026-11-19T10:00:00Z",
    label: "Day 4 · Earlier email opened",
    detail:
      "AI reassessment superseded Not Opened; wait for payment activity instead of sending an outdated reminder.",
    status: "Superseded",
  },
  {
    at: "2026-11-20T11:00:00Z",
    label: "Day 5 · Payment link clicked",
    detail: "Payment page accessed; payment initiated but not completed.",
  },
  {
    at: "2026-11-21T11:00:00Z",
    label: "Day 6 · Next reminder replaced",
    detail:
      "Adaptive Follow-up: Payment Not Finished — Replaced Reminder 3. Approved workflow copy automatically applied; demographic/contextual variant retained.",
    status: "Applied",
  },
  {
    at: "2026-11-21T14:00:00Z",
    label: "Communication execution outcome",
    detail:
      "Email delivered using the approved contextual version; no extra sequential step added.",
    status: "Applied",
  },
  {
    at: "2026-11-22T12:00:00Z",
    label: "Day 7 · Partial payment confirmed",
    detail:
      "AI reassessed the remaining balance; cancelled the old payment-page reminder and selected Part Paid.",
    status: "Cancelled",
  },
  {
    at: "2026-11-22T14:00:00Z",
    label: "Human decision recorded",
    detail:
      "Operations modified timing to respect the contact window, then approved the revised follow-up.",
    status: "Modified",
  },
  {
    at: "2026-11-22T14:05:00Z",
    label: "Revised follow-up approved",
    detail: "Operations approval applied to the remaining-balance reminder.",
    status: "Approved",
  },
];

function decision(id: string, pending: boolean): AdaptiveDecision {
  return {
    id,
    status: pending ? "Pending" : "Applied",
    action: "Replace planned communication",
    followupId: pending ? "payment-failed" : "part-paid",
    channel: "Email",
    scheduled: "2026-11-26T14:00",
    source: pending ? "AI" : "Rule-Based",
    trigger: pending
      ? "Verified payment failure · 25 Nov, 14:00 UTC"
      : "Partial payment confirmed · 22 Nov, 12:00 UTC",
    explanation: pending
      ? "A verified failure makes the next generic reminder inappropriate. Offer the approved secure payment link after the waiting period; Operations must approve this case-specific change."
      : "Confirmed partial payment supersedes the payment-page reminder. The approved Part Paid follow-up acknowledges progress without changing payment terms or increasing contact volume.",
    confidence: pending ? 88 : 96,
    compliance: "Eligible — mock checks passed",
    requiresApproval: pending,
    at: "2026-11-25T16:00:00Z",
    expiresAt: "2026-12-25T16:00:00Z",
    subject: "A clear reminder about your account",
    body: "Hi {{first_name}},\n\nPlease review your remaining balance and approved payment options.\n\n{{payment_link}}\n\n{{brand_name}}",
    sms: "{{brand_name}}: Review account {{account_reference}} and payment options. {{payment_link}}",
    occurrence: pending ? "repeat" : "first",
    contentVersion: pending ? "Age 35–44 · English" : "Main / Default · English",
    replaces: "Reminder 3",
  };
}

export const seedAdaptiveCases: AdaptiveCase[] = [
  {
    accountId: "pp-10482",
    strategyId: "pp-loans-early-recovery",
    status: "Active",
    engagement: "Part Paid",
    originalStep: "Reminder 3",
    originalChannel: "Email",
    originalScheduled: "2026-11-26T14:00",
    decision: decision("ad-john", false),
    history: journeyHistory,
    usage: {
      "payment-not-finished": { first: { status: "Sent", at: "2026-11-21T14:00:00Z", replaced: "Reminder 3" } },
      "part-paid": { first: { status: "Scheduled", at: "2026-11-26T14:00:00Z", replaced: "Reminder 3" } },
    },
  },
  {
    accountId: "pp-88831",
    strategyId: "pp-loans-early-recovery",
    status: "Requires Review",
    engagement: "Payment Failed",
    originalStep: "Reminder 3",
    originalChannel: "Email",
    originalScheduled: "2026-11-26T14:00",
    decision: decision("ad-david", true),
    usage: {
      "not-opened": { first: { status: "Sent", at: "2026-11-18T14:00:00Z", replaced: "Reminder 2" } },
      "payment-not-finished": {
        first: { status: "Sent", at: "2026-11-19T14:00:00Z", replaced: "Reminder 2" },
        repeat: { status: "Sent", at: "2026-11-22T14:00:00Z", replaced: "Reminder 3" },
      },
      "payment-failed": {
        first: { status: "Sent", at: "2026-11-24T14:00:00Z", replaced: "Reminder 3" },
        repeat: { status: "Scheduled", at: "2026-11-26T14:00:00Z", replaced: "Reminder 3" },
      },
    },
    history: [
      { at: "2026-11-16T14:00:00Z", label: "Day 1 · Reminder 1 sent", detail: "Original workflow step · Main / Default · English." },
      { at: "2026-11-18T14:00:00Z", label: "Day 3 · Payment page visited without completed payment", detail: "Rule-Based: Payment Not Finished selected." },
      { at: "2026-11-19T14:00:00Z", label: "Day 4 · Follow-up sent", detail: sentLabel("Payment Not Finished", "first", "Reminder 2", "Main / Default · English"), status: "Applied" },
      { at: "2026-11-21T11:00:00Z", label: "Day 6 · Payment page revisited without completed payment", detail: "Repeated incomplete payment activity." },
      { at: "2026-11-22T14:00:00Z", label: "Day 7 · Follow-up sent", detail: sentLabel("Payment Not Finished", "repeat", "Reminder 3", "Age 35–44 · English"), status: "Applied" },
      { at: "2026-11-24T14:00:00Z", label: "Day 9 · Follow-up sent", detail: sentLabel("Payment Failed", "first", "Reminder 3", "Age 35–44 · English"), status: "Applied" },
      {
        at: "2026-11-25T14:00:00Z",
        label: "Verified payment failure",
        detail: "Payment provider mock event: failed transaction; no payment received.",
      },
      {
        at: "2026-11-25T16:00:00Z",
        label: "AI Decision Awaiting Approval",
        detail:
          "Payment Failed · Repeat recommended to replace Reminder 3 (Age 35–44 · English). Operations review required. Scheduled content is not used until sent.",
        status: "Pending",
      },
    ],
  },
];

export function resolveAdaptiveDecision(
  state: AdaptiveCase,
  status: "Approved" | "Rejected" | "Modified",
  actor: string,
  at: string,
  patch: Partial<AdaptiveDecision> = {},
): AdaptiveCase {
  if (!canReviewDecision(state.decision, true, at)) return state;
  const decision = {
    ...state.decision,
    ...patch,
    id: state.decision.id,
    status: status === "Modified" ? ("Pending" as const) : status,
  };
  return {
    ...state,
    decision,
    status: status === "Modified" ? "Requires Review" : "Active",
    history: [
      ...state.history,
      {
        at,
        label: `Human decision · ${status}`,
        detail: `${actor}: ${decision.action} · ${decision.channel} · ${decision.scheduled}. ${status === "Rejected" ? "Recommendation rejected; original plan retained." : status === "Modified" ? "Changed action/content remains pending approval." : "Approved; ready for the eligible contact window."}`,
        status,
      },
    ],
  };
}

export function reassessAdaptiveCase(
  state: AdaptiveCase,
  outcome: "recommendation" | "no-change" | "blocked" | "completed",
  at: string,
): AdaptiveCase {
  if (outcome === "no-change")
    return {
      ...state,
      history: [
        ...state.history,
        {
          at,
          label: "Manual reassessment · No change required",
          detail: "Latest engagement still supports the current plan.",
          status: "Deferred",
        },
      ],
    };
  const completed = outcome === "completed";
  const blocked = outcome === "blocked";
  const exhausted = isExhausted(state.usage, state.decision.followupId);
  return {
    ...state,
    status: completed ? "Completed" : blocked ? "Paused" : "Requires Review",
    engagement: completed ? "Paid in Full" : state.engagement,
    decision: {
      ...state.decision,
      id: `ad-${at}`,
      source: "Manual Reassessment",
      status: completed ? "Applied" : blocked ? "Blocked" : "Pending",
      requiresApproval: !completed && !blocked,
      trigger: completed
        ? `Full payment confirmed · ${at}`
        : blocked
          ? `Mandatory contact restriction · ${at}`
          : `Latest ${state.engagement.toLowerCase()} activity · ${at}`,
      action: completed
        ? "Stop workflow"
        : blocked
          ? "Route for Operations review"
          : "Reschedule communication",
      compliance: blocked ? "Blocked — contact restriction" : "Eligible — mock checks passed",
      at,
      explanation: completed
        ? "Full payment confirmed. Stop applicable collection reminders and cancel pending contact."
        : blocked
          ? "A mandatory contact restriction prevents this communication. Route the issue to Operations; no approval can bypass this restriction."
          : exhausted
            ? "Both First Time and Repeat content for this follow-up have been sent. Continue with the existing workflow and reschedule the next planned reminder for an eligible window; human approval is required."
            : "The latest engagement supersedes the previous recommendation. Move the approved follow-up to the next eligible contact window; human approval is required.",
      scheduled: "2026-11-27T14:00",
    },
    history: [
      ...state.history,
      {
        at,
        label: "Previous recommendation superseded",
        detail: `Newer payment/engagement evidence replaced ${state.decision.action}; old approval controls are no longer active.`,
        status: "Superseded",
      },
      {
        at,
        label: completed ? "Day 10 · Full payment confirmed" : "Manual reassessment",
        detail: completed
          ? "Mock full-payment event: remaining balance cleared; applicable reminders stopped and scheduled communication cancelled."
          : blocked
            ? "Communication blocked; Operations attention required."
            : "Next scheduled communication rescheduled for an eligible window; approval required.",
        status: completed ? "Applied" : blocked ? "Blocked" : "Pending",
      },
    ],
  };
}

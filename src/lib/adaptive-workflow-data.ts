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
    trigger: "Email opened; payment link not clicked within 48 hours of the open. A customer who clicks moves to Payment Not Finished.",
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
    first: { subject: "A quick reminder about your account", body: "Hi {{first_name}},\n\nPaying takes a few minutes on the secure page, and you can choose the method that suits you.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Pay {{account_reference}} securely in a few steps: {{payment_link}}" },
    repeat: { subject: "Other ways to pay, or get help", body: "Hi {{first_name}},\n\nIf it helps, you can use another available payment method, or contact our team and we'll help you complete it.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Try another payment method or get help for {{account_reference}}: {{payment_link}}" },
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
    first: { subject: "Payment plans are available", body: "Hi {{first_name}},\n\nYou can set up a payment plan for your account. Choose how often to pay and the amount — it only takes a minute.\n\n{{payment_link}}\n\n{{brand_name}}", sms: "{{brand_name}}: Set up a payment plan for {{account_reference}}: {{payment_link}}" },
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
        subject: copy?.subject ?? "A quick reminder about your account",
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
  | "Expired"
  | "Changed"
  | "Failed";
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
/** Actions Operations can choose when modifying an AI decision. */
export const modifyActions = [
  "Keep the plan",
  "Use a follow-up",
  "Move the next message",
  "Switch channel",
  "Check again later",
  "Send to Operations",
];
export const COMPLIANCE_AT_SEND = "Compliance is checked when the message is sent.";
/** Approval applies only to AI decisions for supervised clients; fixed-rule follow-ups apply automatically. */
export function needsApproval(source: AdaptiveDecision["source"], supervised: boolean): boolean {
  return source !== "Rule-Based" && supervised;
}
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
  compliance: "Checked at send time" | "Blocked — contact restriction";
  requiresApproval: boolean;
  expiresAt: string;
  at: string;
  subject: string;
  body: string;
  sms: string;
  occurrence?: Occurrence;
  contentVersion?: string;
  replaces?: string;
  note?: string;
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
  /** Supervised clients require approval for AI decisions. */
  supervised?: boolean;
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
    detail: "Not Opened follow-up lined up in place of Reminder 2.",
    status: "Applied",
  },
  {
    at: "2026-11-19T10:00:00Z",
    label: "Day 4 · Earlier email opened",
    detail:
      "Rule: email opened late, so the Not Opened follow-up is cancelled. Reminder 2 goes as planned.",
    status: "Cancelled",
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
      "Rule: Payment Not Finished follow-up lined up in place of Reminder 3. Its text was approved with the workflow.",
    status: "Applied",
  },
  {
    at: "2026-11-21T14:00:00Z",
    label: "Communication execution outcome",
    detail: "Follow-up: Payment Not Finished (replaced Reminder 3) · Age 65+ version.",
    status: "Applied",
  },
  {
    at: "2026-11-22T12:00:00Z",
    label: "Day 7 · Partial payment confirmed",
    detail:
      "Rule: Part Paid follow-up lined up in place of Reminder 4. Reminder 3 was already replaced, so it is not sent again.",
    status: "Applied",
  },
];

function decision(id: string, pending: boolean): AdaptiveDecision {
  return {
    id,
    status: pending ? "Pending" : "Applied",
    action: pending ? "Switch communication channel" : "Replace planned communication",
    followupId: pending ? "payment-failed" : "part-paid",
    channel: pending ? "SMS" : "Email",
    scheduled: "2026-11-28T14:00",
    source: pending ? "AI" : "Rule-Based",
    trigger: pending
      ? "Payment Failed follow-up already sent; last 3 emails not opened · 25 Nov, 16:00 UTC"
      : "Partial payment confirmed · 22 Nov, 12:00 UTC",
    explanation: pending
      ? "Follow-up already sent, 3 emails not opened → send by SMS from now on. This client is supervised, so Operations approves this AI decision. If it isn't approved before Reminder 4 is due, Reminder 4 goes out as planned and this decision expires."
      : "A fixed rule replaced Reminder 4 with the Part Paid follow-up. Its text was approved with the workflow, so it applies automatically.",
    ...(pending ? { confidence: 88 } : {}),
    compliance: "Checked at send time",
    requiresApproval: pending,
    at: "2026-11-25T16:00:00Z",
    expiresAt: "2026-11-28T14:00:00Z",
    subject: pending ? "Your payment didn't go through" : "Thank you for your payment",
    body: pending
      ? "Hi {{first_name}},\n\nIf the same method keeps failing, you can choose another available method, or our team can help you find an alternative.\n\n{{payment_link}}\n\n{{brand_name}}"
      : "Hi {{first_name}},\n\nThank you — we received your payment. A remaining balance of {{balance}} is still open on {{account_reference}}.\n\n{{payment_link}}\n\n{{brand_name}}",
    sms: pending
      ? "{{brand_name}}: Use another payment method or get help: {{payment_link}}"
      : "{{brand_name}}: Thanks for your payment. Remaining balance: {{balance}}. {{payment_link}}",
    occurrence: pending ? "repeat" : "first",
    contentVersion: pending ? "Age 35–44 · English" : "Age 65+ · English",
    replaces: "Reminder 4",
  };
}

export const seedAdaptiveCases: AdaptiveCase[] = [
  {
    accountId: "pp-10482",
    strategyId: "pp-loans-early-recovery",
    status: "Active",
    engagement: "Part Paid",
    originalStep: "Reminder 4",
    originalChannel: "Email",
    originalScheduled: "2026-11-28T14:00",
    supervised: true,
    decision: decision("ad-john", false),
    history: journeyHistory,
    usage: {
      "payment-not-finished": { first: { status: "Sent", at: "2026-11-21T14:00:00Z", replaced: "Reminder 3" } },
      "part-paid": { first: { status: "Scheduled", at: "2026-11-28T14:00:00Z", replaced: "Reminder 4" } },
    },
  },
  {
    accountId: "pp-88831",
    strategyId: "pp-loans-early-recovery",
    status: "Active",
    engagement: "Payment Failed",
    originalStep: "Reminder 4",
    originalChannel: "Email",
    originalScheduled: "2026-11-28T14:00",
    supervised: true,
    decision: decision("ad-david", true),
    usage: {
      "not-opened": { first: { status: "Sent", at: "2026-11-18T14:00:00Z", replaced: "Reminder 2" } },
      "payment-not-finished": {
        first: { status: "Sent", at: "2026-11-19T14:00:00Z", replaced: "Reminder 2" },
        repeat: { status: "Sent", at: "2026-11-22T14:00:00Z", replaced: "Reminder 3" },
      },
      "payment-failed": {
        first: { status: "Sent", at: "2026-11-24T14:00:00Z", replaced: "Reminder 3" },
        repeat: { status: "Scheduled", at: "2026-11-28T14:00:00Z", replaced: "Reminder 4" },
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
          "Follow-up already sent, 3 emails not opened → send by SMS from now on (replaces Reminder 4 · Age 35–44 · English). Reminder 4 is sent as planned unless this is approved first.",
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
  const original = state.decision;
  const decision = {
    ...original,
    ...patch,
    id: original.id,
    status: status === "Modified" ? ("Changed" as const) : status,
  };
  const history: AdaptiveEvent[] = [...state.history];
  if (status === "Modified")
    history.push({
      at,
      label: "AI original suggestion (kept for the record)",
      detail: `${original.action} · ${original.channel} · ${original.scheduled}.`,
    });
  history.push({
    at,
    label: `Human decision · ${status === "Modified" ? "Changed" : status}`,
    detail: `${actor}: ${decision.action} · ${decision.channel} · ${decision.scheduled}. ${status === "Rejected" ? "Recommendation rejected; the plan continues as planned." : status === "Modified" ? `Changed by Operations.${patch.note ? ` Note: ${patch.note}` : ""}` : "Approved; it replaces the next planned message."}`,
    status: status === "Modified" ? "Changed" : status,
  });
  return { ...state, decision, status: "Active", history };
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
    status: completed ? "Completed" : blocked ? "Paused" : "Active",
    engagement: completed ? "Paid in Full" : state.engagement,
    decision: {
      ...state.decision,
      id: `ad-${at}`,
      source: "Manual Reassessment",
      status: completed || !state.supervised ? "Applied" : blocked ? "Blocked" : "Pending",
      requiresApproval: !completed && !blocked && !!state.supervised,
      expiresAt: state.originalScheduled + ":00Z",
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
      compliance: blocked ? "Blocked — contact restriction" : "Checked at send time",
      at,
      explanation: completed
        ? "Full payment confirmed. Stop applicable collection reminders and cancel pending contact."
        : blocked
          ? "A mandatory contact restriction prevents this communication. Route the issue to Operations; no approval can bypass this restriction."
          : exhausted
            ? "Both First Time and Repeat content for this follow-up have been sent. Continue with the existing workflow and reschedule the next planned reminder for an eligible window; approval is needed for supervised clients."
            : "The latest engagement supersedes the previous recommendation. Move the approved follow-up to the next eligible contact window; approval is needed for supervised clients.",
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
            : "Next planned message moved to an eligible window. The plan keeps running meanwhile.",
        status: completed ? "Applied" : blocked ? "Blocked" : "Pending",
      },
    ],
  };
}

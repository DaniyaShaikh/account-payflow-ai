import type { NodeConfig, Strategy, StrategyNode } from "./strategy-data";
import { initialCommunicationVersions } from "./communication-versions";

export interface AdaptiveFollowup {
  id: string;
  name: string;
  trigger: string;
  config: NodeConfig;
}

export const standardFollowups = [
  {
    id: "not-opened",
    name: "Not Opened",
    trigger: "No email open recorded within 48 hours of delivery.",
  },
  {
    id: "opened-not-paid",
    name: "Opened, Not Paid",
    trigger: "Email opened; no payment activity within 48 hours of the open.",
  },
  {
    id: "no-engagement",
    name: "No Engagement",
    trigger:
      "No observable open, click or payment activity within 72 hours of the last communication.",
  },
  {
    id: "payment-not-finished",
    name: "Payment Not Finished",
    trigger: "Payment page accessed; no completed payment within 24 hours.",
  },
  {
    id: "payment-failed",
    name: "Payment Failed",
    trigger: "Verified payment failure; reassess after 2 hours before another contact.",
  },
  {
    id: "part-paid",
    name: "Part Paid",
    trigger: "Confirmed partial payment; reassess remaining balance after 24 hours.",
  },
];

export function followupNode(followup: AdaptiveFollowup): StrategyNode {
  return {
    id: followup.id,
    title: followup.name,
    kind: "Communication",
    origin: "AI Proposed",
    config: followup.config,
  };
}

export function writeFollowup(strategy: Strategy, followup: AdaptiveFollowup): AdaptiveFollowup {
  const source = Object.values(strategy.nodes).find((node) => node.kind === "Communication");
  const base =
    source?.config.communicationVersions ?? initialCommunicationVersions(followupNode(followup));
  return {
    ...followup,
    config: {
      channel: "Email",
      purpose: "Payment Reminder",
      reminderStage: followup.name,
      ...(source?.config.communicationSegments
        ? { communicationSegments: source.config.communicationSegments }
        : {}),
      communicationVersions: base.map((version) => ({
        ...version,
        subject: `Your account — ${followup.name.toLowerCase()}`,
        status: "Modified",
        hasUnsavedChanges: false,
        explanation: `Simulated AI reasoning: ${followup.trigger} Replace the next eligible reminder rather than add contact volume. Use approved account copy and existing recipient versions; mandatory protections still apply.`,
      })),
    },
  };
}

export function seedAdaptiveWorkflow(strategy: Strategy): Strategy {
  const enabled = ["pp-loans-early-recovery", "pp-third-party-proposal"].includes(strategy.id);
  const finalized = strategy.status === "Active" || strategy.status === "Approved";
  const followups = standardFollowups.map((scenario, index) => {
    const followup: AdaptiveFollowup = {
      ...scenario,
      config: { channel: "Email", purpose: "Payment Reminder", communicationVersions: [] },
    };
    if (!finalized && index === 2) return followup;
    const written = writeFollowup(strategy, followup);
    return finalized
      ? {
          ...written,
          config: {
            ...written.config,
            communicationVersions:
              written.config.communicationVersions?.map((v) => ({
                ...v,
                status: "Final" as const,
              })) ?? [],
          },
        }
      : written;
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
    history: [
      ...journeyHistory.slice(0, 6),
      {
        at: "2026-11-25T14:00:00Z",
        label: "Verified payment failure",
        detail: "Payment provider mock event: failed transaction; no payment received.",
      },
      {
        at: "2026-11-25T16:00:00Z",
        label: "AI Decision Awaiting Approval",
        detail:
          "Payment Failed follow-up recommended to replace Reminder 3. Operations review required.",
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

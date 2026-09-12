// Human Review model — an EXCEPTION workspace, not the normal workflow.
// A review only exists because an evaluated governance rule required human
// judgement before a proposed collection action could be executed.

export type ReviewPriority = "High" | "Medium" | "Normal";

export type ReviewStatus =
  | "Awaiting Review"
  | "Approved"
  | "Modified"
  | "Rejected"
  | "On Hold"
  | "Completed";

export type ReviewDecision = "Approved" | "Modified" | "Rejected" | "On Hold";

export interface ReviewHistoryEntry {
  at: string;
  event: string;
  detail?: string;
  by?: string;
}

export interface HumanReview {
  id: string;
  clientId: string;
  /** Collection case / customer account this review belongs to. */
  accountId: string;
  customer: string;
  reference: string;
  originalBalance: number;
  outstanding: number;
  recovered: number;
  daysPastDue: number;
  journey: string;
  priority: ReviewPriority;
  /** Short business reason shown in the queue. */
  reason: string;
  /** Governance rule that required the review. */
  ruleId: string;
  ruleName: string;
  conditionText: string;
  observedValue: string;
  proposedAction: string;
  /** null when the recommendation carries no confidence score. */
  confidence: number | null;
  /** Concise business-level explanation. Never internal model reasoning. */
  explanation: string[];
  context: { label: string; value: string }[];
  timeline: { at: string; label: string }[];
  waitingMinutes: number;
  status: ReviewStatus;
  assignedSupervisor: string | null;
  finalAction: string | null;
  guidance: string | null;
  rejectionReason: string | null;
  holdUntil: string | null;
  history: ReviewHistoryEntry[];
}

export const reviewPriorities: ReviewPriority[] = ["High", "Medium", "Normal"];

export const reviewStatuses: ReviewStatus[] = [
  "Awaiting Review",
  "Approved",
  "Modified",
  "Rejected",
  "On Hold",
  "Completed",
];

export const reviewReasons = [
  "Repeated unsuccessful attempts",
  "Low decision confidence",
  "Payment arrangement exception",
  "High balance treatment",
  "Customer dispute raised",
  "Hardship signal detected",
];

/** Actions PayFlow can propose, and that a supervisor may substitute. */
export const proposedActions = [
  "Move to stronger collection treatment",
  "Change communication strategy",
  "Modify payment treatment",
  "Send settlement offer",
  "Continue current treatment with adjusted communication",
  "Hold collection activity pending dispute review",
  "Pause outreach and request updated contact details",
];

export const rejectionReasons = [
  "Not appropriate for customer context",
  "Insufficient information",
  "Incorrect treatment",
  "Client policy consideration",
  "Other",
];

export const waitingBuckets = [
  "Any Age",
  "Under 30 min",
  "30 min – 2 hours",
  "2 – 24 hours",
  "Over 24 hours",
] as const;

export function formatWaiting(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return h === 0 ? `${d}d` : `${d}d ${h}h`;
}

export function inWaitingBucket(minutes: number, bucket: string) {
  switch (bucket) {
    case "Under 30 min":
      return minutes < 30;
    case "30 min – 2 hours":
      return minutes >= 30 && minutes < 120;
    case "2 – 24 hours":
      return minutes >= 120 && minutes < 1440;
    case "Over 24 hours":
      return minutes >= 1440;
    default:
      return true;
  }
}

export function reviewStatusTone(status: ReviewStatus) {
  switch (status) {
    case "Awaiting Review":
      return "warning" as const;
    case "Approved":
    case "Completed":
      return "success" as const;
    case "Modified":
      return "info" as const;
    case "Rejected":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function priorityTone(priority: ReviewPriority) {
  if (priority === "High") return "danger" as const;
  if (priority === "Medium") return "warning" as const;
  return "neutral" as const;
}

/** Demonstration data only — thresholds and priorities are not finalized. */
export const reviewsSeed: HumanReview[] = [
  {
    id: "rev-1041",
    clientId: "paypal",
    accountId: "pp-10482",
    customer: "John Smith",
    reference: "PP-10482",
    originalBalance: 5400,
    outstanding: 4250,
    recovered: 1150,
    daysPastDue: 42,
    journey: "Progressive Collection",
    priority: "High",
    reason: "Repeated unsuccessful attempts",
    ruleId: "repeated-attempts-escalation",
    ruleName: "Repeated Attempts Escalation",
    conditionText: "Unsuccessful Attempts greater than or equal to 3",
    observedValue: "4 unsuccessful attempts",
    proposedAction: "Move to stronger collection treatment",
    confidence: 92,
    explanation: [
      "The customer has received multiple reminders without payment.",
      "The latest communication was opened but no payment link interaction occurred.",
      "The configured governance rule requires supervisor review before stronger treatment is applied.",
    ],
    context: [
      { label: "Previous Attempts", value: "4" },
      { label: "Last Communication", value: "SMS Reminder" },
      { label: "Last Customer Engagement", value: "Message Read" },
      { label: "Payment Status", value: "Partial Payment Previously Received" },
      { label: "Promise-to-Pay", value: "None Active" },
    ],
    timeline: [
      { at: "12 Sep · 09:42", label: "SMS Reminder Delivered" },
      { at: "12 Sep · 09:51", label: "Customer Read SMS" },
      { at: "12 Sep · 10:00", label: "No Payment Link Click" },
      { at: "12 Sep · 12:00", label: "Reassessment Performed" },
      { at: "12 Sep · 12:01", label: "Repeated Attempts Rule Triggered" },
      { at: "12 Sep · 12:01", label: "Human Review Created" },
    ],
    waitingMinutes: 18,
    status: "Awaiting Review",
    assignedSupervisor: "Zeeshan",
    finalAction: null,
    guidance: null,
    rejectionReason: null,
    holdUntil: null,
    history: [
      {
        at: "12 Sep · 12:01",
        event: "Human review created",
        detail: "Repeated Attempts Escalation required supervisor judgement",
      },
      {
        at: "12 Sep · 12:01",
        event: "PayFlow proposed action recorded",
        detail: "Move to stronger collection treatment · confidence 92%",
      },
      { at: "12 Sep · 12:01", event: "Assigned to supervisor", detail: "Zeeshan" },
    ],
  },
  {
    id: "rev-1042",
    clientId: "canadian-tire",
    accountId: "ct-20394",
    customer: "Emily Jones",
    reference: "CT-20394",
    originalBalance: 7800,
    outstanding: 7300,
    recovered: 500,
    daysPastDue: 27,
    journey: "Progressive Reminder",
    priority: "Medium",
    reason: "Low decision confidence",
    ruleId: "low-confidence-review",
    ruleName: "Low Confidence Review",
    conditionText: "AI Confidence less than 70",
    observedValue: "64% confidence",
    proposedAction: "Change communication strategy",
    confidence: 64,
    explanation: [
      "Engagement signals are mixed: messages are delivered but rarely opened.",
      "No clear channel preference has been established for this customer.",
      "Confidence fell below the client threshold, so a supervisor confirms the strategy change.",
    ],
    context: [
      { label: "Previous Attempts", value: "2" },
      { label: "Last Communication", value: "SMS Reminder" },
      { label: "Last Customer Engagement", value: "Delivered, not opened" },
      { label: "Payment Status", value: "Partially Paid" },
      { label: "Promise-to-Pay", value: "None Active" },
    ],
    timeline: [
      { at: "12 Sep · 08:10", label: "SMS Reminder Delivered" },
      { at: "12 Sep · 11:15", label: "Reassessment Performed" },
      { at: "12 Sep · 11:16", label: "Low Confidence Rule Triggered" },
      { at: "12 Sep · 11:16", label: "Human Review Created" },
    ],
    waitingMinutes: 42,
    status: "Awaiting Review",
    assignedSupervisor: "Zeeshan",
    finalAction: null,
    guidance: null,
    rejectionReason: null,
    holdUntil: null,
    history: [
      { at: "12 Sep · 11:16", event: "Human review created", detail: "Low Confidence Review" },
      {
        at: "12 Sep · 11:16",
        event: "PayFlow proposed action recorded",
        detail: "Change communication strategy · confidence 64%",
      },
    ],
  },
  {
    id: "rev-1043",
    clientId: "paypal",
    accountId: "pp-11021",
    customer: "Sarah Khan",
    reference: "PP-11021",
    originalBalance: 9600,
    outstanding: 8900,
    recovered: 700,
    daysPastDue: 48,
    journey: "Promise-to-Pay Follow-Up",
    priority: "Normal",
    reason: "Payment arrangement exception",
    ruleId: "high-balance-review",
    ruleName: "High Balance Review",
    conditionText: "Outstanding Balance greater than $10,000",
    observedValue: "$8,900 outstanding with an extended arrangement request",
    proposedAction: "Modify payment treatment",
    confidence: 78,
    explanation: [
      "The customer requested a longer arrangement than the configured standard.",
      "A promise-to-pay is active and has not yet lapsed.",
      "Arrangement exceptions require supervisor confirmation before they are offered.",
    ],
    context: [
      { label: "Previous Attempts", value: "1" },
      { label: "Last Communication", value: "Email Reminder" },
      { label: "Last Customer Engagement", value: "Replied to Email" },
      { label: "Payment Status", value: "Unpaid" },
      { label: "Promise-to-Pay", value: "Active · due 28 Sep" },
    ],
    timeline: [
      { at: "12 Sep · 07:20", label: "Customer Replied to Email" },
      { at: "12 Sep · 10:04", label: "Arrangement Request Detected" },
      { at: "12 Sep · 10:05", label: "Payment Arrangement Exception Triggered" },
      { at: "12 Sep · 10:05", label: "Human Review Created" },
    ],
    waitingMinutes: 72,
    status: "Awaiting Review",
    assignedSupervisor: null,
    finalAction: null,
    guidance: null,
    rejectionReason: null,
    holdUntil: null,
    history: [
      { at: "12 Sep · 10:05", event: "Human review created", detail: "High Balance Review" },
      {
        at: "12 Sep · 10:05",
        event: "PayFlow proposed action recorded",
        detail: "Modify payment treatment · confidence 78%",
      },
    ],
  },
  {
    id: "rev-1044",
    clientId: "paypal",
    accountId: "pp-88831",
    customer: "David Lee",
    reference: "PP-88831",
    originalBalance: 12500,
    outstanding: 12500,
    recovered: 0,
    daysPastDue: 96,
    journey: "Escalated Collection",
    priority: "High",
    reason: "High balance treatment",
    ruleId: "high-balance-review",
    ruleName: "High Balance Review",
    conditionText: "Outstanding Balance greater than $10,000",
    observedValue: "$12,500 outstanding",
    proposedAction: "Send settlement offer",
    confidence: 88,
    explanation: [
      "No payment or engagement has been recorded after four outreach attempts.",
      "The balance exceeds the client threshold for autonomous action.",
      "A settlement offer materially changes the outcome, so supervisor approval is required.",
    ],
    context: [
      { label: "Previous Attempts", value: "4" },
      { label: "Last Communication", value: "Email Escalation Notice" },
      { label: "Last Customer Engagement", value: "No engagement recorded" },
      { label: "Payment Status", value: "Unpaid" },
      { label: "Promise-to-Pay", value: "None Active" },
    ],
    timeline: [
      { at: "11 Sep · 09:00", label: "Escalation Notice Delivered" },
      { at: "11 Sep · 18:00", label: "No Response Recorded" },
      { at: "12 Sep · 06:30", label: "Reassessment Performed" },
      { at: "12 Sep · 06:31", label: "High Balance Rule Triggered" },
      { at: "12 Sep · 06:31", label: "Human Review Created" },
    ],
    waitingMinutes: 330,
    status: "Awaiting Review",
    assignedSupervisor: "Zeeshan",
    finalAction: null,
    guidance: null,
    rejectionReason: null,
    holdUntil: null,
    history: [
      { at: "12 Sep · 06:31", event: "Human review created", detail: "High Balance Review" },
      {
        at: "12 Sep · 06:31",
        event: "PayFlow proposed action recorded",
        detail: "Send settlement offer · confidence 88%",
      },
      { at: "12 Sep · 06:31", event: "Assigned to supervisor", detail: "Zeeshan" },
    ],
  },
  {
    id: "rev-1045",
    clientId: "canadian-tire",
    accountId: "ct-22540",
    customer: "Priya Nair",
    reference: "CT-22540",
    originalBalance: 3200,
    outstanding: 3200,
    recovered: 0,
    daysPastDue: 62,
    journey: "Escalated Collection",
    priority: "High",
    reason: "Customer dispute raised",
    ruleId: "dispute-detected-review",
    ruleName: "Dispute Detected Review",
    conditionText: "Customer Reply Content contains \"dispute\"",
    observedValue: "Reply flagged as a balance dispute",
    proposedAction: "Hold collection activity pending dispute review",
    confidence: null,
    explanation: [
      "The customer disputed the balance in a direct reply.",
      "Collection activity is paused while the dispute is assessed.",
      "A supervisor confirms how the case should proceed.",
    ],
    context: [
      { label: "Previous Attempts", value: "3" },
      { label: "Last Communication", value: "Email Reminder" },
      { label: "Last Customer Engagement", value: "Replied · dispute raised" },
      { label: "Payment Status", value: "Unpaid" },
      { label: "Promise-to-Pay", value: "None Active" },
    ],
    timeline: [
      { at: "11 Sep · 14:22", label: "Email Reminder Delivered" },
      { at: "11 Sep · 15:03", label: "Customer Replied · Dispute Language Detected" },
      { at: "11 Sep · 15:04", label: "Dispute Detected Rule Triggered" },
      { at: "11 Sep · 15:04", label: "Human Review Created" },
      { at: "11 Sep · 16:40", label: "Placed On Hold by Zeeshan" },
    ],
    waitingMinutes: 1290,
    status: "On Hold",
    assignedSupervisor: "Zeeshan",
    finalAction: "Collection activity paused",
    guidance: null,
    rejectionReason: null,
    holdUntil: "14 Sep 2026",
    history: [
      { at: "11 Sep · 15:04", event: "Human review created", detail: "Dispute Detected Review" },
      {
        at: "11 Sep · 15:04",
        event: "PayFlow proposed action recorded",
        detail: "Hold collection activity pending dispute review",
      },
      {
        at: "11 Sep · 16:40",
        event: "Held until 14 Sep 2026",
        detail: "Customer contacted support and requested 48 hours",
        by: "Zeeshan",
      },
    ],
  },
  {
    id: "rev-1046",
    clientId: "canadian-tire",
    accountId: "ct-21877",
    customer: "Robert Chen",
    reference: "CT-21877",
    originalBalance: 4100,
    outstanding: 1900,
    recovered: 2200,
    daysPastDue: 40,
    journey: "Payment Plan Monitoring",
    priority: "Normal",
    reason: "Payment arrangement exception",
    ruleId: "broken-promise-escalation",
    ruleName: "Broken Promise Escalation",
    conditionText: "Missed Installments greater than or equal to 1",
    observedValue: "1 missed installment, then paid",
    proposedAction: "Move to stronger collection treatment",
    confidence: 71,
    explanation: [
      "One installment was missed before the customer paid late.",
      "The plan is otherwise on track.",
      "Supervisor guidance kept the customer on the existing plan.",
    ],
    context: [
      { label: "Previous Attempts", value: "1" },
      { label: "Last Communication", value: "SMS Installment Reminder" },
      { label: "Last Customer Engagement", value: "Payment Completed" },
      { label: "Payment Status", value: "Partially Paid" },
      { label: "Promise-to-Pay", value: "None Active" },
    ],
    timeline: [
      { at: "10 Sep · 08:00", label: "Installment Missed" },
      { at: "10 Sep · 08:01", label: "Broken Promise Rule Triggered" },
      { at: "10 Sep · 08:01", label: "Human Review Created" },
      { at: "10 Sep · 09:12", label: "Supervisor Modified Recommendation" },
      { at: "10 Sep · 09:13", label: "Adjusted Action Released" },
    ],
    waitingMinutes: 71,
    status: "Modified",
    assignedSupervisor: "Zeeshan",
    finalAction: "Continue current treatment with adjusted communication",
    guidance:
      "Customer made a recent partial payment. Maintain softer tone for the next communication.",
    rejectionReason: null,
    holdUntil: null,
    history: [
      { at: "10 Sep · 08:01", event: "Human review created", detail: "Broken Promise Escalation" },
      {
        at: "10 Sep · 08:01",
        event: "PayFlow proposed action recorded",
        detail: "Move to stronger collection treatment · confidence 71%",
      },
      {
        at: "10 Sep · 09:12",
        event: "Supervisor modified recommendation",
        detail: "Final action: Continue current treatment with adjusted communication",
        by: "Zeeshan",
      },
      {
        at: "10 Sep · 09:13",
        event: "Adjusted action released to collection case",
        by: "Zeeshan",
      },
    ],
  },
  {
    id: "rev-1047",
    clientId: "northstar-utilities",
    accountId: "ns-31450",
    customer: "Marcus Webb",
    reference: "NS-31450",
    originalBalance: 5900,
    outstanding: 5400,
    recovered: 500,
    daysPastDue: 55,
    journey: "Promise-to-Pay Follow-Up",
    priority: "Medium",
    reason: "Hardship signal detected",
    ruleId: "northstar-hardship-review",
    ruleName: "Hardship Signal Review",
    conditionText: "Customer Risk Level is High",
    observedValue: "Hardship language detected in reply",
    proposedAction: "Pause outreach and request updated contact details",
    confidence: 69,
    explanation: [
      "The customer indicated financial hardship in a recent reply.",
      "Utility hardship handling requires a supervisor decision before further outreach.",
    ],
    context: [
      { label: "Previous Attempts", value: "2" },
      { label: "Last Communication", value: "Email Reminder" },
      { label: "Last Customer Engagement", value: "Replied · hardship mentioned" },
      { label: "Payment Status", value: "Partially Paid" },
      { label: "Promise-to-Pay", value: "Active · due 01 Sep" },
    ],
    timeline: [
      { at: "12 Sep · 09:00", label: "Customer Replied" },
      { at: "12 Sep · 09:02", label: "Hardship Signal Rule Triggered" },
      { at: "12 Sep · 09:02", label: "Human Review Created" },
    ],
    waitingMinutes: 195,
    status: "Awaiting Review",
    assignedSupervisor: "Sarah",
    finalAction: null,
    guidance: null,
    rejectionReason: null,
    holdUntil: null,
    history: [
      { at: "12 Sep · 09:02", event: "Human review created", detail: "Hardship Signal Review" },
      {
        at: "12 Sep · 09:02",
        event: "PayFlow proposed action recorded",
        detail: "Pause outreach and request updated contact details · confidence 69%",
      },
    ],
  },
];

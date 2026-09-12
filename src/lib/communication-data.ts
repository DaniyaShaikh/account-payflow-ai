import type { Tone } from "@/components/payflow-ui";

export type CommChannel = "Email" | "SMS" | "WhatsApp";

export type CommStatus =
  | "Prepared"
  | "Awaiting Governance"
  | "Approved"
  | "Scheduled"
  | "Sent"
  | "Delivered"
  | "Opened / Read"
  | "Payment Link Clicked"
  | "Failed"
  | "Suppressed";

export type CommPurpose =
  | "Payment Reminder"
  | "Promise-to-Pay Follow-Up"
  | "Payment Plan Reminder"
  | "Settlement Offer"
  | "Final Notice";

export const commChannels: CommChannel[] = ["Email", "SMS"];

export const commStatuses: CommStatus[] = [
  "Prepared",
  "Awaiting Governance",
  "Approved",
  "Scheduled",
  "Sent",
  "Delivered",
  "Opened / Read",
  "Payment Link Clicked",
  "Failed",
  "Suppressed",
];

export const commPurposes: CommPurpose[] = [
  "Payment Reminder",
  "Promise-to-Pay Follow-Up",
  "Payment Plan Reminder",
  "Settlement Offer",
  "Final Notice",
];

export const commDateRanges = ["Today", "Yesterday", "Last 7 Days", "This Month"];

export const dropOffSegments = [
  "Delivered but Not Opened / Read",
  "Opened / Read but Did Not Click",
  "Clicked but Did Not Initiate Payment",
];

export interface CommEvent {
  at: string;
  label: string;
  detail?: string;
}

export interface Communication {
  id: string;
  clientId: string;
  accountId: string;
  customer: string;
  reference: string;
  channel: CommChannel;
  purpose: CommPurpose;
  journeyId: string;
  journeyStage: string;
  status: CommStatus;
  /** null means engagement is not technically trackable for this send */
  engagement: string | null;
  dateBucket: "Today" | "Yesterday" | "Last 7 Days" | "This Month";
  dateLabel: string;
  time: string;
  createdAt: string;
  sentAt: string | null;
  balance: number;
  subject?: string;
  bodyLines: string[];
  paymentLink: boolean;
  whyMessage: string;
  whyChannel: string;
  whyTiming: string;
  events: CommEvent[];
  reviewId?: string;
  outcomeNote?: string;
  initiatedPayment?: boolean;
}

export function commStatusTone(status: CommStatus): Tone {
  switch (status) {
    case "Payment Link Clicked":
      return "success";
    case "Opened / Read":
      return "info";
    case "Delivered":
    case "Sent":
      return "neutral";
    case "Awaiting Governance":
      return "warning";
    case "Failed":
      return "danger";
    case "Suppressed":
      return "danger";
    default:
      return "neutral";
  }
}

export const clientBranding: Record<
  string,
  { name: string; headerClass: string; accentClass: string; signature: string }
> = {
  paypal: {
    name: "PayPal",
    headerClass: "bg-[#003087] text-white",
    accentClass: "bg-[#0070ba] text-white",
    signature: "PayPal Collections",
  },
  "canadian-tire": {
    name: "Canadian Tire",
    headerClass: "bg-[#b3121f] text-white",
    accentClass: "bg-[#b3121f] text-white",
    signature: "Canadian Tire Billing",
  },
  "northstar-utilities": {
    name: "Northstar Utilities",
    headerClass: "bg-[#0f5b52] text-white",
    accentClass: "bg-[#0f5b52] text-white",
    signature: "Northstar Billing",
  },
};

export function brandingFor(clientId: string) {
  return (
    clientBranding[clientId] ?? {
      name: "Client",
      headerClass: "bg-secondary text-secondary-foreground",
      accentClass: "bg-primary text-primary-foreground",
      signature: "Collections",
    }
  );
}

export const communications: Communication[] = [

  {
    id: "cm-90412",
    clientId: "paypal",
    accountId: "pp-10482",
    customer: "John Smith",
    reference: "PP-10482",
    channel: "SMS",
    purpose: "Payment Reminder",
    journeyId: "progressive-collection",
    journeyStage: "Second Reminder",
    status: "Payment Link Clicked",
    engagement: "Payment Link Clicked",
    dateBucket: "Today",
    dateLabel: "12 Sep 2026",
    time: "09:42",
    createdAt: "12 Sep 2026 · 09:40",
    sentAt: "12 Sep 2026 · 09:42",
    balance: 4250,
    bodyLines: [
      "Hello John,",
      "Your PayPal account PP-10482 has an outstanding balance of $4,250. You can settle it securely using the link below.",
      "Thank you,",
    ],
    paymentLink: true,
    whyMessage:
      "The account remains overdue following the previous reminder and no payment has been received since the partial payment in August.",
    whyChannel:
      "The customer previously engaged with SMS and a valid mobile number is available on the account.",
    whyTiming:
      "The current journey scheduled a reassessment after the previous reminder period, and that period has now completed.",
    events: [
      { at: "12 Sep · 09:40", label: "Communication prepared", detail: "SMS reminder drafted from case context" },
      { at: "12 Sep · 09:41", label: "Governance check passed", detail: "No applicable rule required human review" },
      { at: "12 Sep · 09:42", label: "SMS sent" },
      { at: "12 Sep · 09:43", label: "SMS delivered" },
      { at: "12 Sep · 09:51", label: "SMS read" },
      { at: "12 Sep · 09:54", label: "Payment link clicked", detail: "Client-branded payment page opened" },
    ],
    outcomeNote:
      "Payment link click recorded on the collection case. Context updated and the next reassessment moved forward.",
    initiatedPayment: true,
  },
  {
    id: "cm-90398",
    clientId: "canadian-tire",
    accountId: "ct-20394",
    customer: "Emily Jones",
    reference: "CT-20394",
    channel: "Email",
    purpose: "Payment Reminder",
    journeyId: "early-stage-collection",
    journeyStage: "Follow-Up Reminder",
    status: "Opened / Read",
    engagement: "Opened",
    dateBucket: "Today",
    dateLabel: "12 Sep 2026",
    time: "09:31",
    createdAt: "12 Sep 2026 · 09:28",
    sentAt: "12 Sep 2026 · 09:31",
    balance: 7300,
    subject: "Your Canadian Tire account balance",
    bodyLines: [
      "Hello Emily,",
      "Your Canadian Tire account CT-20394 has an outstanding balance of $7,300. You can pay securely online at any time.",
      "If you have already paid, please ignore this message.",
    ],
    paymentLink: true,
    whyMessage:
      "The balance remains outstanding after the initial reminder and no dispute or payment arrangement is recorded.",
    whyChannel: "Email is the customer's confirmed contact channel and previous emails were opened.",
    whyTiming: "The journey's observation period after the initial reminder has completed.",
    events: [
      { at: "12 Sep · 09:28", label: "Communication prepared" },
      { at: "12 Sep · 09:30", label: "Governance check passed" },
      { at: "12 Sep · 09:31", label: "Email sent" },
      { at: "12 Sep · 09:31", label: "Email delivered" },
      { at: "12 Sep · 09:47", label: "Email opened" },
    ],
    outcomeNote:
      "Opened but not clicked. The case will be reassessed before any further contact is prepared.",
  },
  {
    id: "cm-90377",
    clientId: "paypal",
    accountId: "pp-11021",
    customer: "Sarah Khan",
    reference: "PP-11021",
    channel: "SMS",
    purpose: "Promise-to-Pay Follow-Up",
    journeyId: "promise-to-pay-follow-up",
    journeyStage: "Promise Reminder",
    status: "Payment Link Clicked",
    engagement: "Payment Link Clicked",
    dateBucket: "Today",
    dateLabel: "12 Sep 2026",
    time: "09:16",
    createdAt: "12 Sep 2026 · 09:14",
    sentAt: "12 Sep 2026 · 09:16",
    balance: 8900,
    bodyLines: [
      "Hello Sarah,",
      "This is a reminder of your agreed payment of $8,900 on your PayPal account PP-11021.",
      "You can complete the payment securely using the link below.",
    ],
    paymentLink: true,
    whyMessage: "A promise to pay is recorded and the agreed date is approaching.",
    whyChannel: "The customer responds reliably on SMS and confirmed the promise by SMS reply.",
    whyTiming: "The journey sends a single reminder shortly before the promised payment date.",
    events: [
      { at: "12 Sep · 09:14", label: "Communication prepared" },
      { at: "12 Sep · 09:15", label: "Governance check passed" },
      { at: "12 Sep · 09:16", label: "SMS sent" },
      { at: "12 Sep · 09:16", label: "SMS delivered" },
      { at: "12 Sep · 09:22", label: "Payment link clicked" },
    ],
    initiatedPayment: true,
  },
  {
    id: "cm-90341",
    clientId: "canadian-tire",
    accountId: "ct-21877",
    customer: "Robert Chen",
    reference: "CT-21877",
    channel: "Email",
    purpose: "Payment Plan Reminder",
    journeyId: "payment-plan-monitoring",
    journeyStage: "Installment Reminder",
    status: "Delivered",
    engagement: "No engagement yet",
    dateBucket: "Today",
    dateLabel: "12 Sep 2026",
    time: "08:55",
    createdAt: "12 Sep 2026 · 08:52",
    sentAt: "12 Sep 2026 · 08:55",
    balance: 1900,
    subject: "Your next Canadian Tire installment",
    bodyLines: [
      "Hello Robert,",
      "Your next installment on account CT-21877 is due shortly. The remaining balance on your plan is $1,900.",
      "Thank you for keeping your plan on track.",
    ],
    paymentLink: true,
    whyMessage: "An installment plan is active and the next installment date is approaching.",
    whyChannel: "Email is the channel used for all plan correspondence on this account.",
    whyTiming: "The journey sends installment reminders two days before each due date.",
    events: [
      { at: "12 Sep · 08:52", label: "Communication prepared" },
      { at: "12 Sep · 08:54", label: "Governance check passed" },
      { at: "12 Sep · 08:55", label: "Email sent" },
      { at: "12 Sep · 08:56", label: "Email delivered" },
    ],
  },
  {
    id: "cm-90330",
    clientId: "paypal",
    accountId: "pp-12098",
    customer: "Michael Brown",
    reference: "PP-12098",
    channel: "SMS",
    purpose: "Payment Plan Reminder",
    journeyId: "payment-plan-monitoring",
    journeyStage: "Installment Reminder",
    status: "Delivered",
    engagement: null,
    dateBucket: "Today",
    dateLabel: "12 Sep 2026",
    time: "08:40",
    createdAt: "12 Sep 2026 · 08:38",
    sentAt: "12 Sep 2026 · 08:40",
    balance: 2100,
    bodyLines: [
      "Hello Michael,",
      "Your next PayPal installment on account PP-12098 is due in 7 days. Remaining balance $2,100.",
    ],
    paymentLink: true,
    whyMessage: "The plan is on schedule, so only a routine installment reminder is appropriate.",
    whyChannel: "The customer opted into SMS notifications for plan reminders.",
    whyTiming: "Reminder sent ahead of the scheduled installment date.",
    events: [
      { at: "12 Sep · 08:38", label: "Communication prepared" },
      { at: "12 Sep · 08:40", label: "SMS sent" },
      { at: "12 Sep · 08:41", label: "SMS delivered" },
    ],
    outcomeNote: "Read receipts are not available from this SMS provider, so engagement is shown as not trackable.",
  },
  {
    id: "cm-90311",
    clientId: "canadian-tire",
    accountId: "ct-20394",
    customer: "Emily Jones",
    reference: "CT-20394",
    channel: "SMS",
    purpose: "Payment Reminder",
    journeyId: "progressive-collection",
    journeyStage: "Second Reminder",
    status: "Failed",
    engagement: "Not available",
    dateBucket: "Yesterday",
    dateLabel: "11 Sep 2026",
    time: "16:20",
    createdAt: "11 Sep 2026 · 16:18",
    sentAt: "11 Sep 2026 · 16:20",
    balance: 7300,
    bodyLines: [
      "Hello Emily,",
      "Your Canadian Tire account CT-20394 remains overdue. You can pay securely using the link below.",
    ],
    paymentLink: true,
    whyMessage: "The account remained overdue after the previous reminder.",
    whyChannel: "SMS was selected because the customer had not opened the previous email at that time.",
    whyTiming: "The journey's observation period had completed.",
    events: [
      { at: "11 Sep · 16:18", label: "Communication prepared" },
      { at: "11 Sep · 16:20", label: "SMS sent" },
      { at: "11 Sep · 16:21", label: "SMS failed", detail: "Mobile number unreachable" },
      { at: "11 Sep · 16:22", label: "Channel context updated", detail: "Mobile number marked unreliable" },
      { at: "11 Sep · 16:25", label: "Case reassessed", detail: "Alternative action determined: try email" },
    ],
    outcomeNote:
      "The failure updated the contact context and the case was reassessed. Email was selected as the alternative channel — no human review was required because no governance rule applied.",
  },
  {
    id: "cm-90288",
    clientId: "northstar-utilities",
    accountId: "ns-30112",
    customer: "Laura Fitzgerald",
    reference: "NS-30112",
    channel: "Email",
    purpose: "Payment Reminder",
    journeyId: "early-stage-collection",
    journeyStage: "Initial Reminder",
    status: "Delivered",
    engagement: "No engagement yet",
    dateBucket: "Yesterday",
    dateLabel: "11 Sep 2026",
    time: "11:05",
    createdAt: "11 Sep 2026 · 11:02",
    sentAt: "11 Sep 2026 · 11:05",
    balance: 2450,
    subject: "Your Northstar Utilities balance",
    bodyLines: [
      "Hello Laura,",
      "Your Northstar Utilities account NS-30112 has an outstanding balance of $2,450.",
      "You can pay securely online using the link below.",
    ],
    paymentLink: true,
    whyMessage: "First-time delinquency with no previous collection contact on the account.",
    whyChannel: "Email is the only confirmed contact channel for this customer.",
    whyTiming: "Sent on entry to the journey.",
    events: [
      { at: "11 Sep · 11:02", label: "Communication prepared" },
      { at: "11 Sep · 11:04", label: "Governance check passed" },
      { at: "11 Sep · 11:05", label: "Email sent" },
      { at: "11 Sep · 11:06", label: "Email delivered" },
      { at: "13 Sep · 11:06", label: "No-response event created", detail: "Observation period completed with no engagement" },
    ],
    outcomeNote:
      "No meaningful response within the observation window. A no-response event was created and the case will be reassessed before any further contact — the next reminder is not sent automatically.",
  },
  {
    id: "cm-90265",
    clientId: "paypal",
    accountId: "pp-88831",
    customer: "David Lee",
    reference: "PP-88831",
    channel: "Email",
    purpose: "Settlement Offer",
    journeyId: "escalated-collection",
    journeyStage: "Human Review",
    status: "Awaiting Governance",
    engagement: "Not available",
    dateBucket: "Last 7 Days",
    dateLabel: "09 Sep 2026",
    time: "14:12",
    createdAt: "09 Sep 2026 · 14:12",
    sentAt: null,
    balance: 12500,
    subject: "A settlement option for your PayPal account",
    bodyLines: [
      "Hello David,",
      "We would like to help you resolve the outstanding balance of $12,500 on account PP-88831.",
      "A reduced settlement option is available. You can review and accept it securely using the link below.",
    ],
    paymentLink: true,
    whyMessage:
      "The account has a high balance with no response after repeated attempts, so a settlement option was prepared.",
    whyChannel: "Email is the only channel with a deliverable contact point on this account.",
    whyTiming: "Prepared once the escalation point in the journey was reached.",
    events: [
      { at: "09 Sep · 14:12", label: "Communication prepared" },
      { at: "09 Sep · 14:13", label: "Governance check", detail: "High balance rule requires supervisor approval" },
      { at: "09 Sep · 14:13", label: "Human review created", detail: "Awaiting supervisor decision" },
    ],
    reviewId: "rev-1041",
    outcomeNote:
      "This communication will not be sent until a supervisor approves, modifies or rejects it in Human Review.",
  },
  {
    id: "cm-90240",
    clientId: "canadian-tire",
    accountId: "ct-22540",
    customer: "Priya Nair",
    reference: "CT-22540",
    channel: "Email",
    purpose: "Payment Reminder",
    journeyId: "escalated-collection",
    journeyStage: "Human Review",
    status: "Suppressed",
    engagement: "Not available",
    dateBucket: "Last 7 Days",
    dateLabel: "08 Sep 2026",
    time: "10:30",
    createdAt: "08 Sep 2026 · 10:30",
    sentAt: null,
    balance: 3200,
    subject: "Your Canadian Tire account balance",
    bodyLines: [
      "Hello Priya,",
      "Your Canadian Tire account CT-22540 has an outstanding balance of $3,200.",
    ],
    paymentLink: true,
    whyMessage: "A routine reminder was prepared before the dispute was recorded on the case.",
    whyChannel: "Email is the customer's recorded contact channel.",
    whyTiming: "Would have followed the journey's observation period.",
    events: [
      { at: "08 Sep · 10:30", label: "Communication prepared" },
      { at: "08 Sep · 10:31", label: "Dispute detected", detail: "Customer disputed the charge by reply" },
      { at: "08 Sep · 10:31", label: "Communication suppressed", detail: "Outreach held while the dispute is open" },
    ],
    outcomeNote: "Suppressed automatically because an open dispute is recorded on the collection case.",
  },
  {
    id: "cm-90212",
    clientId: "paypal",
    accountId: "pp-10482",
    customer: "John Smith",
    reference: "PP-10482",
    channel: "Email",
    purpose: "Payment Reminder",
    journeyId: "early-stage-collection",
    journeyStage: "Initial Reminder",
    status: "Opened / Read",
    engagement: "Opened",
    dateBucket: "This Month",
    dateLabel: "05 Sep 2026",
    time: "09:10",
    createdAt: "05 Sep 2026 · 09:08",
    sentAt: "05 Sep 2026 · 09:10",
    balance: 5400,
    subject: "Your PayPal account balance",
    bodyLines: [
      "Hello John,",
      "Your PayPal account PP-10482 has an outstanding balance of $5,400.",
      "You can pay securely online at any time using the link below.",
    ],
    paymentLink: true,
    whyMessage: "First reminder on entry to the early-stage journey.",
    whyChannel: "Email was the customer's preferred channel at the time of assessment.",
    whyTiming: "Sent on day 0 of the journey.",
    events: [
      { at: "05 Sep · 09:08", label: "Communication prepared" },
      { at: "05 Sep · 09:10", label: "Email sent" },
      { at: "05 Sep · 09:11", label: "Email delivered" },
      { at: "05 Sep · 11:24", label: "Email opened" },
    ],
  },
  {
    id: "cm-90190",
    clientId: "northstar-utilities",
    accountId: "ns-31450",
    customer: "Marcus Webb",
    reference: "NS-31450",
    channel: "SMS",
    purpose: "Promise-to-Pay Follow-Up",
    journeyId: "promise-to-pay-follow-up",
    journeyStage: "Promise Reminder",
    status: "Delivered",
    engagement: null,
    dateBucket: "This Month",
    dateLabel: "03 Sep 2026",
    time: "15:44",
    createdAt: "03 Sep 2026 · 15:42",
    sentAt: "03 Sep 2026 · 15:44",
    balance: 5400,
    bodyLines: [
      "Hello Marcus,",
      "A reminder of your agreed payment of $5,400 on Northstar account NS-31450.",
    ],
    paymentLink: true,
    whyMessage: "A promise to pay was captured on a call and the agreed date is approaching.",
    whyChannel: "SMS was confirmed on the call as the customer's preferred reminder channel.",
    whyTiming: "Single reminder ahead of the promised payment date.",
    events: [
      { at: "03 Sep · 15:42", label: "Communication prepared" },
      { at: "03 Sep · 15:44", label: "SMS sent" },
      { at: "03 Sep · 15:45", label: "SMS delivered" },
    ],
  },
];


export function communicationById(id: string) {
  return communications.find((c) => c.id === id);
}

export function communicationsForAccount(accountId: string) {
  return communications.filter((c) => c.accountId === accountId);
}

export function communicationsForClient(clientId: string) {
  return communications.filter((c) => c.clientId === clientId);
}

export function communicationsForJourney(journeyId: string) {
  return communications.filter((c) => c.journeyId === journeyId);
}

/** Communication events surfaced on the collection case timeline. */
export function communicationTimelineEvents(accountId: string) {
  return communicationsForAccount(accountId).flatMap((c) =>
    c.events.map((e) => ({
      at: e.at,
      label: e.label,
      detail: e.detail ?? `${c.channel} · ${c.purpose}`,
      communicationId: c.id,
    })),
  );
}

export function engagementLabel(c: Communication) {
  if (c.engagement === null) return "Not trackable";
  return c.engagement;
}

export function dropOffSegmentOf(c: Communication): string | null {
  if (c.status === "Delivered" && c.engagement !== "Opened" && c.engagement !== "Read")
    return "Delivered but Not Opened / Read";
  if (c.status === "Opened / Read") return "Opened / Read but Did Not Click";
  if (c.status === "Payment Link Clicked" && !c.initiatedPayment)
    return "Clicked but Did Not Initiate Payment";
  return null;
}

export function commSummary(list: Communication[]) {
  const engagedStatuses: CommStatus[] = ["Opened / Read", "Payment Link Clicked"];
  return {
    sentToday: list.filter((c) => c.dateBucket === "Today" && c.sentAt !== null).length,
    delivered: list.filter((c) =>
      ["Delivered", "Opened / Read", "Payment Link Clicked"].includes(c.status),
    ).length,
    engaged: list.filter((c) => engagedStatuses.includes(c.status)).length,
    clicks: list.filter((c) => c.status === "Payment Link Clicked").length,
    failed: list.filter((c) => c.status === "Failed").length,
  };
}

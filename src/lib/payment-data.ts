import { accounts, formatCurrency, type CustomerAccount } from "@/lib/payflow-data";
import type { Tone } from "@/components/payflow-ui";

/**
 * Payment outcomes that PayFlow receives back from the customer-facing payment
 * experience. The customer experience itself lives on the public /pay route and
 * is not part of the internal application.
 */
export type PaymentOutcome =
  | "Paid in Full"
  | "Partial Payment"
  | "Payment Plan Created"
  | "Installment Received"
  | "Payment Failed"
  | "Payment Not Completed";

export type PaymentStatus =
  | "No Payment Yet"
  | "Partial Payment Received"
  | "Payment Plan Active"
  | "Paid in Full"
  | "Last Payment Failed";

export interface PaymentPlanState {
  totalPayments: number;
  paymentsMade: number;
  installmentAmount: number;
  nextInstallment: string;
}

export interface PaymentSummary {
  outstanding: number;
  recovered: number;
  originalBalance: number;
  status: PaymentStatus;
  lastPayment: { amount: number; at: string; method: string } | null;
  plan: PaymentPlanState | null;
  failedAttempts: number;
}

export function paymentStatusTone(status: PaymentStatus): Tone {
  switch (status) {
    case "Paid in Full":
      return "success";
    case "Payment Plan Active":
      return "info";
    case "Partial Payment Received":
      return "info";
    case "Last Payment Failed":
      return "danger";
    default:
      return "neutral";
  }
}

/** Demo payment-link token used in customer communications, e.g. demo-PP-10482. */
export function paymentTokenForAccount(account: CustomerAccount) {
  return `demo-${account.reference}`;
}

export function accountForPaymentToken(token: string): CustomerAccount | undefined {
  const reference = token.replace(/^demo-/i, "").toUpperCase();
  return accounts.find((a) => a.reference.toUpperCase() === reference);
}

/** Last four characters of the account reference — all a customer needs to see. */
export function maskedReference(reference: string) {
  return `•••• ${reference.slice(-4)}`;
}

const planOverrides: Record<string, PaymentPlanState> = {
  "pp-12098": {
    totalPayments: 6,
    paymentsMade: 3,
    installmentAmount: 500,
    nextInstallment: "25 Aug 2026",
  },
  "ct-20394": {
    totalPayments: 3,
    paymentsMade: 1,
    installmentAmount: 620,
    nextInstallment: "02 Sep 2026",
  },
};

const lastPaymentOverrides: Record<string, { amount: number; at: string; method: string }> = {
  "pp-10482": { amount: 1150, at: "15 Aug 2026", method: "Card" },
  "pp-11021": { amount: 700, at: "05 Aug 2026", method: "Bank Account" },
  "pp-12098": { amount: 500, at: "18 Aug 2026", method: "Card" },
  "ct-20394": { amount: 620, at: "02 Aug 2026", method: "Card" },
};

const failedAttemptOverrides: Record<string, number> = {
  "pp-88831": 1,
};

export function paymentSummaryFor(accountId: string): PaymentSummary | null {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return null;

  const plan = planOverrides[accountId] ?? null;
  const lastPayment = lastPaymentOverrides[accountId] ?? null;
  const failedAttempts = failedAttemptOverrides[accountId] ?? 0;

  let status: PaymentStatus = "No Payment Yet";
  if (account.outstanding <= 0) status = "Paid in Full";
  else if (plan) status = "Payment Plan Active";
  else if (failedAttempts > 0 && !lastPayment) status = "Last Payment Failed";
  else if (account.recovered > 0) status = "Partial Payment Received";

  return {
    outstanding: account.outstanding,
    recovered: account.recovered,
    originalBalance: account.originalBalance,
    status,
    lastPayment,
    plan,
    failedAttempts,
  };
}

/** Payment-side events shown in the collection case timeline. */
export interface PaymentTimelineEvent {
  at: string;
  label: string;
  detail: string;
}

const paymentTimelines: Record<string, PaymentTimelineEvent[]> = {
  "pp-10482": [
    { at: "10:14", label: "Payment link clicked", detail: "Customer opened the payment experience" },
    { at: "10:16", label: "Payment initiated", detail: "Partial payment selected" },
    { at: "10:18", label: "Partial payment received", detail: formatCurrency(1150) },
    { at: "10:18", label: "Outstanding balance updated", detail: formatCurrency(4250) },
    { at: "10:19", label: "Collection case reassessment", detail: "Next best action determined" },
  ],
  "pp-12098": [
    { at: "09:41", label: "Payment plan created", detail: "6 payments of " + formatCurrency(500) },
    { at: "09:41", label: "Payment arrangement active", detail: "Monitoring future installments" },
    { at: "11:02", label: "Installment received", detail: formatCurrency(500) },
    { at: "11:02", label: "Outstanding balance updated", detail: formatCurrency(2100) },
    { at: "11:03", label: "Payment plan updated", detail: "3 of 6 payments made" },
  ],
  "pp-88831": [
    { at: "16:22", label: "Payment initiated", detail: "Full balance selected" },
    { at: "16:23", label: "Payment could not be completed", detail: "Payment was not processed" },
    { at: "16:24", label: "Collection case reassessment", detail: "Governance check applied" },
  ],
};

export function paymentTimelineEvents(accountId: string): PaymentTimelineEvent[] {
  return paymentTimelines[accountId] ?? [];
}

/**
 * How PayFlow handles each outcome it receives back from the payment
 * experience. Purely internal operating behaviour — never shown to customers.
 */
export const outcomeHandling: Record<PaymentOutcome, string[]> = {
  "Paid in Full": [
    "Record payment event and clear the outstanding balance",
    "Complete the collection objective and stop active collection activity",
    "Update the connected source system and send confirmation where configured",
    "Close the collection case",
  ],
  "Partial Payment": [
    "Record payment event and reduce the outstanding balance",
    "Update customer context with the new balance and payment behaviour",
    "Reassess the collection case and determine the next best action",
    "No automatic closure and no automatic human review",
  ],
  "Payment Plan Created": [
    "Record the payment arrangement against the collection case",
    "Update customer context and adjust treatment to plan monitoring",
    "Monitor future installment events",
    "Case remains open while the arrangement is active",
  ],
  "Installment Received": [
    "Record payment and reduce the outstanding balance",
    "Update the payment plan progress",
    "Continue the plan while installments remain",
    "Complete the plan and close the case when the final installment clears the balance",
  ],
  "Payment Failed": [
    "Record a payment failure event and update customer context",
    "Reassess the case and determine the next best action",
    "Apply a governance check",
    "Route to human review only if an applicable rule triggers",
  ],
  "Payment Not Completed": [
    "Record that the payment experience was opened but not completed",
    "Use as operational context for the next reassessment",
    "Feeds the Clicked → Payment Initiated → Paid funnel",
  ],
};

export const planOptions = [
  { id: "A", label: "Option A", payments: 3, note: "Fewer, larger payments" },
  { id: "B", label: "Option B", payments: 6, note: "More, smaller payments" },
];

export const planIllustrativeNote =
  "Payment plan amounts, dates and eligibility shown here are illustrative examples for demonstration only and are not final terms.";

/** Aggregate payment outcomes across the accounts a user can see. */
export function paymentOutcomeTotals(list: CustomerAccount[]) {
  let recovered = 0;
  let paidInFull = 0;
  let activePlans = 0;
  let partialPayments = 0;
  let failedPayments = 0;

  for (const account of list) {
    const summary = paymentSummaryFor(account.id);
    if (!summary) continue;
    recovered += summary.recovered;
    if (summary.status === "Paid in Full") paidInFull += 1;
    if (summary.status === "Payment Plan Active") activePlans += 1;
    if (summary.status === "Partial Payment Received") partialPayments += 1;
    failedPayments += summary.failedAttempts;
  }

  return { recovered, paidInFull, activePlans, partialPayments, failedPayments };
}

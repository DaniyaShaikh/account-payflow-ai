import { useSyncExternalStore } from "react";
import { communications, type Communication } from "./communication-data";
import { subClientNameFor } from "./portfolio-data";
import { applicableRules, type ComplianceRule } from "./compliance-data";
import type { ClientConfig } from "./payflow-data";

export const unsubscribeReasons = [
  "I receive too many emails",
  "I have already made the payment",
  "These emails are not relevant to me",
  "I prefer another communication method",
  "I don't recognize this account",
  "I have privacy concerns",
  "Other",
] as const;
export type UnsubscribeReason = (typeof unsubscribeReasons)[number];
export const reviewReasons: string[] = ["I have already made the payment", "I don't recognize this account"];
export type UnsubscribeStatus = "Unsubscribed" | "Under Review" | "Resubscribed";
export const unsubscribeStatuses: UnsubscribeStatus[] = ["Unsubscribed", "Under Review", "Resubscribed"];

export interface UnsubscribeRecord {
  id: string; token: string; communicationId: string; clientId: string; subClient: string;
  customer: string; email: string; reference: string; subject: string; senderAddress: string;
  reason: UnsubscribeReason | null; comments: string; at: string; status: UnsubscribeStatus;
  history: { at: string; label: string }[];
}

export function customerEmail(c: Pick<Communication, "customer">) {
  return `${c.customer.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
}
export function senderAddressFor(clientId: string) { return `reminders@${clientId.replace(/[^a-z]/g, "")}.payflow-mail.com`; }
export function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(2, u.length - 2))}@${d}`;
}
/** Mock secure token per email communication (opaque, non-guessable looking). */
export function unsubscribeToken(commId: string) {
  let h = 2166136261; for (const ch of commId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `u_${(h >>> 0).toString(36)}${commId.replace("cm-", "").split("").reverse().join("")}`;
}
export function communicationForToken(token: string) {
  return communications.find(c => c.channel === "Email" && unsubscribeToken(c.id) === token);
}
export const expiredTokens = ["u_expired"];

const daysAgo = (d: number, h = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(h, 15, 0, 0); return t.toISOString(); };
const mock = (i: number, clientId: string, customer: string, reference: string, subject: string, reason: UnsubscribeReason | null, at: string, comments = ""): UnsubscribeRecord => ({
  id: `UNS-${1040 + i}`, token: `u_seed${i}`, communicationId: `seed-${i}`, clientId, subClient: subClientNameFor(clientId, reference) || "Main Portfolio",
  customer, email: customerEmail({ customer }), reference, subject, senderAddress: senderAddressFor(clientId), reason, comments, at,
  status: reason && reviewReasons.includes(reason) ? "Under Review" : "Unsubscribed",
  history: [{ at, label: "Unsubscribed via email footer link" }, { at, label: "Email reminders suppressed for this Client" }],
});
const seed: UnsubscribeRecord[] = [
  mock(1, "canadian-tire", "Olivia Martin", "CT-23011", "Your Canadian Tire account balance", "I receive too many emails", daysAgo(0, 9)),
  mock(2, "paypal", "Ethan Wright", "PP-13402", "A settlement option for your PayPal account", "I have already made the payment", daysAgo(0, 11), "Paid by bank transfer last Friday."),
  mock(3, "northstar-utilities", "Grace Patel", "NS-30877", "Your Northstar Utilities balance", null, daysAgo(3)),
  mock(4, "canadian-tire", "Noah Wilson", "CT-22109", "Your next Canadian Tire installment", "I prefer another communication method", daysAgo(6), "Please text me instead."),
  mock(5, "paypal", "Ava Thompson", "PP-12877", "Reminder: payment due on your PayPal account", "I don't recognize this account", daysAgo(9)),
  mock(6, "northstar-utilities", "Liam Roy", "NS-29954", "Your Northstar Utilities balance", "I have privacy concerns", daysAgo(14)),
  mock(7, "canadian-tire", "Mia Gagnon", "CT-21450", "Your Canadian Tire account balance", "These emails are not relevant to me", daysAgo(40)),
];

let records = seed;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
export function useUnsubscribes() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => records, () => seed);
}
export function recordForToken(token: string) { return records.find(r => r.token === token); }
export function isSuppressed(clientId: string, email: string) {
  return records.some(r => r.clientId === clientId && r.email === email && r.status !== "Resubscribed");
}
export function confirmUnsubscribe(comm: Communication, reason: UnsubscribeReason | null, comments: string) {
  const token = unsubscribeToken(comm.id);
  if (recordForToken(token)) return recordForToken(token)!;
  const at = new Date().toISOString();
  const rec: UnsubscribeRecord = {
    id: `UNS-${1100 + records.length}`, token, communicationId: comm.id, clientId: comm.clientId,
    subClient: subClientNameFor(comm.clientId, comm.reference) || "Main Portfolio", customer: comm.customer, email: customerEmail(comm),
    reference: comm.reference, subject: comm.subject ?? comm.purpose, senderAddress: senderAddressFor(comm.clientId), reason, comments: comments.trim(), at,
    status: reason && reviewReasons.includes(reason) ? "Under Review" : "Unsubscribed",
    history: [{ at, label: "Unsubscribed via email footer link" }, { at, label: "Email reminders suppressed for this Client only; other channels unchanged" }, ...(reason && reviewReasons.includes(reason) ? [{ at, label: "Flagged for Operations review" }] : [])],
  };
  records = [rec, ...records]; emit(); return rec;
}

/** Footer shows when an Email-applicable Unsubscribe Option rule is in effect for the Client (mandatory rules can't be deselected). */
export function unsubscribeFooterRequired(rules: ComplianceRule[], clientId: string, config?: ClientConfig) {
  if (!config?.jurisdiction) return false;
  return applicableRules(rules, config.jurisdiction, clientId, config.disabledComplianceRules ?? [])
    .some(r => r.category === "Unsubscribe Option" && r.status === "Active" && (r.channel === "Email" || r.channel === "All Channels"));
}

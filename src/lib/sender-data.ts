/**
 * Client-level SendGrid + sender identity mock data (frontend prototype only).
 * No real SendGrid calls, DNS changes or credential storage happen here.
 */
import type { ClientConfig } from "./payflow-data";

export type SendGridStatus = "Not Configured" | "Connected" | "Connection Failed";
export type DomainStatus = "DNS Pending" | "Verifying" | "Verified" | "Verification Failed" | "Provider Connection Failed";

export interface SendGridConfig {
  status: SendGridStatus;
  /** Only a masked hint is kept; actual values are never stored or displayed. */
  apiKeyHint: string | null;
  webhookKeyHint: string | null;
  webhookStatus: "Receiving Events" | "Not Receiving" | "Unknown";
  lastCheck: string | null;
  error: string | null;
}

export interface SenderIdentity {
  id: string;
  email: string;
  displayName: string;
  primary: boolean;
  priority: number;
  enabled: boolean;
  lastVerified: string | null;
  migrated?: boolean;
}

export interface DomainAuth {
  domain: string;
  status: DomainStatus;
  lastCheck: string | null;
}

export interface SenderAuditEntry {
  at: string;
  user: string;
  action: string;
  previous?: string | undefined;
  next?: string;
}

export interface EmailSetup {
  sendgrid: SendGridConfig;
  senders: SenderIdentity[];
  domains: DomainAuth[];
  audit: SenderAuditEntry[];
}

export const domainOf = (email: string) => (email.split("@")[1] ?? "").toLowerCase();
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export function webhookUrlFor(clientId: string) {
  return `https://hooks.payflow.io/sendgrid/events/${clientId || "new-client"}`;
}

export function domainStatusOf(setup: EmailSetup, email: string): DomainStatus {
  return setup.domains.find((d) => d.domain === domainOf(email))?.status ?? "DNS Pending";
}

export const isVerified = (setup: EmailSetup, s: SenderIdentity) => domainStatusOf(setup, s.email) === "Verified";
/** Eligible = provider connected + domain verified + enabled. Consent is checked separately. */
export const isEligible = (setup: EmailSetup, s: SenderIdentity) =>
  setup.sendgrid.status === "Connected" && isVerified(setup, s) && s.enabled;

export function eligibleSenders(setup: EmailSetup) {
  return setup.senders.filter((s) => isEligible(setup, s)).sort((a, b) => a.priority - b.priority);
}
export const primarySender = (setup: EmailSetup) => setup.senders.find((s) => s.primary) ?? null;

/** Primary when eligible, else the next eligible sender by priority. */
export function resolveSender(setup: EmailSetup): { sender: SenderIdentity | null; type: "Primary" | "Alternative" | "None"; reason: string } {
  const p = primarySender(setup);
  if (p && isEligible(setup, p)) return { sender: p, type: "Primary", reason: "Primary sender is verified and enabled" };
  const alt = eligibleSenders(setup)[0];
  if (alt) return { sender: alt, type: "Alternative", reason: "Primary sender unavailable; next eligible sender by priority" };
  return { sender: null, type: "None", reason: "No verified and enabled sender is available" };
}

export function dnsRecordsFor(domain: string, clientId: string) {
  const id = (clientId || "client").replace(/[^a-z0-9]/g, "").slice(0, 8) || "client";
  return [
    { type: "CNAME", host: `em${id.length}42.${domain}`, value: "u4821937.wl188.sendgrid.net" },
    { type: "CNAME", host: `s1._domainkey.${domain}`, value: `s1.domainkey.u4821937.wl188.sendgrid.net` },
    { type: "CNAME", host: `s2._domainkey.${domain}`, value: `s2.domainkey.u4821937.wl188.sendgrid.net` },
    { type: "TXT", host: `_dmarc.${domain}`, value: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain },
  ];
}

export function activationIssues(c: Pick<ClientConfig, "channels" | "emailSetup">, clientId = ""): string[] {
  if (!c.channels.email) return [];
  const setup = c.emailSetup ?? emptyEmailSetup();
  void clientId;
  const out: string[] = [];
  if (setup.sendgrid.status !== "Connected") out.push("Branding & Channels: connect SendGrid (email channel is on)");
  if (!setup.senders.some((s) => isVerified(setup, s) && s.enabled))
    out.push("Branding & Channels: add at least one verified and enabled sender email");
  const p = primarySender(setup);
  if (!p || !isVerified(setup, p) || !p.enabled) out.push("Branding & Channels: select an eligible Primary sender");
  return out;
}

/** Whether a sender can be disabled/deleted without leaving the client with no eligible sender. */
export function canRemoveEligible(setup: EmailSetup, id: string, emailOn: boolean) {
  if (!emailOn) return true;
  const target = setup.senders.find((s) => s.id === id);
  if (!target || !isEligible(setup, target)) return true;
  return eligibleSenders(setup).length > 1;
}

export function setPrimary(setup: EmailSetup, id: string): EmailSetup {
  return { ...setup, senders: setup.senders.map((s) => ({ ...s, primary: s.id === id })) };
}

export function emptyEmailSetup(): EmailSetup {
  return {
    sendgrid: { status: "Not Configured", apiKeyHint: null, webhookKeyHint: null, webhookStatus: "Unknown", lastCheck: null, error: null },
    senders: [],
    domains: [],
    audit: [],
  };
}

const connected = (check: string): SendGridConfig => ({
  status: "Connected", apiKeyHint: "SG.••••••••••••k9Qa", webhookKeyHint: "••••••••••••7fD2",
  webhookStatus: "Receiving Events", lastCheck: check, error: null,
});

/** Client-specific seeds. Existing single From emails become migrated identities with their actual status. */
export function seedEmailSetup(clientId: string, emailFrom: string, senderName: string): EmailSetup {
  if (clientId === "paypal") {
    return {
      sendgrid: connected("Nov 25, 2026 · 09:12"),
      senders: [
        { id: "pp-s1", email: "collections@paypal.com", displayName: "PayPal Collections", primary: true, priority: 1, enabled: true, lastVerified: "Nov 25, 2026", migrated: true },
        { id: "pp-s2", email: "payments@paypal.com", displayName: "PayPal Payments", primary: false, priority: 2, enabled: true, lastVerified: "Nov 25, 2026" },
        { id: "pp-s3", email: "support@paypal.com", displayName: "PayPal Support", primary: false, priority: 3, enabled: false, lastVerified: "Nov 25, 2026" },
        { id: "pp-s4", email: "accounts@paypalservices.com", displayName: "PayPal Accounts", primary: false, priority: 4, enabled: false, lastVerified: null },
      ],
      domains: [
        { domain: "paypal.com", status: "Verified", lastCheck: "Nov 25, 2026 · 09:12" },
        { domain: "paypalservices.com", status: "DNS Pending", lastCheck: "Nov 24, 2026 · 16:40" },
      ],
      audit: [
        { at: "Nov 24, 2026 · 16:40", user: "Ayesha Khan", action: "Sender added", next: "accounts@paypalservices.com" },
        { at: "Nov 20, 2026 · 11:05", user: "Ayesha Khan", action: "Sender disabled", previous: "Enabled", next: "support@paypal.com · Disabled" },
        { at: "Nov 12, 2026 · 10:00", user: "System", action: "Migrated existing From email", next: "collections@paypal.com" },
      ],
    };
  }
  if (!emailFrom || emailFrom === "collections@payflow.io") return emptyEmailSetup();
  const verified = clientId === "canadian-tire";
  return {
    sendgrid: verified
      ? connected("Nov 24, 2026 · 14:30")
      : { status: "Connection Failed", apiKeyHint: "SG.••••••••••••x1Lm", webhookKeyHint: "••••••••••••9aQe", webhookStatus: "Not Receiving", lastCheck: "Nov 25, 2026 · 07:55", error: "401 Unauthorized — the API key was revoked or lacks Mail Send permission." },
    senders: [
      { id: `${clientId}-s1`, email: emailFrom, displayName: senderName || emailFrom, primary: true, priority: 1, enabled: true, lastVerified: verified ? "Nov 24, 2026" : null, migrated: true },
    ],
    domains: [{ domain: domainOf(emailFrom), status: verified ? "Verified" : "DNS Pending", lastCheck: verified ? "Nov 24, 2026 · 14:30" : null }],
    audit: [{ at: "Nov 12, 2026 · 10:00", user: "System", action: "Migrated existing From email", next: emailFrom }],
  };
}

export function getEmailSetup(clientId: string, c: Pick<ClientConfig, "emailSetup" | "emailFrom" | "senderName">): EmailSetup {
  return c.emailSetup ?? seedEmailSetup(clientId, c.emailFrom, c.senderName);
}

/* -------- Historical send records (fixed at send time; never derived from current config) -------- */

export interface SentVia {
  email: string;
  displayName: string;
  type: "Primary" | "Alternative";
  reason: string;
}

const historicalSenders: Record<string, SentVia[]> = {
  paypal: [
    { email: "collections@paypal.com", displayName: "PayPal Collections", type: "Primary", reason: "Primary sender" },
    { email: "payments@paypal.com", displayName: "PayPal Payments", type: "Alternative", reason: "Sent via failover: Primary sender temporarily rate-limited by provider" },
  ],
  "canadian-tire": [{ email: "billing@canadiantire.ca", displayName: "Canadian Tire Billing", type: "Primary", reason: "Primary sender" }],
  "northstar-utilities": [{ email: "billing@northstar.com", displayName: "Northstar Billing", type: "Primary", reason: "Primary sender" }],
};

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function sentViaFor(commId: string, clientId: string): SentVia {
  const list = historicalSenders[clientId] ?? [{ email: "collections@payflow.io", displayName: "PayFlow Collections", type: "Primary" as const, reason: "Primary sender" }];
  const alt = list[1];
  if (alt && hash(commId) % 6 === 0) return alt;
  return list[0]!;
}

export function historicalSenderEmails(clientId: string) {
  return (historicalSenders[clientId] ?? []).map((s) => s.email);
}

/* -------- Account-level sender overrides (read-only mock) -------- */

export interface AccountSenderOverride {
  previous: string;
  current: string;
  reason: string;
  effective: string;
  status: "Active" | "Expired";
}

export const accountSenderOverrides: Record<string, AccountSenderOverride> = {
  "pp-88831": {
    previous: "collections@paypal.com",
    current: "payments@paypal.com",
    reason: "Sender-specific technical failure: customer mailbox rejected the Primary sender (hard bounce on collections@paypal.com).",
    effective: "Nov 22, 2026",
    status: "Active",
  },
};

/** Customer email consent is separate from sender configuration. */
export const accountEmailEligibility: Record<string, string> = {
  "pp-11021": "Not eligible — customer unsubscribed from collection emails",
};

export function senderTimelineEvents(accountId: string) {
  const o = accountSenderOverrides[accountId];
  return o
    ? [{ at: o.effective, label: "Email sender changed for this account", detail: `${o.previous} → ${o.current}. ${o.reason} Client Primary sender unchanged.` }]
    : [];
}

/** Operational sender issues surfaced through the existing notification bell. */
export function senderAlerts(setup: EmailSetup, emailOn: boolean): string[] {
  if (!emailOn || setup.sendgrid.status === "Not Configured") return [];
  const out: string[] = [];
  if (setup.sendgrid.status === "Connection Failed") out.push("SendGrid connection failed");
  for (const d of setup.domains)
    if (d.status === "Verification Failed" || d.status === "Provider Connection Failed") out.push(`Domain verification failed · ${d.domain}`);
  if (eligibleSenders(setup).length === 0) out.push("No eligible sender available · email communications blocked");
  return out;
}

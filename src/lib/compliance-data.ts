import type { Rule } from "./rules-data";

export const complianceCategories = ["Consent & Opt-Out", "Reply Handling", "Frequency", "Permitted Hours", "Holidays & Restricted Dates", "Content", "Contact Restrictions", "Additional Controls"] as const;
export type ComplianceCategory = typeof complianceCategories[number];
export type ComplianceStatus = "Draft" | "Pending Approval" | "Active" | "Inactive" | "Archived";
export type ComplianceAction = "Allow" | "Block" | "Reschedule" | "Suppress" | "Require Approval" | "Flag for Review";
export interface Jurisdiction { country: string; state: string; region: string; postal: string; timezone: string }
export const emptyJurisdiction: Jurisdiction = { country: "", state: "", region: "", postal: "", timezone: "America/Toronto" };
export const countries = ["United States", "Canada"];
export const statesFor = (country: string) => country === "Canada" ? ["Ontario", "Quebec", "British Columbia", "Alberta"] : ["California", "New York", "Texas", "Florida"];
export const complianceChannels = ["All Channels", "Email", "SMS", "Voice", "WhatsApp"];
export const conditionFields = ["Consent", "Opt-Out", "Contact Attempts", "Outside Permitted Hours", "Restricted Date", "Do Not Contact", "Cease Communication", "Disputed Debt", "Legal Representation", "Bankruptcy", "Deceased", "Hardship", "Third-Party Contact", "Sender Identified", "Unsubscribe Instructions", "Template Approved", "Reply Handling Enabled", "Language", "Communication Type", "Outstanding Balance", "Days Past Due"];
export const conditionOperators = ["Equals", "Greater Than", "Less Than", "Between", "Includes", "Excludes"];
export interface ComplianceCondition { id: string; field: string; operator: string; value: string; period: number }
export interface Holiday { id: string; name: string; date: string; recurring: boolean; country: string; state: string; source: string }
export interface ComplianceRule {
  id: string; name: string; category: ComplianceCategory; description: string; reference: string; source: string;
  jurisdiction: Jurisdiction; channel: string; enforcement: "Mandatory" | "Client Configurable" | "Advisory";
  priority: number; from: string; until: string; status: ComplianceStatus; action: ComplianceAction;
  logic: "AND" | "OR"; conditions: ComplianceCondition[]; clientId: string | null; version: number;
  settings: { start: string; end: string; weekendStart: string; weekendEnd: string; days: number[]; intervalHours: number; daily: number; weekly: number; monthly: number; combined: boolean; reply: string; keywords: string; consentMethod: string; consentExpiryDays: number; resubscribe: boolean; promotionalOnly: boolean; requiredText: string; retentionDays: number };
}
export interface ComplianceAudit { id: string; ruleId: string; ruleName: string; event: string; by: string; at: string; reason: string; before: unknown; after: unknown; approval: string }
export interface EvaluationInput {
  clientId: string; jurisdiction: Jurisdiction; channel: string; type: string; at: string;
  consent: boolean; optedOut: boolean; attempts: number; attemptsDaily: number; attemptsMonthly: number;
  flags: string[]; senderIdentified: boolean; unsubscribeInstructions: boolean; templateApproved: boolean;
  replyEnabled: boolean; language: string; balance: number; daysPastDue: number;
  consentDate?: string; consentSource?: string; messageText?: string;
  lastContactAt?: string; contactHistory?: { at: string; channel: string }[]; operational?: Record<string, string | number>;
}
export interface EvaluationResult { result: "Allowed" | "Blocked" | "Reschedule" | "Review Required"; matches: { id: string; name: string; reason: string; action: string; layer: string }[]; evaluated: string[]; nextWindow?: string }

export function newComplianceRule(): ComplianceRule {
  return { id: "", name: "", category: "Consent & Opt-Out", description: "", reference: "Illustrative configuration — legal validation required", source: "", jurisdiction: { ...emptyJurisdiction, country: "Canada" }, channel: "Email", enforcement: "Mandatory", priority: 100, from: "2026-01-01", until: "", status: "Draft", action: "Block", logic: "AND", conditions: [{ id: "c1", field: "Consent", operator: "Equals", value: "No", period: 7 }], clientId: null, version: 1,
    settings: { start: "09:00", end: "18:00", weekendStart: "10:00", weekendEnd: "16:00", days: [1, 2, 3, 4, 5], intervalHours: 0, daily: 0, weekly: 0, monthly: 0, combined: true, reply: "Two-way", keywords: "STOP, HELP", consentMethod: "Recorded customer preference", consentExpiryDays: 0, resubscribe: true, promotionalOnly: false, requiredText: "", retentionDays: 365 } };
}
function seed(id: string, name: string, category: ComplianceCategory, country: string, field: string, value: string, action: ComplianceAction, overrides: Partial<ComplianceRule> = {}): ComplianceRule {
  const base = newComplianceRule();
  return { ...base, id, name, category, jurisdiction: { ...base.jurisdiction, country }, status: "Active", channel: "All Channels", action, conditions: [{ id: `${id}-1`, field, operator: "Equals", value, period: 7 }], ...overrides };
}
export const complianceSeed: ComplianceRule[] = [
  seed("CMP-001", "Canada · channel opt-out suppression", "Consent & Opt-Out", "Canada", "Opt-Out", "Yes", "Suppress"),
  seed("CMP-002", "Canada · explicit consent", "Consent & Opt-Out", "Canada", "Consent", "No", "Block", { channel: "SMS" }),
  seed("CMP-003", "Ontario · recipient-local contact window", "Permitted Hours", "Canada", "Outside Permitted Hours", "Yes", "Reschedule", { jurisdiction: { ...emptyJurisdiction, country: "Canada", state: "Ontario" } }),
  seed("CMP-004", "United States · rolling voice attempts", "Frequency", "United States", "Contact Attempts", "7", "Block", { channel: "Voice", conditions: [{ id: "a", field: "Contact Attempts", operator: "Greater Than", value: "6", period: 7 }] }),
  seed("CMP-005", "United States · cease communication", "Contact Restrictions", "United States", "Cease Communication", "Yes", "Suppress"),
  seed("CMP-006", "Canada · restricted calendar dates", "Holidays & Restricted Dates", "Canada", "Restricted Date", "Yes", "Reschedule"),
  seed("CMP-007", "United States · sender identification", "Content", "United States", "Sender Identified", "No", "Require Approval", { enforcement: "Client Configurable" }),
  seed("CMP-008", "Canada · two-way SMS replies", "Reply Handling", "Canada", "Reply Handling Enabled", "No", "Block", { channel: "SMS" }),
  seed("CMP-009", "Quebec · language review", "Additional Controls", "Canada", "Language", "French", "Flag for Review", { status: "Pending Approval", jurisdiction: { ...emptyJurisdiction, country: "Canada", state: "Quebec" }, enforcement: "Advisory" }),
  seed("CMP-010", "California · approved content", "Content", "United States", "Template Approved", "No", "Require Approval", { status: "Draft", jurisdiction: { ...emptyJurisdiction, country: "United States", state: "California", timezone: "America/Los_Angeles" } }),
];
export const holidaySeed: Holiday[] = [
  { id: "hol-1", name: "New Year’s Day — sample blackout", date: "2026-01-01", recurring: true, country: "Canada", state: "", source: "Illustrative calendar; legal validation required" },
  { id: "hol-2", name: "Christmas Day — sample blackout", date: "2026-12-25", recurring: true, country: "Canada", state: "", source: "Illustrative calendar; legal validation required" },
  { id: "hol-3", name: "Independence Day — sample blackout", date: "2026-07-04", recurring: true, country: "United States", state: "", source: "Illustrative calendar; legal validation required" },
];
export function jurisdictionMatches(scope: Jurisdiction, target: Jurisdiction) {
  const same = (a: string, b: string) => !a || a.trim().toLowerCase() === b.trim().toLowerCase();
  let postalMatch = true;
  if (scope.postal.includes("..")) { const [lo, hi] = scope.postal.split(".."); postalMatch = !!lo && !!hi && target.postal >= lo && target.postal <= hi; }
  else postalMatch = !scope.postal || target.postal.toLowerCase().startsWith(scope.postal.toLowerCase());
  return same(scope.country, target.country) && same(scope.state, target.state) && same(scope.region, target.region) && postalMatch;
}
export function applicableRules(rules: ComplianceRule[], jurisdiction: Jurisdiction, clientId: string, disabled: string[] = []) {
  return rules.filter(r => (!r.clientId || r.clientId === clientId) && jurisdictionMatches(r.jurisdiction, jurisdiction) && (r.enforcement === "Mandatory" || !disabled.includes(r.id))).sort((a, b) => b.priority - a.priority);
}
function localParts(at: string, timezone: string) {
  const date = new Date(at);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(date);
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), time: `${get("hour")}:${get("minute")}`, date: `${get("year")}-${get("month")}-${get("day")}` };
}
function outsideHours(r: ComplianceRule, input: EvaluationInput) {
  const p = localParts(input.at, input.jurisdiction.timezone);
  const weekend = p.day === 0 || p.day === 6;
  return !r.settings.days.includes(p.day) || p.time < (weekend ? r.settings.weekendStart : r.settings.start) || p.time >= (weekend ? r.settings.weekendEnd : r.settings.end);
}
function restrictedDate(holidays: Holiday[], input: EvaluationInput) {
  const p = localParts(input.at, input.jurisdiction.timezone);
  return holidays.some(h => h.country === input.jurisdiction.country && (!h.state || h.state === input.jurisdiction.state) && (h.recurring ? h.date.slice(5) === p.date.slice(5) : h.date === p.date));
}
function compare(actual: string | number, operator: string, value: string) {
  const text = String(actual).toLowerCase(), expected = value.toLowerCase();
  if (operator === "Greater Than") return Number(actual) > Number(value);
  if (operator === "Less Than") return Number(actual) < Number(value);
  if (operator === "Between") { const [a, b] = value.split(/\.\.|,/).map(Number); return a !== undefined && b !== undefined && Number(actual) >= a && Number(actual) <= b; }
  if (operator === "Includes") return text.includes(expected);
  if (operator === "Excludes") return !text.includes(expected);
  return text === expected;
}
function conditionActual(c: ComplianceCondition, r: ComplianceRule, i: EvaluationInput, holidays: Holiday[]): string | number {
  const yes = (v: boolean) => v ? "Yes" : "No";
  if (c.field === "Contact Attempts") return i.contactHistory ? i.contactHistory.filter(h => (r.settings.combined || h.channel === i.channel) && new Date(h.at).getTime() <= new Date(i.at).getTime() && new Date(h.at).getTime() > new Date(i.at).getTime() - c.period * 86400000).length : i.attempts;
  const values: Record<string, string | number> = { Consent: yes(i.consent), "Opt-Out": yes(i.optedOut), "Outside Permitted Hours": yes(outsideHours(r, i)), "Restricted Date": yes(restrictedDate(holidays, i)), "Sender Identified": yes(i.senderIdentified), "Unsubscribe Instructions": yes(i.unsubscribeInstructions), "Template Approved": yes(i.templateApproved), "Reply Handling Enabled": yes(i.replyEnabled), Language: i.language, "Communication Type": i.type, "Outstanding Balance": i.balance, "Days Past Due": i.daysPastDue };
  return values[c.field] ?? yes(i.flags.includes(c.field));
}
function inEffect(r: ComplianceRule, i: EvaluationInput) { const date = localParts(i.at, i.jurisdiction.timezone).date; return r.status === "Active" && (!r.from || r.from <= date) && (!r.until || r.until >= date) && (r.channel === "All Channels" || r.channel === i.channel); }
function triggered(r: ComplianceRule, i: EvaluationInput, holidays: Holiday[]) {
  if (r.settings.promotionalOnly && i.type !== "Promotional") return false;
  const conditions = r.conditions.map(c => compare(conditionActual(c, r, i, holidays), c.operator, c.value));
  const configured = conditions.length > 0 && (r.logic === "AND" ? conditions.every(Boolean) : conditions.some(Boolean));
  const limits = (r.settings.daily > 0 && i.attemptsDaily >= r.settings.daily) || (r.settings.weekly > 0 && i.attempts >= r.settings.weekly) || (r.settings.monthly > 0 && i.attemptsMonthly >= r.settings.monthly);
  const interval = r.settings.intervalHours > 0 && i.lastContactAt && new Date(i.at).getTime() - new Date(i.lastContactAt).getTime() < r.settings.intervalHours * 3600000;
  const expiredConsent = r.category === "Consent & Opt-Out" && r.settings.consentExpiryDays > 0 && (!i.consentDate || new Date(i.at).getTime() - new Date(i.consentDate).getTime() >= r.settings.consentExpiryDays * 86400000);
  const missingContent = r.category === "Content" && r.settings.requiredText.trim() && !(i.messageText ?? "").toLowerCase().includes(r.settings.requiredText.trim().toLowerCase());
  return configured || !!expiredConsent || !!missingContent || (r.category === "Frequency" && !!(limits || interval));
}
export function evaluateRules(rules: ComplianceRule[], operational: Rule[], holidays: Holiday[], input: EvaluationInput, disabled: string[] = []): EvaluationResult {
  if (!input.jurisdiction.country || !input.jurisdiction.timezone || !Number.isFinite(new Date(input.at).getTime())) return { result: "Review Required", matches: [{ id: "CTX", name: "Customer jurisdiction and local time", reason: "Complete the recipient jurisdiction and proposed date/time before execution.", action: "Require Approval", layer: "Compliance" }], evaluated: [] };
  const applicable = applicableRules(rules, input.jurisdiction, input.clientId, disabled).filter(r => inEffect(r, input));
  const matches: EvaluationResult["matches"] = [];
  for (const r of applicable) if (triggered(r, input, holidays)) matches.push({ id: r.id, name: r.name, reason: r.conditions.map(c => `${c.field} ${c.operator.toLowerCase()} ${c.value}${c.field === "Contact Attempts" ? ` / rolling ${c.period} days` : ""}`).join(` ${r.logic} `), action: r.action, layer: r.clientId ? "Client Compliance" : "Compliance" });
  const ops = operational.filter(r => r.status === "Active" && (r.type === "System Rule" ? r.appliedTo.includes(input.clientId) : r.clientId === input.clientId));
  const facts: Record<string, string | number> = { "Outstanding Balance": input.balance, "Days Past Due": input.daysPastDue, Channel: input.channel, "Total Contact Attempts": input.attempts, "Messages Sent (7 days)": input.attempts, "Dispute Flag": input.flags.includes("Disputed Debt") ? "Yes" : "No", ...input.operational };
  for (const r of ops) {
    const checks = r.conditions.map(c => {
      const actual = facts[c.field]; if (actual === undefined) return undefined;
      const op = c.operator;
      if (op === "Does Not Equal" || op === "Is Not") return !compare(actual, "Equals", c.value);
      if (op === "Greater Than or Equal To") return Number(actual) >= Number(c.value);
      if (op === "Less Than or Equal To") return Number(actual) <= Number(c.value);
      return compare(actual, op === "Is" ? "Equals" : op === "Contains" ? "Includes" : op === "Does Not Contain" ? "Excludes" : op, c.value);
    });
    const matched = checks.length > 0 && (r.logic === "ALL" ? checks.every(v => v === true) : checks.some(v => v === true));
    const incomplete = r.logic === "ALL" ? !checks.includes(false) && checks.includes(undefined) : !matched && checks.includes(undefined);
    if (matched || incomplete) matches.push({ id: r.id, name: r.name, reason: matched ? r.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(` ${r.logic} `) : "Missing operational context; review required before execution.", action: matched && r.action === "Prevent Communication" ? "Block" : "Require Approval", layer: r.type });
  }
  const result = matches.some(m => m.action === "Block" || m.action === "Suppress") ? "Blocked" : matches.some(m => m.action === "Require Approval" || m.action === "Flag for Review") ? "Review Required" : matches.some(m => m.action === "Reschedule") ? "Reschedule" : "Allowed";
  const output: EvaluationResult = { result, matches, evaluated: [...applicable.map(r => r.id), ...ops.map(r => r.id)] };
  if (result === "Reschedule") {
    // Advance real instants, then evaluate every local-time restriction together; DST follows Intl timezone rules.
    for (let step = 1; step <= 14 * 24 * 4; step++) {
      const at = new Date(new Date(input.at).getTime() + step * 15 * 60000).toISOString();
      const next = { ...input, at };
      if (applicable.filter(r => r.action !== "Allow").every(r => !inEffect(r, next) || !triggered(r, next, holidays))) { output.nextWindow = at; break; }
    }
  }
  return output;
}
export function defaultEvaluation(clientId = "paypal", jurisdiction: Jurisdiction = { ...emptyJurisdiction, country: "United States", state: "New York", timezone: "America/New_York" }): EvaluationInput {
  return { clientId, jurisdiction, channel: "Email", type: "Transactional", at: "2026-11-09T15:00:00Z", consent: true, optedOut: false, attempts: 0, attemptsDaily: 0, attemptsMonthly: 0, flags: [], senderIdentified: true, unsubscribeInstructions: true, templateApproved: true, replyEnabled: true, language: "English", balance: 100, daysPastDue: 10 };
}
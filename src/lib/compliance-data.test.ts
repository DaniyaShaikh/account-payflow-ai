import { describe, it, expect } from "vitest";
import { newComplianceRule, defaultEvaluation, evaluateRules, applicableRules, holidaySeed, jurisdictionMatches, type ComplianceRule } from "./compliance-data";
import type { Rule } from "./rules-data";
const rule = (patch: Partial<ComplianceRule> = {}): ComplianceRule => ({ ...newComplianceRule(), id: "mandatory", name: "Test protection", status: "Active", channel: "All Channels", ...patch });
const input = () => defaultEvaluation("client", { country: "Canada", state: "Ontario", region: "Toronto", postal: "M5V", timezone: "America/Toronto" });
describe("mandatory compliance enforcement", () => {
  it("cannot be disabled in client settings", () => { const r = rule(); expect(applicableRules([r], input().jurisdiction, "client", [r.id])).toHaveLength(1); });
  it("enforces broader and more specific mandatory restrictions together", () => {
    const broad = rule({ conditions: [{ id: "a", field: "Opt-Out", operator: "Equals", value: "Yes", period: 7 }], action: "Suppress" });
    const specific = rule({ id: "specific", jurisdiction: input().jurisdiction, action: "Allow", conditions: [{ id: "b", field: "Opt-Out", operator: "Equals", value: "Yes", period: 7 }] });
    expect(evaluateRules([broad, specific], [], [], { ...input(), optedOut: true }).result).toBe("Blocked");
  });
  it("client-specific allow cannot weaken mandatory restrictions", () => {
    const mandatory = rule(); const client = rule({ id: "client", clientId: "client", action: "Allow" });
    expect(evaluateRules([mandatory, client], [], [], { ...input(), consent: false }).result).toBe("Blocked");
  });
  it("channel opt-out does not suppress other channels", () => {
    const sms = rule({ channel: "SMS", action: "Suppress", conditions: [{ id: "a", field: "Opt-Out", operator: "Equals", value: "Yes", period: 7 }] });
    expect(evaluateRules([sms], [], [], { ...input(), channel: "Email", optedOut: true }).result).toBe("Allowed");
    expect(evaluateRules([sms], [], [], { ...input(), channel: "SMS", optedOut: true }).result).toBe("Blocked");
  });
  it("frequency limits enforce rolling 7 day threshold", () => {
    const r = rule({ category: "Frequency", conditions: [{ id: "a", field: "Contact Attempts", operator: "Greater Than", value: "6", period: 7 }] });
    expect(evaluateRules([r], [], [], { ...input(), attempts: 6 }).result).toBe("Allowed");
    expect(evaluateRules([r], [], [], { ...input(), attempts: 7 }).result).toBe("Blocked");
  });
  it("excludes contact history outside the rolling period", () => {
    const r = rule({ category: "Frequency", conditions: [{ id: "a", field: "Contact Attempts", operator: "Greater Than", value: "0", period: 7 }] });
    expect(evaluateRules([r], [], [], { ...input(), contactHistory: [{ at: "2026-10-01T12:00:00Z", channel: "Email" }] }).result).toBe("Allowed");
  });
  it("uses recipient local time and reschedules to the 9 AM weekday window", () => {
    const r = rule({ category: "Permitted Hours", action: "Reschedule", conditions: [{ id: "a", field: "Outside Permitted Hours", operator: "Equals", value: "Yes", period: 7 }] });
    const result = evaluateRules([r], [], [], { ...input(), at: "2026-11-09T23:00:00Z" });
    expect(result.result).toBe("Reschedule"); expect(result.nextWindow).toBe("2026-11-10T14:00:00.000Z");
  });
  it("adjusts the 9 AM window for daylight saving time", () => {
    const r = rule({ category: "Permitted Hours", action: "Reschedule", conditions: [{ id: "a", field: "Outside Permitted Hours", operator: "Equals", value: "Yes", period: 7 }] });
    expect(evaluateRules([r], [], [], { ...input(), at: "2026-07-06T11:00:00Z" }).nextWindow).toBe("2026-07-06T13:00:00.000Z");
  });
  it("holds holiday communications and finds a non-restricted date", () => {
    const r = rule({ category: "Holidays & Restricted Dates", action: "Reschedule", conditions: [{ id: "a", field: "Restricted Date", operator: "Equals", value: "Yes", period: 7 }] });
    const result = evaluateRules([r], [], holidaySeed, { ...input(), at: "2026-12-25T15:00:00Z" });
    expect(result.result).toBe("Reschedule"); expect(result.nextWindow).toBe("2026-12-26T05:00:00.000Z");
  });
  it("evaluates active operational controls with compliance", () => {
    const operational: Rule = { id: "op", name: "Operational hold", description: "", type: "Client Rule", clientId: "client", category: "Amount", logic: "ALL", conditions: [{ id: "c", field: "Outstanding Balance", operator: "Greater Than", value: "50" }], action: "Prevent Communication", status: "Active", createdBy: "Admin", lastUpdated: "", triggers7d: 0, appliedTo: [], history: [] };
    expect(evaluateRules([], [operational], [], input()).result).toBe("Blocked");
  });
  it("never evaluates another client's rules", () => { expect(evaluateRules([rule({ clientId: "other" })], [], [], { ...input(), consent: false }).result).toBe("Allowed"); });
  it("ignores draft and not-yet-effective rules", () => { expect(evaluateRules([rule({ status: "Draft" }), rule({ id: "future", from: "2027-01-01" })], [], [], { ...input(), consent: false }).result).toBe("Allowed"); });
  it("matches jurisdiction postal prefixes and ranges without cancelling country rules", () => {
    expect(jurisdictionMatches({ ...input().jurisdiction, postal: "M5" }, input().jurisdiction)).toBe(true);
    expect(jurisdictionMatches({ ...input().jurisdiction, postal: "10001..10010" }, { ...input().jurisdiction, postal: "10005" })).toBe(true);
    expect(jurisdictionMatches({ ...input().jurisdiction, state: "Quebec" }, input().jurisdiction)).toBe(false);
  });
  it("requires review when recipient jurisdiction is missing", () => { expect(evaluateRules([], [], [], { ...input(), jurisdiction: { ...input().jurisdiction, country: "" } }).result).toBe("Review Required"); });
});
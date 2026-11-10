import { describe, expect, it } from "vitest";
import { essentialRules, fieldByLabel, ruleActions, type Rule } from "./rules-data";
import { defaultEvaluation, evaluateRules, complianceSeed } from "./compliance-data";
import { operationalRuleSelected } from "./client-rule-selection";
import { makeConfig } from "./payflow-data";

function getRule(id: string): Rule {
  const rule = essentialRules.find(r => r.id === id);
  if (!rule) throw new Error(`Missing essential rule: ${id}`);
  return rule;
}
function evaluate(id: string, facts: Record<string, string | number>, balance = 100) {
  const rule = { ...getRule(id), status: "Active" as const, appliedTo: ["paypal"] };
  return evaluateRules([], [rule], [], { ...defaultEvaluation(), balance, operational: facts });
}

describe("essential System + Client rules", () => {
  it("makes new rules drafts without changing existing client selections", () => {
    expect(essentialRules).toHaveLength(10);
    for (const rule of essentialRules) {
      expect(rule.status).toBe("Draft");
      expect(rule.appliedTo).toEqual([]);
      expect(operationalRuleSelected(rule, "paypal", makeConfig())).toBe(false);
      expect(operationalRuleSelected(rule, "paypal", makeConfig({ selectedOperationalRules: [rule.id] }))).toBe(true);
      expect(ruleActions).toContain(rule.action);
      for (const condition of rule.conditions) expect(fieldByLabel(condition.field)).toBeDefined();
    }
  });
  it("includes unsubscribe options for email and SMS", () => {
    expect(getRule("allow-unsubscribe-option").action).toBe("Include Unsubscribe Option");
    expect(evaluate("allow-unsubscribe-option", { Channel: "Email" }).matches).toHaveLength(1);
    expect(evaluate("allow-unsubscribe-option", { Channel: "SMS" }).matches).toHaveLength(1);
    expect(evaluate("allow-unsubscribe-option", { Channel: "Voice" }).matches).toHaveLength(0);
  });
  it("offers an alternate payment method only after failure and when available", () => {
    const id = "failed-payment-alternate-method";
    expect(getRule(id).action).toBe("Offer Alternate Payment Method");
    expect(evaluate(id, { "Payment Status": "Failed", "Alternate Payment Method Available": "Yes" }).matches).toHaveLength(1);
    expect(evaluate(id, { "Payment Status": "Failed", "Alternate Payment Method Available": "No" }).matches).toHaveLength(0);
    expect(evaluate(id, { "Payment Status": "Paid", "Alternate Payment Method Available": "Yes" }).matches).toHaveLength(0);
  });
  it("proposes channel fallback only after failure with an eligible alternate", () => {
    const id = "failed-delivery-alternate-channel";
    expect(getRule(id).action).toBe("Send via Alternate Channel");
    expect(evaluate(id, { "Delivery Status": "Failed", "Alternate Channel Eligible": "Yes" }).result).toBe("Review Required");
    expect(evaluate(id, { "Delivery Status": "Failed", "Alternate Channel Eligible": "No" }).matches).toHaveLength(0);
    expect(evaluate(id, { "Delivery Status": "Delivered", "Alternate Channel Eligible": "Yes" }).matches).toHaveLength(0);
  });
  it("stops contact after unsubscribe", () => {
    expect(evaluate("respect-channel-unsubscribe", { "Customer Opted Out": "Yes" }).result).toBe("Blocked");
    expect(evaluate("respect-channel-unsubscribe", { "Customer Opted Out": "No" }).result).toBe("Allowed");
  });
  it("stops collection reminders for paid or zero balance accounts", () => {
    expect(evaluate("paid-account-stop-reminders", { "Payment Status": "Paid" }).result).toBe("Blocked");
    expect(evaluate("paid-account-stop-reminders", { "Payment Status": "Unpaid" }, 0).result).toBe("Blocked");
    expect(evaluate("paid-account-stop-reminders", { "Payment Status": "Unpaid" }, 100).result).toBe("Allowed");
  });
  it("holds reminders during pending payments", () => {
    expect(evaluate("payment-processing-hold", { "Payment Processing Status": "Pending" }).result).toBe("Review Required");
    expect(evaluate("payment-processing-hold", { "Payment Processing Status": "Succeeded" }).result).toBe("Allowed");
  });
  it("blocks duplicate communications", () => {
    expect(evaluate("prevent-duplicate-messages", { "Duplicate Communication": "Yes" }).result).toBe("Blocked");
    expect(evaluate("prevent-duplicate-messages", { "Duplicate Communication": "No" }).result).toBe("Allowed");
  });
  it("blocks bounced contact channels", () => {
    expect(evaluate("invalid-address-hold", { "Delivery Status": "Bounced" }).result).toBe("Blocked");
    expect(evaluate("invalid-address-hold", { "Delivery Status": "Delivered" }).result).toBe("Allowed");
  });
  it("proposes instalment follow-up only for a missed payment with remaining balance", () => {
    expect(evaluate("missed-installment-follow-up", { "Missed Installments": 1 }).matches).toHaveLength(1);
    expect(evaluate("missed-installment-follow-up", { "Missed Installments": 0 }).matches).toHaveLength(0);
    expect(evaluate("missed-installment-follow-up", { "Missed Installments": 1 }, 0).matches).toHaveLength(0);
  });
  it("proposes one confirmation only after successful payment", () => {
    const id = "successful-payment-confirmation";
    expect(evaluate(id, { "Payment Processing Status": "Succeeded", "Payment Confirmation Sent": "No" }).matches).toHaveLength(1);
    expect(evaluate(id, { "Payment Processing Status": "Pending", "Payment Confirmation Sent": "No" }).matches).toHaveLength(0);
    expect(evaluate(id, { "Payment Processing Status": "Succeeded", "Payment Confirmation Sent": "Yes" }).matches).toHaveLength(0);
  });
  it("fallback cannot override mandatory opt-out suppression", () => {
    const fallback = { ...getRule("failed-delivery-alternate-channel"), status: "Active" as const, appliedTo: ["paypal"] };
    const input = { ...defaultEvaluation("paypal", { country: "Canada", state: "Ontario", region: "", postal: "", timezone: "America/Toronto" }), optedOut: true, operational: { "Delivery Status": "Failed", "Alternate Channel Eligible": "Yes" } };
    expect(evaluateRules(complianceSeed, [fallback], [], input).result).toBe("Blocked");
  });
});
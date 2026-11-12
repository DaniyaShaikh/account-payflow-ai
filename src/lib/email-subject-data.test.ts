import { describe, it, expect } from "vitest";
import { messageTemplates, templateForNode } from "./strategy-data";
import {
  aggregateSubjects,
  emailRecords,
  emailPayments,
  filterEmails,
  normalizeSubject,
  subjectLeaders,
  MIN_SUBJECT_DELIVERIES,
  type EmailRecord,
  type PaymentTransaction,
} from "./email-subject-data";
const row: EmailRecord = {
  id: "a",
  subject: "  Payment   reminder ",
  date: "2026-11-12",
  clientId: "paypal",
  portfolioId: "p",
  workflowId: "w",
  stage: "Second reminder",
  purpose: "Payment Reminder",
  delivered: true,
  openEvents: ["1", "2", "3"],
  clickEvents: ["1", "2"],
  paymentLinkClicked: true,
  initiated: true,
  bodyId: "one",
};
const payment: PaymentTransaction = {
  id: "t",
  communicationId: "a",
  status: "Succeeded",
  date: row.date,
  clientId: row.clientId,
  portfolioId: "p",
  workflowId: "w",
  stage: row.stage,
};
describe("subject analytics rules", () => {
  it("keeps selected subjects draft-scoped without changing shared email templates", () => {
    const original = messageTemplates.find(t => t.id === "em-reminder")?.subject;
    const template = templateForNode({ id: "draft", kind: "Communication", title: "Reminder", origin: "Human Modified", config: { templateId: "em-reminder", channel: "Email", subjectOverride: "Your payment options are ready when you are" } });
    expect(template?.subject).toBe("Your payment options are ready when you are");
    expect(messageTemplates.find(t => t.id === "em-reminder")?.subject).toBe(original);
  });
  it("normalizes insignificant spacing without merging distinct text", () => {
    expect(normalizeSubject(row.subject)).toBe("Payment reminder");
    expect(normalizeSubject("payment reminder")).not.toBe(normalizeSubject(row.subject));
  });
  it("counts unique opens per communication, not tracking events", () => {
    expect(aggregateSubjects([row, { ...row, id: "b", openEvents: [] }])[0]?.opens).toBe(1);
  });
  it("counts unique clicks per communication, not tracking events", () => {
    expect(aggregateSubjects([row, { ...row, id: "b", clickEvents: [] }])[0]?.clicks).toBe(1);
  });
  it("uses delivered as the open-rate denominator", () => {
    expect(
      aggregateSubjects([
        row,
        { ...row, id: "b", openEvents: [] },
        { ...row, id: "c", delivered: false },
      ])[0]?.openRate,
    ).toBe(0.5);
  });
  it("uses delivered as the click-rate denominator", () => {
    expect(aggregateSubjects([row, { ...row, id: "b", clickEvents: [] }])[0]?.clickRate).toBe(0.5);
  });
  it("counts only successful payment transactions, deduplicated", () => {
    expect(
      aggregateSubjects(
        [row],
        [payment, payment, { ...payment, id: "failed", status: "Failed" }],
      )[0]?.completed,
    ).toBe(1);
  });
  it("attributes a transaction to only one subject", () => {
    expect(
      aggregateSubjects(
        [row, { ...row, id: "b", subject: "Another subject" }],
        [payment, { ...payment, communicationId: "b" }],
      ).reduce((s, r) => s + r.completed, 0),
    ).toBe(1);
  });
  it("does not credit unattributed transactions", () => {
    expect(aggregateSubjects([row], [{ ...payment, communicationId: null }])[0]?.completed).toBe(0);
  });
  it("uses successful transaction count / delivered for conversion", () => {
    expect(aggregateSubjects([row, { ...row, id: "b" }], [payment])[0]?.conversion).toBe(0.5);
  });
  it("excludes samples under 100 deliveries from conversion leaders", () => {
    const metrics = aggregateSubjects([row], [payment]);
    expect(MIN_SUBJECT_DELIVERIES).toBe(100);
    expect(subjectLeaders(metrics).conversion).toBeUndefined();
  });
  it("defaults to descending completed payment counts", () => {
    expect(
      aggregateSubjects([row, { ...row, id: "b", subject: "Other" }], [payment]).map(
        (r) => r.completed,
      ),
    ).toEqual([1, 0]);
  });
  it("preserves distinct body variations in the same subject", () => {
    expect(
      aggregateSubjects([row, { ...row, id: "b", subject: "Payment reminder", bodyId: "two" }])[0]
        ?.variations,
    ).toBe(2);
  });
  it("applies all contextual and date filters together", () => {
    const match = emailRecords[0];
    if (!match) throw Error("seed missing");
    const rows = filterEmails({
      clientIds: [match.clientId],
      portfolioIds: [match.portfolioId],
      workflowId: match.workflowId,
      stage: match.stage,
      start: match.date,
      end: match.date,
      search: normalizeSubject(match.subject),
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (r) =>
          r.date === match.date &&
          r.portfolioId === match.portfolioId &&
          r.workflowId === match.workflowId &&
          r.stage === match.stage,
      ),
    ).toBe(true);
    expect(filterEmails({ clientIds: [] })).toHaveLength(0);
  });
  it("keeps mock funnel counts and rates consistent", () => {
    for (const r of aggregateSubjects(emailRecords)) {
      expect(r.delivered).toBeLessThanOrEqual(r.sent);
      expect(r.opens).toBeLessThanOrEqual(r.delivered);
      expect(r.clicks).toBeLessThanOrEqual(r.opens);
      expect(r.initiated).toBeLessThanOrEqual(r.paymentLinkClicks);
      expect(r.completed).toBeLessThanOrEqual(r.initiated);
      expect(r.conversion).toBe(r.completed / r.delivered);
    }
    expect(new Set(emailPayments.map((p) => p.id)).size).toBe(emailPayments.length);
  });
});

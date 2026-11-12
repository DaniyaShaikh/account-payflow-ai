import { seedStrategies } from "./strategy-data";
import { seedPortfolios } from "./portfolio-data";

export const MIN_SUBJECT_DELIVERIES = 100;
export const ANALYTICS_DATE = "2026-11-12";
export const reminderTypes = [
  "First reminder",
  "Second reminder",
  "Final reminder",
  "Payment plan",
  "Promise to pay",
];
export const subjectSamples = [
  {
    subject: "A friendly reminder about your outstanding balance",
    stage: "First reminder",
    purpose: "Payment Reminder",
    opens: 85,
    clicks: 12,
    payments: 2,
  },
  {
    subject: "Your payment options are ready when you are",
    stage: "Second reminder",
    purpose: "Payment Reminder",
    opens: 68,
    clicks: 40,
    payments: 18,
  },
  {
    subject: "A reminder: your account still needs attention",
    stage: "Final reminder",
    purpose: "Firm Reminder",
    opens: 55,
    clicks: 28,
    payments: 9,
  },
  {
    subject: "Spread your balance with a payment plan",
    stage: "Payment plan",
    purpose: "Payment Plan Reminder",
    opens: 72,
    clicks: 34,
    payments: 12,
  },
  {
    subject: "Your promised payment is coming up",
    stage: "Promise to pay",
    purpose: "Promise-to-Pay Reminder",
    opens: 75,
    clicks: 38,
    payments: 15,
  },
  {
    subject: "Let’s find a payment option that works for you",
    stage: "Second reminder",
    purpose: "Payment Reminder",
    opens: 95,
    clicks: 85,
    payments: 70,
  },
];
export interface EmailRecord {
  id: string;
  subject: string;
  date: string;
  clientId: string;
  portfolioId: string;
  workflowId: string;
  stage: string;
  purpose: string;
  delivered: boolean;
  openEvents: string[];
  clickEvents: string[];
  paymentLinkClicked: boolean;
  initiated: boolean;
  bodyId: string;
}
export interface PaymentTransaction {
  id: string;
  communicationId: string | null;
  status: "Succeeded" | "Failed";
  date: string;
  clientId: string;
  portfolioId: string;
  workflowId: string;
  stage: string;
}
export const normalizeSubject = (subject: string) => subject.trim().replace(/\s+/g, " ");
export const emailRecords: EmailRecord[] = [];
export const emailPayments: PaymentTransaction[] = [];
// Fixed reproducible prototype data. One transaction has one attributed communication,
// representing its last payment-link click within seven days. Missing linkage stays null.
seedPortfolios
  .filter((_, i) => i % 2 === 0)
  .forEach((portfolio, context) => {
    const workflow =
      seedStrategies.find((s) => s.portfolioId === portfolio.id) ??
      seedStrategies.find((s) => s.clientId === portfolio.clientId);
    if (!workflow) return;
    subjectSamples.forEach((sample, sampleIndex) => {
      for (let day = 0; day < 30; day++) {
        const date = new Date(Date.UTC(2026, 10, 12 - day)).toISOString().slice(0, 10);
        const volume =
          sampleIndex === 5
            ? day === 0
              ? 8
              : 0
            : 25 + ((day + context * 3 + sampleIndex * 7) % 15);
        for (let n = 0; n < volume; n++) {
          const id = `email-${context}-${sampleIndex}-${day}-${n}`;
          const score = (n * 37 + day * 11 + context * 7) % 100;
          const delivered = score < 96;
          const opened = delivered && score < sample.opens;
          const clicked = opened && score < sample.clicks;
          const initiated = clicked && score < sample.clicks * 0.8;
          const paid = initiated && score < sample.payments;
          const row: EmailRecord = {
            id,
            subject: n % 3 === 0 ? `  ${sample.subject.replace(" ", "  ")} ` : sample.subject,
            date,
            clientId: portfolio.clientId,
            portfolioId: portfolio.id,
            workflowId: workflow.id,
            stage: sample.stage,
            purpose: sample.purpose,
            delivered,
            openEvents: opened ? ["open", "open-again"] : [],
            clickEvents: clicked ? ["click", "click-again"] : [],
            paymentLinkClicked: clicked,
            initiated,
            bodyId: n % 2 ? "support" : "standard",
          };
          emailRecords.push(row);
          if (paid || (initiated && n % 4 === 0))
            emailPayments.push({
              id: `txn-${id}`,
              communicationId: id,
              status: paid ? "Succeeded" : "Failed",
              date,
              clientId: row.clientId,
              portfolioId: row.portfolioId,
              workflowId: row.workflowId,
              stage: row.stage,
            });
        }
      }
    });
    emailPayments.push({
      id: `unlinked-${context}`,
      communicationId: null,
      status: "Succeeded",
      date: ANALYTICS_DATE,
      clientId: portfolio.clientId,
      portfolioId: portfolio.id,
      workflowId: workflow.id,
      stage: "Second reminder",
    });
  });
export interface SubjectFilters {
  clientIds: string[];
  portfolioIds?: string[];
  workflowId?: string | undefined;
  stage?: string | undefined;
  start?: string;
  end?: string;
  search?: string;
}
export function matchesContext(
  row: Omit<
    EmailRecord,
    | "id"
    | "subject"
    | "delivered"
    | "openEvents"
    | "clickEvents"
    | "paymentLinkClicked"
    | "initiated"
    | "bodyId"
    | "purpose"
  >,
  filters: SubjectFilters,
) {
  return (
    filters.clientIds.includes(row.clientId) &&
    (!filters.portfolioIds?.length || filters.portfolioIds.includes(row.portfolioId)) &&
    (!filters.workflowId || row.workflowId === filters.workflowId) &&
    (!filters.stage || row.stage === filters.stage) &&
    (!filters.start || row.date >= filters.start) &&
    (!filters.end || row.date <= filters.end)
  );
}
export function filterEmails(filters: SubjectFilters) {
  return emailRecords.filter(
    (row) =>
      matchesContext(row, filters) &&
      (!filters.search ||
        normalizeSubject(row.subject).toLowerCase().includes(filters.search.toLowerCase().trim())),
  );
}
export interface SubjectMetrics {
  subject: string;
  sent: number;
  delivered: number;
  opens: number;
  openRate: number;
  clicks: number;
  clickRate: number;
  paymentLinkClicks: number;
  initiated: number;
  completed: number;
  conversion: number;
  variations: number;
}
export function aggregateSubjects(
  records: EmailRecord[],
  payments: PaymentTransaction[] = emailPayments,
): SubjectMetrics[] {
  const successful = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const p of payments) {
    if (p.status !== "Succeeded" || !p.communicationId || seen.has(p.id)) continue;
    seen.add(p.id);
    const ids = successful.get(p.communicationId) ?? new Set<string>();
    ids.add(p.id);
    successful.set(p.communicationId, ids);
  }
  const groups = new Map<string, EmailRecord[]>();
  for (const row of new Map(records.map((r) => [r.id, r])).values()) {
    const key = normalizeSubject(row.subject);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups]
    .map(([subject, rows]) => {
      const delivered = rows.filter((r) => r.delivered).length;
      const opens = rows.filter((r) => r.delivered && r.openEvents.length > 0).length;
      const clicks = rows.filter((r) => r.delivered && r.clickEvents.length > 0).length;
      const completed = rows.reduce((sum, r) => sum + (successful.get(r.id)?.size ?? 0), 0);
      return {
        subject,
        sent: rows.length,
        delivered,
        opens,
        openRate: delivered ? opens / delivered : 0,
        clicks,
        clickRate: delivered ? clicks / delivered : 0,
        paymentLinkClicks: rows.filter((r) => r.paymentLinkClicked).length,
        initiated: rows.filter((r) => r.initiated).length,
        completed,
        conversion: delivered ? completed / delivered : 0,
        variations: new Set(rows.map((r) => r.bodyId)).size,
      };
    })
    .sort((a, b) => b.completed - a.completed || a.subject.localeCompare(b.subject));
}
export function subjectLeaders(rows: SubjectMetrics[]) {
  const top = (
    key: keyof Pick<SubjectMetrics, "opens" | "clicks" | "completed" | "conversion">,
    pool = rows,
  ) => [...pool].sort((a, b) => b[key] - a[key] || b.delivered - a.delivered)[0];
  return {
    opened: top("opens"),
    clicked: top("clicks"),
    payments: top("completed"),
    conversion: top(
      "conversion",
      rows.filter((r) => r.delivered >= MIN_SUBJECT_DELIVERIES),
    ),
  };
}
export const percentage = (n: number) => `${(n * 100).toFixed(1)}%`;
export function subjectInsight(row: SubjectMetrics) {
  if (row.delivered < MIN_SUBJECT_DELIVERIES)
    return "Insufficient delivery volume for a reliable conversion ranking.";
  if (row.openRate > 0.75 && row.clickRate < 0.2)
    return "High estimated opens but low clicks and payment conversion.";
  if (row.conversion > 0.13) return "Strong payment conversion in this filtered reminder context.";
  return "Compare alongside reminder stage, email body and account context—not the subject alone.";
}
export function historicalExamples(
  clientId: string,
  workflowId: string,
  stage: string,
  purpose: string,
) {
  const exact = emailRecords.filter(
    (r) =>
      r.clientId === clientId &&
      r.workflowId === workflowId &&
      r.stage === stage &&
      r.purpose === purpose,
  );
  const clientStage = emailRecords.filter(
    (r) => r.clientId === clientId && r.stage === stage && r.purpose === purpose,
  );
  return {
    rows: aggregateSubjects(exact.length ? exact : clientStage).slice(0, 3),
    scope: exact.length
      ? "Same client, workflow, stage and purpose"
      : "Same client, stage and purpose · no exact workflow history",
  };
}
export function sampleBody(variation: string) {
  return `Hi Alex,\n\nYour account has an outstanding balance of $425.00. ${variation === "support" ? "If you need more time, we can help you explore a payment plan." : "You can review your balance and available payment options securely."}\n\nReview payment options: {{payment_link}}\n\nIf you have already paid, thank you. Please contact us if you believe this balance is incorrect.\n\n{{brand_name}}\nManage communication preferences: {{unsubscribe_link}}`;
}

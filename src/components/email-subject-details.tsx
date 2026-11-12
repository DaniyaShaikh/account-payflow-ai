import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Btn, FilterSelect, StatusPill } from "./payflow-ui";
import {
  aggregateSubjects,
  normalizeSubject,
  percentage,
  sampleBody,
  subjectInsight,
  type EmailRecord,
  type SubjectMetrics,
} from "@/lib/email-subject-data";
import { clients } from "@/lib/payflow-data";
import { seedStrategies } from "@/lib/strategy-data";

export function SubjectExamples({
  rows,
  onView,
  reminderFor,
}: {
  rows: SubjectMetrics[];
  onView?: (row: SubjectMetrics) => void;
  reminderFor?: (row: SubjectMetrics) => string;
}) {
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.subject} className="py-3 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-foreground">{row.subject}</p>
            {onView && (
              <Btn variant="ghost" onClick={() => onView(row)}>
                View Details
              </Btn>
            )}
          </div>
          {reminderFor && <p className="mt-1 text-[11px] text-muted-foreground">{reminderFor(row)}</p>}
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {row.delivered.toLocaleString()} delivered · {percentage(row.openRate)} estimated opens
            · {percentage(row.clickRate)} clicks · {row.completed} completed payments ·{" "}
            {percentage(row.conversion)} conversion
          </p>
        </div>
      ))}
    </div>
  );
}

export function EmailSubjectDetails({
  row,
  records,
  comparisons,
  onClose,
}: {
  row: SubjectMetrics | undefined;
  records: EmailRecord[];
  comparisons: SubjectMetrics[];
  onClose: () => void;
}) {
  const [period, setPeriod] = useState("Daily");
  const [variation, setVariation] = useState("standard");
  const own = records.filter((r) => normalizeSubject(r.subject) === row?.subject);
  const stages = [...new Set(own.map((r) => r.stage))];
  const peers = comparisons.filter(
    (r) =>
      r.subject !== row?.subject &&
      records.some((e) => normalizeSubject(e.subject) === r.subject && stages.includes(e.stage)),
  );
  const groups = new Map<string, EmailRecord[]>();
  own.forEach((r) => {
    const d = new Date(`${r.date}T12:00:00Z`);
    if (period === "Weekly") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const trend = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const m = aggregateSubjects(list)[0];
      return { date, Opens: m?.opens ?? 0, Clicks: m?.clicks ?? 0, Payments: m?.completed ?? 0 };
    });
  const breakdown = (key: "clientId" | "workflowId" | "stage") =>
    [...new Set(own.map((r) => r[key]))].map((id) => {
      const metric = aggregateSubjects(own.filter((r) => r[key] === id))[0];
      const label =
        key === "clientId"
          ? (clients.find((c) => c.id === id)?.name ?? id)
          : key === "workflowId"
            ? (seedStrategies.find((s) => s.id === id)?.name ?? id)
            : id;
      return (
        <div key={id} className="flex items-start justify-between gap-3 py-2 text-xs">
          <span className="min-w-0 break-words">{label}</span>
          <span className="shrink-0 text-muted-foreground">
            {metric?.completed ?? 0} paid · {percentage(metric?.conversion ?? 0)}
          </span>
        </div>
      );
    });
  return (
    <Dialog
      open={!!row}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg leading-relaxed">{row?.subject}</DialogTitle>
          <DialogDescription>Subject analysis · mock data · {stages.join(" / ")}</DialogDescription>
        </DialogHeader>
        {row && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Sent", row.sent],
                ["Delivered", row.delivered],
                ["Unique Opens", row.opens],
                ["Unique Clicks", row.clicks],
                ["Payment Initiated", row.initiated],
                ["Completed Payments", row.completed],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-border pb-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Open tracking is an estimate due to privacy protections and automated email-client
              activity. Payments count successful transactions, not amounts. Attribution: last
              payment-link click within 7 days; one subject per transaction.
            </p>
            <section className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Communication-to-Payment Funnel</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Sent", row.sent],
                  ["Delivered", row.delivered],
                  ["Opened", row.opens],
                  ["Clicked", row.clicks],
                  ["Initiated", row.initiated],
                  ["Completed", row.completed],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <progress
                      className="mt-2 h-2 w-full accent-primary"
                      max={row.sent || 1}
                      value={Number(value)}
                    />
                    <p className="mt-1 text-xs">
                      {percentage(Number(value) / (row.sent || 1))} of sent
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Performance Trend</h3>
                <FilterSelect
                  label="Group by"
                  value={period}
                  options={["Daily", "Weekly"]}
                  onChange={setPeriod}
                />
              </div>
              <div
                className="mt-3 h-56 min-w-0"
                aria-label={`${period} opens, clicks and completed payments trend`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      tickFormatter={(v) => String(v).slice(5)}
                    />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                    <Line dataKey="Opens" stroke="var(--primary)" dot={false} />
                    <Line dataKey="Clicks" stroke="var(--info)" dot={false} />
                    <Line dataKey="Payments" stroke="var(--success)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated opens · Unique clicks · Completed payments
              </p>
            </section>
            <section className="grid gap-5 border-t border-border pt-4 sm:grid-cols-3">
              {(["clientId", "workflowId", "stage"] as const).map((key, i) => (
                <div key={key} className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    {["By Client", "By Workflow", "By Reminder Stage"][i]}
                  </h3>
                  <div className="mt-2 divide-y divide-border">{breakdown(key)}</div>
                </div>
              ))}
            </section>
            <section className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Sample Email Preview</h3>
                <StatusPill>{row.variations} body variations</StatusPill>
              </div>
              <div className="mt-3 flex gap-2">
                {[...new Set(own.map((r) => r.bodyId))].map((v) => (
                  <Btn
                    key={v}
                    variant={variation === v ? "primary" : "secondary"}
                    onClick={() => setVariation(v)}
                  >
                    {v === "support" ? "Support-led body" : "Standard body"}
                  </Btn>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold">Subject: {row.subject}</p>
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-muted-foreground">
                {sampleBody(
                  own.some((r) => r.bodyId === variation)
                    ? variation
                    : (own[0]?.bodyId ?? "standard"),
                )}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Results combine distinct bodies sharing this subject; their content is not
                identical.
              </p>
            </section>
            <section className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Similar Reminder Subjects</h3>
              {peers.length ? (
                <SubjectExamples rows={peers} />
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No comparable subjects in the selected context.
                </p>
              )}
            </section>
            <section className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-ai">AI Insight · Simulated</h3>
              <p className="mt-2 text-sm">{subjectInsight(row)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Observed associations are not causal: client mix, reminder timing and body
                variations also affect results.
              </p>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

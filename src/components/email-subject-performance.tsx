import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import {
  Panel,
  KpiCard,
  Btn,
  FilterSelect,
  FilterMultiSelect,
  SearchInput,
  Td,
  Tr,
  StatusPill,
  EmptyState,
  Skeleton,
} from "./payflow-ui";
import { useRole } from "@/lib/role-context";
import { seedPortfolios } from "@/lib/portfolio-data";
import { seedStrategies } from "@/lib/strategy-data";
import {
  aggregateSubjects,
  ANALYTICS_DATE,
  emailPayments,
  filterEmails,
  matchesContext,
  MIN_SUBJECT_DELIVERIES,
  normalizeSubject,
  percentage,
  reminderTypes,
  subjectInsight,
  subjectLeaders,
  type SubjectMetrics,
} from "@/lib/email-subject-data";
import { EmailSubjectDetails, SubjectExamples } from "./email-subject-details";
const columns: { label: string; key: keyof SubjectMetrics }[] = [
  { label: "Email Subject", key: "subject" },
  { label: "Emails Sent", key: "sent" },
  { label: "Delivered", key: "delivered" },
  { label: "Unique Opens", key: "opens" },
  { label: "Open Rate", key: "openRate" },
  { label: "Unique Clicks", key: "clicks" },
  { label: "Click Rate", key: "clickRate" },
  { label: "Payment Link Clicks", key: "paymentLinkClicks" },
  { label: "Payment Initiated", key: "initiated" },
  { label: "Completed Payments", key: "completed" },
  { label: "Payment Conversion Rate", key: "conversion" },
];
export function EmailSubjectPerformance() {
  const { visibleClients } = useRole();
  const [client, setClient] = useState("All Clients");
  const [portfolios, setPortfolios] = useState<string[]>([]);
  const [workflow, setWorkflow] = useState("All Workflows");
  const [stage, setStage] = useState("All Reminder Types");
  const [range, setRange] = useState("Last 30 Days");
  const [start, setStart] = useState("2026-10-14");
  const [end, setEnd] = useState(ANALYTICS_DATE);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<keyof SubjectMetrics>("completed");
  const [ascending, setAscending] = useState(false);
  const [detail, setDetail] = useState<SubjectMetrics>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);
  const clientId = visibleClients.find((c) => c.name === client)?.id;
  const scopes = clientId ? [clientId] : visibleClients.map((c) => c.id);
  const portfolioOptions = seedPortfolios.filter((p) => p.clientId === clientId);
  const workflowOptions = seedStrategies.filter((s) => scopes.includes(s.clientId));
  const workflowId = workflowOptions.find((s) => s.name === workflow)?.id;
  const startDate =
    range === "Today"
      ? ANALYTICS_DATE
      : range === "Last 7 Days"
        ? "2026-11-06"
        : range === "Custom Range"
          ? start
          : "2026-10-14";
  const endDate = range === "Custom Range" ? end : ANALYTICS_DATE;
  const filters = {
    clientIds: scopes,
    portfolioIds: portfolioOptions.filter((p) => portfolios.includes(p.name)).map((p) => p.id),
    workflowId,
    stage: stage === "All Reminder Types" ? undefined : stage,
    start: startDate,
    end: endDate,
    search,
  };
  const records = filterEmails(filters);
  const rows = aggregateSubjects(records);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const x = a[sort],
          y = b[sort];
        return (
          (typeof x === "string" && typeof y === "string"
            ? x.localeCompare(y)
            : Number(x) - Number(y)) * (ascending ? 1 : -1)
        );
      }),
    [rows, sort, ascending],
  );
  const leaders = subjectLeaders(rows);
  const unattributed = emailPayments.filter(
    (p) => p.status === "Succeeded" && !p.communicationId && matchesContext(p, filters),
  ).length;
  const reset = () => {
    setClient("All Clients");
    setPortfolios([]);
    setWorkflow("All Workflows");
    setStage("All Reminder Types");
    setRange("Last 30 Days");
    setSearch("");
    setStart("2026-10-14");
    setEnd(ANALYTICS_DATE);
  };
  const counts = (
    row: SubjectMetrics | undefined,
    metric: "opens" | "clicks" | "completed" | "conversion",
  ) =>
    !row
      ? "No qualifying data"
      : metric === "conversion"
        ? percentage(row.conversion)
        : row[metric].toLocaleString();
  return (
    <section className="mb-5 min-w-0" aria-label="Email Subject Performance">
      <Panel
        title="Email Subject Performance"
        description="Successful payment transactions by email subject"
        action={<StatusPill>Mock data · through 12 Nov 2026</StatusPill>}
        bodyClassName="px-0 pb-0"
      >
        <div className="px-5">
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Date Range"
              value={range}
              onChange={setRange}
              options={["Last 30 Days", "Last 7 Days", "Today", "Custom Range"]}
            />
            <FilterSelect
              label="Client"
              value={client}
              onChange={(v) => {
                setClient(v);
                setPortfolios([]);
                setWorkflow("All Workflows");
              }}
              options={["All Clients", ...visibleClients.map((c) => c.name)]}
            />
            {clientId && (
              <FilterMultiSelect
                label="Sub-Client / Portfolio"
                allLabel="All Portfolios"
                selected={portfolios}
                onChange={setPortfolios}
                options={portfolioOptions.map((p) => p.name)}
              />
            )}
            <FilterSelect
              label="Workflow / Strategy"
              value={workflow}
              onChange={setWorkflow}
              options={["All Workflows", ...workflowOptions.map((s) => s.name)]}
            />
            <FilterSelect
              label="Reminder Type"
              value={stage}
              onChange={setStage}
              options={["All Reminder Types", ...reminderTypes]}
            />
            <Btn variant="ghost" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Btn>
          </div>
          {range === "Custom Range" && (
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                ["From", start, setStart],
                ["To", end, setEnd],
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="text-xs text-muted-foreground">
                  {String(label)}{" "}
                  <input
                    type="date"
                    aria-label={String(label)}
                    value={String(value)}
                    onChange={(e) => {
                      if (typeof setter === "function") setter(e.target.value);
                    }}
                    className="rounded-md border border-border bg-card p-2 text-foreground"
                  />
                </label>
              ))}
              {start > end && (
                <p role="alert" className="self-center text-xs text-destructive">
                  Choose an end date on or after the start date.
                </p>
              )}
            </div>
          )}
          <SearchInput
            className="mt-3 max-w-md"
            value={search}
            onChange={setSearch}
            placeholder="Search email subjects"
          />
          <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)
              : (
                  [
                    ["Most Opened Subject", leaders.opened, "opens"],
                    ["Most Clicked Subject", leaders.clicked, "clicks"],
                    ["Most Payments Generated", leaders.payments, "completed"],
                    ["Highest Payment Conversion", leaders.conversion, "conversion"],
                  ] as const
                ).map(([label, row, metric]) => (
                  <div key={label} className="min-w-0">
                    <KpiCard
                      label={label}
                      value={counts(row, metric)}
                      hint={
                        !row
                          ? `Minimum ${MIN_SUBJECT_DELIVERIES} deliveries for conversion rankings`
                          : metric === "opens"
                            ? `${percentage(row.openRate)} estimated open rate`
                            : metric === "clicks"
                              ? `${percentage(row.clickRate)} click rate`
                              : metric === "conversion"
                                ? `${row.completed} completed payments · ${row.delivered} delivered`
                                : "Completed payment transactions"
                      }
                    />
                    <p className="mt-2 min-h-9 text-xs font-medium leading-relaxed text-foreground">
                      {row?.subject ?? "No data for this selection"}
                    </p>
                  </div>
                ))}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            Open tracking is an estimate due to privacy protections and automated email-client
            activity. All rates use Delivered as the denominator. Conversion rankings require at
            least {MIN_SUBJECT_DELIVERIES} deliveries. Not attributed: {unattributed} successful
            transactions{search ? " in the selected context (not subject-linked)" : ""}.
          </p>
        </div>
        {loading ? (
          <div className="px-5 pb-4" role="status">
            <Skeleton className="h-20" />
            <span className="sr-only">Loading subject performance</span>
          </div>
        ) : !rows.length ? (
          <div className="px-5 pb-5">
            <EmptyState
              title="No subject performance data"
              description={
                search
                  ? "No subjects match this search and selected filters."
                  : "No email deliveries are available for this client, period or reminder context."
              }
              action={<Btn onClick={reset}>Clear filters</Btn>}
            />
          </div>
        ) : (
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full min-w-[1550px] border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      aria-sort={sort === c.key ? (ascending ? "ascending" : "descending") : "none"}
                      className="border-y border-border px-3 py-2 text-left whitespace-nowrap"
                    >
                      <Btn
                        variant="ghost"
                        className="h-auto px-0 text-[11px]"
                        onClick={() => {
                          setSort(c.key);
                          setAscending(sort === c.key ? !ascending : c.key === "subject");
                        }}
                      >
                        {c.label}
                        {sort === c.key &&
                          (ascending ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          ))}
                      </Btn>
                    </th>
                  ))}
                  <th className="sticky right-0 border-y border-border bg-surface px-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <Tr key={row.subject}>
                    <Td className="min-w-[250px] max-w-[290px] whitespace-normal">
                      <p className="font-semibold leading-relaxed">{row.subject}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {row.variations} body variations
                        {row.delivered < MIN_SUBJECT_DELIVERIES ? " · Low sample" : ""}
                      </p>
                    </Td>
                    {columns.slice(1).map((c) => (
                      <Td key={c.key} className="tabular px-3">
                        {["openRate", "clickRate", "conversion"].includes(c.key)
                          ? percentage(Number(row[c.key]))
                          : Number(row[c.key]).toLocaleString()}
                      </Td>
                    ))}
                    <Td className="sticky right-0 bg-card">
                      <Btn variant="ghost" onClick={() => setDetail(row)}>
                        View Details
                      </Btn>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel
        title="AI Subject Insights"
        description="Simulated historical insights · same filters as subject performance"
        className="mt-4"
        action={<Sparkles className="size-4 text-ai" />}
      >
        {!rows.length ? (
          <p className="text-xs text-muted-foreground">
            Insufficient data for insights in this selection.
          </p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 text-xs">
                <p>
                  <span className="font-semibold text-foreground">Payment leader: </span>
                  {leaders.payments?.subject} · {leaders.payments?.completed} completed payments.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Conversion leader: </span>
                  {leaders.conversion
                    ? `${leaders.conversion.subject} · ${percentage(leaders.conversion.conversion)}`
                    : "No subject meets the minimum delivery threshold."}
                </p>
                {rows
                  .filter((r) => r.openRate > 0.75 && r.clickRate < 0.2)
                  .slice(0, 1)
                  .map((r) => (
                    <p key={r.subject}>
                      <span className="font-semibold">Engagement gap: </span>
                      {r.subject} — {subjectInsight(r)}
                    </p>
                  ))}
                {rows
                  .filter((r) => r.delivered < MIN_SUBJECT_DELIVERIES)
                  .map((r) => (
                    <p key={r.subject} className="text-warning-foreground">
                      Insufficient data: {r.subject} · {r.delivered} delivered; excluded from
                      conversion rankings.
                    </p>
                  ))}
                {leaders.payments &&
                  (() => {
                    const context = records.filter(
                      (r) => normalizeSubject(r.subject) === leaders.payments?.subject,
                    );
                    const contexts = [...new Set(context.map((r) => `${r.clientId}|${r.stage}`))]
                      .map((key) => {
                        const [id, reminder] = key.split("|");
                        const m = aggregateSubjects(
                          context.filter((r) => r.clientId === id && r.stage === reminder),
                        )[0];
                        return { id, reminder, m };
                      })
                      .sort((a, b) => (b.m?.completed ?? 0) - (a.m?.completed ?? 0));
                    const best = contexts[0];
                    return best ? (
                      <p>
                        <span className="font-semibold">Context highlight: </span>
                        {visibleClients.find((c) => c.id === best.id)?.name} · {best.reminder} ·{" "}
                        {best.m?.completed} completed payments ·{" "}
                        {percentage(best.m?.conversion ?? 0)} conversion.
                      </p>
                    ) : null;
                  })()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">Top Performing Subject Examples</h3>
                <SubjectExamples
                  rows={rows.filter((r) => r.delivered >= MIN_SUBJECT_DELIVERIES).slice(0, 3)}
                  onView={setDetail}
                  reminderFor={r => [...new Set(records.filter(e => normalizeSubject(e.subject) === r.subject).map(e => e.stage))].join(', ')}
                />
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Attribution: last payment-link click within 7 days; each successful transaction is
              credited once. Subject performance is contextual, not evidence that a subject alone
              caused payment. Mock suggestions do not bypass compliance, client policies or human
              approval.
            </p>
          </>
        )}
      </Panel>
      <EmailSubjectDetails
        row={detail}
        records={filterEmails({ ...filters, search: "" })}
        comparisons={aggregateSubjects(filterEmails({ ...filters, search: "" }))}
        onClose={() => setDetail(undefined)}
      />
    </section>
  );
}

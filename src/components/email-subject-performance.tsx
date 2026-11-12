import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  subjectLeaders,
  type SubjectMetrics,
} from "@/lib/email-subject-data";
import { EmailSubjectDetails } from "./email-subject-details";
import { SubjectInsightButton } from "./subject-insight-button";
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
  const [moreFilters, setMoreFilters] = useState(false);
  const [allMetrics, setAllMetrics] = useState(false);
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
  const displayedColumns = allMetrics
    ? columns
    : columns.filter((c) =>
        ["subject", "delivered", "openRate", "clickRate", "completed", "conversion"].includes(
          c.key,
        ),
      );
  const insightKey = JSON.stringify(filters);
  const contextFor = (row: SubjectMetrics | undefined) =>
    row
      ? [
          ...new Set(
            records
              .filter((r) => normalizeSubject(r.subject) === row.subject)
              .map(
                (r) =>
                  `${visibleClients.find((c) => c.id === r.clientId)?.name ?? r.clientId} · ${r.stage}`,
              ),
          ),
        ].join(" / ")
      : "Selected filters";
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
            <Btn variant="ghost" onClick={() => setMoreFilters((v) => !v)}>
              <SlidersHorizontal className="size-3.5" />
              Filters
              {portfolios.length || workflow !== "All Workflows" || stage !== "All Reminder Types"
                ? " · Applied"
                : ""}
            </Btn>
            <Btn variant="ghost" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Btn>
          </div>
          {moreFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
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
            </div>
          )}
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
                  <div key={label} className="relative min-w-0">
                    <div className="absolute right-2 top-2 z-10">
                      <SubjectInsightButton
                        key={`${insightKey}-${metric}`}
                        row={row}
                        label={label}
                        context={contextFor(row)}
                        onDetails={setDetail}
                      />
                    </div>
                    <KpiCard
                      label={
                        label === "Highest Payment Conversion"
                          ? "Best Conversion"
                          : label === "Most Payments Generated"
                            ? "Most Payments"
                            : label === "Most Opened Subject"
                              ? "Most Opened"
                              : "Most Clicked"
                      }
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Opens are estimates · Payments count successful transactions
            </p>
            <Btn variant="ghost" onClick={() => setAllMetrics((v) => !v)}>
              {allMetrics ? "Key metrics" : "All metrics"}
              {allMetrics ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Btn>
          </div>
          <details className="mb-3 text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">
              Measurement notes · {unattributed} not attributed
            </summary>
            <p className="mt-2 leading-relaxed">
              Open tracking is estimated due to privacy protections and automated email-client
              activity. All rates use Delivered as the denominator. Conversion rankings require{" "}
              {MIN_SUBJECT_DELIVERIES} deliveries. Attribution uses the last payment-link click
              within 7 days; each successful transaction is credited once. {unattributed} successful
              transactions have no subject attribution. Outcomes depend on client mix, reminder
              stage and email body, not just the subject.
            </p>
          </details>
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
            <table
              className={`w-full ${allMetrics ? "min-w-[1550px]" : "min-w-[800px]"} border-collapse text-xs`}
            >
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  {displayedColumns.map((c) => (
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
                  <th className="sticky right-0 border-y border-border bg-surface px-3 text-left">
                    Details
                  </th>
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
                    {displayedColumns.slice(1).map((c) => (
                      <Td key={c.key} className="tabular px-3">
                        {["openRate", "clickRate", "conversion"].includes(c.key)
                          ? percentage(Number(row[c.key]))
                          : Number(row[c.key]).toLocaleString()}
                      </Td>
                    ))}
                    <Td className="sticky right-0 bg-card">
                      <SubjectInsightButton
                        key={`${insightKey}-${row.subject}`}
                        row={row}
                        label={row.subject}
                        context={contextFor(row)}
                        onDetails={setDetail}
                      />
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
      <EmailSubjectDetails
        row={detail}
        records={filterEmails({ ...filters, search: "" })}
        comparisons={aggregateSubjects(filterEmails({ ...filters, search: "" }))}
        onClose={() => setDetail(undefined)}
      />
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  Panel,
  KpiCard,
  StatusPill,
  FilterSelect,
  FilterMultiSelect,
} from "@/components/payflow-ui";
import { useRole, useVisibleAccounts, useVisibleActivity } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { formatCurrency, formatNumber, journeys } from "@/lib/payflow-data";
import { paymentOutcomeTotals } from "@/lib/payment-data";
import { useVisibleCommunications } from "@/components/communication-table";
import { buildIntegrations, integrationSummary } from "@/lib/integration-data";
import {
  isSingleClientSelected,
  portfolioByName,
  subClientNamesForClient,
} from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { EmailSubjectPerformance } from "@/components/email-subject-performance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Operations Dashboard — PayFlow Collections" },
      {
        name: "description",
        content:
          "Operational view of client portfolios, customer accounts under collection and active collection cases across PayFlow.",
      },
      { property: "og:title", content: "Operations Dashboard — PayFlow Collections" },
      {
        property: "og:description",
        content:
          "Track accounts under collection, active cases, recovered amounts and pending human reviews.",
      },
    ],
  }),
  component: Dashboard,
});

const funnelStages = [
  "Valid Addresses",
  "Invalid Addresses",
  "Sent",
  "Delivered",
  "Opened / Read",
  "Clicked",
  "Payment Initiated",
  "Paid",
] as const;

const stageRates = [1, 0.062, 0.984, 0.956, 0.738, 0.416, 0.737, 0.802];

// Funnel stages map onto the communication statuses that produced them, so a
// click leads to the underlying communications.
function stageStatus(stage: string): string | undefined {
  switch (stage) {
    case "Delivered":
      return "Delivered";
    case "Opened / Read":
      return "Opened / Read";
    case "Clicked":
    case "Payment Initiated":
    case "Paid":
      return "Payment Link Clicked";
    default:
      return undefined;
  }
}

function hashSeed(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function funnelVolumes(
  client: string,
  subClient: string,
  date: string,
  channel: string,
  journey: string,
) {
  const seed = hashSeed(`${client}|${subClient}|${date}|${channel}|${journey}`);
  const base = 5200 + (seed % 5200);
  let previous = base;
  return funnelStages.map((stage, i) => {
    if (i === 0) return { stage, volume: base, rate: null as number | null };
    const jitter = 0.94 + ((seed >> (i * 3)) % 13) / 100;
    // Invalid addresses branch off the valid pool; every other stage follows the previous one.
    const volume = Math.round(
      (stage === "Invalid Addresses" ? base : previous) * (stageRates[i] ?? 1) * jitter,
    );
    const rate = volume / (stage === "Invalid Addresses" ? base : previous);
    if (stage !== "Invalid Addresses") previous = volume;
    return { stage, volume, rate };
  });
}

/** Seeded inbox-placement split for the delivered volume (email only). */
function placementSplit(delivered: number, seed: number) {
  const inbox = Math.round(delivered * (0.82 + ((seed >> 5) % 8) / 100));
  const spam = Math.round((delivered - inbox) * 0.72);
  const promotions = delivered - inbox - spam;
  return [
    { label: "Inbox", volume: inbox },
    { label: "Spam", volume: spam },
    { label: "Promotions", volume: promotions },
  ];
}

function CommunicationFunnel() {
  const { visibleClients } = useRole();
  const [client, setClient] = useState("All Clients");
  const [subClients, setSubClients] = useState<string[]>([]);
  const [date, setDate] = useState("Today");
  const [channel, setChannel] = useState("All Channels");
  const [journey, setJourney] = useState("All Workflows");

  const isDefault =
    client === "All Clients" &&
    subClients.length === 0 &&
    date === "Today" &&
    channel === "All Channels" &&
    journey === "All Workflows";

  const rows = funnelVolumes(client, subClients.join(","), date, channel, journey);
  const deliveredVolume = rows.find((r) => r.stage === "Delivered")?.volume ?? 0;
  const placement = placementSplit(
    deliveredVolume,
    hashSeed(`${client}|${subClients.join(",")}|${date}|${channel}|${journey}`),
  );
  const showPlacement = channel === "All Channels" || channel === "Email";
  const [expanded, setExpanded] = useState<string | null>(null);
  const activeParts = [
    client !== "All Clients" ? client : null,
    subClients.length > 0 ? subClients.join(", ") : null,
    channel !== "All Channels" ? channel : null,
    date !== "Today" ? date : null,
    journey !== "All Workflows" ? journey : null,
  ].filter(Boolean);

  return (
    <Panel
      title="Communication to Payment Performance"
      description="Conversion from outreach to completed payment, with address validity and inbox placement"
      className="mb-5"
      action={
        !isDefault ? (
          <button
            onClick={() => {
              setClient("All Clients");
              setSubClients([]);
              setDate("Today");
              setChannel("All Channels");
              setJourney("All Workflows");
            }}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Reset Filters
          </button>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Client"
          value={client}
          onChange={(v) => {
            setClient(v);
            setSubClients([]);
          }}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        {isSingleClientSelected(client) && (
          <FilterMultiSelect
            label="Sub-Client"
            allLabel="All Sub-Clients"
            selected={subClients}
            onChange={setSubClients}
            options={subClientNamesForClient(visibleClients, client)}
          />
        )}
        <FilterSelect
          label="Date"
          value={date}
          onChange={setDate}
          options={["Today", "Yesterday", "Last 7 Days", "This Month", "Custom Range"]}
        />
        <FilterSelect
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={["All Channels", "Email", "SMS"]}
        />
        <span
          className="flex cursor-not-allowed items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 opacity-60"
          title="Coming in a later phase"
        >
          <span className="text-[11px] font-medium text-muted-foreground">Channel</span>
          <span className="text-[13px] font-medium text-muted-foreground">WhatsApp · soon</span>
        </span>
        <FilterSelect
          label="Workflow"
          value={journey}
          onChange={setJourney}
          options={["All Workflows", ...journeys]}
        />
        {!isDefault && (
          <span className="text-xs text-muted-foreground">{activeParts.join(" · ")}</span>
        )}
      </div>

      {/* Grouped progression: Total Records and Delivered expand into their breakdowns. */}
      {(() => {
        const vol = (st: string) => rows.find((r) => r.stage === st)?.volume ?? 0;
        const valid = vol("Valid Addresses");
        const invalid = vol("Invalid Addresses");
        const total = valid + invalid;
        const main = [
          { key: "records", label: "Total Records", volume: total, sub: "records received" },
          ...rows
            .filter((r) => !["Valid Addresses", "Invalid Addresses", "Sent"].includes(r.stage))
            .map((r) => ({ key: r.stage, label: r.stage, volume: r.volume, sub: "" })),
        ];
        const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "0%");
        const breakdown =
          expanded === "records"
            ? [
                { label: "Valid Addresses", volume: valid, of: total, tone: "bg-primary" },
                { label: "Invalid Addresses", volume: invalid, of: total, tone: "bg-warning" },
                { label: "Sent", volume: vol("Sent"), of: valid, tone: "bg-navy" },
              ]
            : expanded === "Delivered"
              ? placement.map((p) => ({
                  label: p.label,
                  volume: p.volume,
                  of: deliveredVolume,
                  tone:
                    p.label === "Inbox"
                      ? "bg-teal"
                      : p.label === "Spam"
                        ? "bg-warning"
                        : "bg-primary",
                }))
              : null;
        return (
          <>
            <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
              {main.map((m, i) => {
                const expandable = m.key === "records" || (m.key === "Delivered" && showPlacement);
                const isOpen = expanded === m.key;
                const isPaid = i === main.length - 1;
                const prev = i > 0 ? main[i - 1]!.volume : 0;
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          "text-[11.5px] font-semibold",
                          isPaid ? "text-success" : "text-foreground",
                        )}
                      >
                        {m.label}
                      </span>
                      {expandable && (
                        <span className="text-[10.5px] text-muted-foreground">
                          {isOpen ? "▴" : "▾"}
                        </span>
                      )}
                    </div>
                    <p className="tabular mt-2 text-[19px] leading-none font-bold tracking-tight text-foreground">
                      {formatNumber(m.volume)}
                    </p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isPaid ? "bg-teal" : i === 0 ? "bg-navy" : "bg-primary",
                        )}
                        style={{ width: `${Math.max(5, (m.volume / (total || 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="tabular mt-2 text-[10.5px] text-muted-foreground">
                      {i === 0 ? m.sub : `${pct(m.volume, prev)} of previous`}
                    </p>
                  </>
                );
                const cls = cn(
                  "block bg-card px-4 py-3.5 text-left transition-colors hover:bg-surface",
                  isOpen && "bg-surface ring-1 ring-inset ring-primary/40",
                );
                return expandable ? (
                  <button
                    key={m.key}
                    type="button"
                    className={cls}
                    onClick={() => setExpanded(isOpen ? null : m.key)}
                  >
                    {body}
                  </button>
                ) : (
                  <Link
                    key={m.key}
                    to="/communications"
                    search={{
                      ...(client !== "All Clients" ? { client } : {}),
                      ...(channel !== "All Channels" ? { channel } : {}),
                      ...(stageStatus(m.label) ? { status: stageStatus(m.label) } : {}),
                    }}
                    className={cls}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
            {breakdown && (
              <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-3">
                <p className="mb-2.5 text-[11.5px] font-semibold text-foreground">
                  {expanded === "records" ? "Total Records breakdown" : "Delivered where (email)"}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {breakdown.map((b) => (
                    <div
                      key={b.label}
                      className="rounded-md border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11.5px] text-muted-foreground">{b.label}</span>
                        <span className="tabular text-[10.5px] text-muted-foreground">
                          {pct(b.volume, b.of)}
                        </span>
                      </div>
                      <p className="tabular mt-1 text-[16px] font-bold text-foreground">
                        {formatNumber(b.volume)}
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full", b.tone)}
                          style={{ width: `${b.of ? (b.volume / b.of) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {expanded === "Delivered" && (
                  <p className="mt-2 text-[10.5px] text-muted-foreground">
                    Placement is reported by the receiving mail provider.
                  </p>
                )}
              </div>
            )}
          </>
        );
      })()}
    </Panel>
  );
}

function Dashboard() {
  const { visibleClients, roleLabel } = useRole();
  const accounts = useVisibleAccounts();
  const activity = useVisibleActivity();

  const [date, setDate] = useState("Today");
  const [client, setClient] = useState("All Clients");
  const [subClients, setSubClients] = useState<string[]>([]);
  const [channel, setChannel] = useState("All Channels");

  const selectedPortfolios = subClients
    .map((name) => portfolioByName(name))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const scoped =
    client === "All Clients" ? visibleClients : visibleClients.filter((c) => c.name === client);

  const totalAccounts =
    selectedPortfolios.length > 0
      ? selectedPortfolios.reduce((sum, p) => sum + p.accounts, 0)
      : scoped.reduce((sum, c) => sum + c.accounts, 0);
  const totalCases =
    selectedPortfolios.length > 0
      ? selectedPortfolios.reduce((sum, p) => sum + p.cases, 0)
      : scoped.reduce((sum, c) => sum + c.activeCases, 0);
  const recovered = scoped.reduce((sum, c) => sum + c.recovered, 0);
  const { counts: reviewCounts } = useReviews();

  const scopedIds = scoped.map((c) => c.id);
  const scopedActivity = activity.filter((a) => scopedIds.includes(a.clientId));
  const paymentTotals = paymentOutcomeTotals(
    accounts.filter((a) => scopedIds.includes(a.clientId)),
  );

  const communications = useVisibleCommunications();
  const failedComms = communications.filter(
    (c) => c.status === "Failed" && scopedIds.includes(c.clientId),
  ).length;
  const integrationAttention = useMemo(
    () => integrationSummary(buildIntegrations(scoped)).attention,
    [scoped],
  );

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description={`${roleLabel} view · ${formatNumber(accounts.length)} sample accounts loaded`}
      />

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-2.5">
        <FilterSelect
          label="Date"
          value={date}
          onChange={setDate}
          options={["Today", "Last 7 days", "Last 30 days", "Quarter to date"]}
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={(v) => {
            setClient(v);
            setSubClients([]);
          }}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        {isSingleClientSelected(client) && (
          <FilterMultiSelect
            label="Sub-Client"
            allLabel="All Sub-Clients"
            selected={subClients}
            onChange={setSubClients}
            options={subClientNamesForClient(visibleClients, client)}
          />
        )}
        <FilterSelect
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={["All Channels", "Email", "SMS", "Voice", "Letter"]}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Active Clients" value={formatNumber(scoped.length)} />
        <KpiCard
          label="Accounts Under Collection"
          value={formatNumber(totalAccounts)}
          trend={{ direction: "up", text: "3.1% vs previous period" }}
        />
        <KpiCard
          label="Active Collection Cases"
          value={formatNumber(totalCases)}
          trend={{ direction: "down", text: "1.8% vs previous period" }}
        />
        <KpiCard
          label="Amount Recovered"
          value={formatCurrency(recovered, true)}
          tone="primary"
          trend={{ direction: "up", text: "8.4% vs previous period" }}
        />
        <Link to="/human-review" search={{ status: "Awaiting Review" }} className="block">
          <KpiCard
            label="Human Reviews Pending"
            value={formatNumber(reviewCounts.awaiting)}
            trend={{
              direction: "flat",
              text: `${reviewCounts.highPriority} high priority · open queue`,
            }}
          />
        </Link>
      </div>

      <Panel
        title="Attention Required"
        description="Open items that need an operations decision or follow-up"
        className="mb-5"
      >
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          <Link to="/human-review" search={{ status: "Awaiting Review" }}>
            <StatusPill tone={reviewCounts.awaiting ? "warning" : "neutral"}>
              Human Reviews Pending · {reviewCounts.awaiting}
            </StatusPill>
          </Link>
          <Link to="/communications" search={{ status: "Failed" }}>
            <StatusPill tone={failedComms ? "warning" : "neutral"}>
              Failed Communications · {failedComms}
            </StatusPill>
          </Link>
          <Link to="/accounts">
            <StatusPill tone={paymentTotals.failedPayments ? "warning" : "neutral"}>
              Failed Payments · {paymentTotals.failedPayments}
            </StatusPill>
          </Link>
          <Link to="/integrations" search={{ status: "Attention Required" }}>
            <StatusPill tone={integrationAttention ? "danger" : "neutral"}>
              Integration Issues · {integrationAttention}
            </StatusPill>
          </Link>
        </div>
        {!reviewCounts.awaiting &&
          !failedComms &&
          !paymentTotals.failedPayments &&
          !integrationAttention && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Nothing requires attention right now.
            </p>
          )}
      </Panel>

      <CommunicationFunnel />

      <EmailSubjectPerformance />

      <Panel
        title="Payment Outcomes"
        description="Outcomes received back from the customer payment experience"
        className="mb-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Amount Recovered" value={formatCurrency(paymentTotals.recovered, true)} />
          <KpiCard label="Accounts Paid in Full" value={formatNumber(paymentTotals.paidInFull)} />
          <KpiCard label="Active Payment Plans" value={formatNumber(paymentTotals.activePlans)} />
          <KpiCard label="Partial Payments" value={formatNumber(paymentTotals.partialPayments)} />
          <KpiCard label="Failed Payments" value={formatNumber(paymentTotals.failedPayments)} />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Clients Needing Attention" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {scoped.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="text-[13px] font-semibold text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                  <StatusPill tone={c.reviewsPending > 10 ? "danger" : "warning"}>
                    {c.reviewsPending} reviews
                  </StatusPill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.attention}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent Operational Activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {scopedActivity.map((item) => (
              <li key={item.text} className="flex items-start justify-between gap-3 px-4 py-3">
                <p className="text-[13px] text-foreground">{item.text}</p>
                <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                  {item.at}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

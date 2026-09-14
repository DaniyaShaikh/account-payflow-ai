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
  ALL_SUB_CLIENTS,
  portfolioByName,
  subClientOptions,
} from "@/lib/portfolio-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
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
  "Sent",
  "Delivered",
  "Opened / Read",
  "Clicked",
  "Payment Initiated",
  "Paid",
] as const;

const stageRates = [1, 0.956, 0.738, 0.416, 0.737, 0.802];

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
    const volume = Math.round(previous * (stageRates[i] ?? 1) * jitter);
    const rate = volume / previous;
    previous = volume;
    return { stage, volume, rate };
  });
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
      description="Conversion from outreach to completed payment"
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

      {/* Connected progression: navy → PayFlow blue → teal at the paid stage. */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        {rows.map((row, i) => {
          const top = rows[0]?.volume || 1;
          const width = Math.max(5, (row.volume / top) * 100);
          const isPaid = i === rows.length - 1;
          const barColor = isPaid
            ? "bg-teal"
            : i === 0
              ? "bg-navy"
              : "bg-primary";
          return (
            <Link
              key={row.stage}
              to="/communications"
              search={{
                ...(client !== "All Clients" ? { client } : {}),
                ...(channel !== "All Channels" ? { channel } : {}),
                ...(journey !== "All Workflows" ? { journey } : {}),
                ...(stageStatus(row.stage) ? { status: stageStatus(row.stage) } : {}),
              }}
              className="group relative block bg-card px-4 py-3.5 transition-colors hover:bg-surface"
              title={`View communications at "${row.stage}"`}
            >
              <div className="flex items-center gap-1.5">
                <span className="tabular text-[10px] font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={
                    isPaid
                      ? "text-[11.5px] font-semibold text-success"
                      : "text-[11.5px] font-semibold text-foreground"
                  }
                >
                  {row.stage}
                </span>
              </div>
              <p className="tabular mt-2 text-[19px] leading-none font-bold tracking-tight text-foreground">
                {formatNumber(row.volume)}
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${barColor} transition-all group-hover:opacity-80`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="tabular text-[11.5px] font-semibold text-primary">
                  {row.rate === null ? "Start" : `${(row.rate * 100).toFixed(1)}%`}
                </span>
                <span className="tabular text-[10.5px] text-muted-foreground">
                  {row.rate === null
                    ? "of funnel"
                    : `−${formatNumber(Math.round((rows[i - 1]?.volume ?? 0) - row.volume))}`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function Dashboard() {
  const { visibleClients, roleLabel } = useRole();
  const accounts = useVisibleAccounts();
  const activity = useVisibleActivity();

  const [date, setDate] = useState("Today");
  const [client, setClient] = useState("All Clients");
  const [subClient, setSubClient] = useState(ALL_SUB_CLIENTS);
  const [channel, setChannel] = useState("All Channels");

  const selectedPortfolio =
    subClient === ALL_SUB_CLIENTS ? undefined : portfolioByName(subClient);

  const scoped = selectedPortfolio
    ? visibleClients.filter((c) => c.id === selectedPortfolio.clientId)
    : client === "All Clients"
      ? visibleClients
      : visibleClients.filter((c) => c.name === client);

  const totalAccounts = selectedPortfolio
    ? selectedPortfolio.accounts
    : scoped.reduce((sum, c) => sum + c.accounts, 0);
  const totalCases = selectedPortfolio
    ? selectedPortfolio.cases
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
            setSubClient(ALL_SUB_CLIENTS);
          }}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Sub-Client"
          value={subClient}
          onChange={setSubClient}
          options={subClientOptions(visibleClients, client)}
        />
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
        {!reviewCounts.awaiting && !failedComms && !paymentTotals.failedPayments && !integrationAttention && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Nothing requires attention right now.
          </p>
        )}
      </Panel>

      <CommunicationFunnel />

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

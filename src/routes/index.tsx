import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  KpiCard,
  StatusPill,
  FilterSelect,
} from "@/components/payflow-ui";
import { useRole, useVisibleAccounts, useVisibleActivity } from "@/lib/role-context";
import { useReviews } from "@/lib/reviews-context";
import { formatCurrency, formatNumber, journeys } from "@/lib/payflow-data";

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

function funnelVolumes(client: string, date: string, channel: string, journey: string) {
  const seed = hashSeed(`${client}|${date}|${channel}|${journey}`);
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
  const [date, setDate] = useState("Today");
  const [channel, setChannel] = useState("All Channels");
  const [journey, setJourney] = useState("All Workflows");

  const isDefault =
    client === "All Clients" &&
    date === "Today" &&
    channel === "All Channels" &&
    journey === "All Workflows";

  const rows = funnelVolumes(client, date, channel, journey);
  const activeParts = [
    client !== "All Clients" ? client : null,
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
          onChange={setClient}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
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

      <div className="space-y-1">
        {rows.map((row, i) => {
          const top = rows[0]?.volume || 1;
          const width = Math.max(6, (row.volume / top) * 100);
          const dropOff = row.rate === null ? null : 1 - row.rate;
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
              className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
              title={`View communications at "${row.stage}"`}
            >

              <div className="flex items-baseline justify-between gap-4">
                <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <span className="tabular w-4 text-[11px] text-muted-foreground">{i + 1}</span>
                  {row.stage}
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="tabular text-[15px] font-semibold text-foreground">
                    {formatNumber(row.volume)}
                  </span>
                  <span className="tabular w-14 text-right text-[12px] font-medium text-muted-foreground">
                    {row.rate === null ? "—" : `${(row.rate * 100).toFixed(1)}%`}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all group-hover:bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="tabular w-24 text-right text-[11px] text-muted-foreground">
                  {dropOff === null
                    ? "start of funnel"
                    : `−${formatNumber(Math.round((rows[i - 1]?.volume ?? 0) - row.volume))} lost`}
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
  const [channel, setChannel] = useState("All Channels");

  const scoped =
    client === "All Clients"
      ? visibleClients
      : visibleClients.filter((c) => c.name === client);

  const totalAccounts = scoped.reduce((sum, c) => sum + c.accounts, 0);
  const totalCases = scoped.reduce((sum, c) => sum + c.activeCases, 0);
  const recovered = scoped.reduce((sum, c) => sum + c.recovered, 0);
  const { counts: reviewCounts } = useReviews();

  const scopedIds = scoped.map((c) => c.id);
  const scopedActivity = activity.filter((a) => scopedIds.includes(a.clientId));

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description={`${roleLabel} view · ${formatNumber(accounts.length)} sample accounts loaded`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterSelect
          label="Date"
          value={date}
          onChange={setDate}
          options={["Today", "Last 7 days", "Last 30 days", "Quarter to date"]}
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
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

      <CommunicationFunnel />

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

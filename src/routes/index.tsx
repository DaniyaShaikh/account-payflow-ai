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
import { formatCurrency, formatNumber } from "@/lib/payflow-data";

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
    const volume = Math.round(previous * stageRates[i] * jitter);
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
  const [journey, setJourney] = useState("All Journeys");

  const isDefault =
    client === "All Clients" &&
    date === "Today" &&
    channel === "All Channels" &&
    journey === "All Journeys";

  const rows = funnelVolumes(client, date, channel, journey);
  const activeParts = [
    client !== "All Clients" ? client : null,
    channel !== "All Channels" ? channel : null,
    date !== "Today" ? date : null,
    journey !== "All Journeys" ? journey : null,
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
              setJourney("All Journeys");
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
          label="Journey"
          value={journey}
          onChange={setJourney}
          options={["All Journeys", ...journeys]}
        />
        {!isDefault && (
          <span className="text-xs text-muted-foreground">{activeParts.join(" · ")}</span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map((row) => (
          <Link
            key={row.stage}
            to="/accounts"
            className="group rounded-md border border-border bg-surface px-3 py-4 transition-colors hover:border-primary/40 hover:bg-card"
            title={`View accounts at "${row.stage}" (drill-down coming soon)`}
          >
            <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
              {row.stage}
            </p>
            <p className="tabular mt-1 text-sm font-semibold text-foreground">
              {formatNumber(row.volume)}
            </p>
            <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
              {row.rate === null ? "—" : `${(row.rate * 100).toFixed(1)}%`}
            </p>
          </Link>
        ))}
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
  const reviews = scoped.reduce((sum, c) => sum + c.reviewsPending, 0);

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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Active Clients" value={formatNumber(scoped.length)} />
        <KpiCard label="Accounts Under Collection" value={formatNumber(totalAccounts)} />
        <KpiCard label="Active Collection Cases" value={formatNumber(totalCases)} />
        <KpiCard label="Amount Recovered" value={formatCurrency(recovered, true)} />
        <KpiCard label="Human Reviews Pending" value={formatNumber(reviews)} />
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

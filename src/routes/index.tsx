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
];

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

      <Panel
        title="Communication to Payment Performance"
        description="Funnel detail arrives in a later step"
        className="mb-5"
      >
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {funnelStages.map((stage) => (
            <div
              key={stage}
              className="rounded-md border border-dashed border-border-strong bg-surface px-3 py-4"
            >
              <p className="text-[11px] font-medium text-muted-foreground">{stage}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground/70">—</p>
            </div>
          ))}
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

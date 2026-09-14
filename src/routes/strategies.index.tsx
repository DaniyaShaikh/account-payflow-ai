import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Plus, GitBranch, Mail, MessageSquare } from "lucide-react";
import {
  PageHeader,
  StatusPill,
  SearchInput,
  FilterSelect,
  EmptyState,
  Btn,
} from "@/components/payflow-ui";
import { StrategyMiniMap } from "@/components/strategy-canvas";
import { useRole } from "@/lib/role-context";
import { useStrategies } from "@/lib/strategy-context";
import { clientName, formatNumber } from "@/lib/payflow-data";
import { strategyStatusTone, strategyStatuses, type Strategy } from "@/lib/strategy-data";

export const Route = createFileRoute("/strategies/")({
  head: () => ({
    meta: [
      { title: "Strategies / Workflows — PayFlow" },
      {
        name: "description",
        content:
          "AI-proposed and human-created collection strategies per client and sub-client portfolio, with visual flow previews and targeting details.",
      },
      { property: "og:title", content: "Strategies / Workflows — PayFlow" },
      {
        property: "og:description",
        content: "Proposed and approved collection strategies awaiting review or already running.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StrategiesPage,
});

function flowStats(strategy: Strategy) {
  const nodes = Object.values(strategy.nodes);
  return {
    steps: nodes.length,
    branches: nodes.filter((n) => n.kind === "Condition").length,
    emails: nodes.filter((n) => n.kind === "Communication" && n.config.channel === "Email").length,
    sms: nodes.filter((n) => n.kind === "Communication" && n.config.channel === "SMS").length,
  };
}

function StrategiesPage() {
  const { visibleClients, canSeeClient } = useRole();
  const { strategies, portfolioById, portfolios } = useStrategies();
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("All Clients");
  const [portfolio, setPortfolio] = useState("All Portfolios");
  const [status, setStatus] = useState("All Statuses");

  const visible = useMemo(
    () => strategies.filter((s) => canSeeClient(s.clientId)),
    [strategies, canSeeClient],
  );

  const portfolioOptions = [
    "All Portfolios",
    ...portfolios
      .filter((p) => canSeeClient(p.clientId) && (client === "All Clients" || clientName(p.clientId) === client))
      .map((p) => p.name),
  ];

  const rows = visible.filter((s) => {
    if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (client !== "All Clients" && clientName(s.clientId) !== client) return false;
    if (portfolio !== "All Portfolios" && portfolioById(s.portfolioId)?.name !== portfolio)
      return false;
    if (status !== "All Statuses" && s.status !== status) return false;
    return true;
  });

  const proposed = visible.filter((s) => s.status === "AI Proposed").length;

  return (
    <>
      <PageHeader
        title="Strategies / Workflows"
        description="PayFlow proposes a strategy from collection data and case context — and a person can create one too, with AI suggesting the steps. Every strategy is reviewed and approved before it runs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {proposed > 0 && (
              <StatusPill tone="ai" dot>
                {proposed} awaiting review
              </StatusPill>
            )}
            <Link to="/strategies/new">
              <Btn variant="primary">
                <Plus className="size-3.5" /> Create workflow
              </Btn>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search strategies"
          className="w-56"
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={(v) => {
            setClient(v);
            setPortfolio("All Portfolios");
          }}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Portfolio"
          value={portfolio}
          onChange={setPortfolio}
          options={portfolioOptions}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...strategyStatuses]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No strategies match these filters"
          description="Adjust the client, portfolio or status filter to see proposed and approved strategies."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => {
            const pf = portfolioById(s.portfolioId);
            const stats = flowStats(s);
            return (
              <Link
                key={s.id}
                to="/strategies/$strategyId"
                params={{ strategyId: s.id }}
                className="group rounded-xl border border-border/80 bg-card px-4 py-4 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] leading-snug font-semibold text-foreground group-hover:text-primary">
                    {s.name}
                  </p>
                  <StatusPill tone={strategyStatusTone(s.status)} dot>
                    {s.status}
                  </StatusPill>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {clientName(s.clientId)} · {pf?.name ?? "Portfolio"}
                </p>

                <div className="mt-3">
                  <StrategyMiniMap strategy={s} />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
                  <span className="tabular">{stats.steps} steps</span>
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="size-3" /> {stats.branches} branches
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" /> {stats.emails}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3" /> {stats.sms}
                  </span>
                </div>

                <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {s.summary}
                </p>

                {s.segment && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <StatusPill>Age {s.segment.ageBand}</StatusPill>
                    <StatusPill>{s.segment.postalRegion}</StatusPill>
                    <StatusPill>{s.segment.balanceBand}</StatusPill>
                    <StatusPill>{s.segment.delinquency}</StatusPill>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={s.origin === "AI Proposed" ? "ai" : "info"}>
                    {s.origin === "AI Proposed" ? (
                      <>
                        <Sparkles className="size-3" /> AI Proposed
                      </>
                    ) : (
                      "Human Modified"
                    )}
                  </StatusPill>
                  <StatusPill>{s.version}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11.5px] text-muted-foreground">
                  <span className="tabular">{formatNumber(s.coverage)} cases covered</span>
                  <span>Updated {s.lastUpdated}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

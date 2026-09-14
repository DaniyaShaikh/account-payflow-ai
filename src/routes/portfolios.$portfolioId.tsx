import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageHeader,
  Panel,
  KpiCard,
  StatusPill,
  EmptyState,
  Btn,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { useStrategies } from "@/lib/strategy-context";
import { clientName, formatCurrency, formatNumber } from "@/lib/payflow-data";
import { portfolioStatusTone } from "@/lib/portfolio-data";
import { strategyStatusTone } from "@/lib/strategy-data";

export const Route = createFileRoute("/portfolios/$portfolioId")({
  head: () => ({
    meta: [
      { title: "Sub-client portfolio — PayFlow" },
      {
        name: "description",
        content:
          "Sub-client portfolio workspace showing its account population, collection summary and the strategies applied to it within the parent client context.",
      },
      { property: "og:title", content: "Sub-client portfolio — PayFlow" },
      {
        property: "og:description",
        content: "Portfolio population, collection summary and applied collection strategies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioWorkspace,
});

function PortfolioWorkspace() {
  const { portfolioId } = Route.useParams();
  const { canSeeClient } = useRole();
  const { portfolioById, strategiesForPortfolio } = useStrategies();
  const portfolio = portfolioById(portfolioId);

  if (!portfolio || !canSeeClient(portfolio.clientId)) {
    return (
      <Panel title="No access to this portfolio">
        <p className="text-sm text-muted-foreground">
          This sub-client portfolio belongs to a client that is not assigned to your account.
        </p>
        <Link to="/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  const strategies = strategiesForPortfolio(portfolio.id);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Clients", to: "/clients" },
          { label: clientName(portfolio.clientId), to: "/clients/$clientId" },
          { label: portfolio.name },
        ]}
        title={portfolio.name}
        description={`${clientName(portfolio.clientId)} > ${portfolio.name} · ${portfolio.description}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={portfolioStatusTone(portfolio.status)} dot>
              {portfolio.status}
            </StatusPill>
            <StatusPill>{portfolio.code}</StatusPill>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customer Accounts" value={formatNumber(portfolio.accounts)} />
        <KpiCard label="Collection Cases" value={formatNumber(portfolio.cases)} />
        <KpiCard label="Outstanding" value={formatCurrency(portfolio.outstanding, true)} />
        <KpiCard
          label="Latest File Received"
          value={portfolio.lastFileReceived}
          hint="Population changes with every file"
        />
      </div>

      <Panel
        title="Strategies / Workflows for this portfolio"
        description="Portfolios may run different strategies from their parent client."
        action={
          <Link to="/strategies">
            <Btn>All strategies</Btn>
          </Link>
        }
      >
        {strategies.length === 0 ? (
          <EmptyState
            title="No strategy applied yet"
            description="PayFlow proposes a strategy once enough portfolio, payment and engagement context is available."
          />
        ) : (
          <ul className="space-y-2">
            {strategies.map((s) => (
              <li key={s.id}>
                <Link
                  to="/strategies/$strategyId"
                  params={{ strategyId: s.id }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {s.origin} · {s.version} · updated {s.lastUpdated}
                    </p>
                  </div>
                  <StatusPill tone={strategyStatusTone(s.status)} dot>
                    {s.status}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

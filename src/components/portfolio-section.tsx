import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  DataTable,
  Td,
  Tr,
  StatusPill,
  PrimaryCell,
  EmptyState,
  Btn,
  Field,
  TextInput,
  SelectInput,
  Panel,
} from "@/components/payflow-ui";
import { useStrategies } from "@/lib/strategy-context";
import { portfolioStatusTone, portfolioStatuses, type PortfolioStatus } from "@/lib/portfolio-data";
import { formatCurrency, formatNumber } from "@/lib/payflow-data";

export function PortfolioSection({
  clientId,
  clientName,
  canEdit,
}: {
  clientId: string;
  clientName: string;
  canEdit: boolean;
}) {
  const { portfoliosForClient, addPortfolio, strategyById } = useStrategies();
  const portfolios = portfoliosForClient(clientId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<PortfolioStatus>("Onboarding");

  const submit = () => {
    if (!name.trim()) return;
    addPortfolio({
      id: `${clientId}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      clientId,
      name: name.trim(),
      code: code.trim() || "Pending",
      status,
      description: "New sub-client portfolio added in this session.",
      accounts: 0,
      cases: 0,
      outstanding: 0,
      activeStrategyId: null,
      lastFileReceived: "No file received yet",
    });
    setName("");
    setCode("");
    setStatus("Onboarding");
    setAdding(false);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          A sub-client / portfolio is a distinct collection portfolio belonging to {clientName}. Each
          portfolio can hold a different account population and run different strategies. Portfolios
          are not customer accounts.
        </p>
        {canEdit && (
          <Btn variant="primary" onClick={() => setAdding((v) => !v)}>
            + Add Sub-Client / Portfolio
          </Btn>
        )}
      </div>

      {adding && (
        <Panel title="Add Sub-Client / Portfolio" className="mb-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Portfolio Name">
              <TextInput value={name} onChange={setName} placeholder={`${clientName} Loans`} />
            </Field>
            <Field label="Portfolio Code / Reference">
              <TextInput value={code} onChange={setCode} placeholder="PF-05" />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                options={portfolioStatuses}
                onChange={(v) => setStatus(v as PortfolioStatus)}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" onClick={submit} disabled={!name.trim()}>
              Add portfolio
            </Btn>
            <Btn onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Panel>
      )}

      {portfolios.length === 0 ? (
        <EmptyState
          title="No portfolios yet"
          description={`Add the first collection portfolio for ${clientName}.`}
        />
      ) : (
        <DataTable
          minWidth={900}
          head={[
            "Portfolio",
            "Reference",
            "Status",
            "Accounts / Cases",
            "Outstanding",
            "Active Strategy",
            "",
          ]}
        >
          {portfolios.map((p) => {
            const strategy = p.activeStrategyId ? strategyById(p.activeStrategyId) : undefined;
            return (
              <Tr key={p.id}>
                <Td>
                  <Link to="/portfolios/$portfolioId" params={{ portfolioId: p.id }}>
                    <PrimaryCell
                      title={
                        <span className="text-primary hover:underline">
                          {clientName} &gt; {p.name}
                        </span>
                      }
                      subtitle={p.description}
                    />
                  </Link>
                </Td>
                <Td className="tabular text-muted-foreground">{p.code}</Td>
                <Td>
                  <StatusPill tone={portfolioStatusTone(p.status)} dot>
                    {p.status}
                  </StatusPill>
                </Td>
                <Td className="tabular">
                  {formatNumber(p.accounts)} / {formatNumber(p.cases)}
                </Td>
                <Td className="tabular font-medium">{formatCurrency(p.outstanding, true)}</Td>
                <Td className="text-muted-foreground">
                  {strategy ? (
                    <Link
                      to="/strategies/$strategyId"
                      params={{ strategyId: strategy.id }}
                      className="text-primary hover:underline"
                    >
                      {strategy.name}
                    </Link>
                  ) : (
                    "None applied"
                  )}
                </Td>
                <Td>
                  <Link
                    to="/portfolios/$portfolioId"
                    params={{ portfolioId: p.id }}
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    View details
                  </Link>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}

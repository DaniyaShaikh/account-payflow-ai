import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  PageHeader,
  DataTable,
  Td,
  Tr,
  StatusPill,
  FilterSelect,
  SearchInput,
  TabBar,
  PrimaryCell,
  Btn,
  KpiCard,
} from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { useRules } from "@/lib/rules-context";
import {
  ruleActions,
  ruleCategories,
  ruleConditionSummary,
  statusToneForRule,
} from "@/lib/rules-data";

export const Route = createFileRoute("/rules/")({
  head: () => ({
    meta: [
      { title: "Rules & Governance — PayFlow Collections" },
      {
        name: "description",
        content:
          "Structured governance rules that define the operating boundaries and human review conditions used by PayFlow collection automation.",
      },
      { property: "og:title", content: "Rules & Governance — PayFlow Collections" },
      {
        property: "og:description",
        content: "System and client governance rules with structured conditions and actions.",
      },
    ],
  }),
  component: RulesPage,
});

const tabs = ["All Rules", "System Rules", "Client Rules"] as const;

function RulesPage() {
  const navigate = useNavigate();
  const { visibleClients, isAdmin } = useRole();
  const { visibleRules, canCreateRuleForClient } = useRules();

  const [tab, setTab] = useState<(typeof tabs)[number]>("All Rules");
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [action, setAction] = useState("All Actions");

  const canCreate =
    isAdmin || visibleClients.some((c) => canCreateRuleForClient(c.id));

  const clientLabel = (clientId: string | null) =>
    clientId === null
      ? "All Clients / Available Globally"
      : (visibleClients.find((c) => c.id === clientId)?.name ?? clientId);

  const rows = visibleRules.filter((rule) => {
    if (tab === "System Rules" && rule.type !== "System Rule") return false;
    if (tab === "Client Rules" && rule.type !== "Client Rule") return false;
    if (client !== "All Clients") {
      const target = visibleClients.find((c) => c.name === client);
      const matches =
        rule.clientId === target?.id || (target ? rule.appliedTo.includes(target.id) : false);
      if (!matches) return false;
    }
    if (category !== "All Categories" && rule.category !== category) return false;
    if (status !== "All Statuses" && rule.status !== status) return false;
    if (action !== "All Actions" && rule.action !== action) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${rule.name} ${rule.description} ${rule.category}`.toLowerCase().includes(q))
      return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Rules"
        description="Define the operating boundaries and review conditions used by PayFlow."
        actions={
          canCreate ? (
            <Btn variant="primary" onClick={() => navigate({ to: "/rules/new" })}>
              <Plus className="size-3.5" /> Create Rule
            </Btn>
          ) : (
            <StatusPill>Read-only access</StatusPill>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Rules"
          value={String(visibleRules.filter((r) => r.status === "Active").length)}
        />
        <KpiCard
          label="System Rules"
          value={String(visibleRules.filter((r) => r.type === "System Rule").length)}
        />
        <KpiCard
          label="Client Rules"
          value={String(visibleRules.filter((r) => r.type === "Client Rule").length)}
        />
        <KpiCard
          label="Triggers · last 7 days"
          value={String(visibleRules.reduce((sum, r) => sum + r.triggers7d, 0))}
        />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search rules"
          className="w-56"
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...visibleClients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={["All Categories", ...ruleCategories]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", "Active", "Draft", "Inactive"]}
        />
        <FilterSelect
          label="Action"
          value={action}
          onChange={setAction}
          options={["All Actions", ...ruleActions]}
        />
      </div>

      <DataTable
        minWidth={1040}
        head={[
          "Rule Name",
          "Type",
          "Client / Scope",
          "Category",
          "Condition Summary",
          "Result",
          "Status",
          "Last Updated",
        ]}
      >
        {rows.map((rule) => (
          <Tr key={rule.id} onClick={() => navigate({ to: "/rules/$ruleId", params: { ruleId: rule.id } })}>
            <Td>
              <Link
                to="/rules/$ruleId"
                params={{ ruleId: rule.id }}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <PrimaryCell title={rule.name} subtitle={rule.action} />
              </Link>
            </Td>
            <Td>
              <StatusPill tone={rule.type === "System Rule" ? "info" : "neutral"}>
                {rule.type}
              </StatusPill>
            </Td>
            <Td className="text-muted-foreground">{clientLabel(rule.clientId)}</Td>
            <Td className="text-muted-foreground">{rule.category}</Td>
            <Td className="max-w-[320px] truncate whitespace-nowrap text-foreground">
              {ruleConditionSummary(rule)}
            </Td>
            <Td className="text-muted-foreground">{rule.action}</Td>
            <Td>
              <StatusPill tone={statusToneForRule(rule.status)}>{rule.status}</StatusPill>
            </Td>
            <Td className="tabular text-muted-foreground">{rule.lastUpdated}</Td>
          </Tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <Td className="text-muted-foreground">No rules match these filters.</Td>
          </tr>
        )}
      </DataTable>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Rules are evaluated inside each client's AI operating mode. Under Autopilot routine actions
        proceed within configured boundaries; under Supervised AI a triggered review rule creates a
        human review item instead of executing the action.
      </p>
    </>
  );
}

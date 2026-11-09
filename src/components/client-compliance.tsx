import { Link } from "@tanstack/react-router";
import { Btn, StatusPill, ToggleRow } from "./payflow-ui";
import { JurisdictionFields, ComplianceNotice } from "./compliance-common";
import { useCompliance } from "@/lib/compliance-context";
import { applicableRules, complianceCategories, emptyJurisdiction } from "@/lib/compliance-data";
import type { ClientConfig } from "@/lib/payflow-data";

export function ClientCompliance({ config, patch, clientId = "", readOnly = false }: { config: ClientConfig; patch: (p: Partial<ClientConfig>) => void; clientId?: string; readOnly?: boolean }) {
  const { rules } = useCompliance();
  const jurisdiction = config.jurisdiction ?? emptyJurisdiction;
  const disabled = config.disabledComplianceRules ?? [];
  // Include disabled configurable records in the list so they can be enabled again.
  const applicable = applicableRules(rules, jurisdiction, clientId);
  return <div className="space-y-5">
    <ComplianceNotice />
    <JurisdictionFields value={jurisdiction} onChange={jurisdiction => patch({ jurisdiction })} disabled={readOnly} />
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Applicable Compliance Rules</h3>{clientId && <Link to="/compliance" search={{ clientId }}><Btn variant="ghost">View Effective Rules</Btn></Link>}</div>
    {!jurisdiction.country ? <p className="text-sm text-muted-foreground">Select a country to identify inherited rules.</p> : !applicable.length ? <p className="text-sm text-muted-foreground">No sample rules match this jurisdiction. Legal validation is still required.</p> : complianceCategories.map(category => {
      const items = applicable.filter(r => r.category === category); if (!items.length) return null;
      return <div key={category} className="border-t border-border pt-3"><h4 className="mb-2 text-xs font-semibold text-muted-foreground">{category}</h4>{items.map(r => <div key={r.id} className="border-b border-border/50 py-2 last:border-0 [&>div>div>div]:flex-wrap [&>div>div]:min-w-0">
        <ToggleRow label={r.name} description={[r.jurisdiction.country, r.jurisdiction.state, r.jurisdiction.region, r.jurisdiction.postal, r.channel].filter(Boolean).join(" · ")} badge={r.enforcement === "Mandatory" ? "Mandatory · locked" : r.enforcement} checked={r.enforcement === "Mandatory" || !disabled.includes(r.id)} disabled={readOnly || r.enforcement === "Mandatory"} onChange={enabled => patch({ disabledComplianceRules: enabled ? disabled.filter(id => id !== r.id) : [...disabled, r.id] })} />
        <div className="flex flex-wrap gap-2"><StatusPill>{r.clientId ? "Client Configuration" : "Inherited from Governance"}</StatusPill><StatusPill tone={r.status === "Active" ? "success" : "warning"}>{r.status}</StatusPill><Link to="/compliance/$ruleId" params={{ ruleId: r.id }} className="text-xs font-medium text-primary">View rule</Link></div>
      </div>)}</div>;
    })}
    {!readOnly && clientId && <Link to="/compliance/new" search={{ clientId }}><Btn>Add Client-Specific Rule</Btn></Link>}
    <p className="text-xs text-muted-foreground">Client-specific restrictions add to inherited protections. Mandatory rules cannot be disabled or weakened.</p>
  </div>;
}
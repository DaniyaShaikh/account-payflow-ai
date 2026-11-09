import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, StatusPill } from "./payflow-ui";
import { JurisdictionFields, ComplianceNotice } from "./compliance-common";
import { useCompliance } from "@/lib/compliance-context";
import { applicableRules, complianceCategories, emptyJurisdiction, newComplianceRule } from "@/lib/compliance-data";
import { ComplianceEditor } from "./compliance-editor";
import type { ClientConfig } from "@/lib/payflow-data";

export function ClientCompliance({ config, patch, clientId = "", readOnly = false }: { config: ClientConfig; patch: (p: Partial<ClientConfig>) => void; clientId?: string; readOnly?: boolean }) {
  const { rules } = useCompliance();
  const [creating, setCreating] = useState(false);
  const [editLoc, setEditLoc] = useState(false);
  const jurisdiction = config.jurisdiction ?? emptyJurisdiction;
  const disabled = config.disabledComplianceRules ?? [];
  // Include disabled configurable records in the list so they can be enabled again.
  const applicable = applicableRules(rules, jurisdiction, clientId);
  return <div className="space-y-5">
    <ComplianceNotice />
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"><div className="flex flex-wrap gap-x-4 gap-y-1"><span className="text-xs font-semibold text-muted-foreground">Loaded location</span>{([["Country", jurisdiction.country], ["State/Province", jurisdiction.state], ["Region", jurisdiction.region], ["Postal", jurisdiction.postal], ["Time zone", jurisdiction.timezone]] as const).map(([k, v]) => <span key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v || "—"}</span></span>)}</div>{!readOnly && <button type="button" onClick={() => setEditLoc(!editLoc)} className="text-xs font-medium text-primary">{editLoc ? "Done" : "Change"}</button>}</div>
    {editLoc && !readOnly && <JurisdictionFields value={jurisdiction} onChange={jurisdiction => patch({ jurisdiction })} />}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Compliance Rules <span className="text-muted-foreground">· {applicable.filter(r => r.enforcement === "Mandatory" || !disabled.includes(r.id)).length} selected</span></h3><div className="flex flex-wrap gap-2">{clientId && <Link to="/compliance" search={{ clientId }}><Btn variant="ghost">View Effective Rules</Btn></Link>}{!readOnly && <Btn onClick={() => setCreating(!creating)}>{creating ? "Cancel new rule" : "+ Add Compliance Rule"}</Btn>}</div></div>
    {creating && <div className="border-y border-border py-5"><ComplianceEditor initial={{ ...newComplianceRule(), clientId: clientId || null, jurisdiction: { ...jurisdiction } }} onSaved={() => setCreating(false)} /></div>}
    {!jurisdiction.country ? <p className="text-sm text-muted-foreground">Select a country to identify inherited rules.</p> : !applicable.length ? <p className="text-sm text-muted-foreground">No sample rules match this jurisdiction. Legal validation is still required.</p> : complianceCategories.map(category => {
      const items = applicable.filter(r => r.category === category); if (!items.length) return null;
      return <div key={category} className="border-t border-border pt-3"><h4 className="mb-2 text-xs font-semibold text-muted-foreground">{category}</h4>{items.map(r => <div key={r.id} className="border-b border-border/50 py-2 last:border-0 [&>div>div>div]:flex-wrap [&>div>div]:min-w-0">
        <label className="flex items-start gap-3 py-2"><input type="checkbox" aria-label={`Select ${r.name}`} checked={r.enforcement === "Mandatory" || !disabled.includes(r.id)} disabled={readOnly || r.enforcement === "Mandatory"} onChange={e => patch({ disabledComplianceRules: e.target.checked ? disabled.filter(id => id !== r.id) : [...disabled, r.id] })} className="mt-1 size-4 shrink-0 accent-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{r.name}</span><StatusPill>{r.enforcement === "Mandatory" ? "Mandatory · locked" : r.enforcement}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">{[r.jurisdiction.country, r.jurisdiction.state, r.jurisdiction.region, r.jurisdiction.postal, r.channel].filter(Boolean).join(" · ")}</p></div></label>
        <div className="flex flex-wrap gap-2"><StatusPill>{r.clientId ? "Client Configuration" : "Inherited from Governance"}</StatusPill><StatusPill tone={r.status === "Active" ? "success" : "warning"}>{r.status}</StatusPill><Link to="/compliance/$ruleId" params={{ ruleId: r.id }} className="text-xs font-medium text-primary">View rule</Link></div>
      </div>)}</div>;
    })}
    <p className="text-xs text-muted-foreground">Client-specific restrictions add to inherited protections. Recommended rules are selected by default and can be deselected. Mandatory legal protections stay locked.</p>
  </div>;
}
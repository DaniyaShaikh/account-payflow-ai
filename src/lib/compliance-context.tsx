import { useContext, useMemo, useState, type ReactNode } from "react";
import { createStableContext } from "./stable-context";
import { useRole } from "./role-context";
import { useRules } from "./rules-context";
import { operationalRuleSelected } from "./client-rule-selection";
import { complianceSeed, jurisdictionLibraryRules, holidaySeed, evaluateRules, type ComplianceRule, type ComplianceAudit, type Holiday, type EvaluationInput, type EvaluationResult } from "./compliance-data";

interface ComplianceValue {
  rules: ComplianceRule[]; audit: ComplianceAudit[]; holidays: Holiday[];
  saveRule: (rule: ComplianceRule, reason: string) => string | null;
  duplicateRule: (rule: ComplianceRule) => string | null;
  saveHoliday: (holiday: Holiday, remove?: boolean) => void;
  evaluate: (input: EvaluationInput, record?: boolean) => EvaluationResult;
}
const ComplianceContext = createStableContext<ComplianceValue | null>("compliance", null);
export function ComplianceProvider({ children }: { children: ReactNode }) {
  const { isAdmin, userName, allClients, visibleClientIds } = useRole();
  const { allRules } = useRules();
  const [rules, setRules] = useState(() => [...complianceSeed, ...jurisdictionLibraryRules]);
  const [holidays, setHolidays] = useState(holidaySeed);
  const [audit, setAudit] = useState<ComplianceAudit[]>([{ id: "AUD-SEED", ruleId: "CMP-001", ruleName: complianceSeed[0]?.name ?? "Sample rule", event: "Sample rules created", by: "PayFlow sample catalogue", at: "2026-11-01T12:00:00Z", reason: "Illustrative configurations requiring legal validation", before: null, after: complianceSeed, approval: "Sample configuration" }]);
  const value = useMemo<ComplianceValue>(() => {
    const record = (entry: Omit<ComplianceAudit, "id" | "by" | "at">) => setAudit(prev => [{ ...entry, id: crypto.randomUUID(), by: userName, at: new Date().toISOString() }, ...prev]);
    const saveRule = (rule: ComplianceRule, reason: string) => {
      if (!isAdmin || !reason.trim()) return null;
      const before = rules.find(r => r.id === rule.id);
      // Client rules cannot replace inherited records. Evaluation always retains every mandatory rule.
      if (before && before.clientId !== rule.clientId) return null;
      const id = before?.id ?? `CMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const after = { ...rule, id, version: (before?.version ?? 0) + 1 };
      setRules(prev => before ? prev.map(r => r.id === id ? after : r) : [after, ...prev]);
      record({ ruleId: id, ruleName: rule.name, event: before ? before.status !== rule.status ? `Status: ${before.status} → ${rule.status}` : "Rule modified" : "Rule created", reason, before: before ?? null, after, approval: rule.status === "Pending Approval" ? "Pending Approval" : rule.status === "Active" ? "Approved by Operations Admin" : "Not requested" });
      return id;
    };
    return {
      rules: isAdmin ? rules : rules.filter(r => !r.clientId || visibleClientIds.includes(r.clientId)),
      audit: isAdmin ? audit : [], holidays, saveRule,
      duplicateRule: r => saveRule({ ...r, id: "", name: `${r.name} (copy)`, status: "Draft", version: 1 }, "Duplicated as a draft"),
      saveHoliday: (holiday, remove) => {
        if (!isAdmin) return;
        const before = holidays.find(h => h.id === holiday.id);
        setHolidays(prev => remove ? prev.filter(h => h.id !== holiday.id) : before ? prev.map(h => h.id === holiday.id ? holiday : h) : [...prev, holiday]);
        record({ ruleId: holiday.id, ruleName: holiday.name, event: remove ? "Holiday removed" : before ? "Holiday modified" : "Holiday created", reason: holiday.source, before: before ?? null, after: remove ? null : holiday, approval: "Calendar maintained by Operations Admin" });
      },
      evaluate: (input, shouldRecord = false) => {
        if (!visibleClientIds.includes(input.clientId)) return { result: "Review Required", matches: [{ id: "ACCESS", name: "Client access", reason: "Client not assigned", action: "Require Approval", layer: "Access" }], evaluated: [] };
        const client = allClients.find(c => c.id === input.clientId);
        const selectedRules = client ? allRules.filter(r => (r.type === "System Rule" || r.clientId === input.clientId) && operationalRuleSelected(r, input.clientId, client.config)).map(r => r.type === "System Rule" ? { ...r, appliedTo: [...r.appliedTo, input.clientId] } : r) : allRules;
        const result = evaluateRules(rules, selectedRules, holidays, input, client?.config.disabledComplianceRules ?? []);
        if (shouldRecord) record({ ruleId: "EVALUATION", ruleName: `Communication · ${client?.name ?? input.clientId}`, event: `Execution check: ${result.result}`, reason: result.matches.map(m => `${m.id}: ${m.reason}`).join("; ") || "All applicable checks passed", before: null, after: { clientId: input.clientId, channel: input.channel, at: input.at, jurisdiction: input.jurisdiction, ...result }, approval: result.result });
        return result;
      },
    };
  }, [rules, holidays, audit, isAdmin, userName, allClients, allRules, visibleClientIds]);
  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
}
export function useCompliance() { const ctx = useContext(ComplianceContext); if (!ctx) throw new Error("ComplianceProvider is required"); return ctx; }
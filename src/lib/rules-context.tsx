import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { rulesSeed, slugify, type Rule } from "./rules-data";
import { useRole } from "./role-context";

interface RulesContextValue {
  allRules: Rule[];
  /** Rules the current role is allowed to see. */
  visibleRules: Rule[];
  rulesForClient: (clientId: string) => { systemRules: Rule[]; clientRules: Rule[] };
  addRule: (rule: Omit<Rule, "id">) => Rule;
  updateRule: (id: string, patch: Partial<Rule>) => void;
  canEditRule: (rule: Rule) => boolean;
  canCreateRuleForClient: (clientId: string | null) => boolean;
}

const RulesContext = createContext<RulesContextValue | null>(null);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [allRules, setAllRules] = useState<Rule[]>(rulesSeed);
  const { isAdmin, visibleClientIds, can } = useRole();

  const value = useMemo<RulesContextValue>(() => {
    const supervisorCanEdit = (clientId: string | null) =>
      clientId !== null &&
      visibleClientIds.includes(clientId) &&
      can("Create / Edit Client Rules", clientId);

    const visibleRules = isAdmin
      ? allRules
      : allRules.filter((r) => r.clientId === null || visibleClientIds.includes(r.clientId));

    return {
      allRules,
      visibleRules,
      rulesForClient: (clientId: string) => ({
        systemRules: allRules.filter(
          (r) => r.type === "System Rule" && r.appliedTo.includes(clientId),
        ),
        clientRules: allRules.filter((r) => r.type === "Client Rule" && r.clientId === clientId),
      }),
      addRule: (rule) => {
        const base = slugify(rule.name);
        const id = allRules.some((r) => r.id === base) ? `${base}-${allRules.length + 1}` : base;
        const created: Rule = { ...rule, id };
        setAllRules((prev) => [created, ...prev]);
        return created;
      },
      updateRule: (id, patch) =>
        setAllRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      canEditRule: (rule) => (isAdmin ? true : supervisorCanEdit(rule.clientId)),
      canCreateRuleForClient: (clientId) => (isAdmin ? true : supervisorCanEdit(clientId)),
    };
  }, [allRules, isAdmin, visibleClientIds, can]);

  return <RulesContext.Provider value={value}>{children}</RulesContext.Provider>;
}

export function useRules() {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error("useRules must be used inside RulesProvider");
  return ctx;
}

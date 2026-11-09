import type { ClientConfig } from "./payflow-data";
import { makeConfig } from "./payflow-data";
import type { Rule } from "./rules-data";
import { emptyJurisdiction } from "./compliance-data";

export function operationalRuleSelected(rule: Rule, clientId: string, config: ClientConfig) {
  return config.selectedOperationalRules !== undefined
    ? config.selectedOperationalRules.includes(rule.id)
    : rule.appliedTo.includes(clientId) || rule.clientId === clientId;
}

export function importClientConfig(existing?: ClientConfig, code = ""): ClientConfig {
  // Never inherit another client's branding, jurisdiction or rule exclusions.
  return existing ? structuredClone(existing) : makeConfig({ code, jurisdiction: { ...emptyJurisdiction } });
}
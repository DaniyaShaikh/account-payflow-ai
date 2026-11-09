import { describe, it, expect } from "vitest";
import { makeConfig } from "./payflow-data";
import { rulesSeed } from "./rules-data";
import { operationalRuleSelected, importClientConfig } from "./client-rule-selection";
import { applicableRules, complianceSeed, emptyJurisdiction } from "./compliance-data";

describe("client rule choices", () => {
  it("preselects country and region matching compliance rules", () => {
    const matches = applicableRules(complianceSeed, { ...emptyJurisdiction, country: "Canada", state: "Ontario" }, "new");
    expect(matches.map(r => r.id)).toContain("CMP-003");
    expect(matches.map(r => r.id)).toContain("CMP-001");
    expect(matches.map(r => r.id)).not.toContain("CMP-004");
  });
  it("keeps deselected configurable rules excluded while mandatory rules stay selected", () => {
    const matches = applicableRules(complianceSeed, { ...emptyJurisdiction, country: "United States" }, "new", ["CMP-007", "CMP-005"]);
    expect(matches.map(r => r.id)).not.toContain("CMP-007");
    expect(matches.map(r => r.id)).toContain("CMP-005");
  });
  it("preserves existing operational choices including unchecked rules", () => {
    const r = rulesSeed[0]; if (!r) throw new Error("Missing seed");
    expect(operationalRuleSelected(r, "paypal", makeConfig())).toBe(true);
    expect(operationalRuleSelected(r, "paypal", makeConfig({ selectedOperationalRules: [] }))).toBe(false);
    expect(operationalRuleSelected(r, "paypal", makeConfig({ selectedOperationalRules: [r.id] }))).toBe(true);
  });
  it("preserves existing client configuration on reimport", () => {
    const config = makeConfig({ disabledComplianceRules: ["CMP-007"], selectedOperationalRules: ["rule-1"] });
    expect(importClientConfig(config)).toEqual(config);
    expect(importClientConfig(config)).not.toBe(config);
  });
  it("does not copy another client's rule choices into a newly imported client", () => {
    const config = importClientConfig(undefined, "CL-1090");
    expect(config.code).toBe("CL-1090");
    expect(config.disabledComplianceRules).toBeUndefined();
    expect(config.selectedOperationalRules).toBeUndefined();
    expect(config.jurisdiction).toBeUndefined();
  });
});
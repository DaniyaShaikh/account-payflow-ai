import { describe, expect, it } from "vitest";
import { customerCombinationSegments, mockWorkflowCustomers } from "./communication-customer-cohorts";
import { defaultCommunicationSegments, demonstrateVariantMatch } from "./communication-segments";
import { generateCustomerVersions, initialCommunicationVersions, validateCommunicationVersion, communicationReviewIssues, seedCommunicationVersions } from "./communication-versions";
import { seedStrategies } from "./strategy-data";

const strategy = seedStrategies.find((s) => s.id === "pp-third-party-proposal");
if (!strategy) throw new Error("Missing workflow fixture");
const node = Object.values(strategy.nodes).find((n) => n.kind === "Communication");
if (!node) throw new Error("Missing reminder fixture");
const customers = mockWorkflowCustomers(strategy);

describe("customer-based combined versions", () => {
  it("creates only the three observed combinations, deduplicating recipients and skipping unknown ages", () => {
    expect(customerCombinationSegments(defaultCommunicationSegments(), customers).map((r) => r.name)).toEqual(["18–24 (Alberta, French)", "18–24 (Alberta, English)", "18–24 (Bahrain)"]);
  });
  it("matches age, location and language together with a default fallback", () => {
    const result = generateCustomerVersions(initialCommunicationVersions(node), defaultCommunicationSegments(), customers);
    const ids = result.communicationSegments.rules.filter((r) => r.combined).map((r) => r.id);
    expect(demonstrateVariantMatch(result.communicationSegments, ids, { age: 22, country: "Canada", region: "Alberta", language: "French" })).toBe(ids[0]);
    expect(demonstrateVariantMatch(result.communicationSegments, ids, { age: 22, country: "Canada", region: "Ontario", language: "French" })).toBe("default");
    expect(demonstrateVariantMatch(result.communicationSegments, ids, { country: "Bahrain" })).toBe("default");
  });
  it("preserves reviewed edits during repeated generation and leaves new versions pending", () => {
    const original = initialCommunicationVersions(node, true);
    const first = generateCustomerVersions(original, defaultCommunicationSegments(), customers);
    const combined = first.communicationVersions.find((v) => v.id.startsWith("cohort-"));
    if (!combined) throw new Error("Missing combined version");
    combined.subject = "Saved custom subject";
    combined.status = "Reviewed";
    const second = generateCustomerVersions(first.communicationVersions, first.communicationSegments, customers);
    expect(second.communicationVersions.find((v) => v.id === combined.id)).toEqual(combined);
    expect(first.communicationVersions[0]).toBe(original[0]);
    expect(first.communicationVersions.filter((v) => v.id.startsWith("cohort-")).map((v) => validateCommunicationVersion(v))).toEqual([[], [], []]);
    expect(first.communicationVersions.filter((v) => v.id.startsWith("cohort-") && v.status === "Pending Review")).toHaveLength(2);
  });
  it("blocks approval on new combined versions even if all legacy versions are reviewed", () => {
    const seeded = seedCommunicationVersions(strategy);
    for (const step of Object.values(seeded.nodes)) for (const v of step.config.communicationVersions ?? []) if (!v.id.startsWith("cohort-")) v.status = "Reviewed";
    expect(communicationReviewIssues(seeded).some((issue) => issue.includes("Alberta, French"))).toBe(true);
  });
  it("merges language combinations when language preference is disabled", () => {
    const config = defaultCommunicationSegments();
    config.languageEnabled = false;
    expect(customerCombinationSegments(config, customers).map((r) => r.name)).toEqual(["18–24 (Alberta)", "18–24 (Bahrain)"]);
  });
});
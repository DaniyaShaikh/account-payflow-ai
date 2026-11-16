import { describe, expect, it } from "vitest";
import { defaultCommunicationSegments, demonstrateVariantMatch, segmentIsActive, validateCommunicationSegments } from "./communication-segments";
import { applyCommunicationSegments, communicationReviewIssues, initialCommunicationVersions, mockRegenerateVersion, seedCommunicationVersions } from "./communication-versions";
import { seedStrategies } from "./strategy-data";

describe("review-only demographic segments", () => {
  it("provides all six age groups without generating combinations", () => {
    const config = defaultCommunicationSegments();
    expect(config.rules.filter((r) => r.kind === "Age group").map((r) => [r.minAge,r.maxAge])).toEqual([[18,24],[25,34],[35,44],[45,54],[55,64],[65,null]]);
    expect(config.rules.filter((r) => r.kind === "Country").map((r) => r.country)).toEqual(["Canada","United States","Bahrain"]);
    expect(validateCommunicationSegments(config)).toEqual([]);
  });
  it("rejects overlapping inclusive age ranges", () => {
    const config = defaultCommunicationSegments();
    config.rules = config.rules.map((r) => r.id === "age-25-34" ? { ...r, minAge: 24 } : r);
    expect(validateCommunicationSegments(config).some((e) => e.includes("overlaps"))).toBe(true);
  });
  it("rejects reversed, fractional and underage ranges", () => {
    for (const [minAge,maxAge] of [[35,24],[18.5,24],[17,24]]) {
      const config = defaultCommunicationSegments();
      config.rules = config.rules.map((r) => r.id === "age-18-24" ? { ...r, minAge: minAge ?? 0, maxAge: maxAge ?? 0 } : r);
      expect(validateCommunicationSegments(config).length).toBeGreaterThan(0);
    }
  });
  it("rejects a region in the wrong country", () => {
    const config = defaultCommunicationSegments();
    config.rules = config.rules.map((r) => r.id === "region-ontario" ? { ...r, country: "United States" } : r);
    expect(validateCommunicationSegments(config).length).toBeGreaterThan(0);
  });
  it("demonstrates configured priority among existing matching variants", () => {
    const config = defaultCommunicationSegments();
    const ids = ["default","age-18-24","country-canada","region-ontario"];
    const customer = { age: 22, country: "Canada", region: "Ontario" };
    expect(demonstrateVariantMatch(config,ids,customer)).toBe("region-ontario");
    config.rules.sort((a,b) => Number(b.id === "age-18-24") - Number(a.id === "age-18-24"));
    expect(demonstrateVariantMatch(config,ids,customer)).toBe("age-18-24");
  });
  it("skips disabled criteria and unavailable variants and retains default fallback", () => {
    const config = defaultCommunicationSegments();
    config.enabled["Age group"] = false;
    expect(segmentIsActive(config,"age-18-24")).toBe(false);
    expect(segmentIsActive(config,"default")).toBe(true);
    expect(demonstrateVariantMatch(config,["default","age-18-24"],{age:22})).toBe("default");
  });
  it("resets changed or re-enabled segment versions without changing content", () => {
    const previous = defaultCommunicationSegments();
    const next = defaultCommunicationSegments();
    next.rules = next.rules.map((r) => r.id === "age-18-24" ? { ...r, maxAge: 23 } : r);
    const seed = seedStrategies[0];
    const node = seed && Object.values(seed.nodes).find((n) => n.kind === "Communication");
    if (!node) throw new Error("Missing fixture");
    const versions = initialCommunicationVersions({...node,origin:"AI Proposed"},true);
    const result = applyCommunicationSegments(versions,previous,next);
    expect(result.find((v) => v.id === "age-18-24")?.status).toBe("Pending Review");
    expect(result[0]).toBe(versions[0]);
    expect(result[1]?.emailBody).toBe(versions[1]?.emailBody);
    previous.enabled["Age group"] = false;
    expect(applyCommunicationSegments(versions,previous,defaultCommunicationSegments())[1]?.status).toBe("Pending Review");
  });
  it("gates approval for active country versions, not disabled ones", () => {
    const seed = seedStrategies[0];
    if (!seed) throw new Error("Missing fixture");
    const strategy = seedCommunicationVersions({...seed,status:"Active"});
    const node = Object.values(strategy.nodes).find((n) => n.kind === "Communication");
    const base = node?.config.communicationVersions?.[0];
    if (!node || !base) throw new Error("Missing default");
    node.config.communicationVersions?.push(mockRegenerateVersion({...base,id:"country-canada"}));
    expect(communicationReviewIssues(strategy).some((e) => e.includes("Canada"))).toBe(true);
    node.config.communicationSegments = defaultCommunicationSegments();
    node.config.communicationSegments.enabled.Country = false;
    expect(communicationReviewIssues(strategy)).toEqual([]);
  });
});
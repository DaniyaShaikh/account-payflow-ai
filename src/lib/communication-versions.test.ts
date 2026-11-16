import { describe, expect, it } from "vitest";
import { seedStrategies } from "./strategy-data";
import { communicationAgeGroups, communicationReviewIssues, initialCommunicationVersions, mockRegenerateVersion, removeCommunicationVersion, replaceCommunicationVersion, saveCommunicationVersion, seedCommunicationVersions, selectCommunicationVersion, validateCommunicationVersion } from "./communication-versions";

const node = Object.values(seedStrategies[0].nodes).find((n) => n.kind === "Communication");
if (!node) throw new Error("Fixture requires a communication step");
const fixture = initialCommunicationVersions({ ...node, origin: "AI Proposed" });

describe("communication version review rules", () => {
  it("configures all six requested bands outside UI", () => {
    expect(communicationAgeGroups.map((g) => [g.min, g.max])).toEqual([[18,24],[25,34],[35,44],[45,54],[55,64],[65,Infinity]]);
    expect(fixture.map((v) => v.id)).toEqual(["default", "age-18-24", "age-65-plus"]);
  });
  it("keeps Main / Default when removal is requested", () => {
    expect(removeCommunicationVersion(fixture, "default")).toEqual(fixture);
  });
  it("removes only the selected optional version", () => {
    expect(removeCommunicationVersion(fixture, "age-18-24")).toEqual([fixture[0], fixture[2]]);
  });
  it("saves one version without touching other versions", () => {
    const replacement = saveCommunicationVersion(fixture[1], { ...fixture[1], subject: "Your account summary", status: "Modified" });
    const next = replaceCommunicationVersion(fixture, replacement);
    expect(next[0]).toBe(fixture[0]); expect(next[2]).toBe(fixture[2]);
    expect(next[1].subject).toBe("Your account summary");
  });
  it("resets reviewed edits to Pending Review", () => {
    const previous = { ...fixture[0], status: "Reviewed" as const };
    expect(saveCommunicationVersion(previous, { ...previous, subject: "Updated summary" }).status).toBe("Pending Review");
  });
  it("regenerates only one version and resets reviewed status", () => {
    const regenerated = mockRegenerateVersion({ ...fixture[1], status: "Reviewed" });
    const next = replaceCommunicationVersion(fixture, regenerated);
    expect(next[0]).toBe(fixture[0]); expect(next[2]).toBe(fixture[2]);
    expect(regenerated.status).toBe("Pending Review");
    expect(regenerated.emailBody.endsWith(fixture[1].protectedEmail)).toBe(true);
    expect(regenerated.smsContent.endsWith(fixture[1].protectedSms)).toBe(true);
  });
  it("uses default for unknown age and unreviewed or missing matches", () => {
    expect(selectCommunicationVersion(fixture)).toBe(fixture[0]);
    expect(selectCommunicationVersion(fixture, 20)).toBe(fixture[0]);
    expect(selectCommunicationVersion(fixture, 40)).toBe(fixture[0]);
    const reviewed = { ...fixture[1], status: "Reviewed" as const };
    expect(selectCommunicationVersion(replaceCommunicationVersion(fixture, reviewed), 20)).toBe(reviewed);
  });
  it("rejects missing content and changes to protected copy", () => {
    expect(validateCommunicationVersion({ ...fixture[0], subject: "" }).length).toBeGreaterThan(0);
    expect(validateCommunicationVersion({ ...fixture[1], emailBody: "Different payment terms" }).length).toBeGreaterThan(0);
    expect(validateCommunicationVersion({ ...fixture[1], subject: "Urgent: must pay immediately" }).length).toBeGreaterThan(0);
  });
  it("blocks approval until every active version is reviewed and saved", () => {
    const strategy = seedCommunicationVersions({ ...seedStrategies[0], status: "Under Review" });
    expect(communicationReviewIssues(strategy).length).toBeGreaterThan(0);
    const reviewed = { ...strategy, nodes: Object.fromEntries(Object.entries(strategy.nodes).map(([id,n]) => [id, { ...n, config: { ...n.config, communicationVersions: n.config.communicationVersions?.map((v) => ({ ...v, status: "Reviewed" as const })) } }])) };
    expect(communicationReviewIssues(reviewed)).toEqual([]);
    const communication = Object.values(reviewed.nodes).find((n) => n.kind === "Communication");
    if (!communication?.config.communicationVersions) throw new Error("Missing seeded versions");
    communication.config.communicationVersions[0].hasUnsavedChanges = true;
    expect(communicationReviewIssues(reviewed).length).toBeGreaterThan(0);
  });
});
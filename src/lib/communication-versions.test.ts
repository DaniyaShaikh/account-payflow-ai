import { describe, expect, it } from "vitest";
import { seedStrategies, type Strategy } from "./strategy-data";
import { communicationAgeGroups, communicationReviewIssues, finalizeCommunicationVersions, initialCommunicationVersions, mockRegenerateVersion, removeCommunicationVersion, replaceCommunicationVersion, saveCommunicationVersion, seedCommunicationVersions, selectCommunicationVersion, validateCommunicationVersion } from "./communication-versions";

const seed = seedStrategies[0];
if (!seed) throw new Error("Missing strategy fixture");
const node = Object.values(seed.nodes).find((n) => n.kind === "Communication");
if (!node) throw new Error("Fixture requires a communication step");
const fixture = initialCommunicationVersions({ ...node, origin: "AI Proposed" });
function at(index: number) {
  const value = fixture[index];
  if (!value) throw new Error("Missing version fixture");
  return value;
}

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
    const replacement = saveCommunicationVersion(at(1), { ...at(1), subject: "Your account summary", status: "Modified" });
    const next = replaceCommunicationVersion(fixture, replacement);
    expect(next[0]).toBe(fixture[0]); expect(next[2]).toBe(fixture[2]);
    expect(next[1]?.subject).toBe("Your account summary");
  });
  it("saves edits as drafts until overall workflow approval", () => {
    const previous = { ...at(0), status: "Reviewed" as const };
    expect(saveCommunicationVersion(previous, { ...previous, subject: "Updated summary" }).status).toBe("Modified");
  });
  it("regenerates only one version and resets reviewed status", () => {
    const regenerated = mockRegenerateVersion({ ...at(1), status: "Reviewed" });
    const next = replaceCommunicationVersion(fixture, regenerated);
    expect(next[0]).toBe(fixture[0]); expect(next[2]).toBe(fixture[2]);
    expect(regenerated.status).toBe("Pending Review");
    expect(regenerated.emailBody.endsWith(at(1).protectedEmail)).toBe(true);
    expect(regenerated.smsContent.endsWith(at(1).protectedSms)).toBe(true);
  });
  it("uses default for unknown age and unreviewed or missing matches", () => {
    expect(selectCommunicationVersion(fixture)).toBe(fixture[0]);
    expect(selectCommunicationVersion(fixture, 20)).toBe(fixture[0]);
    expect(selectCommunicationVersion(fixture, 40)).toBe(fixture[0]);
    const reviewed = { ...at(1), status: "Reviewed" as const };
    expect(selectCommunicationVersion(replaceCommunicationVersion(fixture, reviewed), 20)).toBe(reviewed);
  });
  it("rejects missing content and changes to protected copy", () => {
    expect(validateCommunicationVersion({ ...at(0), subject: "" }).length).toBeGreaterThan(0);
    expect(validateCommunicationVersion({ ...at(1), emailBody: "Different payment terms" }).length).toBeGreaterThan(0);
    expect(validateCommunicationVersion({ ...at(1), subject: "Urgent: must pay immediately" }).length).toBeGreaterThan(0);
  });
  it("allows saved valid drafts without individual review and blocks unsaved changes", () => {
    const strategy = seedCommunicationVersions({ ...seed, status: "Under Review" });
    expect(communicationReviewIssues(strategy)).toEqual([]);
    const reviewed: Strategy = { ...strategy, nodes: Object.fromEntries(Object.entries(strategy.nodes).map(([id,n]) => [id, n.config.communicationVersions ? { ...n, config: { ...n.config, communicationVersions: n.config.communicationVersions.map((v) => ({ ...v, status: "Reviewed" as const })) } } : n])) };
    expect(communicationReviewIssues(reviewed)).toEqual([]);
    const communication = Object.values(reviewed.nodes).find((n) => n.kind === "Communication");
    if (!communication?.config.communicationVersions) throw new Error("Missing seeded versions");
    const first = communication.config.communicationVersions[0];
    if (!first) throw new Error("Missing default");
    first.hasUnsavedChanges = true;
    expect(communicationReviewIssues(reviewed).length).toBeGreaterThan(0);
  });
  it("finalizes all enabled messages together on overall approval", () => {
    const strategy = seedCommunicationVersions({ ...seed, status: "Under Review" });
    const final = finalizeCommunicationVersions(strategy);
    const versions = Object.values(final.nodes).flatMap((n) => n.config.communicationVersions ?? []);
    expect(versions.length).toBeGreaterThan(0);
    expect(versions.every((v) => v.status === "Final")).toBe(true);
    expect(Object.values(strategy.nodes).flatMap((n) => n.config.communicationVersions ?? []).some((v) => v.status !== "Final")).toBe(true);
  });
  it("does not finalize invalid message content", () => {
    const strategy = seedCommunicationVersions({ ...seed, status: "Under Review" });
    const first = Object.values(strategy.nodes).flatMap((n) => n.config.communicationVersions ?? [])[0];
    if (!first) throw new Error("Missing message");
    first.subject = "";
    expect(finalizeCommunicationVersions(strategy)).toBe(strategy);
  });
});
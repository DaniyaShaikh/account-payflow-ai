import { describe, expect, it } from "vitest";
import {
  canReviewDecision,
  followupNode,
  reassessAdaptiveCase,
  needsApproval,
  resolveAdaptiveDecision,
  seedAdaptiveCases,
  seedAdaptiveWorkflow,
  standardFollowups,
  usageStatus,
  isExhausted,
  nextOccurrence,
  writeFollowup,
} from "./adaptive-workflow-data";
import { seedStrategies } from "./strategy-data";
import {
  communicationReviewIssues,
  finalizeCommunicationVersions,
  seedCommunicationVersions,
} from "./communication-versions";

const now = "2026-11-25T17:04:00Z";
function proposal() {
  const source = seedStrategies.find((s) => s.id === "pp-third-party-proposal");
  if (!source) throw new Error("Missing proposal fixture");
  return seedAdaptiveWorkflow(seedCommunicationVersions(source));
}
function pendingCase() {
  const state = seedAdaptiveCases.find((c) => c.accountId === "pp-88831");
  if (!state) throw new Error("Missing pending fixture");
  return state;
}

describe("adaptive workflow safeguards", () => {
  it("tracks First Time and Repeat separately; scheduled content is not used until sent", () => {
    const s = proposal();
    const f = s.adaptiveFollowups?.find((x) => x.id === "payment-failed");
    if (!f) throw new Error("missing");
    const usage = { "payment-failed": { first: { status: "Sent" as const }, repeat: { status: "Scheduled" as const } } };
    expect(usageStatus(usage, f, "repeat")).toBe("Scheduled");
    expect(isExhausted(usage, "payment-failed")).toBe(false);
    expect(nextOccurrence(usage, f)).toBeNull();
    expect(isExhausted({ x: { first: { status: "Sent" }, repeat: { status: "Sent" } } }, "x")).toBe(true);
    const repeatSubject = f.repeat?.communicationVersions?.[0]?.subject;
    expect(repeatSubject).toBeTruthy();
    expect(repeatSubject).not.toBe(f.config.communicationVersions?.[0]?.subject);
  });
  it("keeps all seven standard scenarios outside the original graph", () => {
    const s = proposal();
    expect(s.adaptiveFollowups?.map((f) => f.name)).toEqual([
      "Not Opened",
      "Opened, Not Paid",
      "No Engagement",
      "Payment Not Finished",
      "Payment Failed",
      "Part Paid",
      "Plan Setup Not Finished",
    ]);
    expect(standardFollowups.find((f) => f.id === "not-opened")?.trigger).toContain("48 hours");
    expect(Object.keys(s.nodes)).not.toContain("not-opened");
    expect(
      followupNode(
        s.adaptiveFollowups?.[0] ?? { id: "test", name: "Test", trigger: "", config: {} },
      ).config.referenceEvent,
    ).toBeUndefined();
  });
  it("preserves fixed sequence and validation when adaptive mode is off", () => {
    const s = proposal();
    const source = seedStrategies.find((item) => item.id === s.id);
    expect(Object.keys(s.nodes)).toEqual(Object.keys(source?.nodes ?? {}));
    const fixed = { ...s, adaptiveEnabled: false };
    expect(communicationReviewIssues(fixed)).toEqual(
      communicationReviewIssues({ ...fixed, adaptiveFollowups: [] }),
    );
    expect(fixed.nodes).toEqual(s.nodes);
  });
  it("blocks overall approval for Not Written Yet and finalizes all saved follow-ups together", () => {
    const s = proposal();
    expect(communicationReviewIssues(s).some((issue) => issue.startsWith("No Engagement:"))).toBe(
      true,
    );
    const written = {
      ...s,
      adaptiveFollowups: s.adaptiveFollowups?.map((f) => writeFollowup(s, f)) ?? [],
    };
    expect(communicationReviewIssues(written)).toEqual([]);
    const approved = finalizeCommunicationVersions(written);
    expect(
      approved.adaptiveFollowups?.every((f) =>
        f.config.communicationVersions?.every((v) => v.status === "Final"),
      ),
    ).toBe(true);
    expect(approved.nodes).not.toHaveProperty("no-engagement");
  });
  it("reuses available account versions and excludes unsaved follow-ups from approval", () => {
    const s = proposal();
    const f = s.adaptiveFollowups?.[0];
    const source = Object.values(s.nodes).find((n) => n.kind === "Communication");
    if (!f || !source) throw new Error("Missing content fixture");
    const written = writeFollowup(s, f);
    expect(written.config.communicationVersions?.map((v) => v.id)).toEqual(
      source.config.communicationVersions?.map((v) => v.id),
    );
    const unsaved = {
      ...s,
      adaptiveFollowups: [
        {
          ...written,
          config: {
            ...written.config,
            communicationVersions:
              written.config.communicationVersions?.map((v) => ({
                ...v,
                hasUnsavedChanges: true,
              })) ?? [],
          },
        },
      ],
    };
    expect(communicationReviewIssues(unsaved).length).toBeGreaterThan(0);
    expect(finalizeCommunicationVersions(unsaved)).toBe(unsaved);
  });
  it("only allows authorized, pending, unexpired, compliant decisions to be reviewed", () => {
    const d = pendingCase().decision;
    expect(canReviewDecision(d, true, now)).toBe(true);
    expect(canReviewDecision(d, false, now)).toBe(false);
    expect(canReviewDecision({ ...d, expiresAt: "2026-11-24T00:00:00Z" }, true, now)).toBe(false);
    expect(canReviewDecision({ ...d, status: "Superseded" }, true, now)).toBe(false);
    expect(
      canReviewDecision({ ...d, compliance: "Blocked — contact restriction" }, true, now),
    ).toBe(false);
  });
  it("marks Operations modifications as Changed and keeps the AI original suggestion in history", () => {
    const modified = resolveAdaptiveDecision(pendingCase(), "Modified", "Operations", now, {
      channel: "SMS",
      action: "Switch channel",
    });
    expect(modified.decision.channel).toBe("SMS");
    expect(modified.decision.status).toBe("Changed");
    expect(modified.history.some((e) => e.label.startsWith("AI original suggestion"))).toBe(true);
    expect(modified.history.at(-1)?.detail).toContain("Operations: Switch channel · SMS");
    expect(canReviewDecision(modified.decision, true, now)).toBe(false);
    const approved = resolveAdaptiveDecision(pendingCase(), "Approved", "Operations", now);
    expect(approved.decision.status).toBe("Approved");
  });
  it("supersedes previous recommendations on newer events and blocks restricted communications", () => {
    const state = pendingCase();
    const next = reassessAdaptiveCase(state, "recommendation", now);
    expect(next.decision.id).not.toBe(state.decision.id);
    expect(next.history.some((event) => event.status === "Superseded")).toBe(true);
    expect(next.decision.requiresApproval).toBe(true);
    const blocked = reassessAdaptiveCase(state, "blocked", now);
    expect(blocked.status).toBe("Paused");
    expect(blocked.decision.status).toBe("Blocked");
    expect(canReviewDecision(blocked.decision, true, now)).toBe(false);
  });
  it("stops reminders after full payment and leaves no-change recommendations intact", () => {
    const state = pendingCase();
    const unchanged = reassessAdaptiveCase(state, "no-change", now);
    expect(unchanged.decision).toEqual(state.decision);
    const completed = reassessAdaptiveCase(state, "completed", now);
    expect(completed.status).toBe("Completed");
    expect(completed.engagement).toBe("Paid in Full");
    expect(completed.decision.action).toBe("Stop workflow");
    expect(completed.decision.requiresApproval).toBe(false);
    expect(completed.history.at(-1)?.detail).toContain("scheduled communication cancelled");
  });
  it("demonstrates an automatically applied follow-up without independent approval", () => {
    const automatic = seedAdaptiveCases.find((c) => c.accountId === "pp-10482");
    expect(automatic?.decision.status).toBe("Applied");
    expect(automatic?.decision.requiresApproval).toBe(false);
    expect(automatic?.history.some((event) => event.detail.includes("replaced Reminder 3"))).toBe(
      true,
    );
  });
  it("only AI decisions for supervised clients need approval; fixed rules apply automatically", () => {
    expect(needsApproval("Rule-Based", true)).toBe(false);
    expect(needsApproval("AI", true)).toBe(true);
    expect(needsApproval("AI", false)).toBe(false);
  });
  it("expires an AI decision when the planned message is due so the plan keeps running", () => {
    const d = pendingCase().decision;
    expect(canReviewDecision(d, true, "2026-11-28T14:00:00Z")).toBe(false);
  });
});

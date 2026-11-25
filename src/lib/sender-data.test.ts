import { describe, expect, it } from "vitest";
import { activationIssues, canRemoveEligible, emptyEmailSetup, resolveSender, seedEmailSetup, setPrimary, sentViaFor } from "./sender-data";

const pp = () => seedEmailSetup("paypal", "collections@paypal.com", "PayPal Collections");

describe("sender identities", () => {
  it("verified but disabled sender is not eligible", () => {
    const s = pp();
    expect(resolveSender({ ...s, senders: s.senders.filter((x) => x.id === "pp-s3").map((x) => ({ ...x, primary: true })) }).type).toBe("None");
  });
  it("falls back to next eligible sender when primary is disabled", () => {
    const s = pp();
    const r = resolveSender({ ...s, senders: s.senders.map((x) => (x.id === "pp-s1" ? { ...x, enabled: false } : x)) });
    expect(r.type).toBe("Alternative");
    expect(r.sender?.email).toBe("payments@paypal.com");
  });
  it("unverified domain sender cannot be used", () => {
    const s = setPrimary(pp(), "pp-s4");
    const only = { ...s, senders: s.senders.filter((x) => x.id === "pp-s4").map((x) => ({ ...x, enabled: true })) };
    expect(resolveSender(only).sender).toBeNull();
  });
  it("only one primary at a time", () => {
    expect(setPrimary(pp(), "pp-s2").senders.filter((s) => s.primary).map((s) => s.id)).toEqual(["pp-s2"]);
  });
  it("blocks removing the last eligible sender while email is on", () => {
    const s = pp();
    const one = { ...s, senders: s.senders.map((x) => (x.id === "pp-s2" ? { ...x, enabled: false } : x)) };
    expect(canRemoveEligible(one, "pp-s1", true)).toBe(false);
    expect(canRemoveEligible(one, "pp-s1", false)).toBe(true);
    expect(canRemoveEligible(s, "pp-s1", true)).toBe(true);
  });
  it("activation requires SendGrid + verified primary only when email is on", () => {
    expect(activationIssues({ channels: { email: true, sms: true, whatsapp: false }, emailSetup: emptyEmailSetup() })).toHaveLength(3);
    expect(activationIssues({ channels: { email: false, sms: true, whatsapp: false }, emailSetup: emptyEmailSetup() })).toHaveLength(0);
    expect(activationIssues({ channels: { email: true, sms: true, whatsapp: false }, emailSetup: pp() })).toHaveLength(0);
  });
  it("migrated sender on an unverified domain is not auto-verified", () => {
    const s = seedEmailSetup("northstar-utilities", "billing@northstar.com", "Northstar");
    expect(s.domains[0]?.status).toBe("DNS Pending");
    expect(s.senders[0]?.migrated).toBe(true);
  });
  it("historical sender is stable per communication", () => {
    expect(sentViaFor("c-1", "paypal")).toEqual(sentViaFor("c-1", "paypal"));
  });
});

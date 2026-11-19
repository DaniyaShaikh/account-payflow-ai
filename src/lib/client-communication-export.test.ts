import { describe, expect, it } from "vitest";
import { communicationsForClient } from "./communication-data";
import { matchesSubClients, subClientNameFor } from "./portfolio-data";

describe("client communication export scope", () => {
  const rows = communicationsForClient("paypal");

  it("keeps all portfolios within PayPal when none is selected", () => {
    const result = rows.filter((c) => matchesSubClients(c.clientId, c.accountId, []));
    expect(result.length).toBeGreaterThan(0);
    expect(result).toHaveLength(rows.length);
    expect(result.every((c) => c.clientId === "paypal")).toBe(true);
  });

  it("restricts a single portfolio selection to PayPal Finance", () => {
    const result = rows.filter((c) => matchesSubClients(c.clientId, c.accountId, ["PayPal Finance"]));
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(rows.length);
    expect(result.every((c) => subClientNameFor(c.clientId, c.accountId) === "PayPal Finance")).toBe(true);
  });

  it("includes only the selected multiple portfolios", () => {
    const selected = ["PayPal Finance", "PayPal Third Party"];
    const result = rows.filter((c) => matchesSubClients(c.clientId, c.accountId, selected));
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(rows.filter((c) => selected.includes(subClientNameFor(c.clientId, c.accountId))));
    expect(new Set(result.map((c) => subClientNameFor(c.clientId, c.accountId)))).toEqual(new Set(selected));
    expect(result.every((c) => c.clientId === "paypal")).toBe(true);
  });
});
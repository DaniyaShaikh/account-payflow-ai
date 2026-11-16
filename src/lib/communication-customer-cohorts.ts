import type { Strategy } from "./strategy-data";
import { segmentIsActive, type CommunicationSegments, type SegmentExample, type CommunicationSegment } from "./communication-segments";

/** Illustrative recipient data for review only; not inferred from live accounts. */
export function mockWorkflowCustomers(strategy: Pick<Strategy, "clientId" | "portfolioId">): SegmentExample[] {
  if (strategy.clientId === "paypal" && strategy.portfolioId === "pp-third-party") return [
    { age: 22, country: "Canada", region: "Alberta", language: "French" },
    { age: 23, country: "Canada", region: "Alberta", language: "English" },
    { age: 21, country: "Bahrain" },
    { age: 22, country: "Canada", region: "Alberta", language: "English" },
    { country: "Canada", region: "Alberta", language: "English" },
  ];
  return [
    { age: 22, country: "Canada", region: "Ontario", language: "English" },
    { age: 68, country: "Canada", region: "Ontario", language: "French" },
    { country: "Canada", region: "Ontario" },
  ];
}

export function customerCombinationSegments(config: CommunicationSegments, customers: SegmentExample[]): CommunicationSegment[] {
  const unique = new Map<string, CommunicationSegment>();
  for (const customer of customers) {
    const age = config.rules.find((r) => r.kind === "Age group" && !r.combined && segmentIsActive(config, r.id) && customer.age !== undefined && customer.age >= r.minAge && customer.age <= (r.maxAge ?? Infinity));
    // Unknown ages use Main / Default; do not infer customer demographics.
    if (!age) continue;
    const country = config.enabled.Country ? customer.country ?? "" : "";
    const region = country && config.enabled.Region ? customer.region ?? "" : "";
    const language = config.languageEnabled !== false ? customer.language ?? "" : "";
    if (!country && !region && !language) continue;
    const id = `cohort-${age.id}-${encodeURIComponent([country, region, language].join("|"))}`;
    const ageName = `${age.minAge}${age.maxAge === null ? "+" : `–${age.maxAge}`}`;
    unique.set(id, { ...age, id, combined: true, country, region, language, name: `${ageName} (${[region || country, language].filter(Boolean).join(", ")})` });
  }
  return [...unique.values()];
}
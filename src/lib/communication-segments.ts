/** Review-only configuration: never used by workflow execution. */
export type SegmentKind = "Age group" | "Country" | "Region";
export interface CommunicationSegment {
  id: string;
  name: string;
  kind: SegmentKind;
  enabled: boolean;
  minAge: number;
  maxAge: number | null;
  country: string;
  region: string;
}
export interface CommunicationSegments {
  enabled: Record<SegmentKind, boolean>;
  /** Array order is priority, highest first. */
  rules: CommunicationSegment[];
}
export const segmentCountries = ["Canada", "United States"];
export const segmentRegions: Record<string, string[]> = {
  Canada: ["Ontario", "Alberta", "British Columbia", "Quebec"],
  "United States": ["California", "New York", "Washington", "Massachusetts"],
};
export function defaultCommunicationSegments(): CommunicationSegments {
  const ages = [[18,24],[25,34],[35,44],[45,54],[55,64],[65,null]] as const;
  const base = { enabled: true, minAge: 18, maxAge: null, country: "", region: "" };
  return {
    enabled: { "Age group": true, Country: true, Region: true },
    rules: [
      ...["Ontario", "Alberta", "California"].map((region) => ({ ...base, id: `region-${region.toLowerCase()}`, name: region, kind: "Region" as const, country: region === "California" ? "United States" : "Canada", region })),
      ...segmentCountries.map((country) => ({ ...base, id: `country-${country.toLowerCase().replaceAll(" ", "-")}`, name: country, kind: "Country" as const, country })),
      ...ages.map(([min,max]) => ({ ...base, id: max === null ? "age-65-plus" : `age-${min}-${max}`, name: max === null ? `Age ${min}+` : `Age ${min}–${max}`, kind: "Age group" as const, minAge: min, maxAge: max })),
    ],
  };
}
export function segmentCriteria(rule: CommunicationSegment) {
  return rule.kind === "Age group" ? `Age ${rule.minAge}${rule.maxAge === null ? "+" : `–${rule.maxAge}`}` : rule.kind === "Country" ? `Country: ${rule.country}` : `${rule.region}, ${rule.country}`;
}
export function segmentIsActive(config: CommunicationSegments, id: string) {
  if (id === "default") return true;
  const rule = config.rules.find((r) => r.id === id);
  return Boolean(rule?.enabled && config.enabled[rule.kind]);
}
export function validateCommunicationSegments(config: CommunicationSegments): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const rule of config.rules) {
    if (!rule.name.trim()) errors.push("Every segment needs a name.");
    if (ids.has(rule.id) || rule.id === "default") errors.push("Segment identifiers must be unique.");
    ids.add(rule.id);
    if (rule.kind === "Age group") {
      if (!Number.isInteger(rule.minAge) || rule.minAge < 18 || rule.minAge > 120 || (rule.maxAge !== null && (!Number.isInteger(rule.maxAge) || rule.maxAge < rule.minAge || rule.maxAge > 120))) errors.push(`${rule.name}: enter a valid adult age range (18–120), or leave maximum empty for no upper limit.`);
    } else if (!segmentCountries.includes(rule.country) || (rule.kind === "Region" && !segmentRegions[rule.country]?.includes(rule.region))) errors.push(`${rule.name}: choose a valid country and region.`);
  }
  const ages = config.rules.filter((r) => r.kind === "Age group" && segmentIsActive(config, r.id));
  ages.forEach((a,i) => ages.slice(i+1).forEach((b) => {
    if (a.minAge <= (b.maxAge ?? Infinity) && b.minAge <= (a.maxAge ?? Infinity)) errors.push(`${a.name} overlaps ${b.name}.`);
  }));
  const geographic = config.rules.filter((r) => r.kind !== "Age group" && segmentIsActive(config, r.id));
  geographic.forEach((a,i) => geographic.slice(i+1).forEach((b) => {
    if (a.kind === b.kind && a.country === b.country && (a.kind === "Country" || a.region === b.region)) errors.push(`${a.name} duplicates ${b.name}.`);
  }));
  return errors;
}
export interface SegmentExample { age?: number; country?: string; region?: string }
export function matchingCommunicationSegments(config: CommunicationSegments, example: SegmentExample) {
  return config.rules.filter((r) => segmentIsActive(config, r.id) && (r.kind === "Age group"
    ? example.age !== undefined && example.age >= r.minAge && example.age <= (r.maxAge ?? Infinity)
    : r.country === example.country && (r.kind === "Country" || r.region === example.region)));
}
/** Only demonstrates priority among available variants; not an execution selector. */
export function demonstrateVariantMatch(config: CommunicationSegments, availableIds: string[], example: SegmentExample) {
  return matchingCommunicationSegments(config, example).find((r) => availableIds.includes(r.id))?.id ?? "default";
}
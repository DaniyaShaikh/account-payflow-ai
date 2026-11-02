import type { ClientConfig } from "./payflow-data";
import { mappingSummary } from "@/components/client-config-sections";

/** Required onboarding sections that are still incomplete. Optional items (governance rules, portfolios) never count. */
export function incompleteSetupSections(
  name: string,
  c: ClientConfig,
  assignedUsers: number,
): string[] {
  const m = mappingSummary(c);
  const out: string[] = [];
  if (!name || !c.code) out.push("General");
  if (!c.dataSource || c.connection !== "Connected") out.push("Data Source");
  if (!(m.unmapped === 0 && m.attention === 0 && m.mapped > 0)) out.push("Data Mapping");
  if (!c.brandName || !c.senderName || !(c.channels.email || c.channels.sms))
    out.push("Branding & Channels");
  if (assignedUsers === 0) out.push("Assigned Users");
  return out;
}

/** Plain-language reasons for each missing required item. */
export function setupIssueDetails(name: string, c: ClientConfig, assignedUsers: number): string[] {
  const m = mappingSummary(c);
  const out: string[] = [];
  if (!name) out.push("Client Profile: client name is required");
  if (!c.code) out.push("Client Profile: client code / reference is required");
  if (!c.dataSource) out.push("Data Source: select a data source");
  else if (c.connection !== "Connected") out.push("Data Source: connection must be established");
  if (!(m.unmapped === 0 && m.attention === 0 && m.mapped > 0))
    out.push("Data Mapping: map all required fields");
  if (!c.brandName) out.push("Branding & Channels: Display / brand name is required");
  if (!c.senderName) out.push("Branding & Channels: Sender name is required");
  if (!(c.channels.email || c.channels.sms))
    out.push("Branding & Channels: enable at least one channel");
  if (assignedUsers === 0) out.push("Supervisor Assignment: assign at least one supervisor");
  return out;
}

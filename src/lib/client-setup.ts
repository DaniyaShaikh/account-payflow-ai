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

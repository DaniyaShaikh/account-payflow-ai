import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/payflow-ui";
import { ComplianceNotice } from "@/components/compliance-common";
import { ComplianceEditor } from "@/components/compliance-editor";
import { newComplianceRule } from "@/lib/compliance-data";
import { useRole } from "@/lib/role-context";
export const Route = createFileRoute("/compliance/new")({
  validateSearch: (s: Record<string, unknown>): { clientId?: string } => typeof s["clientId"] === "string" ? { clientId: s["clientId"] } : {},
  head: () => ({ meta: [{ title: "Add Compliance Rule — PayFlow" }, { name: "description", content: "Create structured jurisdiction and channel compliance protections." }, { property: "og:title", content: "Add Compliance Rule — PayFlow" }, { property: "og:description", content: "Configure compliance conditions, enforcement and actions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: NewRule,
});
function NewRule() { const { clientId } = Route.useSearch(); const { visibleClients } = useRole(); const client = visibleClients.find(c => c.id === clientId); const initial = newComplianceRule(); return <><PageHeader title="Add Compliance Rule" breadcrumb={[{ label: "Compliance Rules", to: "/compliance" }, { label: "New Rule" }]} /><ComplianceNotice /><ComplianceEditor initial={{ ...initial, clientId: client?.id ?? null, jurisdiction: client?.config.jurisdiction ?? initial.jurisdiction }} /></>; }
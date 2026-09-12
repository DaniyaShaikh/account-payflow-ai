import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PlaceholderSection } from "@/components/payflow-ui";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules — PayFlow Collections" },
      {
        name: "description",
        content:
          "Governance rules that constrain contact frequency, escalation and automated collection decisions.",
      },
      { property: "og:title", content: "Rules — PayFlow Collections" },
      {
        property: "og:description",
        content: "Governance and compliance rules applied to collection activity.",
      },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Rules"
        description="Governance constraints applied to every collection decision."
      />
      <PlaceholderSection
        title="Rule set"
        description="Rule configuration arrives in a later step"
        items={["Contact limits", "Quiet hours", "Escalation thresholds"]}
      />
    </>
  ),
});

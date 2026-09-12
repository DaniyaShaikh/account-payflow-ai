import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PlaceholderSection } from "@/components/payflow-ui";

export const Route = createFileRoute("/human-review")({
  head: () => ({
    meta: [
      { title: "Human Review — PayFlow Collections" },
      {
        name: "description",
        content:
          "Queue of collection cases escalated for supervisor decision before any action is taken.",
      },
      { property: "og:title", content: "Human Review — PayFlow Collections" },
      {
        property: "og:description",
        content: "Supervisor decision queue for escalated collection cases.",
      },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Human Review"
        description="Escalated collection cases waiting on a supervisor decision."
      />
      <PlaceholderSection
        title="Review queue"
        description="Detailed review workflow arrives in a later step"
        items={["Escalations", "Disputes", "Settlement approvals"]}
      />
    </>
  ),
});

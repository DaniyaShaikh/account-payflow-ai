import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PlaceholderSection } from "@/components/payflow-ui";

export const Route = createFileRoute("/communications")({
  head: () => ({
    meta: [
      { title: "Communications — PayFlow Collections" },
      {
        name: "description",
        content:
          "Outbound and inbound collection communications across email, SMS, voice and letter channels.",
      },
      { property: "og:title", content: "Communications — PayFlow Collections" },
      {
        property: "og:description",
        content: "Channel-level communication history for collection cases.",
      },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Communications"
        description="Messages sent to and received from customer accounts."
      />
      <PlaceholderSection
        title="Communication log"
        description="Message detail arrives in a later step"
        items={["Email", "SMS", "Voice", "Letter"]}
      />
    </>
  ),
});

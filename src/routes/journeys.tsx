import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PlaceholderSection } from "@/components/payflow-ui";
import { journeys } from "@/lib/payflow-data";

export const Route = createFileRoute("/journeys")({
  head: () => ({
    meta: [
      { title: "Journeys — PayFlow Collections" },
      {
        name: "description",
        content:
          "Collection journeys that determine how customer accounts progress through contact and payment stages.",
      },
      { property: "og:title", content: "Journeys — PayFlow Collections" },
      {
        property: "og:description",
        content: "Collection journey library used across client portfolios.",
      },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Journeys"
        description="How customer accounts progress through collection stages."
      />
      <PlaceholderSection
        title="Journey library"
        description="Journey design arrives in a later step"
        items={[...journeys]}
      />
    </>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PlaceholderSection } from "@/components/payflow-ui";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — PayFlow Collections" },
      {
        name: "description",
        content:
          "Connections to client systems, payment providers and communication channels used by PayFlow collections.",
      },
      { property: "og:title", content: "Integrations — PayFlow Collections" },
      {
        property: "og:description",
        content: "Client system, payment and messaging connections.",
      },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Integrations"
        description="Connections to client systems, payments and messaging providers."
      />
      <PlaceholderSection
        title="Connections"
        description="Integration setup arrives in a later step"
        items={["Client data feeds", "Payment providers", "Messaging providers"]}
      />
    </>
  ),
});

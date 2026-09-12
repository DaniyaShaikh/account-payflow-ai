import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, DataTable, Td, StatusPill, PlaceholderSection } from "@/components/payflow-ui";
import { clients } from "@/lib/payflow-data";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users & Permissions — PayFlow Collections" },
      {
        name: "description",
        content:
          "Internal PayFlow team members, their roles and the clients each supervisor is assigned to.",
      },
      { property: "og:title", content: "Users & Permissions — PayFlow Collections" },
      {
        property: "og:description",
        content: "Operations admins and supervisors with their client assignments.",
      },
    ],
  }),
  component: UsersPage,
});

const team = [
  { name: "Alex Morgan", role: "Operations Admin", supervisorName: null },
  { name: "Zeeshan", role: "Supervisor", supervisorName: "Zeeshan" },
  { name: "Sarah", role: "Supervisor", supervisorName: "Sarah" },
];

function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users & Permissions"
        description="Internal roles for Phase 1. There is no client portal yet."
      />

      <DataTable head={["User", "Role", "Client Access"]}>
        {team.map((u) => (
          <tr key={u.name} className="border-b border-border last:border-0">
            <Td className="font-medium">{u.name}</Td>
            <Td>
              <StatusPill tone={u.role === "Operations Admin" ? "info" : "neutral"}>
                {u.role}
              </StatusPill>
            </Td>
            <Td className="text-muted-foreground">
              {u.supervisorName
                ? clients
                    .filter((c) => c.supervisors.includes(u.supervisorName!))
                    .map((c) => c.name)
                    .join(", ")
                : "All clients"}
            </Td>
          </tr>
        ))}
      </DataTable>

      <div className="mt-5">
        <PlaceholderSection
          title="Permission matrix"
          description="Granular permissions arrive in a later step"
        />
      </div>
    </>
  );
}

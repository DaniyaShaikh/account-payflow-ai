import { createFileRoute, Link } from "@tanstack/react-router";
import { PlatformShell } from "@/components/platform-shell";
import { PageHeader, Panel, KpiCard, Btn, StatusPill } from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";
import { productStatusTone } from "@/lib/platform-data";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [
      { title: "Platform Overview — Product Administration" },
      {
        name: "description",
        content:
          "Platform Super Admin overview: registered products, active products and organizations entitled to product access.",
      },
      { property: "og:title", content: "Platform Overview — Product Administration" },
      {
        property: "og:description",
        content: "Registered products, active products and organization product entitlement.",
      },
    ],
  }),
  component: PlatformOverview,
});

function PlatformOverview() {
  const { products, organizations, entitlements } = usePlatform();
  const active = products.filter((p) => p.status === "Active");
  const orgsWithAccess = new Set(
    entitlements.filter((e) => e.status === "Granted").map((e) => e.organizationId),
  );

  return (
    <PlatformShell>
      <PageHeader
        eyebrow="Platform"
        title="Platform Overview"
        description="Products registered on the platform and which organizations are entitled to them. Product roles, scope and permissions stay inside each product."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Registered products" value={String(products.length)} />
        <KpiCard label="Active products" value={String(active.length)} tone="primary" />
        <KpiCard
          label="Organizations with access"
          value={`${orgsWithAccess.size} of ${organizations.length}`}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Products"
          description="Register a product now so it can be entitled to organizations later."
          action={
            <Link to="/platform/products">
              <Btn>Manage products</Btn>
            </Link>
          }
        >
          <ul className="divide-y divide-border/50 text-[13px]">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium text-foreground">
                  {p.name} <span className="text-muted-foreground">· {p.code}</span>
                </span>
                <StatusPill tone={productStatusTone(p.status)} dot>
                  {p.status}
                </StatusPill>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Product Access"
          description="Entitlement only — granting a product does not assign any in-product role or client scope."
          action={
            <Link to="/platform/access">
              <Btn>Manage access</Btn>
            </Link>
          }
        >
          <ul className="divide-y divide-border/50 text-[13px]">
            {organizations.map((o) => {
              const granted = entitlements.some(
                (e) => e.organizationId === o.id && e.status === "Granted",
              );
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-medium text-foreground">{o.name}</span>
                  <StatusPill tone={granted ? "success" : "danger"} dot>
                    {granted ? "Has access" : "No access"}
                  </StatusPill>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </PlatformShell>
  );
}

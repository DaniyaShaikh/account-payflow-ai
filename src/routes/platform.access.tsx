import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlatformShell } from "@/components/platform-shell";
import {
  PageHeader,
  Panel,
  DataTable,
  Tr,
  Td,
  PrimaryCell,
  StatusPill,
  Btn,
  FilterSelect,
  SearchInput,
  EmptyState,
} from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";
import { entitlementTone } from "@/lib/platform-data";

export const Route = createFileRoute("/platform/access")({
  head: () => ({
    meta: [
      { title: "Product Access — Platform Administration" },
      {
        name: "description",
        content:
          "Grant or revoke product entitlement per organization. Entitlement does not assign in-product roles, client scope or permissions.",
      },
      { property: "og:title", content: "Product Access — Platform Administration" },
      {
        property: "og:description",
        content: "Organization-level product entitlement: grant or revoke access.",
      },
    ],
  }),
  component: ProductAccessPage,
});

function ProductAccessPage() {
  const { products, organizations, entitlementStatus, setEntitlement } = usePlatform();
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("All Products");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.flatMap((org) =>
      products
        .filter((p) => productFilter === "All Products" || p.name === productFilter)
        .map((p) => ({ org, product: p, status: entitlementStatus(org.id, p.id) }))
        .filter((r) => statusFilter === "All Statuses" || r.status === statusFilter)
        .filter((r) => !q || r.org.name.toLowerCase().includes(q)),
    );
  }, [organizations, products, query, productFilter, statusFilter, entitlementStatus]);

  return (
    <PlatformShell>
      <PageHeader
        breadcrumb={[{ label: "Platform", to: "/platform" }, { label: "Product Access" }]}
        title="Product Access"
        description="Controls which organization is entitled to which product. Granting a product does not assign any product role, client or portfolio scope, or functional permission — those stay inside the product."
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-5 py-3.5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search organizations"
            className="w-full sm:w-[260px]"
          />
          <FilterSelect
            label="Product"
            value={productFilter}
            onChange={setProductFilter}
            options={["All Products", ...products.map((p) => p.name)]}
          />
          <FilterSelect
            label="Access"
            value={statusFilter}
            onChange={setStatusFilter}
            options={["All Statuses", "Granted", "Revoked"]}
          />
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No matching entitlements"
              description="Adjust the search or filters to see organization product access."
            />
          </div>
        ) : (
          <DataTable head={["Organization", "Product", "Access status", ""]}>
            {rows.map((r) => (
              <Tr key={`${r.org.id}-${r.product.id}`}>
                <Td>
                  <PrimaryCell title={r.org.name} />
                </Td>
                <Td className="text-muted-foreground">
                  {r.product.name} · {r.product.code}
                </Td>
                <Td>
                  <StatusPill tone={entitlementTone(r.status)} dot>
                    {r.status === "Granted" ? "Access granted" : "Access revoked"}
                  </StatusPill>
                </Td>
                <Td className="text-right">
                  {r.status === "Granted" ? (
                    <Btn
                      variant="danger"
                      onClick={() => setEntitlement(r.org.id, r.product.id, "Revoked")}
                    >
                      Revoke access
                    </Btn>
                  ) : (
                    <Btn
                      variant="primary"
                      onClick={() => setEntitlement(r.org.id, r.product.id, "Granted")}
                    >
                      Grant access
                    </Btn>
                  )}
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Revoking access disables the organization's entry into the product. Operational data inside
        the product is retained.
      </p>
    </PlatformShell>
  );
}

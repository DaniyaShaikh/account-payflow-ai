import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PlatformShell } from "@/components/platform-shell";
import {
  PageHeader,
  Panel,
  StatusPill,
  Btn,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  EmptyState,
} from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";
import { productStatusTone, type ProductStatus } from "@/lib/platform-data";

export const Route = createFileRoute("/platform/products/$productId")({
  head: () => ({
    meta: [
      { title: "Product Detail — Platform Administration" },
      {
        name: "description",
        content:
          "View and edit basic platform product information: name, product code, description and status.",
      },
      { property: "og:title", content: "Product Detail — Platform Administration" },
      { property: "og:description", content: "Basic product information and status." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { productId } = Route.useParams();
  const { productById, updateProduct, organizations, entitlementStatus } = usePlatform();
  const product = productById(productId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: product?.name ?? "",
    code: product?.code ?? "",
    description: product?.description ?? "",
    status: (product?.status ?? "Draft") as ProductStatus,
  });

  if (!product) {
    return (
      <PlatformShell>
        <EmptyState
          title="Product not found"
          description="This product is no longer registered on the platform."
          action={
            <Link to="/platform/products">
              <Btn>Back to products</Btn>
            </Link>
          }
        />
      </PlatformShell>
    );
  }

  const grantedOrgs = organizations.filter(
    (o) => entitlementStatus(o.id, product.id) === "Granted",
  );

  return (
    <PlatformShell>
      <PageHeader
        breadcrumb={[
          { label: "Platform", to: "/platform" },
          { label: "Products", to: "/platform/products" },
          { label: product.name },
        ]}
        title={product.name}
        description={product.description}
        actions={
          <Btn
            variant={editing ? "secondary" : "primary"}
            onClick={() => {
              setDraft({
                name: product.name,
                code: product.code,
                description: product.description,
                status: product.status,
              });
              setEditing((v) => !v);
            }}
          >
            {editing ? "Cancel" : "Edit product"}
          </Btn>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Product information">
          {editing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product name">
                  <TextInput
                    value={draft.name}
                    onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                  />
                </Field>
                <Field label="Product code">
                  <TextInput
                    value={draft.code}
                    onChange={(v) => setDraft((d) => ({ ...d, code: v }))}
                  />
                </Field>
                <Field label="Status">
                  <SelectInput
                    value={draft.status}
                    options={["Draft", "Active", "Inactive"]}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as ProductStatus }))}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Short description">
                    <TextArea
                      value={draft.description}
                      onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-4">
                <Btn
                  variant="primary"
                  onClick={() => {
                    updateProduct(product.id, draft);
                    setEditing(false);
                  }}
                >
                  Save changes
                </Btn>
              </div>
            </>
          ) : (
            <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-eyebrow">Product name</dt>
                <dd className="mt-1 font-medium text-foreground">{product.name}</dd>
              </div>
              <div>
                <dt className="text-eyebrow">Product code</dt>
                <dd className="mt-1 font-medium text-foreground">{product.code}</dd>
              </div>
              <div>
                <dt className="text-eyebrow">Status</dt>
                <dd className="mt-1">
                  <StatusPill tone={productStatusTone(product.status)} dot>
                    {product.status}
                  </StatusPill>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-eyebrow">Description</dt>
                <dd className="mt-1 text-muted-foreground">{product.description}</dd>
              </div>
            </dl>
          )}
        </Panel>

        <Panel
          title="Entitled organizations"
          description="Entitlement only. Roles, client scope and permissions remain inside the product."
          action={
            <Link to="/platform/access">
              <Btn>Manage access</Btn>
            </Link>
          }
        >
          {grantedOrgs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No organization is entitled to this product yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50 text-[13px]">
              {grantedOrgs.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-medium text-foreground">{o.name}</span>
                  <StatusPill tone="success" dot>
                    Granted
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PlatformShell>
  );
}

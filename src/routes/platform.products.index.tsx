import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Field,
  TextInput,
  TextArea,
  SelectInput,
} from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";
import { productStatusTone, type ProductStatus } from "@/lib/platform-data";

export const Route = createFileRoute("/platform/products/")({
  head: () => ({
    meta: [
      { title: "Products — Platform Administration" },
      {
        name: "description",
        content:
          "Products registered on the platform with product code, description and status. Register or edit basic product information.",
      },
      { property: "og:title", content: "Products — Platform Administration" },
      {
        property: "og:description",
        content: "Registered platform products and their status.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products, addProduct } = usePlatform();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("Draft");

  const submit = () => {
    if (!name.trim() || !code.trim()) return;
    addProduct({ name: name.trim(), code: code.trim().toUpperCase(), description, status });
    setName("");
    setCode("");
    setDescription("");
    setStatus("Draft");
    setAdding(false);
  };

  return (
    <PlatformShell>
      <PageHeader
        title="Products"
        description="Products registered under the platform. PayFlow is the only operational product in this phase."
        actions={
          <Btn variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Register product"}
          </Btn>
        }
      />

      {adding && (
        <Panel
          className="mt-6"
          title="Register product"
          description="Basic product information only — no plans, pricing or licensing."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name">
              <TextInput value={name} onChange={setName} placeholder="e.g. PayFlow" />
            </Field>
            <Field label="Product code">
              <TextInput value={code} onChange={setCode} placeholder="e.g. PAYFLOW" />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                onChange={(v) => setStatus(v as ProductStatus)}
                options={["Draft", "Active", "Inactive"]}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Short description">
                <TextArea
                  value={description}
                  onChange={setDescription}
                  placeholder="What this product does for an organization."
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn variant="primary" onClick={submit}>
              Save product
            </Btn>
            <Btn onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Panel>
      )}

      <Panel className="mt-6" bodyClassName="p-0">
        <DataTable head={["Product", "Code", "Description", "Status", ""]}>
          {products.map((p) => (
            <Tr key={p.id}>
              <Td>
                <PrimaryCell title={p.name} />
              </Td>
              <Td className="text-muted-foreground">{p.code}</Td>
              <Td className="min-w-[240px] max-w-[420px] whitespace-normal align-top text-muted-foreground">
                {p.description}
              </Td>
              <Td>
                <StatusPill tone={productStatusTone(p.status)} dot>
                  {p.status}
                </StatusPill>
              </Td>
              <Td className="text-right">
                <Link to="/platform/products/$productId" params={{ productId: p.id }}>
                  <Btn>View</Btn>
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </PlatformShell>
  );
}

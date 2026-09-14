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
  Field,
  TextInput,
  SelectInput,
  SearchInput,
  FilterSelect,
  EmptyState,
} from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";

export const Route = createFileRoute("/platform/people")({
  head: () => ({
    meta: [
      { title: "People & Product Assignment — Platform Administration" },
      {
        name: "description",
        content:
          "Add a person with their email and organization, then assign which products they may open.",
      },
      { property: "og:title", content: "People & Product Assignment — Platform Administration" },
      {
        property: "og:description",
        content: "Platform people directory with per-person product assignment.",
      },
    ],
  }),
  component: PlatformPeoplePage,
});

const NEW_ORG = "__new__";

function PlatformPeoplePage() {
  const {
    people,
    products,
    organizations,
    organizationById,
    entitlementStatus,
    addPerson,
    updatePerson,
    addOrganization,
  } = usePlatform();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgChoice, setOrgChoice] = useState(organizations[0]?.name ?? "");
  const [newOrgName, setNewOrgName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("All Organizations");

  const activeProducts = products.filter((p) => p.status === "Active");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter(
        (p) => orgFilter === "All Organizations" || organizationById(p.organizationId)?.name === orgFilter,
      )
      .filter(
        (p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
      );
  }, [people, query, orgFilter, organizationById]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setOrgChoice(organizations[0]?.name ?? "");
    setNewOrgName("");
    setSelectedProducts([]);
    setError(null);
  };

  const toggleProduct = (id: string) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const submit = () => {
    if (!name.trim()) return setError("Enter the person's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Enter a valid work email address.");
    if (people.some((p) => p.email.toLowerCase() === email.trim().toLowerCase()))
      return setError("A person with this email already exists.");
    const orgName = orgChoice === NEW_ORG ? newOrgName.trim() : orgChoice;
    if (!orgName) return setError("Enter the organization name.");
    if (selectedProducts.length === 0) return setError("Assign at least one product.");

    const organizationId = addOrganization(orgName);
    addPerson({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      organizationId,
      productIds: selectedProducts,
    });
    resetForm();
    setAdding(false);
  };

  return (
    <PlatformShell>
      <PageHeader
        breadcrumb={[{ label: "Platform", to: "/platform" }, { label: "People" }]}
        title="People & Product Assignment"
        description="Add a person with their email and organization, then select which products they may open. Assignment controls product entry only — roles, client scope and permissions stay inside each product."
        actions={
          <Btn
            variant={adding ? "ghost" : "primary"}
            onClick={() => {
              setAdding((v) => !v);
              resetForm();
            }}
          >
            {adding ? "Cancel" : "Add person"}
          </Btn>
        }
      />

      {adding && (
        <Panel className="mt-6" title="New person">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <TextInput value={name} onChange={setName} placeholder="e.g. Aisha Rahman" />
            </Field>
            <Field label="Work Email">
              <TextInput value={email} onChange={setEmail} placeholder="person@company.com" />
            </Field>
            <Field label="Organization">
              <SelectInput
                value={orgChoice}
                onChange={setOrgChoice}
                options={[...organizations.map((o) => o.name), NEW_ORG]}
              />
            </Field>
            {orgChoice === NEW_ORG && (
              <Field label="New Organization Name">
                <TextInput
                  value={newOrgName}
                  onChange={setNewOrgName}
                  placeholder="e.g. Harbour Credit Union"
                />
              </Field>
            )}
          </div>

          <div className="mt-5">
            <p className="text-eyebrow">Assign products</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {activeProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-border-strong"
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="mt-0.5 size-3.5 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground">
                      {product.name}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {product.code}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="mt-4 text-[12.5px] font-medium text-destructive">{error}</p>}

          <div className="mt-5 flex gap-2">
            <Btn variant="primary" onClick={submit}>
              Add person
            </Btn>
            <Btn
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              Cancel
            </Btn>
          </div>
        </Panel>
      )}

      <Panel className="mt-6" bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-5 py-3.5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search people or emails"
            className="w-full sm:w-[280px]"
          />
          <FilterSelect
            label="Organization"
            value={orgFilter}
            onChange={setOrgFilter}
            options={["All Organizations", ...organizations.map((o) => o.name)]}
          />
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No people found"
              description="Adjust the search or filters, or add a person to assign product access."
            />
          </div>
        ) : (
          <DataTable head={["Person", "Organization", "Assigned products", ""]}>
            {rows.map((person) => {
              const org = organizationById(person.organizationId);
              return (
                <Tr key={person.id}>
                  <Td>
                    <PrimaryCell title={person.name} subtitle={person.email} />
                  </Td>
                  <Td className="text-muted-foreground">{org?.name ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProducts
                        .filter((p) => person.productIds.includes(p.id))
                        .map((p) => {
                          const granted =
                            entitlementStatus(person.organizationId, p.id) === "Granted";
                          return (
                            <StatusPill key={p.id} tone={granted ? "success" : "warning"} dot>
                              {granted ? p.name : `${p.name} · org revoked`}
                            </StatusPill>
                          );
                        })}
                      {person.productIds.length === 0 && (
                        <span className="text-[12.5px] text-muted-foreground">
                          No products assigned
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {activeProducts.map((p) => {
                        const assigned = person.productIds.includes(p.id);
                        return (
                          <Btn
                            key={p.id}
                            variant={assigned ? "danger" : undefined}
                            onClick={() =>
                              updatePerson(person.id, {
                                productIds: assigned
                                  ? person.productIds.filter((id) => id !== p.id)
                                  : [...person.productIds, p.id],
                              })
                            }
                          >
                            {assigned ? `Remove ${p.name}` : `Assign ${p.name}`}
                          </Btn>
                        );
                      })}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        )}
      </Panel>
    </PlatformShell>
  );
}

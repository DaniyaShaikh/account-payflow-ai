import { useContext, useMemo, useState, type ReactNode } from "react";
import { createStableContext } from "./stable-context";
import {
  seedProducts,
  seedOrganizations,
  seedEntitlements,
  seedPeople,
  currentOrganizationId,
  currentPersonId,
  PAYFLOW_PRODUCT_ID,
  type PlatformProduct,
  type PlatformOrganization,
  type ProductEntitlement,
  type PlatformPerson,
} from "./platform-data";

interface PlatformContextValue {
  products: PlatformProduct[];
  organizations: PlatformOrganization[];
  entitlements: ProductEntitlement[];
  people: PlatformPerson[];
  productById: (id: string) => PlatformProduct | undefined;
  organizationById: (id: string) => PlatformOrganization | undefined;
  personById: (id: string) => PlatformPerson | undefined;
  entitlementStatus: (organizationId: string, productId: string) => "Granted" | "Revoked";
  /** Products a person may open: assigned to them and granted to their organization. */
  productsForPerson: (personId: string) => PlatformProduct[];
  /** Products the signed-in person may open. */
  entitledProducts: PlatformProduct[];
  currentPerson: PlatformPerson | undefined;
  currentOrganization: PlatformOrganization | undefined;
  hasPayflowAccess: boolean;
  addProduct: (product: Omit<PlatformProduct, "id">) => string;
  updateProduct: (id: string, patch: Partial<Omit<PlatformProduct, "id">>) => void;
  addOrganization: (name: string) => string;
  addPerson: (person: Omit<PlatformPerson, "id">) => string;
  updatePerson: (id: string, patch: Partial<Omit<PlatformPerson, "id">>) => void;
  setEntitlement: (
    organizationId: string,
    productId: string,
    status: "Granted" | "Revoked",
  ) => void;
}

const PlatformContext = createStableContext<PlatformContextValue | null>("platform", null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<PlatformProduct[]>(seedProducts);
  const [entitlements, setEntitlements] = useState<ProductEntitlement[]>(seedEntitlements);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>(seedOrganizations);
  const [people, setPeople] = useState<PlatformPerson[]>(seedPeople);

  const value = useMemo<PlatformContextValue>(() => {
    const statusFor = (organizationId: string, productId: string) =>
      entitlements.find(
        (e) => e.organizationId === organizationId && e.productId === productId,
      )?.status ?? "Revoked";

    const productsForPerson = (personId: string) => {
      const person = people.find((p) => p.id === personId);
      if (!person) return [];
      return products.filter(
        (product) =>
          product.status === "Active" &&
          person.productIds.includes(product.id) &&
          statusFor(person.organizationId, product.id) === "Granted",
      );
    };

    const entitledProducts = productsForPerson(currentPersonId);

    return {
      products,
      organizations,
      entitlements,
      people,
      productById: (id) => products.find((p) => p.id === id),
      organizationById: (id) => organizations.find((o) => o.id === id),
      personById: (id) => people.find((p) => p.id === id),
      entitlementStatus: statusFor,
      productsForPerson,
      entitledProducts,
      currentPerson: people.find((p) => p.id === currentPersonId),
      currentOrganization: organizations.find((o) => o.id === currentOrganizationId),
      hasPayflowAccess: entitledProducts.some((p) => p.id === PAYFLOW_PRODUCT_ID),
      addProduct: (product) => {
        const id = `prod-${product.code.toLowerCase().replace(/[^a-z0-9]+/g, "-") || Date.now()}`;
        setProducts((prev) => [...prev, { ...product, id }]);
        return id;
      },
      updateProduct: (id, patch) =>
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      addOrganization: (name) => {
        const existing = organizations.find(
          (o) => o.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (existing) return existing.id;
        const id = `org-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28) || Date.now()}`;
        setOrganizations((prev) => [...prev, { id, name: name.trim() }]);
        return id;
      },
      addPerson: (person) => {
        const id = `person-${person.email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        setPeople((prev) => [...prev, { ...person, id }]);
        return id;
      },
      updatePerson: (id, patch) =>
        setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      setEntitlement: (organizationId, productId, status) =>
        setEntitlements((prev) => {
          const exists = prev.some(
            (e) => e.organizationId === organizationId && e.productId === productId,
          );
          if (!exists) return [...prev, { organizationId, productId, status }];
          return prev.map((e) =>
            e.organizationId === organizationId && e.productId === productId
              ? { ...e, status }
              : e,
          );
        }),
    };
  }, [products, entitlements, organizations, people]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

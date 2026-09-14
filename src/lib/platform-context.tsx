import { useContext, useMemo, useState, type ReactNode } from "react";
import { createStableContext } from "./stable-context";
import {
  seedProducts,
  seedOrganizations,
  seedEntitlements,
  currentOrganizationId,
  PAYFLOW_PRODUCT_ID,
  type PlatformProduct,
  type PlatformOrganization,
  type ProductEntitlement,
} from "./platform-data";

interface PlatformContextValue {
  products: PlatformProduct[];
  organizations: PlatformOrganization[];
  entitlements: ProductEntitlement[];
  productById: (id: string) => PlatformProduct | undefined;
  organizationById: (id: string) => PlatformOrganization | undefined;
  entitlementStatus: (organizationId: string, productId: string) => "Granted" | "Revoked";
  /** Products the signed-in user's organization may open. */
  entitledProducts: PlatformProduct[];
  currentOrganization: PlatformOrganization | undefined;
  hasPayflowAccess: boolean;
  addProduct: (product: Omit<PlatformProduct, "id">) => string;
  updateProduct: (id: string, patch: Partial<Omit<PlatformProduct, "id">>) => void;
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

  const value = useMemo<PlatformContextValue>(() => {
    const statusFor = (organizationId: string, productId: string) =>
      entitlements.find(
        (e) => e.organizationId === organizationId && e.productId === productId,
      )?.status ?? "Revoked";

    const entitledProducts = products.filter(
      (p) => p.status === "Active" && statusFor(currentOrganizationId, p.id) === "Granted",
    );

    return {
      products,
      organizations: seedOrganizations,
      entitlements,
      productById: (id) => products.find((p) => p.id === id),
      organizationById: (id) => seedOrganizations.find((o) => o.id === id),
      entitlementStatus: statusFor,
      entitledProducts,
      currentOrganization: seedOrganizations.find((o) => o.id === currentOrganizationId),
      hasPayflowAccess: entitledProducts.some((p) => p.id === PAYFLOW_PRODUCT_ID),
      addProduct: (product) => {
        const id = `prod-${product.code.toLowerCase().replace(/[^a-z0-9]+/g, "-") || Date.now()}`;
        setProducts((prev) => [...prev, { ...product, id }]);
        return id;
      },
      updateProduct: (id, patch) =>
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
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
  }, [products, entitlements]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

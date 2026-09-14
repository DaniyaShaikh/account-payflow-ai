/**
 * Platform layer above the products. This is intentionally thin: it registers
 * products and records which organization is entitled to which product.
 * It carries no billing, pricing, seat or licensing concepts.
 */

export type ProductStatus = "Active" | "Draft" | "Inactive";
export type EntitlementStatus = "Granted" | "Revoked";

export interface PlatformProduct {
  id: string;
  name: string;
  code: string;
  description: string;
  status: ProductStatus;
}

export interface PlatformOrganization {
  id: string;
  name: string;
}

export interface ProductEntitlement {
  organizationId: string;
  productId: string;
  status: EntitlementStatus;
}

export const PAYFLOW_PRODUCT_ID = "prod-payflow";

export const seedProducts: PlatformProduct[] = [
  {
    id: PAYFLOW_PRODUCT_ID,
    name: "PayFlow",
    code: "PAYFLOW",
    description:
      "Collections operations: client portfolios, customer accounts, collection cases, adaptive workflows and governed AI decisions.",
    status: "Active",
  },
];

export const seedOrganizations: PlatformOrganization[] = [
  { id: "org-payflow-ops", name: "PayFlow Operations (internal)" },
  { id: "org-northstar", name: "Northstar Financial Group" },
  { id: "org-arcadia", name: "Arcadia Utilities" },
];

export const seedEntitlements: ProductEntitlement[] = [
  { organizationId: "org-payflow-ops", productId: PAYFLOW_PRODUCT_ID, status: "Granted" },
  { organizationId: "org-northstar", productId: PAYFLOW_PRODUCT_ID, status: "Granted" },
  { organizationId: "org-arcadia", productId: PAYFLOW_PRODUCT_ID, status: "Revoked" },
];

/** The organization behind the signed-in demo user. */
export const currentOrganizationId = "org-payflow-ops";

export function productStatusTone(status: ProductStatus) {
  return status === "Active" ? "success" : status === "Draft" ? "warning" : "muted";
}

export function entitlementTone(status: EntitlementStatus) {
  return status === "Granted" ? "success" : "danger";
}

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
/** Illustrative second product: exists only to show multi-product connections. */
export const SAMPLE_PRODUCT_ID = "prod-insightiq";

export interface PlatformPerson {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  /** Products this person may open (within their organization's entitlement). */
  productIds: string[];
}

export const seedProducts: PlatformProduct[] = [
  {
    id: PAYFLOW_PRODUCT_ID,
    name: "PayFlow",
    code: "PAYFLOW",
    description:
      "Collections operations: client portfolios, customer accounts, collection cases, adaptive workflows and governed AI decisions.",
    status: "Active",
  },
  {
    id: SAMPLE_PRODUCT_ID,
    name: "InsightIQ",
    code: "INSIGHTIQ",
    description:
      "Sample second product, registered to show multi-product access. It has no operational screens in this phase.",
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
  { organizationId: "org-payflow-ops", productId: SAMPLE_PRODUCT_ID, status: "Granted" },
  { organizationId: "org-northstar", productId: PAYFLOW_PRODUCT_ID, status: "Granted" },
  { organizationId: "org-northstar", productId: SAMPLE_PRODUCT_ID, status: "Revoked" },
  { organizationId: "org-arcadia", productId: PAYFLOW_PRODUCT_ID, status: "Revoked" },
  { organizationId: "org-arcadia", productId: SAMPLE_PRODUCT_ID, status: "Revoked" },
];

export const seedPeople: PlatformPerson[] = [
  {
    id: "person-daniya",
    name: "Daniya Khan",
    email: "daniya@payflow.ai",
    organizationId: "org-payflow-ops",
    productIds: [PAYFLOW_PRODUCT_ID, SAMPLE_PRODUCT_ID],
  },
  {
    id: "person-zeeshan",
    name: "Zeeshan Ahmed",
    email: "zeeshan@payflow.ai",
    organizationId: "org-payflow-ops",
    productIds: [PAYFLOW_PRODUCT_ID],
  },
  {
    id: "person-northstar-lead",
    name: "Meera Patel",
    email: "meera.patel@northstarfg.com",
    organizationId: "org-northstar",
    productIds: [PAYFLOW_PRODUCT_ID],
  },
];

/** The signed-in demo person. */
export const currentPersonId = "person-daniya";

/** The organization behind the signed-in demo user. */
export const currentOrganizationId = "org-payflow-ops";

export function productStatusTone(status: ProductStatus): "success" | "warning" | "neutral" {
  return status === "Active" ? "success" : status === "Draft" ? "warning" : "neutral";
}

export function entitlementTone(status: EntitlementStatus): "success" | "danger" {
  return status === "Granted" ? "success" : "danger";
}

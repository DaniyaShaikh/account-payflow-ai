/**
 * User and role model for PayFlow.
 *
 * Roles are definable: PayFlow ships Operations Admin (platform-wide) and
 * Supervisor (client-scoped), and an admin can add further roles built from the
 * same permission set. Client assignment controls WHERE a client-scoped user
 * works, permissions control WHAT they may do there, and permissions can still
 * differ per assigned client.
 */

/** A role name — built-in or admin-defined. */
export type UserRole = string;
export type UserStatus = "Active" | "Inactive";
export type PermissionProfile = string;

export type RoleScope = "Platform-wide" | "Client-scoped";

export interface RoleDefinition {
  id: string;
  name: string;
  scope: RoleScope;
  description: string;
  /** Default permission set applied when the role is assigned to a client. */
  permissions: string[];
  /** Built-in roles cannot be deleted. */
  builtIn: boolean;
}

export const ADMIN_ROLE_NAME = "Operations Admin";
export const SUPERVISOR_ROLE_NAME = "Supervisor";

/** Grouped so the UI stays scannable instead of a permission matrix. */
export const permissionGroups = [
  {
    group: "Client & Case Access",
    permissions: ["View Client", "View Customer Accounts", "View Collection Cases"],
  },
  {
    group: "Collection Operations",
    permissions: ["View Workflows", "View Communications"],
  },
  {
    group: "Human Review",
    permissions: [
      "View Human Reviews",
      "Approve Human Reviews",
      "Modify / Guide AI Recommendation",
    ],
  },
  {
    group: "Governance",
    permissions: ["View Rules", "Create / Edit Client Rules", "Modify Governance"],
  },
  {
    group: "Analytics",
    permissions: ["View Analytics"],
  },
  {
    group: "Client Configuration",
    permissions: ["Modify AI Mode", "Modify Client Configuration"],
  },
] as const;

export const allPermissions: string[] = permissionGroups.flatMap((g) => [...g.permissions]);

/** Demonstration default — not a finalised business requirement. */
export const standardSupervisorPermissions = [
  "View Client",
  "View Customer Accounts",
  "View Collection Cases",
  "View Workflows",
  "View Communications",
  "View Human Reviews",
  "Approve Human Reviews",
  "View Rules",
  "View Analytics",
];

export interface ClientAssignment {
  clientId: string;
  permissions: string[];
}

export interface AccessHistoryEntry {
  at: string;
  event: string;
  by: string;
}

export interface PayflowUser {
  id: string;
  name: string;
  /** Short name used across existing client and review records. */
  shortName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
  assignments: ClientAssignment[];
  history: AccessHistoryEntry[];
}

export function samePermissionSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((p) => b.includes(p));
}

export function profileFor(permissions: string[]): PermissionProfile {
  return samePermissionSet(permissions, standardSupervisorPermissions)
    ? "Standard Supervisor"
    : "Custom";
}

/** Profile shown on the users table — the profile across every assignment. */
export function userProfile(user: PayflowUser): PermissionProfile {
  if (user.role === "Operations Admin") return "Full Access";
  if (user.assignments.length === 0) return "Custom";
  const profiles = user.assignments.map((a) => profileFor(a.permissions));
  return profiles.every((p) => p === "Standard Supervisor") ? "Standard Supervisor" : "Custom";
}

export function shortNameFor(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

const standard = () => [...standardSupervisorPermissions];

export const usersSeed: PayflowUser[] = [
  {
    id: "u-daniya",
    name: "Daniya Shaikh",
    shortName: "Daniya",
    email: "daniya.shaikh@payflow.io",
    role: "Operations Admin",
    status: "Active",
    lastActive: "Today",
    assignments: [],
    history: [
      { at: "01 Sep 2026", event: "Operations Admin access granted", by: "PayFlow Setup" },
    ],
  },
  {
    id: "u-zeeshan",
    name: "Zeeshan Ahmed",
    shortName: "Zeeshan",
    email: "zeeshan.ahmed@payflow.io",
    role: "Supervisor",
    status: "Active",
    lastActive: "Today",
    assignments: [
      {
        clientId: "paypal",
        permissions: [...standard(), "Create / Edit Client Rules"],
      },
      { clientId: "canadian-tire", permissions: standard() },
    ],
    history: [
      {
        at: "12 Sep 2026",
        event: "Client rule creation enabled for PayPal",
        by: "Daniya Shaikh",
      },
      { at: "05 Sep 2026", event: "Canadian Tire assigned", by: "Daniya Shaikh" },
      { at: "02 Sep 2026", event: "PayPal assigned", by: "Daniya Shaikh" },
      { at: "02 Sep 2026", event: "Supervisor account created", by: "Daniya Shaikh" },
    ],
  },
  {
    id: "u-sarah",
    name: "Sarah Chen",
    shortName: "Sarah",
    email: "sarah.chen@payflow.io",
    role: "Supervisor",
    status: "Active",
    lastActive: "Yesterday",
    assignments: [{ clientId: "northstar-utilities", permissions: standard() }],
    history: [
      { at: "04 Sep 2026", event: "Northstar Utilities assigned", by: "Daniya Shaikh" },
      { at: "04 Sep 2026", event: "Supervisor account created", by: "Daniya Shaikh" },
    ],
  },
  {
    id: "u-ahmed",
    name: "Ahmed Raza",
    shortName: "Ahmed",
    email: "ahmed.raza@payflow.io",
    role: "Supervisor",
    status: "Active",
    lastActive: "2 days ago",
    assignments: [{ clientId: "paypal", permissions: standard() }],
    history: [
      { at: "06 Sep 2026", event: "PayPal assigned", by: "Daniya Shaikh" },
      { at: "06 Sep 2026", event: "Supervisor account created", by: "Daniya Shaikh" },
    ],
  },
  {
    id: "u-priya",
    name: "Priya Nair",
    shortName: "Priya",
    email: "priya.nair@payflow.io",
    role: "Supervisor",
    status: "Inactive",
    lastActive: "18 Aug 2026",
    assignments: [
      {
        clientId: "canadian-tire",
        permissions: ["View Client", "View Customer Accounts", "View Collection Cases"],
      },
    ],
    history: [
      { at: "19 Aug 2026", event: "User deactivated", by: "Daniya Shaikh" },
      { at: "10 Aug 2026", event: "Canadian Tire assigned", by: "Daniya Shaikh" },
    ],
  },
];

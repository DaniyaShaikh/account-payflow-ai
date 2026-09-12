// Governance rule model — structured and machine-readable.
// Categories, fields, operators and actions are intentionally extensible:
// adding an entry here surfaces it in the rule builder with no UI changes.

export type RuleType = "System Rule" | "Client Rule";
export type RuleStatus = "Draft" | "Active" | "Inactive";
export type RuleLogic = "ALL" | "ANY";
export type FieldType = "currency" | "number" | "percent" | "text" | "enum";

export interface RuleField {
  label: string;
  category: string;
  type: FieldType;
  options?: string[];
  unitHint?: string;
}

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface RuleHistoryEntry {
  at: string;
  change: string;
  by: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  /** null = system scope, available globally */
  clientId: string | null;
  category: string;
  logic: RuleLogic;
  conditions: RuleCondition[];
  action: string;
  status: RuleStatus;
  createdBy: string;
  lastUpdated: string;
  triggers7d: number;
  /** For system rules: client ids where the rule has been applied. */
  appliedTo: string[];
  history: RuleHistoryEntry[];
}

export const ruleCategories = [
  "Amount",
  "Collection Attempts",
  "Payment Status",
  "Payment Activity",
  "Promise-to-Pay",
  "Payment Plan",
  "Workflow",
  "Communication",
  "Customer Risk",
  "AI Confidence",
] as const;

export const ruleActions = [
  "Require Human Review",
  "Hold Action",
  "Prevent Communication",
  "Request Reassessment",
  "Escalate Case",
  "Apply / Change Workflow",
] as const;

export const ruleFields: RuleField[] = [
  { label: "Outstanding Balance", category: "Amount", type: "currency" },
  { label: "Original Balance", category: "Amount", type: "currency" },
  { label: "Recovered Amount", category: "Amount", type: "currency" },
  { label: "Unsuccessful Attempts", category: "Collection Attempts", type: "number" },
  { label: "Total Contact Attempts", category: "Collection Attempts", type: "number" },
  { label: "Days Since Last Contact", category: "Collection Attempts", type: "number" },
  {
    label: "Payment Status",
    category: "Payment Status",
    type: "enum",
    options: ["Unpaid", "Partially Paid", "Paid", "Failed", "Refunded"],
  },
  { label: "Days Past Due", category: "Payment Status", type: "number" },
  { label: "Failed Payment Attempts", category: "Payment Activity", type: "number" },
  { label: "Last Payment Amount", category: "Payment Activity", type: "currency" },
  {
    label: "Promise-to-Pay Status",
    category: "Promise-to-Pay",
    type: "enum",
    options: ["None", "Active", "Kept", "Broken"],
  },
  { label: "Days Until Promise Date", category: "Promise-to-Pay", type: "number" },
  {
    label: "Payment Plan Status",
    category: "Payment Plan",
    type: "enum",
    options: ["None", "On Track", "At Risk", "Defaulted"],
  },
  { label: "Missed Installments", category: "Payment Plan", type: "number" },
  {
    label: "Workflow",
    category: "Workflow",
    type: "enum",
    options: [
      "Early Stage Collection",
      "Progressive Reminder",
      "Promise-to-Pay Follow-Up",
      "Payment Plan Monitoring",
      "Escalated Collection",
    ],
  },
  { label: "Workflow Stage", category: "Workflow", type: "text" },
  {
    label: "Channel",
    category: "Communication",
    type: "enum",
    options: ["Email", "SMS", "WhatsApp"],
  },
  { label: "Messages Sent (7 days)", category: "Communication", type: "number" },
  { label: "Customer Reply Content", category: "Communication", type: "text" },
  {
    label: "Customer Risk Level",
    category: "Customer Risk",
    type: "enum",
    options: ["Low", "Medium", "High"],
  },
  { label: "Dispute Flag", category: "Customer Risk", type: "enum", options: ["Yes", "No"] },
  { label: "AI Confidence", category: "AI Confidence", type: "percent" },
  { label: "AI Recommendation Type", category: "AI Confidence", type: "text" },
];

const numericOperators = [
  "Equals",
  "Does Not Equal",
  "Greater Than",
  "Greater Than or Equal To",
  "Less Than",
  "Less Than or Equal To",
];
const textOperators = ["Equals", "Does Not Equal", "Contains", "Does Not Contain"];
const enumOperators = ["Is", "Is Not"];

export function fieldByLabel(label: string) {
  return ruleFields.find((f) => f.label === label);
}

export function operatorsForField(label: string): string[] {
  const field = fieldByLabel(label);
  if (!field) return numericOperators;
  if (field.type === "text") return textOperators;
  if (field.type === "enum") return enumOperators;
  return numericOperators;
}

export function formatConditionValue(fieldLabel: string, value: string) {
  const field = fieldByLabel(fieldLabel);
  if (!value) return "—";
  if (!field) return value;
  if (field.type === "currency") {
    const num = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) && value.trim() !== ""
      ? `$${num.toLocaleString("en-US")}`
      : value;
  }
  if (field.type === "percent") return `${value}%`;
  return value;
}

export function conditionSummary(condition: RuleCondition) {
  return `${condition.field} ${condition.operator.toLowerCase()} ${formatConditionValue(
    condition.field,
    condition.value,
  )}`;
}

export function ruleConditionSummary(rule: Pick<Rule, "conditions" | "logic">) {
  if (rule.conditions.length === 0) return "No conditions configured";
  const joiner = rule.logic === "ALL" ? " AND " : " OR ";
  return rule.conditions.map(conditionSummary).join(joiner);
}

export function ruleReadableSummary(
  rule: Pick<Rule, "conditions" | "logic" | "action">,
): { lines: string[]; action: string } {
  const joiner = rule.logic === "ALL" ? "AND" : "OR";
  const lines: string[] = [];
  rule.conditions.forEach((c, i) => {
    if (i > 0) lines.push(joiner);
    lines.push(conditionSummary(c));
  });
  return { lines, action: rule.action };
}

let idCounter = 0;
export function newConditionId() {
  idCounter += 1;
  return `cond-${idCounter}-${idCounter * 7919}`;
}

export function blankCondition(field = "Outstanding Balance"): RuleCondition {
  return {
    id: newConditionId(),
    field,
    operator: operatorsForField(field)[0] ?? "Equals",
    value: "",
  };
}

export const rulesSeed: Rule[] = [
  {
    id: "high-balance-review",
    name: "High Balance Review",
    description:
      "Routes high-value accounts to a supervisor before any autonomous collection action is executed.",
    type: "Client Rule",
    clientId: "paypal",
    category: "Amount",
    logic: "ALL",
    conditions: [
      {
        id: "hb-1",
        field: "Outstanding Balance",
        operator: "Greater Than",
        value: "10000",
      },
    ],
    action: "Require Human Review",
    status: "Active",
    createdBy: "Daniya Shaikh",
    lastUpdated: "12 Sep 2026",
    triggers7d: 14,
    appliedTo: ["paypal"],
    history: [
      { at: "12 Sep 2026", change: "Threshold updated", by: "Daniya Shaikh" },
      { at: "10 Sep 2026", change: "Rule activated", by: "Daniya Shaikh" },
      { at: "08 Sep 2026", change: "Rule created", by: "Daniya Shaikh" },
    ],
  },
  {
    id: "repeated-attempts-escalation",
    name: "Repeated Attempts Escalation",
    description:
      "Escalates accounts where repeated outreach has not produced a response or payment commitment.",
    type: "System Rule",
    clientId: null,
    category: "Collection Attempts",
    logic: "ALL",
    conditions: [
      {
        id: "ra-1",
        field: "Unsuccessful Attempts",
        operator: "Greater Than or Equal To",
        value: "3",
      },
    ],
    action: "Require Human Review",
    status: "Active",
    createdBy: "Daniya Shaikh",
    lastUpdated: "09 Sep 2026",
    triggers7d: 42,
    appliedTo: ["canadian-tire", "northstar-utilities"],
    history: [
      { at: "09 Sep 2026", change: "Applied to Canadian Tire", by: "Daniya Shaikh" },
      { at: "02 Sep 2026", change: "Rule activated", by: "Daniya Shaikh" },
    ],
  },
  {
    id: "low-confidence-review",
    name: "Low Confidence Review",
    description:
      "Requires supervisor judgement when the AI recommendation confidence falls below the configured threshold.",
    type: "Client Rule",
    clientId: "canadian-tire",
    category: "AI Confidence",
    logic: "ALL",
    conditions: [
      { id: "lc-1", field: "AI Confidence", operator: "Less Than", value: "70" },
    ],
    action: "Require Human Review",
    status: "Active",
    createdBy: "Zeeshan",
    lastUpdated: "11 Sep 2026",
    triggers7d: 9,
    appliedTo: ["canadian-tire"],
    history: [
      { at: "11 Sep 2026", change: "Threshold updated", by: "Zeeshan" },
      { at: "04 Sep 2026", change: "Rule created", by: "Zeeshan" },
    ],
  },
  {
    id: "dispute-detected-review",
    name: "Dispute Detected Review",
    description: "Holds collection activity when a customer disputes the balance.",
    type: "System Rule",
    clientId: null,
    category: "Customer Risk",
    logic: "ANY",
    conditions: [
      { id: "dd-1", field: "Dispute Flag", operator: "Is", value: "Yes" },
      {
        id: "dd-2",
        field: "Customer Reply Content",
        operator: "Contains",
        value: "dispute",
      },
    ],
    action: "Hold Action",
    status: "Active",
    createdBy: "Daniya Shaikh",
    lastUpdated: "07 Sep 2026",
    triggers7d: 6,
    appliedTo: ["paypal", "canadian-tire"],
    history: [{ at: "07 Sep 2026", change: "Rule activated", by: "Daniya Shaikh" }],
  },
  {
    id: "broken-promise-escalation",
    name: "Broken Promise Escalation",
    description: "Escalates cases where a promise-to-pay was not honoured.",
    type: "Client Rule",
    clientId: "canadian-tire",
    category: "Promise-to-Pay",
    logic: "ALL",
    conditions: [
      { id: "bp-1", field: "Promise-to-Pay Status", operator: "Is", value: "Broken" },
      { id: "bp-2", field: "Outstanding Balance", operator: "Greater Than", value: "2500" },
    ],
    action: "Escalate Case",
    status: "Draft",
    createdBy: "Zeeshan",
    lastUpdated: "12 Sep 2026",
    triggers7d: 0,
    appliedTo: ["canadian-tire"],
    history: [{ at: "12 Sep 2026", change: "Draft created", by: "Zeeshan" }],
  },
  {
    id: "quiet-period-guard",
    name: "Quiet Period Guard",
    description:
      "Prevents further outreach when the account has already received the configured weekly message volume.",
    type: "System Rule",
    clientId: null,
    category: "Communication",
    logic: "ALL",
    conditions: [
      {
        id: "qp-1",
        field: "Messages Sent (7 days)",
        operator: "Greater Than or Equal To",
        value: "4",
      },
    ],
    action: "Prevent Communication",
    status: "Active",
    createdBy: "Daniya Shaikh",
    lastUpdated: "05 Sep 2026",
    triggers7d: 28,
    appliedTo: ["paypal", "canadian-tire", "northstar-utilities"],
    history: [{ at: "05 Sep 2026", change: "Rule activated", by: "Daniya Shaikh" }],
  },
  {
    id: "northstar-hardship-review",
    name: "Hardship Signal Review",
    description: "Client-specific review for utility customers signalling financial hardship.",
    type: "Client Rule",
    clientId: "northstar-utilities",
    category: "Customer Risk",
    logic: "ALL",
    conditions: [
      { id: "nh-1", field: "Customer Risk Level", operator: "Is", value: "High" },
    ],
    action: "Require Human Review",
    status: "Active",
    createdBy: "Sarah",
    lastUpdated: "10 Sep 2026",
    triggers7d: 5,
    appliedTo: ["northstar-utilities"],
    history: [{ at: "10 Sep 2026", change: "Rule activated", by: "Sarah" }],
  },
];

export function statusToneForRule(status: RuleStatus) {
  if (status === "Active") return "success" as const;
  if (status === "Draft") return "warning" as const;
  return "neutral" as const;
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "rule"
  );
}

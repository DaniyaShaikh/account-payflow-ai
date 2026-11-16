import { templateForNode, templatesFor, type Strategy, type StrategyNode } from "./strategy-data";
import { defaultCommunicationSegments, segmentIsActive, validateCommunicationSegments, type CommunicationSegments } from "./communication-segments";

/** Content variants only: these bands never change workflow targeting or execution. */
export const communicationAgeGroups = [
  { id: "age-18-24", label: "Age 18–24", min: 18, max: 24 },
  { id: "age-25-34", label: "Age 25–34", min: 25, max: 34 },
  { id: "age-35-44", label: "Age 35–44", min: 35, max: 44 },
  { id: "age-45-54", label: "Age 45–54", min: 45, max: 54 },
  { id: "age-55-64", label: "Age 55–64", min: 55, max: 64 },
  { id: "age-65-plus", label: "Age 65+", min: 65, max: Infinity },
];

export type VersionStatus = "Pending Review" | "Reviewed" | "Modified";
export interface CommunicationVersion {
  id: string;
  subject: string;
  emailBody: string;
  smsContent: string;
  explanation: string;
  status: VersionStatus;
  revision: number;
  hasUnsavedChanges?: boolean;
  /** Immutable copy shared by all versions, not editable age-based terms. */
  protectedEmail: string;
  protectedSms: string;
}

export function versionLabel(id: string, config?: CommunicationSegments) {
  return id === "default" ? "Main / Default" : (config ?? defaultCommunicationSegments()).rules.find((g) => g.id === id)?.name ?? id;
}

export function initialCommunicationVersions(node: StrategyNode, reviewed = false): CommunicationVersion[] {
  const email = templatesFor("Email", node.config.purpose)[0];
  const sms = templatesFor("SMS", node.config.purpose)[0];
  const current = templateForNode(node);
  const base: CommunicationVersion = {
    id: "default",
    subject: (current?.channel === "Email" ? current.subject : email?.subject) ?? "A reminder about your account",
    emailBody: email?.body ?? "Hi {{first_name}},\n\nPlease review your account when convenient.\n\n{{payment_link}}\n\n{{brand_name}}",
    smsContent: sms?.body ?? "{{brand_name}}: Please review account {{account_reference}}. {{payment_link}}",
    explanation: "Simulated AI explanation: uses the available reminder purpose and approved template. Country, region and balance remain workflow context; no age-based changes to terms, disclosures or contact pressure.",
    status: reviewed ? "Reviewed" : "Pending Review",
    revision: 0,
    protectedEmail: "",
    protectedSms: "",
  };
  // Preserve the entire approved template as shared protected copy. Only the neutral
  // introductory sentence and subject can vary across the mock age versions.
  base.protectedEmail = base.emailBody;
  base.protectedSms = base.smsContent;
  return node.origin === "AI Proposed"
    ? [base, ...communicationAgeGroups.filter((_, index) => index === 0 || index === 5).map((group) => mockRegenerateVersion({ ...base, id: group.id }, reviewed))]
    : [base];
}

export function mockRegenerateVersion(version: CommunicationVersion, reviewed = false): CommunicationVersion {
  const revision = version.revision + 1;
  const intro = revision % 2 ? "Here is a clear summary of your account reminder." : "Here is your account reminder in a concise format.";
  return {
    ...version,
    subject: revision % 2 ? "Your account reminder — a quick summary" : "A clear reminder about your account",
    emailBody: `${intro}\n\n${version.protectedEmail}`,
    smsContent: `${revision % 2 ? "Account reminder." : "Account summary."} ${version.protectedSms}`,
    explanation: `Simulated AI explanation: ${versionLabel(version.id)} uses a ${revision % 2 ? "plain-language introduction" : "concise introduction"}. Only presentation changes; the approved reminder copy, legal disclosures, payment terms and collection pressure stay identical. Available geographic, balance and reminder context is retained.`,
    revision,
    status: reviewed ? "Reviewed" : "Pending Review",
    hasUnsavedChanges: false,
  };
}

export function validateCommunicationVersion(version: CommunicationVersion): string[] {
  const errors: string[] = [];
  if (!version.subject.trim() || !version.emailBody.trim() || !version.smsContent.trim()) errors.push("Email subject, email body and SMS content are required.");
  if (!version.emailBody.endsWith(version.protectedEmail) || !version.smsContent.endsWith(version.protectedSms)) errors.push("Restore the shared approved reminder copy; disclosures and payment terms must stay unchanged across versions.");
  const emailIntro = version.emailBody.slice(0, Math.max(0, version.emailBody.length - version.protectedEmail.length));
  const smsIntro = version.smsContent.slice(0, Math.max(0, version.smsContent.length - version.protectedSms.length));
  if (/(?:\d|[$€£%]|legal action|penalt|deadline|urgent|immediately|must pay|discount|interest|fee)/i.test(`${version.subject} ${emailIntro} ${smsIntro}`)) errors.push("Use neutral introductory wording without new amounts, terms, deadlines or collection pressure.");
  if (version.hasUnsavedChanges) errors.push("Save or discard unsaved changes first.");
  return errors;
}

export function saveCommunicationVersion(previous: CommunicationVersion, draft: CommunicationVersion): CommunicationVersion {
  return { ...draft, id: previous.id, protectedEmail: previous.protectedEmail, protectedSms: previous.protectedSms, hasUnsavedChanges: false, status: previous.status === "Reviewed" || previous.status === "Pending Review" ? "Pending Review" : "Modified" };
}

export function replaceCommunicationVersion(versions: CommunicationVersion[], replacement: CommunicationVersion) {
  return versions.map((v) => v.id === replacement.id ? replacement : v);
}

export function removeCommunicationVersion(versions: CommunicationVersion[], id: string) {
  return id === "default" ? versions : versions.filter((v) => v.id !== id);
}

/** For preview/future selection only; not connected to simulated workflow execution. */
export function selectCommunicationVersion(versions: CommunicationVersion[], age?: number) {
  const group = age === undefined ? undefined : communicationAgeGroups.find((g) => age >= g.min && age <= g.max);
  return versions.find((v) => v.id === group?.id && v.status === "Reviewed" && validateCommunicationVersion(v).length === 0)
    ?? versions.find((v) => v.id === "default");
}

export function communicationReviewIssues(strategy: Strategy): string[] {
  return Object.values(strategy.nodes).filter((n) => n.kind === "Communication" && !n.disabled).flatMap((node) => {
    const versions = node.config.communicationVersions ?? initialCommunicationVersions(node);
    const segments = node.config.communicationSegments ?? defaultCommunicationSegments();
    const issues = versions.filter((v) => segmentIsActive(segments, v.id) && (v.status !== "Reviewed" || validateCommunicationVersion(v).length > 0)).map((v) => `${node.title}: ${versionLabel(v.id, segments)}`);
    issues.push(...validateCommunicationSegments(segments).map((issue) => `${node.title}: ${issue}`));
    if (versions.some((v) => v.id !== "default" && !segments.rules.some((r) => r.id === v.id))) issues.push(`${node.title}: configure the missing segment criteria`);
    if (!versions.some((v) => v.id === "default")) issues.push(`${node.title}: Main / Default is required`);
    return issues;
  });
}

export function applyCommunicationSegments(versions: CommunicationVersion[], previous: CommunicationSegments, next: CommunicationSegments) {
  return versions.map((version) => {
    if (version.id === "default") return version;
    const before = previous.rules.find((r) => r.id === version.id);
    const after = next.rules.find((r) => r.id === version.id);
    const changed = JSON.stringify(before) !== JSON.stringify(after) || (!segmentIsActive(previous, version.id) && segmentIsActive(next, version.id));
    return changed ? { ...version, status: "Pending Review" as const } : version;
  });
}

export function seedCommunicationVersions(strategy: Strategy): Strategy {
  return { ...strategy, nodes: Object.fromEntries(Object.entries(strategy.nodes).map(([id, node]) => [id, node.kind === "Communication" ? { ...node, config: { ...node.config, communicationVersions: node.config.communicationVersions ?? initialCommunicationVersions(node, strategy.status === "Active" || strategy.status === "Approved") } } : node])) };
}
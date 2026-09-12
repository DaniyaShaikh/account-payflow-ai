# PayFlow product-model refinement

## Goal
Correct the prototype’s hierarchy and business-rule presentation while preserving every route, permission, workflow, payment flow, navigation item, and existing operational behavior.

## Implementation

### 1. Separate Customer Accounts from Collection Cases
- Extend the existing demo account model with a distinct illustrative case reference.
- Keep the combined **Accounts / Cases** screen, but show both the customer/account identity and collection-case identity on account, communication, workflow, and Human Review detail views where relevant.
- Label these explicitly as **Account Reference** and **Case Reference / Case ID** so the UI never implies they are the same record.
- Keep Client → Customer Account unchanged and present the downstream relationship as Account → Collection Case → Workflow → Communications / Payments / Human Reviews / Events.

### 2. Strengthen adaptive Workflow semantics
- Preserve all current Workflow terminology and existing `/journeys` technical route compatibility.
- Refine Workflow Detail copy to state that stages are strategic guidance, not mandatory sequential steps.
- Adjust the stage presentation to reduce rigid numbered-sequence cues and introduce a compact reassessment explanation covering payment, communication, response, promise-to-pay, dispute, and failure events.
- Preserve current workflow assignments, versions, communications, and review links.

### 3. Correct Client onboarding rules
- Keep the existing seven onboarding steps.
- Remove the missing-governance-rule condition from activation-blocking issues.
- Show **No client-specific governance rules configured** as a neutral informational notice in Review & Activate.
- Update Data Mapping wording to explain that the shown fields are illustrative operational mappings, not a finalized mandatory schema, while retaining all current mapping states and controls.

### 4. Make branding follow Client Type
- Centralize customer-facing brand resolution using the existing Client Type.
- **First Party:** use the client’s configured brand, sender identity, email, SMS identity, communication preview, and payment presentation.
- **Third Party:** use PayFlow / collection-operator branding for the sender-facing experience while identifying the underlying client/account obligation in message content.
- Make the onboarding and client-configuration previews visibly explain and react to the selected Client Type.
- Apply the same rule to communication detail and the existing public payment experience without changing the payment journey.

### 5. Clarify Human Review decisions
- Preserve the current review workspace and actions.
- Present three explicit sections: **Why this requires review**, **PayFlow Recommendation**, and **Human Decision**.
- Rename the displayed result to **Governance Result**, add the requested recommendation context copy, and mark confidence as illustrative rather than a fixed threshold.
- Add a simple optional decision note/comment to the decision flow and ensure the UI states that the recorded human decision controls the proposed action.
- Keep the existing lightweight history rather than expanding it into a new audit module.

### 6. Clarify Rules and defaults
- Add concise definitions for System Rules and Client Rules in the directory and builder.
- State that global availability does not mean automatic enablement for every client.
- Preserve the required Client selector for Client Rules and the **System / Available Globally** scope for System Rules.
- Make a new High Balance Review example start with **Outstanding Balance → Greater Than → blank value**, never `= 0` and without presenting a sample amount as a permanent threshold.
- Keep the current categories and actions, with visible wording that they are illustrative options.

### 7. Cohesive enterprise polish
- Refine only the touched screens and shared presentation primitives where necessary: clearer labels and grouping, balanced spacing, compact controls, semantic notices, responsive wrapping, focus/hover states, and accessible decision hierarchy.
- Preserve the current PayFlow navy/blue/teal direction, page layouts, navigation, screen inventory, and role-based visibility.

## Technical details
- Add a `caseReference` field to seeded `CustomerAccount` records and derive linked displays from the account record rather than duplicating references across datasets.
- Make branding resolution consume current client configuration/type, with a safe PayFlow fallback for third-party and newly created clients.
- Separate onboarding blocking issues from informational notices so activation eligibility is unchanged except for the requested governance-rule correction.
- Keep internal `journey` field names and route paths where required for compatibility; all visible terminology remains Workflow.

## Validation
- Run focused type checks and browser checks for:
  - Accounts / Cases list and detail hierarchy.
  - Workflow Detail adaptive-stage messaging.
  - First Party and Third Party onboarding previews.
  - Communication and public payment branding for both client types.
  - Client activation with no client-specific governance rules.
  - Human Review decision actions and optional notes.
  - System Rule and Client Rule creation behavior.
  - Operations Admin and Supervisor client isolation.
- Check desktop and mobile wrapping on the changed screens and confirm no console errors.

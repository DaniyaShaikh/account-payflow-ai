# PayFlow Collections Hub

Create a NEW PayFlow application from scratch.

Do NOT copy the structure of any previous PayFlow prototype.

For this first step, focus ONLY on:

1. the correct product hierarchy,

2. the correct user roles,

3. a clean navigation structure,

4. the overall visual design system,

5. a simple initial dashboard shell,

6. the Clients and Accounts/Cases foundation.

Do NOT build the full product yet.

==================================================

PRODUCT OVERVIEW

==================================================

PayFlow is an AI-powered collections operations platform.

It is used by an internal operations team to manage collections on behalf of multiple Clients.

The core business hierarchy is:

PAYFLOW

→ CLIENT

→ CUSTOMER ACCOUNT

→ COLLECTION CASE

This hierarchy is critical.

A Client is an organization whose collection operations PayFlow manages.

Examples:

PayPal

Canadian Tire

A Client is NOT the debtor/customer being collected from.

Each Client may have hundreds or thousands of Customer Accounts.

Example:

Client:

PayPal

Customer Accounts:

- John Smith

- Sarah Khan

- Michael Brown

- etc.

Each Customer Account may have an active Collection Case.

A Collection Case represents the actual collection activity against that customer/account.

==================================================

VERY IMPORTANT DATA MODEL

==================================================

Always keep the relationship:

ONE CLIENT

→ MANY CUSTOMER ACCOUNTS

→ EACH ACCOUNT MAY HAVE A COLLECTION CASE

Example:

PayPal

→ 12,480 Customer Accounts

→ 2,140 Active Collection Cases

Canadian Tire

→ 8,215 Customer Accounts

→ 1,460 Active Collection Cases

Do NOT treat PayPal or Canadian Tire as individual collection accounts.

Use the terms consistently:

Client

Customer Account

Collection Case

==================================================

USERS / ROLES

==================================================

Phase 1 has two internal roles:

1. Operations Admin

2. Supervisor

There is no Client portal in Phase 1.

OPERATIONS ADMIN

Has access to the full platform.

Can eventually:

- manage Clients

- view all Customer Accounts

- view all Collection Cases

- manage Supervisors

- assign Supervisors to Clients

- manage rules and governance

- manage integrations

- manage permissions

SUPERVISOR

Can only access Clients assigned to them.

Example:

Supervisor:

Zeeshan

Assigned Clients:

PayPal

Canadian Tire

Zeeshan can only see:

- PayPal data

- Canadian Tire data

He must NOT see any unassigned Clients.

For now, create the role distinction in the UI and structure, but do not build the full permission matrix yet.

==================================================

NAVIGATION

==================================================

Keep the main navigation simple.

Use:

OVERVIEW

- Dashboard

OPERATIONS

- Clients

- Accounts / Cases

- Human Review

AI OPERATIONS

- Journeys

- Communications

GOVERNANCE

- Rules

ADMINISTRATION

- Users & Permissions

- Integrations

Do not build every section fully yet.

For this first step:

fully establish only:

- Dashboard shell

- Clients

- Accounts / Cases

Other navigation items may exist as clean placeholders.

Do NOT add:

- AI Workforce with named AI workers

- workflow builder

- campaign builder

- complex template builder

- multiple overlapping dashboards

==================================================

VISUAL DESIGN

==================================================

Create a premium enterprise SaaS design.

Visual direction:

- clean

- modern

- minimal

- professional

- easy to scan

- generous spacing

- compact data presentation

- restrained use of cards

- strong typography hierarchy

- subtle borders

- light enterprise interface

Reference style:

Linear

Stripe

Vercel

Notion

GitHub

Do not overload screens.

Avoid:

- giant cards

- excessive gradients

- too many colors

- excessive AI graphics

- unnecessary descriptive text

- large decorative illustrations

- repeated information

The application should feel like a serious enterprise collections platform.

==================================================

DASHBOARD — FIRST VERSION ONLY

==================================================

Create a simple Operations Dashboard shell.

Do NOT build the final detailed analytics yet.

At the top include global filters:

Date

Client

Channel

Example:

Date: Today

Client: All Clients

Channel: All Channels

Show compact KPI cards:

Active Clients

Accounts Under Collection

Active Collection Cases

Amount Recovered

Human Reviews Pending

Then include a clean placeholder area titled:

Communication to Payment Performance

This will later become the detailed funnel:

Sent

Delivered

Opened/Read

Clicked

Payment Initiated

Paid

For now, keep it visually simple.

Also include:

Clients Needing Attention

and

Recent Operational Activity

Do not show AI worker activity on the dashboard.

==================================================

CLIENTS PAGE

==================================================

Create a clean Clients list/table.

Columns:

Client

Customer Accounts

Active Cases

AI Mode

Assigned Supervisor

Status

Example demo data:

PayPal

12,480 Accounts

2,140 Active Cases

Autopilot

Zeeshan

Active

Canadian Tire

8,215 Accounts

1,460 Active Cases

Supervised AI

Zeeshan

Active

Northstar Utilities

5,340 Accounts

840 Active Cases

Supervised AI

Sarah

Active

Clicking a Client should open a simple Client Detail page.

==================================================

CLIENT DETAIL

==================================================

Example:

PayPal

Show a compact header:

Client Name

Status

AI Mode

Assigned Supervisors

Total Accounts

Active Cases

Tabs:

Overview

Accounts

Journeys

Communications

Rules

Human Reviews

Configuration

For this first step, fully design only:

Overview

Accounts

Other tabs may remain simple placeholders.

PAYPAL OVERVIEW should show:

Total Customer Accounts

Active Collection Cases

Outstanding Amount

Amount Recovered

Human Reviews Pending

Then a small recent activity section.

Do not make the page too crowded.

==================================================

CLIENT ACCOUNTS TAB

==================================================

Show the individual Customer Accounts belonging to PayPal.

Columns:

Customer

Account Reference

Outstanding Balance

Collection Status

Current Journey

Last Action

Next Action

Example:

John Smith

PP-10482

$4,250

Active

Early Stage Collection

Email Reminder Sent

Reassess in 48 hours

Sarah Khan

PP-11021

$8,900

Promise to Pay

Promise-to-Pay Follow-Up

SMS Sent

Review after promise date

Michael Brown

PP-12098

$2,100

Payment Plan

Payment Plan Monitoring

Installment Received

Next installment in 7 days

This is critical:

These rows are PayPal CUSTOMER ACCOUNTS.

They are NOT separate Clients.

==================================================

ACCOUNTS / CASES PAGE

==================================================

Create a platform-wide Accounts / Cases page.

Admin can see Accounts across all Clients.

Columns:

Client

Customer

Account Reference

Outstanding Balance

Collection Status

Current Journey

Last Action

Next Action

Human Review

Filters:

Client

Status

Journey

Human Review

Example:

PayPal | John Smith | PP-10482 | $4,250 | Active | Early Stage Collection | Email Sent | Reassess in 48h | No

Canadian Tire | Emily Jones | CT-20394 | $7,300 | Active | Progressive Reminder | SMS Sent | Reassess Tomorrow | No

PayPal | David Lee | PP-88831 | $12,500 | Human Review | Escalated Collection | AI Recommendation Created | Awaiting Supervisor | Yes

==================================================

ACCOUNT / CASE DETAIL — SIMPLE FOUNDATION

==================================================

Clicking an Account should open a simple detail page.

Show:

Customer Name

Client

Account Reference

Original Balance

Outstanding Balance

Amount Recovered

Collection Status

Current Journey

Last Action

Next Action

Then show a simple Activity Timeline.

Example:

Account became overdue

↓

Customer assessed

↓

Email reminder sent

↓

Email delivered

↓

Payment link clicked

↓

Partial payment received

↓

Balance updated

↓

Next reassessment scheduled

Do not build detailed AI reasoning yet.

==================================================

ROLE PREVIEW

==================================================

Create an easy way in the prototype to preview:

Operations Admin View

Supervisor View

ADMIN VIEW:

Can see all Clients.

SUPERVISOR VIEW:

Use Zeeshan as demo Supervisor.

Zeeshan should only see:

PayPal

Canadian Tire

Do not show Northstar Utilities to Zeeshan.

The restriction should apply to:

- Dashboard

- Clients

- Accounts / Cases

This is important.

==================================================

DO NOT BUILD YET

==================================================

Do NOT fully build:

Rule Builder

Journey Builder

Detailed Human Review

Detailed Communications

Detailed Insights

AI Activity

Payment Experience

Detailed Integrations

Permission Matrix

Full Client Onboarding Wizard

These will be added in later prompts.

Do not invent complex functionality that has not been requested.

==================================================

SUCCESS CRITERIA FOR THIS FIRST BUILD

==================================================

Before adding more features, the application must clearly communicate:

1. PayFlow manages multiple Clients.

2. Each Client has many Customer Accounts.

3. Customer Accounts are the actual collection subjects.

4. Collection Cases belong to Customer Accounts.

5. Admin can access all Clients.

6. Supervisor can only access assigned Clients.

7. The UI is simple and not crowded.

8. AI is present in the product concept but does not dominate the interface.

9. Dashboard is an operational collections dashboard, not an AI monitoring dashboard.

10. The user can navigate:

Dashboard

→ Client

→ Client Accounts

→ Customer Account / Collection Case

Build this foundation first.

Do not proceed to advanced modules until this hierarchy and navigation are correct.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://account-payflow-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d723331-df4c-47b6-b5b6-738ae48635b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

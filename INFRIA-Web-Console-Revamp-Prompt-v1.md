# INFRIA Web Console — Revamp & Implementation Prompt

**Document:** INFRIA-CONSOLE-REVAMP-001  
**Version:** 1.0  
**Target:** AI coding agent / Antigravity / Frontend Engineer  
**Status:** Implementation Brief  

---

## 1. OBJECTIVE

Revamp the existing INFRIA Web Console into a polished developer infrastructure console with:

- INFRIA's new green visual identity instead of the previous blue identity;
- a visual language inspired by modern developer consoles such as Firebase Console, without copying Firebase literally;
- stronger information hierarchy, navigation, states, tables, forms, code blocks, dialogs, and feedback;
- a fully coherent project lifecycle;
- functional project deletion/archive flow;
- functional logout/sign-out flow;
- a functional Dashboard AI chat that uses the same runtime/test path as the Simulator;
- functional analytics and Recent Executions with meaningful categorization/tags;
- optimized data queries so Analytics does not fetch unnecessary large datasets;
- a clear relationship between Web Console → Project → Knowledge → Functions → AI Configuration → SDK → Runtime → Analytics;
- documentation of the complete application flow.

Do not treat this as a cosmetic color replacement. This is a product-level UI/UX and interaction revamp while preserving the locked INFRIA architecture and existing functional contracts.

---

## 2. SOURCE OF TRUTH

Before changing code, inspect and understand the existing repository and the INFRIA documentation files available in the main project folder.

Important references include:

- `INFRIA-SADD-v0.4-Locked.md`
- `INFRIA-SADD-v0.3.1-Updated.md`
- `INFRIA-Web-Console-Prototype-Blueprint.md`

The locked architecture must remain intact:

```text
Web Console
  Next.js → Vercel
        │
        ├── Firebase Authentication
        ├── Firestore Client SDK for safe/direct access
        └── Firebase Functions for privileged / processing operations
```

Backend:

```text
Firebase Cloud Functions
Node.js / Express
        ↓
Firestore + n8n orchestration
```

Do not redesign the backend architecture as part of this UI revamp.

The locked SADD states that the Console uses hybrid data access, API key operations and other privileged operations remain protected by Functions, and runtime AI traffic is never sent directly from Flutter to n8n or the LLM provider.

Reference: SADD v0.4 locked baseline.

---

## 3. BRAND DIRECTION

### 3.1 New color identity

The old console used blue as its primary accent. Replace the primary brand accent with the new INFRIA green identity from the provided logo reference.

Do not invent a radically different brand palette.

Use:

```text
Neutral developer-console foundation
+
INFRIA green as primary accent
+
Semantic status colors for success / warning / error / info
```

The green should be used intentionally for:

- primary buttons;
- active navigation states;
- links where appropriate;
- focus rings;
- selected tabs;
- project/status accents;
- AI-related brand accents;
- progress indicators;
- highlighted values;
- subtle decorative brand details.

Do not color every component green.

Avoid:

- excessive gradients;
- neon green interfaces;
- green backgrounds everywhere;
- colored text without semantic purpose;
- excessive glassmorphism;
- excessive shadows.

The result should feel calm, technical, reliable, and premium.

### 3.2 Logo placeholder

The final `.svg` logo asset has not been supplied yet.

Therefore:

- reserve a dedicated logo slot in the header/sidebar;
- keep `INFRIA` text as a temporary fallback;
- preserve the future ability to replace the fallback with the final SVG without redesigning the layout;
- do not attempt to recreate or permanently bake the logo as a new SVG;
- do not distort the logo area.

Suggested temporary structure:

```text
[ INFRIA logo slot ]
INFRIA
```

The final asset should be swappable from one component/configuration source.

---

## 4. BRAND PHILOSOPHY TO REFLECT IN UI

The logo concept provided by the designer contains several ideas that can subtly influence the visual system.

### Waves

The waves represent calmness and a controlled, calm interaction with AI. Use this idea subtly in the product language rather than introducing decorative waves everywhere.

Suitable use:

- gentle AI loading animation;
- subtle empty-state accent;
- calm micro-animation around AI activity;
- soft background detail in AI-specific surfaces.

Avoid large decorative waves that make the Console look like a marketing landing page.

### Typing / information gesture

The face resembles the familiar `...` typing / thinking indicator.

This can influence:

- AI processing indicator;
- assistant thinking state;
- simulator execution state;
- runtime event indicator.

Example:

```text
INFRIA is processing...
•••
```

Keep it restrained.

### Chat form

The logo has a chat-like construction. Reflect this in AI surfaces, especially:

- Dashboard AI assistant/test box;
- Simulator;
- AI Configuration preview;
- Function Calling execution feedback.

### Outer circle / application boundary

The outer circle suggests INFRIA living inside the host application.

This should translate conceptually into the UI:

```text
Developer Console
      ↓
INFRIA Infrastructure
      ↓
Host Application / Flutter SDK
      ↓
End User
```

Do not literally draw circles around the entire application. Express this relationship through architecture visualization, breadcrumbs, integration diagrams, and contextual copy.

### `IN` highlighted

The `IN` treatment suggests INFRIA's role inside the application ecosystem.

Use the brand green primarily as the INFRIA identity accent rather than introducing additional unrelated highlight colors.

### Antenna

The antenna concept is not yet finalized philosophically. Do not invent a strong marketing interpretation.

Treat the antenna as an optional subtle visual motif only. It may represent connectivity / signal / communication, but it must not become a dominant design element until the brand meaning is finalized.

---

## 5. CORE UX PRINCIPLE

The Console must behave like a developer control plane, not a generic SaaS admin dashboard.

The primary mental model remains:

```text
Workspace
  ↓
Project
  ↓
Resource
  ↓
Configure / Test / Integrate / Observe
```

Every important screen must answer:

1. Where am I?
2. What can I do here?
3. What should I do next?

The product loop remains:

```text
Login
 ↓
Personal Workspace
 ↓
Create Project
 ↓
Configure AI
 ↓
Add Knowledge
 ↓
Register Functions
 ↓
Generate Credential
 ↓
Integrate Flutter SDK
 ↓
Test Runtime
 ↓
Observe Analytics
```

This follows the existing INFRIA golden path.

---

## 6. INFORMATION ARCHITECTURE

Global navigation:

```text
Dashboard
Projects
```

Project navigation:

```text
Overview
Knowledge
Functions
AI Configuration
SDK & API Keys
Analytics
```

Account:

```text
Personal Workspace
Google Account
Sign Out
```

Do not add billing, teams, marketplace, secrets, models, deployment, etc. unless they already have real functionality and are explicitly part of the current scope.

---

## 7. GLOBAL SHELL REVAMP

Create a polished developer-console shell.

### Header

Should contain:

- logo slot;
- current project context when inside a project;
- workspace context;
- account menu;
- optional command/search affordance if it is already supported by the app.

Example:

```text
[INFRIA] / Demo Store                    Workspace ▼   [avatar] ▼
```

### Sidebar

Requirements:

- compact but readable;
- stable width;
- visually clear active state;
- collapsible on smaller desktop widths if existing architecture supports it;
- project navigation appears only when a project is selected;
- Account area anchored at the bottom.

Example:

```text
INFRIA

Workspace
  Dashboard
  Projects

Project
  Overview
  Knowledge
  Functions
  AI Configuration
  SDK & API Keys
  Analytics

──────────────
Account
  Personal Workspace
  Sign Out
```

The active item must use the new INFRIA green accent with restrained contrast.

---

## 8. DASHBOARD REVAMP

Dashboard remains the developer home, not a BI dashboard.

It should help the developer:

- understand project status;
- continue setup;
- run a quick AI test;
- see recent runtime activity.

Suggested layout:

```text
Good afternoon
Doni's Workspace

[ Create Project ]

Projects
┌──────────────────────────────────────────────────┐
│ Project cards / table                            │
└──────────────────────────────────────────────────┘

Quick AI Test
┌──────────────────────────────────────────────────┐
│ Ask INFRIA something...                     Send │
│                                                  │
│ AI Response                                      │
│ Route: RAG   Latency: 1.2s   Source: Dashboard   │
└──────────────────────────────────────────────────┘

Recent Activity
┌──────────────────────────────────────────────────┐
│ ...                                              │
└──────────────────────────────────────────────────┘
```

### Important: Dashboard AI must be functional

The Dashboard AI chat box must NOT be a visual-only widget.

It must use the same underlying runtime/test service abstraction as the Simulator.

Do not implement:

```text
Dashboard Chat → fake local response
Simulator → real API
```

Instead:

```text
Dashboard Chat
      ↓
Shared Runtime Test Service
      ↓
INFRIA Test/Runtime API
      ↓
AI orchestration
      ↓
Response
      ↓
Analytics event with source=dashboard
```

Likewise:

```text
Simulator
      ↓
Shared Runtime Test Service
      ↓
INFRIA Test/Runtime API
      ↓
Analytics event with source=simulator
```

If the backend contract does not yet distinguish test source, introduce the smallest compatible metadata layer in the Console/test request abstraction rather than duplicating logic.

Do not alter the locked runtime contract unnecessarily.

---

## 9. PROJECT LIST

Use a developer-platform table/list instead of oversized SaaS cards.

Columns:

```text
Project
Platform
Status
Knowledge
Functions
Last Activity
```

Actions:

```text
Open
More
```

The More menu should include only valid actions, including Delete/Archive as appropriate.

Provide:

- search;
- empty state;
- loading state;
- error state;
- pagination or cursor-based loading if dataset size warrants it.

Do not load every project-related resource for every row just to render counts.

Use aggregated / summary fields where available.

---

## 10. CREATE PROJECT FLOW

Preserve the simple MVP form:

```text
Project Name
Description (optional)
Platform = Flutter

[ Create Project ]
```

After creation:

```text
Project Created

Project ID
Public API Key

[ Copy API Key ]
[ Go to Project ]
```

The public API key must follow the existing security contract: show the actual value only in creation/rotation flow; do not store or expose it casually in normal logs.

---

## 11. PROJECT OVERVIEW REVAMP

Make Overview the central project control surface.

Header:

```text
Demo Store
Flutter
Active
```

Display:

- Project ID;
- created date;
- SDK version;
- API key status;
- setup/readiness state.

### Setup readiness

Use a compact progress/checklist component:

```text
Project Setup
✓ Project created
✓ AI configuration
✓ Knowledge ready
○ Function integration
○ SDK integration
```

The next step must be visually obvious.

### Primary actions

```text
Add Knowledge
Add Function
Integrate SDK
Test AI
```

The Test AI action should open/navigate to the same test mechanism used by Simulator.

---

## 12. KNOWLEDGE

Keep the existing knowledge model and lifecycle.

List columns:

```text
Title
Category
Status
Chunks
Updated
```

Statuses:

```text
Draft
Processing
Ready
Failed
Archived
```

Actions:

```text
Create
Edit
Publish / Unpublish
Reindex
Archive
Delete
```

The UI must clearly distinguish:

```text
content status
vs
indexing / embedding status
```

Do not expose raw embeddings in the normal UI.

---

## 13. FUNCTIONS

Function Registry must make Dynamic Function Calling understandable to developers.

Columns:

```text
Function
Description
Execution
Auth
Confirmation
Status
```

Create/edit flow must support at minimum:

```text
Name
Description
Parameters (JSON Schema)
Execution Type
Authentication Required
Confirmation Required
Status
```

MVP execution type:

```text
client_callback
```

The UI should explain the relationship:

```text
AI decides
   ↓
INFRIA validates policy
   ↓
Flutter SDK receives callback
   ↓
App executes function
   ↓
Result returns to INFRIA
   ↓
AI finalizes response
```

A small sequence visualization may be used on Function detail, but keep it technical and compact.

---

## 14. AI CONFIGURATION

Keep the existing fields:

```text
Assistant Name
Role
Language
Tone
System Instructions
Fallback Message
Retrieval Top-K
Retrieval Threshold
```

Enable/disable indicators for:

```text
Knowledge / RAG
Function Calling
```

Add a lightweight live preview/test panel only if it uses the shared runtime test service.

Do not create a fake “AI preview” that is disconnected from the actual configuration.

---

## 15. SDK & API KEYS

This page must feel implementation-oriented.

Sections:

### Install

```bash
flutter pub add infria_sdk
```

### Initialize

```dart
final infria = Infria(
  projectId: 'infria-demo-store-7f42',
  apiKey: 'infria_pk_xxxxx',
);
```

### Chat

```dart
InfriaChat(
  client: infria,
);
```

### Function registration

Show relevant client callback code when available.

Each code block gets:

```text
[ Copy ]
```

API key table:

```text
Name
Prefix
Status
Created
Last Used
```

Actions:

```text
Create Key
Rotate
Revoke
```

Do not expose LLM secrets.

---

## 16. SIMULATOR / PLAYGROUND

The Simulator should become the main developer test surface.

Suggested layout:

```text
Simulator

[ Test Project: Demo Store ▼ ]

Conversation
┌────────────────────────────────────────────┐
│ User: Cek status pesanan ORD123            │
│                                            │
│ INFRIA: Saya cek terlebih dahulu...        │
│                                            │
│ Function Call                              │
│ check_order_status                         │
│ { orderId: "ORD123" }                     │
│                                            │
│ Function Result                            │
│ { status: "shipped" }                     │
│                                            │
│ INFRIA: Pesanan ORD123 sudah dikirim.      │
└────────────────────────────────────────────┘

Ask something...
[ input                                 ] [Send]

Execution metadata
Route: Function
Latency: 1.24s
Sources: 0
Request ID: req_...
```

Simulator must support both:

```text
RAG
Function Calling
```

and clearly show which path was taken.

Do not duplicate runtime logic inside the Simulator component.

---

## 17. ANALYTICS REVAMP

Analytics should be operational observability, not BI.

Core metrics:

```text
Total Requests
Successful Requests
Failed Requests
Function Calls
Fallbacks
Average Latency
```

Add filtering:

```text
Time range
Route
Status
Source
Function
```

### Recent Executions

Make this section truly functional.

Each execution should have data similar to:

```text
Time
Request ID
Source
Route
Status
Latency
Function
```

Example:

```text
12:42:11
req_01J...
SIMULATOR
RAG
SUCCESS
1.24s
—
```

```text
12:41:54
req_01J...
DASHBOARD
FUNCTION
SUCCESS
1.83s
check_order_status
```

### Tagging

Use compact semantic tags:

```text
SIMULATOR
DASHBOARD
SDK
RAG
FUNCTION
SUCCESS
ERROR
FALLBACK
```

Source and route should be separate concepts.

Example:

```text
Source: SIMULATOR
Route: FUNCTION
Status: SUCCESS
```

Do not make one giant ambiguous tag such as `SIMULATOR_FUNCTION_SUCCESS`.

---

## 18. ANALYTICS QUERY OPTIMIZATION

This is mandatory.

Do not implement Analytics by fetching a large number of raw Firestore documents and calculating everything in the browser.

Avoid:

```text
get all analytics events
→ fetch all
→ filter in frontend
→ calculate every metric
```

Prefer:

```text
query only the selected project
→ query only required time window
→ query only required fields where possible
→ limit results
→ paginate Recent Executions
```

For large execution histories:

- use indexed filters;
- use ordered timestamps;
- use cursor pagination / `limit()`;
- avoid unbounded listeners;
- avoid repeated queries for the same dataset;
- cache or memoize stable summary data at the service layer;
- use aggregated counters/summaries when already available;
- request only the fields needed for the current screen where the SDK/API allows it.

If aggregation cannot be done efficiently client-side, use a backend aggregation endpoint or pre-aggregated documents instead of downloading the full history.

### Required indexes

Inspect the actual query implementation and ensure corresponding Firestore indexes exist for combinations such as:

```text
projectId + createdAt
projectId + source + createdAt
projectId + route + createdAt
projectId + status + createdAt
```

Do not blindly add indexes. Add only those actually required by the implemented filters.

---

## 19. LOG / EXECUTION DETAIL

Clicking Recent Executions should open a detailed execution view or drawer.

Show:

```text
Request ID
Timestamp
Source
Route
Status
Latency
Project
Function name (when applicable)
Retrieval metadata (when applicable)
LLM provider metadata (when safe)
Error summary (when applicable)
```

Never display:

- LLM API secrets;
- raw credentials;
- sensitive secrets;
- server stack traces.

Provide Request ID for debugging.

---

## 20. PROJECT DELETE / ARCHIVE FLOW

Project deletion was missing and must now be implemented.

There should be a clear project-danger-zone action.

Recommended UX:

```text
Project Settings / Overview
        ↓
Danger Zone
        ↓
Delete Project
```

Use a destructive confirmation dialog.

Example:

```text
Delete “Demo Store”?

This action will remove the project and its associated
configuration/resources according to the current backend
lifecycle policy.

Type the project name to confirm.

[Cancel] [Delete Project]
```

Do not implement deletion as a single accidental click.

### Important backend rule

Do not delete only the top-level project document while leaving orphaned resources.

The implementation must follow the actual backend/data lifecycle contract.

Potential related resources include:

```text
knowledge
chunks
functions
apiKeys metadata
conversations (if stored)
analytics/events
config
versions
```

If full hard-delete cascading is not currently supported by the backend, expose an explicit Archive flow instead of pretending a full deletion happened.

The UI must reflect the real operation status.

---

## 21. LOGOUT / SIGN OUT

Implement the missing logout action.

Account menu:

```text
Personal Workspace
Google Account
──────────────
Sign Out
```

Behavior:

```text
Sign Out
  ↓
Firebase Auth signOut()
  ↓
Clear client-side auth-dependent state
  ↓
Redirect to /login
```

Must handle:

- successful logout;
- already-expired session;
- loading state while logging out if necessary;
- protected route guard after logout;
- preventing authenticated pages from remaining accessible through stale local state.

Do not reinvent authentication. Use the existing Firebase Authentication implementation.

---

## 22. ACCOUNT UX

Account menu should include:

```text
Workspace
Google Account
Sign Out
```

Do not add fake account settings that are not backed by real functionality.

---

## 23. EMPTY / LOADING / ERROR / PROCESSING STATES

Every resource surface must have explicit states:

```text
Loading
Success
Empty
Error
Processing
```

Examples:

### No projects

```text
No projects yet.
Create your first INFRIA project to start building.

[ Create Project ]
```

### No knowledge

```text
No knowledge sources yet.
Add knowledge to ground your AI responses.

[ Add Knowledge ]
```

### No functions

```text
No functions registered.
Connect your application logic with Dynamic Function Calling.

[ Add Function ]
```

### No analytics

```text
No runtime activity yet.
Integrate the SDK or run the Simulator to create your first execution.
```

### Runtime error

```text
Unable to complete the request.

Request ID: req_123

[ Try Again ]
```

Never display stack traces.

---

## 24. RESPONSIVE / DESKTOP PRIORITY

Primary target:

```text
Desktop / Laptop
minimum 1280px
```

Maintain usable tablet behavior.

Mobile is secondary for Web Console.

Do not sacrifice dense developer-console layouts just to imitate consumer mobile responsiveness.

---

## 25. DESIGN SYSTEM

Visual characteristics:

```text
Dense but readable
Clear hierarchy
Subtle borders
Minimal shadows
Strong typography
Predictable controls
Calm green brand accent
```

Prefer:

```text
Tables
Tabs
Breadcrumbs
Cards where useful
Code blocks
Badges
Forms
Dialogs
Drawers
Toasts
Side navigation
```

Avoid:

```text
Huge hero sections
Marketing gradients
Excessive glassmorphism
Excessive illustration
Decorative charts
Animated dashboard widgets
```

Use a consistent token system for:

- background;
- foreground;
- muted text;
- border;
- card;
- primary INFRIA green;
- semantic states;
- radius;
- spacing;
- typography.

Do not hard-code slightly different greens across components.

---

## 26. FIREBASE-CONSOLE-LIKE PRODUCT PATTERN

Take inspiration from Firebase Console in terms of information architecture and developer ergonomics:

- persistent navigation;
- resource-first thinking;
- project context;
- configuration surfaces;
- tables and filters;
- technical metadata;
- generated credentials;
- clear setup state;
- operational visibility.

Do NOT clone Firebase visually.

INFRIA must retain its own identity:

```text
Calm
Technical
AI-native
Green-accented
Developer-first
```

---

## 27. SHARED SERVICES / FRONTEND ARCHITECTURE

Do not place business logic directly in page components.

Use clear service abstractions such as:

```text
services/
├── auth.service.ts
├── workspace.service.ts
├── project.service.ts
├── knowledge.service.ts
├── function.service.ts
├── ai.service.ts
├── runtime-test.service.ts
├── sdk.service.ts
└── analytics.service.ts
```

Critical rule:

```text
Dashboard AI
Simulator
AI Config Preview

        ↓
Shared runtime-test service
```

Analytics pages should use:

```text
Page
 ↓
Analytics service
 ↓
Optimized query / API
```

not arbitrary Firestore reads scattered across components.

---

## 28. DATA / QUERY RULES

Project context must always be route-derived and explicit.

Example:

```text
/projects/infria-demo-store-7f42/knowledge
```

Do not depend only on browser state to determine the selected project.

When querying Firestore:

- scope every resource to the current project/workspace;
- use indexed queries;
- avoid unbounded reads;
- use `limit()` and cursors for lists;
- avoid real-time listeners where data does not require real-time behavior;
- use one service/query abstraction per resource;
- avoid duplicate requests caused by component re-renders.

---

## 29. ACCESSIBILITY

Ensure:

- keyboard navigability;
- visible focus state;
- semantic buttons/links;
- dialogs can be dismissed safely;
- destructive actions clearly communicated;
- sufficient text contrast;
- status is not communicated by color alone;
- loading state has accessible text/labels;
- icon-only buttons have accessible labels.

---

## 30. DO NOT BREAK EXISTING FUNCTIONALITY

Before implementation:

1. inspect the current app;
2. identify existing working routes/components/services;
3. preserve working contracts;
4. refactor instead of duplicating functionality;
5. do not replace real functionality with mock data;
6. if something is genuinely unavailable, use an explicit mock layer and label it clearly.

No fake success states.

No fake analytics.

No fake project deletion.

No fake AI responses.

No fake API key operations.

---

## 31. IMPLEMENTATION ORDER

Execute in this order:

```text
1. Inspect existing repository
2. Inspect current routes/components/services
3. Inspect current Firestore queries
4. Identify existing Dashboard AI and Simulator implementations
5. Establish design tokens / green theme
6. Refactor global shell/navigation
7. Improve Dashboard
8. Connect Dashboard AI to shared runtime-test service
9. Improve Simulator
10. Improve Project List/Create/Overview
11. Implement Delete/Archive flow
12. Implement Logout
13. Improve Knowledge / Functions / AI Config / SDK pages
14. Refactor Analytics queries
15. Add execution source/route/status metadata
16. Implement Recent Executions filters/pagination
17. Improve loading/error/empty states
18. Validate all routes
19. Run build/type checks/lint/tests
20. Document final app flow
```

Do not spend most of the effort on visual polish before the critical functional flows are stable.

---

## 32. ACCEPTANCE CRITERIA

The revamp is complete when:

### Brand

- [ ] Blue primary accent has been replaced with the INFRIA green theme.
- [ ] Green is implemented through reusable design tokens.
- [ ] Logo slot is ready for the future SVG asset.
- [ ] Existing `INFRIA` text fallback remains available.

### Shell

- [ ] Header is polished.
- [ ] Sidebar is consistent.
- [ ] Project context is obvious.
- [ ] Account menu works.
- [ ] Sign Out works.

### Dashboard

- [ ] Dashboard feels like a developer home.
- [ ] AI test box is functional.
- [ ] Dashboard AI shares the runtime-test service with Simulator.
- [ ] Dashboard executions are tagged with `DASHBOARD` source.

### Projects

- [ ] Project list works.
- [ ] Create project works.
- [ ] Project overview works.
- [ ] Project readiness state works.
- [ ] Delete or Archive works according to actual backend support.
- [ ] Destructive confirmation exists.

### Knowledge

- [ ] CRUD works.
- [ ] Publishing lifecycle is visible.
- [ ] Indexing status is visible.

### Functions

- [ ] CRUD works.
- [ ] JSON Schema parameters can be edited.
- [ ] Client callback behavior is clearly represented.

### AI

- [ ] AI Configuration works.
- [ ] AI test uses real shared runtime path.

### SDK

- [ ] Install snippet works as documentation.
- [ ] Project ID is shown.
- [ ] API key can be copied from valid creation/rotation surface.
- [ ] Function registration example can be copied.

### Simulator

- [ ] RAG test works.
- [ ] Function Calling test works.
- [ ] Route is visible.
- [ ] Request metadata is visible.
- [ ] Simulator events are tagged with `SIMULATOR` source.

### Analytics

- [ ] Metrics are functional.
- [ ] Recent Executions uses real data.
- [ ] Source/route/status tags are visible.
- [ ] Filters work.
- [ ] Pagination/cursor loading exists when needed.
- [ ] Queries are scoped and optimized.
- [ ] No unbounded analytics fetch is used.

### States

- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Processing state exists.
- [ ] No fake live data is presented as real.

### Quality

- [ ] Type check passes.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] Existing working functionality is not regressed.

---

## 33. FINAL IMPLEMENTATION PRINCIPLE

The result should make a developer feel:

> “This is the control plane for my INFRIA project.”

Not:

> “This is a generic AI chatbot dashboard.”

The console should visually communicate:

```text
Project
  ↓
Knowledge
  ↓
Functions
  ↓
AI Configuration
  ↓
SDK
  ↓
Test
  ↓
Observe
```

The green identity should reinforce INFRIA without overwhelming the developer-console usability.

The brand should feel calm like the logo philosophy, while the product itself remains technical, functional, and infrastructure-oriented.

---

## 34. REQUIRED DELIVERABLES FROM THE CODING AGENT

At the end of implementation, provide:

1. Updated Web Console implementation.
2. Refactored/shared runtime test service where required.
3. Functional Dashboard AI test.
4. Functional Simulator.
5. Functional Analytics and Recent Executions.
6. Functional Logout.
7. Functional Project Delete/Archive flow according to backend capabilities.
8. Updated Firestore indexes only when required by actual queries.
9. UI states for loading/error/empty/processing.
10. A concise implementation report listing changed routes/components/services and any backend dependency that remains unresolved.

Do not silently leave TODOs for core acceptance criteria.

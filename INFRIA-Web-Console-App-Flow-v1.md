# INFRIA Web Console — Application Flow & Interaction Model

**Version:** 1.0  
**Purpose:** Single reference for Web Console navigation, state transitions, and developer golden path.

---

## 1. PRODUCT ROLE

INFRIA Web Console adalah **developer control plane**.

Console digunakan developer untuk:

```text
Create Project
Manage Knowledge
Register Functions
Configure AI
Generate Credentials
Integrate SDK
Test AI Runtime
Observe Runtime
```

Console bukan end-user chatbot.

---

## 2. GLOBAL APPLICATION FLOW

```text
/login
   ↓
Google Authentication
   ↓
Personal Workspace
   ↓
/dashboard
   ├── View Projects
   ├── Quick AI Test
   └── Recent Activity
   ↓
/projects
   ├── Create Project
   └── Open Project
         ↓
/projects/[projectId]
         ├── Overview
         ├── Knowledge
         ├── Functions
         ├── AI Configuration
         ├── SDK & API Keys
         ├── Simulator / Test
         └── Analytics
```

---

## 3. AUTHENTICATION FLOW

```text
User opens Console
        ↓
Firebase Auth state checked
        ↓
Authenticated?
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ↓         ↓
Dashboard   /login
              ↓
       Continue with Google
              ↓
       Firebase user created
              ↓
       Personal workspace resolved
              ↓
          Dashboard
```

### Logout

```text
Account Menu
   ↓
Sign Out
   ↓
Firebase signOut()
   ↓
Clear auth-dependent client state
   ↓
/login
```

Protected routes must reject stale unauthenticated access.

---

## 4. WORKSPACE FLOW

Prototype uses a personal workspace.

```text
Google UID
   ↓
Personal Workspace
   ↓
Projects
```

Future workspace/team expansion must not change the core project model unnecessarily.

---

## 5. CREATE PROJECT FLOW

```text
Dashboard / Projects
        ↓
Create Project
        ↓
Enter Project Name
        ↓
Optional Description
        ↓
Platform = Flutter
        ↓
Create
        ↓
Project document created
        ↓
Project ID generated
        ↓
Public project key generated
        ↓
Creation result
        ↓
Go to Project
```

### Creation state machine

```text
IDLE
 ↓
SUBMITTING
 ↓
SUCCESS
 ↓
PROJECT_READY
```

Failure:

```text
SUBMITTING
   ↓
ERROR
   ↓
Retry
```

---

## 6. PROJECT LIFECYCLE

```text
Created
   ↓
Configured
   ↓
Knowledge Ready
   ↓
Functions Ready
   ↓
SDK Integrated
   ↓
Runtime Testing
   ↓
Runtime Observability
```

Project status:

```text
active
suspended
archived
```

If the backend fully supports hard delete, project deletion may be used. Otherwise Archive is the safe lifecycle operation.

---

## 7. PROJECT OVERVIEW FLOW

The Overview page should answer:

```text
What is this project?
Is it ready?
What should I do next?
```

Flow:

```text
Open Project
   ↓
Project Overview
   ├── Project Identity
   ├── Setup Readiness
   ├── Resource Summary
   ├── Test AI
   └── Next Actions
```

Suggested next-action logic:

```text
No Knowledge
   → Add Knowledge

Knowledge Ready + No Function
   → Add Function

Knowledge + Function + No SDK
   → Integrate SDK

SDK ready
   → Test AI

Runtime activity exists
   → View Analytics
```

---

## 8. KNOWLEDGE FLOW

```text
Project
  ↓
Knowledge
  ↓
Add Knowledge
  ↓
Title + Category + Content
  ↓
Save Draft OR Publish
```

Publish flow:

```text
DRAFT
  ↓
PROCESSING
  ↓
Embedding / Indexing
  ↓
READY
```

Failure:

```text
PROCESSING
  ↓
FAILED
  ↓
Retry / Edit / Reindex
```

Archive:

```text
READY
  ↓
ARCHIVED
```

Delete should use confirmation.

---

## 9. FUNCTION REGISTRY FLOW

```text
Project
  ↓
Functions
  ↓
Add Function
  ↓
Name
Description
Parameters JSON Schema
Execution Type
Security settings
  ↓
Save
  ↓
Function becomes available to AI policy
```

MVP execution:

```text
client_callback
```

---

## 10. FUNCTION RUNTIME FLOW

```text
End User Message
       ↓
Flutter SDK
       ↓
INFRIA Backend
       ↓
Tenant + Function Policy
       ↓
AI Orchestration
       ↓
LLM chooses function
       ↓
Backend validates function call
       ↓
Flutter SDK receives function_call event
       ↓
Host app executes local callback
       ↓
function-result
       ↓
INFRIA Backend
       ↓
AI final response
       ↓
Flutter SDK
       ↓
End User
```

Important:

Backend does not directly invoke Flutter app code.
The SDK handles the callback boundary.

---

## 11. AI CONFIGURATION FLOW

```text
Project
  ↓
AI Configuration
  ↓
Edit Assistant configuration
  ↓
Save
  ↓
Configuration stored
  ↓
Next runtime/test request uses updated config
```

Fields:

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

---

## 12. DASHBOARD AI TEST FLOW

Dashboard AI is a quick developer test surface.

```text
Dashboard
   ↓
Quick AI Test
   ↓
Select active project/context
   ↓
Enter message
   ↓
Shared Runtime Test Service
   ↓
INFRIA test/runtime endpoint
   ↓
AI orchestration
   ↓
Response
   ↓
Display response + compact metadata
   ↓
Record observable execution metadata
```

The execution source must be:

```text
DASHBOARD
```

Example metadata:

```text
Source: DASHBOARD
Route: RAG
Latency: 1.24s
Request ID: req_123
```

---

## 13. SIMULATOR FLOW

Simulator is the deeper test environment.

```text
Project
  ↓
Simulator
  ↓
Enter user message
  ↓
Shared Runtime Test Service
  ↓
INFRIA Runtime/Test API
  ↓
AI orchestration
```

Possible route:

```text
RAG
```

or:

```text
FUNCTION
```

### RAG

```text
User Question
  ↓
Query Embedding
  ↓
Firestore Vector Retrieval
  ↓
Similarity Threshold
  ↓
Relevant Context?
  ├── No → Grounded Fallback
  └── Yes → LLM
               ↓
          Final Answer
```

### Function Calling

```text
User Question
  ↓
LLM
  ↓
Function Call
  ↓
Backend Policy Validation
  ↓
Flutter callback simulation / test callback boundary
  ↓
Function Result
  ↓
LLM Finalization
  ↓
Final Answer
```

Simulator execution source:

```text
SIMULATOR
```

---

## 14. SHARED TEST SERVICE

Dashboard AI and Simulator must share the same service abstraction.

```text
Dashboard AI ─────┐
                  ├──> runtime-test.service
Simulator ────────┤
                  └──> INFRIA Test/Runtime API
```

This prevents two different implementations from drifting apart.

The service should normalize:

```text
projectId
message
sessionId
source
```

Example conceptual payload:

```json
{
  "projectId": "prj_demo_store",
  "message": "Cek status pesanan ORD123",
  "source": "simulator"
}
```

The source value is Console observability metadata. It must not weaken or bypass runtime authorization.

---

## 15. SDK INTEGRATION FLOW

```text
SDK & API Keys
   ↓
Project ID
   ↓
Public API Key
   ↓
Install SDK
   ↓
Initialize Infria client
   ↓
Create InfriaChat
   ↓
Register local functions
   ↓
Run application
```

Example:

```dart
final infria = Infria(
  projectId: 'prj_demo_store',
  apiKey: 'inf_pub_xxx',
);

InfriaChat(
  client: infria,
);
```

---

## 16. ANALYTICS FLOW

Every observable runtime execution should produce a compact analytics event.

Conceptual event:

```json
{
  "requestId": "req_123",
  "source": "simulator",
  "route": "function",
  "status": "success",
  "latencyMs": 1832,
  "createdAt": "timestamp"
}
```

Additional metadata may include:

```text
function name
retrieval score
result count
LLM provider metadata
fallback state
```

Never include secrets.

---

## 17. ANALYTICS QUERY FLOW

Analytics page:

```text
Open Analytics
   ↓
Resolve projectId from route
   ↓
Load summary metrics
   ↓
Load first page of Recent Executions
   ↓
Render
```

Filtering:

```text
Change time range
   ↓
New indexed query
   ↓
Update summary / list
```

Pagination:

```text
Load first N
   ↓
Store last document cursor
   ↓
Load More
   ↓
Use startAfter(cursor)
   ↓
Next N
```

Do not:

```text
Fetch every event
→ calculate in browser
```

---

## 18. RECENT EXECUTION CLASSIFICATION

Source:

```text
DASHBOARD
SIMULATOR
SDK
```

Route:

```text
RAG
FUNCTION
```

Status:

```text
SUCCESS
ERROR
FALLBACK
```

These dimensions should remain separate.

Example:

```text
Source   = SIMULATOR
Route    = FUNCTION
Status   = SUCCESS
```

---

## 19. EXECUTION DETAIL FLOW

```text
Analytics
  ↓
Recent Executions
  ↓
Click execution
  ↓
Execution drawer/detail
  ├── Request ID
  ├── Source
  ├── Route
  ├── Status
  ├── Latency
  ├── Function
  ├── Retrieval metadata
  └── Error summary
```

Never expose secrets.

---

## 20. PROJECT DELETE / ARCHIVE FLOW

Recommended UI:

```text
Project Overview / Settings
   ↓
Danger Zone
   ↓
Delete Project / Archive Project
   ↓
Confirmation
   ↓
Operation
   ↓
Success
   ↓
Redirect to /projects
```

Confirmation for destructive delete:

```text
Type project name
```

Operation must match backend reality.

If backend only supports archive safely:

```text
Archive Project
```

must be exposed instead of falsely claiming permanent deletion.

---

## 21. ERROR HANDLING MODEL

All user-facing operations:

```text
IDLE
 ↓
LOADING / PROCESSING
 ↓
SUCCESS
```

Alternative:

```text
PROCESSING
 ↓
ERROR
 ↓
RETRY
```

Errors must show:

```text
Human-readable message
Request ID when relevant
Retry / recovery action
```

Never show server stack traces.

---

## 22. ROUTE MAP

```text
/login
/dashboard
/projects
/projects/new
/projects/[projectId]
/projects/[projectId]/knowledge
/projects/[projectId]/knowledge/new
/projects/[projectId]/knowledge/[knowledgeId]
/projects/[projectId]/functions
/projects/[projectId]/functions/new
/projects/[projectId]/functions/[functionId]
/projects/[projectId]/ai
/projects/[projectId]/sdk
/projects/[projectId]/analytics
/projects/[projectId]/simulator
```

The exact route naming may follow the current implementation, but the hierarchy must remain project-centric and explicit.

---

## 23. END-TO-END DEVELOPER GOLDEN PATH

```text
Login
  ↓
Workspace
  ↓
Create Project
  ↓
Project Overview
  ↓
Add Knowledge
  ↓
Publish Knowledge
  ↓
Wait for READY
  ↓
Add Function
  ↓
Configure AI
  ↓
Open SDK
  ↓
Copy project credentials
  ↓
Integrate Flutter SDK
  ↓
Run Simulator
  ↓
Test RAG
  ↓
Test Function Calling
  ↓
Observe Recent Executions
  ↓
Open Analytics
```

Dashboard provides shortcuts into this same loop.

---

## 24. DESIGN ↔ PRODUCT RELATIONSHIP

The visual design should communicate the product architecture without becoming an architecture diagram everywhere.

```text
Green accent
   ↓
INFRIA identity

Calm AI motion
   ↓
Reliable AI interaction

Clear project context
   ↓
Infrastructure mindset

Tables + technical metadata
   ↓
Developer tooling

Simulator + Analytics
   ↓
Observable runtime
```

The UI should consistently reinforce:

> INFRIA sits inside a developer's application as AI infrastructure.

---

## 25. FINAL UX TEST

A first-time developer should be able to answer these questions immediately:

```text
What project am I in?
What is configured?
What is missing?
Where do I add knowledge?
Where do I register functions?
How do I connect Flutter?
How do I test AI?
Did the request actually execute?
What route did the AI use?
Was it successful?
```

If the interface cannot answer these without hunting through the UI, the design needs another iteration.

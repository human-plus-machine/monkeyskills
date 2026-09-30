---
name: document-codebase
description: Generate comprehensive documentation for existing codebases. Creates business overview, architecture, code structure, API docs, component inventory, technology stack, and dependencies. Use when analyzing a codebase, documenting existing systems, or when the user asks for project documentation.
---

# Codebase Documentation Generator

Generate comprehensive documentation for existing codebases by analyzing source code, configuration, and infrastructure.

## Quick Start

1. Check `docs/codebase/state.json` — see **Session Flow** below
2. Gather business context + deep-scan repo (two passes) — build discovery brief
3. Present discovery summary (including any docs to skip) — wait for user confirmation
4. Spawn subagents in batches of 4 — skip non-applicable docs, allow targeted file reads
5. Validate outputs (existence + structure + Mermaid), update `state.json`, present completion summary

## Session Flow

Before doing anything, check `docs/codebase/state.json`:

**If `state.json` does not exist** — fresh run, proceed to step 2.

**If `state.json` exists** — read it and announce what was found:

```
Found existing session at docs/codebase/state.json
  Status: [e.g. discovery_complete / in_progress / complete]
  Docs completed: [list]
  Docs pending:   [list]
  Docs skipped:   [list]

How would you like to proceed?
  a) Resume — continue from where we left off
  b) Regenerate all — start fresh (overwrites existing docs)
  c) Regenerate specific docs — choose which files to rewrite
  d) Cancel
```

Wait for the user's choice before proceeding. Only the orchestrator reads and writes `state.json` — subagents never touch it.

**Resume behavior by status:**

| `state.json` status | What "Resume" does |
|---------------------|--------------------|
| `discovery_complete` | Discovery is done but no docs were written yet. Skip Steps 1-2. Re-present the Step 3 discovery summary for confirmation, then proceed to Step 4 for all pending docs. |
| `in_progress` | Some docs were written, some are still pending (session was interrupted mid-generation). Skip Steps 1-3. Re-run the discovery scan (Step 2) to rebuild the brief, then spawn subagents **only for docs with status `"pending"`** — do not regenerate docs already marked `"complete"`. |
| `complete` | All docs were written. Offer options (b), (c), or (d) only — there is nothing to resume. |

For `in_progress` resumes: the discovery brief is not persisted to disk (it lives only in the orchestrator's context). The orchestrator must re-run Step 2 to reconstruct it before spawning subagents for the remaining docs.

## State File

Location: `docs/codebase/state.json`

```json
{
  "status": "discovery_complete | in_progress | complete",
  "discovery": {
    "confirmed_by_user": true,
    "stack": "[detected language/framework]",
    "entry_points": ["[list of entry point file paths]"],
    "modules": ["[list of top-level modules/packages]"],
    "has_infra": true,
    "has_openapi": false,
    "business_context_source": "user_provided | readme | inferred"
  },
  "docs": {
    "business-overview.md":       "pending | complete | skipped",
    "architecture.md":            "pending | complete | skipped",
    "code-structure.md":          "pending | complete | skipped",
    "api-documentation.md":       "pending | complete | skipped",
    "component-inventory.md":     "pending | complete | skipped",
    "technology-stack.md":        "pending | complete | skipped",
    "dependencies.md":            "pending | complete | skipped",
    "code-quality-assessment.md": "pending | complete | skipped"
  }
}
```

## Output Location

```
docs/
└── codebase/
    ├── state.json                  ← session state (orchestrator only)
    ├── business-overview.md
    ├── architecture.md
    ├── code-structure.md
    ├── api-documentation.md
    ├── component-inventory.md
    ├── technology-stack.md
    ├── dependencies.md
    └── code-quality-assessment.md
```

## Documentation Artifacts

| File | Purpose |
|------|---------|
| `business-overview.md` | Business context, transactions, dictionary |
| `architecture.md` | System overview, diagrams, data flow |
| `code-structure.md` | Build system, key classes, design patterns |
| `api-documentation.md` | REST APIs, internal APIs, data models |
| `component-inventory.md` | Modules/packages categorized by their actual role in this repo |
| `technology-stack.md` | Languages, frameworks, infrastructure |
| `dependencies.md` | Internal and external dependencies |
| `code-quality-assessment.md` | Test coverage, quality indicators, tech debt |

## Discovery Brief Format

The discovery brief is the data package the orchestrator builds during Step 2 and passes to each subagent. It is **not** `state.json` — it is a larger, in-memory structure that the orchestrator assembles and includes verbatim in each subagent's prompt. `state.json` tracks session status only; the brief carries the actual codebase data.

```
discovery_brief = {
  // From state.json — session metadata
  "stack": "TypeScript + Express 4.18",
  "entry_points": ["src/index.ts", "src/worker.ts"],
  "modules": ["api", "worker", "shared", "infra"],
  "has_infra": true,
  "has_openapi": false,
  "business_context_source": "user_provided",

  // From Step 1 — business context
  "business_context": {
    "user_answers": "...",          // verbatim user responses (or null)
    "readme_extract": "..."         // business-relevant excerpt from README (or null)
  },

  // From Step 2 Pass 1 — structural scan
  "directory_tree": "...",          // top 2-3 levels of directory structure
  "build_configs": {                // key contents of each build/config file
    "package.json": "{ ... }",
    ".github/workflows/deploy.yml": "..."
  },
  "docker_compose": "...",          // full contents if present (or null)
  "env_vars": ["DATABASE_URL", "REDIS_URL", "STRIPE_API_KEY"],
  "iac_files": ["infra/main.tf"],
  "ci_cd_config": ["..."],
  "openapi_path": null,
  "migration_files": ["src/migrations/001_create_users.ts"],
  "linter_formatter_configs": [".eslintrc.js", ".prettierrc"],
  "test_config_files": ["jest.config.ts"],

  // From Step 2 Pass 2 — content extraction
  "routes": [                       // every HTTP endpoint found
    { "method": "POST", "path": "/api/orders", "handler": "OrderController.create", "file": "src/api/routes/orders.ts" }
  ],
  "domain_models": [                // ORM/schema model summaries
    { "name": "Order", "file": "src/models/order.ts", "fields": ["id", "userId", "total", "status"], "relationships": ["User", "OrderItem"] }
  ],
  "event_names": ["OrderPlaced", "PaymentFailed"],
  "service_classes": [
    { "name": "BillingService", "file": "src/services/billing.ts", "methods": ["charge()", "refund()"] }
  ],
  "role_names": ["ADMIN", "USER", "BILLING_MANAGER"],
  "import_graph": {                 // module → module dependencies
    "api": ["shared", "worker"],
    "worker": ["shared"],
    "infra": []
  },
  "package_dependencies": {         // runtime deps with versions from manifests
    "express": "^4.18.2",
    "prisma": "5.10.0"
  },
  "todo_fixme_counts": {            // per-file counts
    "src/api/legacy.ts": { "TODO": 3, "FIXME": 1 },
    "src/worker/processor.ts": { "HACK": 2 }
  },
  "test_files": ["src/__tests__/orders.test.ts", "src/__tests__/billing.test.ts"],
  "error_messages_sample": ["Order not found", "Insufficient funds", "Unauthorized access"]
}
```

The orchestrator includes the full brief in each subagent prompt. Each subagent uses only the fields relevant to its doc (see Subagent briefs by doc table in Step 4).

## Orchestration Flow

The orchestrator builds the discovery brief during Steps 1-2 and passes it to each subagent. Subagents write primarily from the brief and may read individual files for additional detail — they do not re-scan the full codebase.

### Step 1: Gather Business Context

Check for a `README.md` (or `README.rst`, `README.txt`) at the repo root. Extract any business-level description, purpose statement, or user-facing language — this becomes confirmed context.

Then ask the user this optional question and wait for a response:

```
To ground the business overview in reality rather than code inference, can you
briefly answer the following? (Skip any you're unsure about — just press Enter.)

  1. What does this system do from a business perspective?
  2. Who are the end users or consumers?
  3. What are the key business workflows or transactions it supports?
  4. Any domain-specific terms we should know?
```

### Step 2: Scan the Repo

The orchestrator performs a deep scan so subagents receive enough data to write their docs without re-scanning the full codebase. The scan has two passes.

**Pass 1 — Structural scan** (file names, configs, directory layout):
- Package managers and build config files (`package.json`, `pom.xml`, `build.gradle`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `composer.json`, etc.)
- Detected language(s) and stack from configs and file extensions
- Module/package structure — whatever organizational units this stack uses
- Infrastructure definitions if present (CDK, Terraform, CloudFormation, Pulumi, Ansible, etc.)
- Service boundaries — APIs, workers, jobs, UI entrypoints, data layers, CLI tools
- Entry point files (`main.py`, `index.ts`, `server.js`, `Application.java`, `cmd/main.go`)
- Docker / `docker-compose.yml` for runtime topology
- Environment variable names from `.env.example` or config files — signals external integrations
- IaC files (`.tf`, `cdk.ts`, `template.yaml`) for deployed resources
- CI/CD config (`.github/workflows`, `buildspec.yml`, `Jenkinsfile`) for deployment model
- OpenAPI/Swagger files (`openapi.yaml`, `swagger.json`) — note if present
- Database migration files or ORM model definitions
- Linter/formatter configs, test config files, coverage tooling

**Pass 2 — Content extraction** (read into the files identified in Pass 1):
- **Route definitions**: Read route/controller files to extract HTTP method + path + handler name for every endpoint
- **Domain models**: Read ORM model/entity/schema files to extract class names, fields, relationships
- **Event/message names**: Grep for event emitters, queue publish calls, topic names
- **Service class names**: Read key service files to extract class names and public method signatures
- **Permission/role names**: Grep for role constants, permission checks, auth decorators
- **Import graph**: For each module, read entry point imports to map internal module→module dependencies
- **Package manifest contents**: Read full `dependencies` (not `devDependencies`) with versions from each manifest
- **TODO/FIXME/HACK/XXX counts**: Grep across the codebase, record count and file locations
- **Test file list**: List all test files with paths
- **Error message strings**: Sample notable error messages from handlers and service code

All of this data becomes the **discovery brief** (see Discovery Brief Format above). Write `docs/codebase/state.json` with `status: "discovery_complete"`, populate the `discovery` object, and set all doc statuses to `"pending"`.

### Step 3: Human Checkpoint

Present the discovery summary and **wait for explicit user confirmation** before writing any docs.

```
## Discovery Summary

**Stack:** [language + framework + version]
**Entry points:** [list]
**Modules/packages:** [list with one-line description each]
**External integrations detected:** [DB, APIs, queues, etc.]
**Infrastructure:** [IaC tool + key resources, or "none detected"]
**OpenAPI spec:** [found at path / not found]
**Business context source:** [User-provided / README / Will be inferred]

**Docs to generate:** [list of applicable docs]
**Docs to skip:** [list with reason, e.g. "api-documentation.md — no HTTP endpoints detected"]

Does this look correct? Reply **yes** to proceed, or tell me what to
correct before I generate the docs.
```

If the user corrects something, update `state.json` with the correction and re-present the summary. Only proceed after confirmation.

### Step 4: Spawn Subagents in Two Batches

Set `state.json` `status` to `"in_progress"`. Spawn subagents using the Task tool (`subagent_type: "general-purpose"`), maximum 4 at a time.

**Model selection:** Omit the `model` parameter and use the default model for all docs; do not pin a model.

**Batch 1** (spawn in parallel, wait for all to complete before batch 2):
- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`

**Batch 2** (spawn in parallel after batch 1 completes):
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`

**Why two batches?** This is a parallelism limit, not a data dependency — batch 2 docs do not read batch 1 outputs. All 8 subagents work from the same discovery brief. The split into batches of 4 avoids overwhelming the system with 8 concurrent subagents. If your environment supports more concurrency, you may run all 8 in a single batch.

**Each subagent receives:**
- The repo path
- The full discovery brief (see Discovery Brief Format section) — not just `state.json`
- Their specific doc template and extraction heuristics from the **Doc Templates** section below
- The instruction: "Write only this one file to `docs/codebase/[filename]`. The discovery brief is your primary data source. You may read individual files in the repo when you need specific detail the brief does not cover (e.g. function signatures, response types, validation logic), but do not perform broad directory walks or full-codebase scans — that work has already been done."

**Subagent briefs by doc:**

| Doc | Key discovery fields to pass |
|-----|------------------------------|
| `business-overview.md` | business context (user answers + README), domain model names, route paths, event names, role names |
| `architecture.md` | entry points, docker/compose, env vars, IaC resources, CI/CD, DB migrations |
| `code-structure.md` | top-level directory structure, build config, repeated patterns across directories |
| `api-documentation.md` | route files, OpenAPI spec path (if found), model/schema files |
| `component-inventory.md` | full module/package list with paths and entry points |
| `technology-stack.md` | all package manifests, CI runtime config, test config files |
| `dependencies.md` | package manifests (runtime deps), import structure between modules |
| `code-quality-assessment.md` | test file list, linter/formatter configs, TODO/FIXME scan results |

**Subagents do NOT:**
- Write to `state.json`
- Re-scan the full codebase
- Spawn further subagents

### Step 5: Reconcile and Present Summary

After both batches complete:

1. **Existence check**: Verify each expected file was written to `docs/codebase/`
2. **Structure check**: Read each file and verify it contains the expected top-level headings from its template (e.g. `architecture.md` must have `## System Overview`, `## Architecture Diagram`, etc.). A file missing its key sections is treated as incomplete.
3. **Mermaid check**: For files that should contain Mermaid diagrams (`architecture.md`, `dependencies.md`), verify at least one ` ```mermaid ` block is present.
4. **Re-run or flag**: For any file that is missing, structurally incomplete, or lacks required diagrams — re-run that subagent once. If it fails a second time, mark it as `"pending"` in `state.json` and flag it to the user.
5. Mark each validated doc in `state.json` with `status: "complete"`
6. Set `state.json` `status` to `"complete"`
7. Present the completion summary:

```markdown
# Codebase Documentation Complete

**Docs written to `docs/codebase/`:**
- ✅ business-overview.md
- ✅ architecture.md
- ✅ code-structure.md
- ✅ api-documentation.md
- ✅ component-inventory.md
- ✅ technology-stack.md
- ✅ dependencies.md
- ✅ code-quality-assessment.md

<!-- For any skipped docs, replace ✅ with ⏭️ and add the reason: -->
<!-- - ⏭️ api-documentation.md — skipped (no HTTP endpoints detected) -->

<!-- For any docs that failed validation after retry: -->
<!-- - ⚠️ dependencies.md — incomplete (missing Mermaid diagram, marked pending) -->

**Key findings:**
[3-5 bullet points: stack, architecture pattern, notable integrations, any quality flags]

> The business-overview.md contains inferred sections — review and correct before
> treating it as authoritative.

**You may:**
- Ask for changes to any specific doc
- Re-run a single doc: just say "regenerate architecture.md"
- Approve — confirm the documentation is accurate
```

## Doc Templates & Extraction Heuristics

These templates and heuristics are passed to each subagent as part of their brief. Each subagent writes exactly one file.

### business-overview.md

Split content into two clearly labeled subsections: **Confirmed** (sourced from user input or README) and **Inferred** (derived from code analysis). If no confirmed context was provided, the entire document is inferred — say so at the top.

**How to extract inferred content:**

| What to look for | What to infer |
|------------------|---------------|
| API route paths (`/orders`, `/invoices`, `/users`) | Business transaction names ("Place Order", "Create Invoice") |
| Domain model class/table names (`Order`, `Campaign`, `Subscription`) | Business dictionary terms |
| Event or message names in queues/topics (`OrderPlaced`, `PaymentFailed`) | Async workflows and domain events |
| Service class names (`BillingService`, `NotificationService`) | Business capabilities |
| README headings and first paragraph | Stated system purpose |
| Error message strings in code | Edge cases and business rules |
| Permission/role names (`ADMIN`, `READ_ONLY`, `BILLING_MANAGER`) | User types and access model |

When inferring transaction names from routes, use the HTTP verb + resource pattern: `POST /orders` → "Create Order", `DELETE /campaigns/{id}` → "Delete Campaign".

```markdown
# Business Overview

> **Note:** Sections marked ⚠️ *Inferred* are derived from code analysis and
> naming conventions — not from explicit user input. Please review and correct
> these before treating this document as authoritative.

## Confirmed Context
<!-- Only present if user provided input or README contained business description -->
- **Source**: [User-provided / README.md]
- **Business Description**: [Verbatim or lightly paraphrased from source]
- **End Users**: [From source]
- **Key Workflows**: [From source]
- **Business Dictionary**: [From source]

## ⚠️ Inferred Context
<!-- Everything below is derived from code — treat as a starting point only -->

### System Purpose
[What the system appears to do — inferred from README, package names, API route structure, and domain model names]

### Apparent Business Transactions
<!-- Derive from HTTP routes, service method names, and event/message names -->
| Transaction | Signal in Code | Confidence |
|-------------|---------------|------------|
| [e.g. Create Order] | [e.g. POST /orders, OrderService.create()] | [High/Medium/Low] |

### Inferred Domain Terms
<!-- Extracted from class, table, event, and variable names -->
| Term | Inferred Meaning |
|------|-----------------|
| [e.g. Campaign] | [e.g. A targeted outreach effort with a budget and audience] |

## Component Level Descriptions
### [Package/Component Name]
- **Purpose**: [Inferred from code — ⚠️ verify]
- **Responsibilities**: [Key responsibilities]
```

### architecture.md

**How to extract this:**

| Signal | What to infer |
|--------|---------------|
| Entry point files (`main.py`, `index.ts`, `server.js`, `Application.java`, `cmd/main.go`) | Service boundaries and process entrypoints |
| Docker / `docker-compose.yml` | Runtime topology — how many processes, what ports, what services |
| Environment variable names in `.env.example`, config files, or `process.env.*` / `os.environ` calls | External service integrations (DB URLs, API keys, queue names, feature flags) |
| Import statements in entry points | Immediate dependencies and wiring |
| IaC files (`.tf`, `cdk.ts`, `template.yaml`) | Deployed resources, networking, storage |
| CI/CD config (`.github/workflows`, `buildspec.yml`, `Jenkinsfile`) | Deployment model and environments |
| Database migration files or ORM model definitions | Data stores and schema structure |

For the Architecture Diagram: trace from the entry point outward — process → external calls → data stores → queues. Only include what is actually evidenced in the code; do not add assumed components.

```markdown
# System Architecture

## System Overview
[2-3 sentence description of what the system is and how it is deployed — ground in entry points and IaC if present]

## Architecture Diagram
[Mermaid diagram: processes/services → data stores → external APIs → queues. Use actual names from the codebase.]

## Component Descriptions
### [Package/Component Name]
- **Purpose**: [What it does]
- **Responsibilities**: [Key responsibilities]
- **Dependencies**: [What it depends on]
- **Type**: [Describe in the repo's own terms — e.g. API server, UI, worker, library, infra, CLI]

## Data Flow
[Mermaid sequence diagram tracing the most important end-to-end workflow — pick the one most central to the system's purpose]

## Integration Points
- **External APIs**: [List with purposes — sourced from env vars, HTTP client calls, SDK imports]
- **Databases**: [List with purposes — sourced from ORM config, connection strings, migration files]
- **Third-party Services**: [List with purposes — sourced from SDK package names and env var keys]

## Infrastructure
<!-- Omit this section if no infrastructure definitions are present in the repo -->
- **IaC Tool**: [Terraform / CDK / CloudFormation / Pulumi / etc.]
- **Key Resources**: [List with purposes]
- **Deployment Model**: [Description]
- **Networking**: [If applicable — VPCs, subnets, ingress, etc.]
```

### code-structure.md

**How to extract this:**

| Signal | What to infer |
|--------|---------------|
| Config files (`package.json` scripts, `Makefile`, `pom.xml` plugins) | Build system type and key commands |
| Top-level directory names (`src/`, `lib/`, `pkg/`, `app/`, `internal/`) | Module organisation style |
| Repeated structural patterns across directories (e.g. every feature has `controller/`, `service/`, `repository/`) | Dominant design pattern (layered, MVC, hexagonal, feature-slice, etc.) |
| Base classes or interfaces that many files extend/implement | Abstraction patterns (Repository, Strategy, Factory, etc.) |
| Middleware chains, decorators, annotations | Cross-cutting concerns (auth, logging, validation) |
| `TODO`, `FIXME`, `HACK`, `XXX` comments | Known debt locations |

For the Files Inventory: list files that a developer would need to touch to add a new feature or fix a bug — entry points, routers, core service files, and shared utilities. Skip generated files, lock files, and test fixtures.

```markdown
# Code Structure

## Build System
- **Type**: [Detected from config files — e.g. npm, Maven, Gradle, Poetry, Cargo, Make, etc.]
- **Key Commands**: [e.g. `npm run build`, `mvn package`, `go build ./...`]
- **Configuration**: [Key build files and notable settings]

## Module Organisation
[Describe the top-level folder structure and the pattern it follows — e.g. feature-based, layer-based, domain-driven]

## Key Files Inventory
<!-- Files a developer needs to know to navigate the codebase -->
| File | Role |
|------|------|
| `[path/to/file]` | [e.g. Application entry point, API router, DB connection setup] |

## Design Patterns
### [Pattern Name]
- **Location**: [Where used — specific files or directories]
- **Purpose**: [Why this pattern was chosen]
- **How to follow it**: [What a developer must do to add a new instance of this pattern]

## Notable Conventions
<!-- Naming, file structure, error handling, logging — anything a new developer must know -->
- [Convention description]
```

### api-documentation.md

**How to extract this:**

| Signal | What to extract |
|--------|----------------|
| OpenAPI / Swagger file (`openapi.yaml`, `swagger.json`) | Use as primary source — extract directly, note it was auto-extracted |
| Route definition files (`routes.ts`, `urls.py`, `router.go`, `*Controller.java`) | HTTP method, path, and handler function name |
| Request body type/schema definitions | Request format |
| Response type/schema definitions or return statements in handlers | Response format |
| Validation decorators or schema validators on request objects | Validation rules |
| Interface or abstract class definitions | Internal API contracts |
| ORM model classes or schema files (`models.py`, `*.entity.ts`, `schema.prisma`) | Data models |

If an OpenAPI spec exists, note it prominently and link to it — do not duplicate it in full; summarise the key endpoints instead.

```markdown
# API Documentation

<!-- If an OpenAPI/Swagger spec exists at [path], that is the authoritative source.
     This document summarises key endpoints for quick navigation. -->

## REST APIs
### [Endpoint Name — e.g. Create Order]
- **Method**: [GET/POST/PUT/PATCH/DELETE]
- **Path**: [/api/path]
- **Purpose**: [What business action this performs]
- **Request**: [Body schema or key fields — omit if no body]
- **Response**: [Success response shape and key status codes]
- **Auth**: [Required role or token type, if detectable]

## Internal APIs
<!-- Key interfaces or abstract classes that define contracts between modules -->
### [Interface/Class Name]
- **Location**: [`path/to/file`]
- **Methods**: [Signatures with parameter and return types]
- **Purpose**: [What contract this defines]

## Data Models
### [Model Name]
- **Source**: [`path/to/model/file`]
- **Fields**: [Field name — type — purpose]
- **Relationships**: [Related models and cardinality]
- **Validation**: [Validation rules if detectable from schema or decorators]
```

### component-inventory.md

Derive categories from what is actually present in the repo — do not force a predefined taxonomy. Common categories include UI, API, services, workers, libraries, infrastructure, tests, scripts/tooling — use whichever apply.

**How to extract this:**
- Walk the top-level directory structure and identify each distinct module, package, or sub-project
- Classify each by what it does, not by a fixed label — read its entry point or `package.json`/`pyproject.toml` description if present
- Group by role: things that serve HTTP, things that process jobs, things that define shared types, things that provision infrastructure, things that test

```markdown
# Component Inventory

<!-- Categories below are derived from this repo's actual structure.
     Add, remove, or rename sections to match what was found. -->

## [Category — e.g. API / UI / Services / Workers / Libraries / Infra / Tests]
| Name | Path | Purpose |
|------|------|---------|
| [Module name] | [`path/`] | [What it does] |

## [Next Category]
| Name | Path | Purpose |
|------|------|---------|

## Summary
- **Total modules/packages**: [Number]
- **[Category]**: [Number]
- *(repeat per category)*
```

### technology-stack.md

**How to extract this:**
- Read all package manager manifests (`package.json`, `pom.xml`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, etc.) — extract language runtime versions and key dependency versions
- Read CI config for the build/test environment to confirm runtime versions actually used
- Identify testing frameworks from dev dependencies or test config files (`jest.config.*`, `pytest.ini`, `phpunit.xml`)
- Identify infrastructure tools from IaC files and CI deployment steps

```markdown
# Technology Stack

## Languages & Runtimes
| Language | Version | Where Used |
|----------|---------|------------|
| [e.g. TypeScript] | [e.g. 5.3] | [e.g. All application code] |

## Frameworks & Libraries
| Name | Version | Purpose |
|------|---------|---------|
| [Framework] | [Version from manifest] | [What it provides] |

## Data Stores
| Name | Purpose |
|------|---------|
| [e.g. PostgreSQL] | [e.g. Primary application database] |

## Infrastructure & Deployment
| Tool/Service | Purpose |
|-------------|---------|
| [e.g. AWS Lambda] | [e.g. Serverless compute for API handlers] |

## Build & Tooling
| Tool | Version | Purpose |
|------|---------|---------|
| [e.g. esbuild] | [Version] | [e.g. Bundler] |

## Testing
| Tool | Version | Purpose |
|------|---------|---------|
| [e.g. Jest] | [Version] | [e.g. Unit and integration tests] |
```

### dependencies.md

**How to extract this:**
- **Internal**: For each module/package, read its imports or build config to identify which other internal modules it references — draw the dependency direction
- **External**: Read the package manifest's `dependencies` (not `devDependencies`) for runtime deps; flag any dependency that appears unpinned (uses `^`, `~`, `*`, or `latest`) as a risk
- **Circular dependencies**: If the import graph reveals A → B → A, flag it explicitly

```markdown
# Dependencies

## Internal Dependency Graph
[Mermaid diagram — show module → module edges based on actual imports/build config. Direction = depends on.]

### Notable Internal Dependencies
| From | To | Reason |
|------|----|--------|
| [Module A] | [Module B] | [Why this dependency exists] |

## External Dependencies
<!-- Runtime dependencies only — excludes dev/test tooling (see technology-stack.md) -->
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| [Name] | [Version — flag if unpinned] | [Why used] | [None / Unpinned / Deprecated / No license] |

## Dependency Risks
<!-- Unpinned versions, known deprecated packages, or missing licenses -->
- [Risk description and location]
```

### code-quality-assessment.md

**How to extract this:**

| Signal | What to assess |
|--------|---------------|
| Test file count vs source file count ratio | Rough coverage proxy (>0.8 = good, 0.3–0.8 = fair, <0.3 = poor) |
| Presence of coverage config (`jest --coverage`, `pytest-cov`, `jacoco`) | Whether coverage is measured |
| Linter config files (`.eslintrc`, `.pylintrc`, `checkstyle.xml`, `golangci.yml`) | Linting configured or not |
| Formatter config (`.prettierrc`, `black.toml`, `gofmt`) | Code style enforced or not |
| `TODO` / `FIXME` / `HACK` / `XXX` comment count and locations | Tech debt surface area |
| Functions longer than ~50 lines or deeply nested conditionals (>3 levels) | Complexity hotspots |
| Duplicate code blocks across files | DRY violations |
| Missing error handling (unchecked returns, bare `except`, unhandled promise rejections) | Reliability risks |

```markdown
# Code Quality Assessment

## Test Coverage
- **Measured**: [Yes — via [tool] / No — no coverage tooling detected]
- **Estimated Coverage**: [Percentage if available, or Good/Fair/Poor based on test:source file ratio]
- **Unit Tests**: [Present / Absent — location if present]
- **Integration Tests**: [Present / Absent — location if present]
- **E2E Tests**: [Present / Absent — location if present]

## Code Quality Indicators
- **Linting**: [Configured — [tool] / Not configured]
- **Formatting**: [Enforced — [tool] / Not enforced]
- **Code Style**: [Consistent / Inconsistent — note any obvious divergence]
- **Inline Documentation**: [Good / Fair / Poor — based on presence of docstrings/JSDoc/comments on public APIs]

## Technical Debt
<!-- Sourced from TODO/FIXME/HACK comments and structural observations -->
| Location | Issue | Severity |
|----------|-------|---------|
| [`path/to/file:line`] | [Description] | [High/Medium/Low] |

## Complexity Hotspots
<!-- Files or functions that are long, deeply nested, or hard to follow -->
- [`path/to/file`] — [Why it's complex]

## Patterns and Anti-patterns
- **Good Patterns**: [List with locations]
- **Anti-patterns**: [List with locations — e.g. God class at `src/utils.ts`, magic strings throughout `src/api/`]
```

## Guidelines

- Use Mermaid diagrams for architecture, data flow, and dependencies
- Validate Mermaid syntax before writing files
- Be comprehensive but concise
- Focus on what developers need to understand the system
- Include file paths for key components
- Document both good patterns and technical debt
- Only the orchestrator writes `state.json` — subagents never touch it
- Never write any docs before the Step 3 human checkpoint is confirmed

### Non-Applicable Docs

Not every doc applies to every repo. If the discovery brief shows a doc has no relevant content (e.g. `api-documentation.md` for a CLI tool with no HTTP endpoints, or Infrastructure sections for a repo with no IaC), handle it as follows:

- **Skip the file entirely** — do not spawn a subagent for it
- Mark it as `"skipped"` (not `"pending"` or `"complete"`) in `state.json`
- In the Step 3 discovery summary, note which docs will be skipped and why
- The completion summary in Step 5 should list skipped docs with a brief reason

This avoids generating placeholder files full of "N/A" that add noise without value.


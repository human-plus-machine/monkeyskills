---
name: architect
description: >-
  Design and implement MonkeyApp topologies from any requirements — Main Agent,
  specialists, workspaces, routines, global skills, and MCP connectors. Use when
  the user asks to architect, seed, scaffold, or configure agents/routines/workspaces
  for a demo, pilot, customer, or feature; or when rewriting/extending a branch
  harness (formerly seed-demo-harness).
---

# Architect (MonkeyApp)

Turn **requirements** into a working MonkeyApp topology: agents, workspaces,
routines, skills, and connectors. Scope follows what the user asks for — not a
fixed demo template.

## Modes

| Mode | When | Where it lands |
|---|---|---|
| **Branch harness** | Repeatable demo/pilot on a topic branch | Code catalogs + bootstrap hooks in `monkeyapp` |
| **Live home** | One-off setup on a running install | `~/.monkeybot` via app APIs / missing-only file writes |

Default to **branch harness** when the user wants something rebuildable. Use
**live home** only when they explicitly want to configure their current install.

## Workflow checklist

Copy and track:

```
Architect:
- [ ] 1. Capture requirements → topology brief
- [ ] 2. Confirm brief with user (agents / workspaces / routines / skills / MCP)
- [ ] 3. Author missing global skills
- [ ] 4. Implement agents (catalog or commitDraft)
- [ ] 5. Implement workspaces (members + PM manager)
- [ ] 6. Implement routines (missing-only JSON seeds)
- [ ] 7. Wire connectors (attach + enabled)
- [ ] 8. Hook bootstrap (branch mode) or apply live
- [ ] 9. Tests / smoke verify
- [ ] 10. Second-launch idempotency check
```

## 1. Capture requirements → topology brief

Interview only what is missing. From freeform requirements, produce this brief
**before writing code or home files**:

```markdown
# Topology: <name>

## Goal
<one sentence>

## Main Agent (`default`)
- Role: <control tower / ops / …>
- Persona notes: <bullet intents — implemented via managed marker, not hand-edited tail>
- Skills: [<slugs>]
- Connectors: [<mcp names>]

## Specialists
| Name | Purpose | Skills | Connectors | Notes |
|---|---|---|---|---|
| … | … | … | … | … |

## Workspaces
| Name | Members | PM? | Resources | Routines in this space |
|---|---|---|---|---|
| … | … | yes/no | … | … |

## Routines
| ID | Name | Scope | Target / pipeline | Trigger | Prompt summary |
|---|---|---|---|---|---|
| … | … | main \| workspace:<id> | agent id **or** `A → B ∥ C → D` | interval\|wallclock | … |

For multi-agent rows, expand under the table:

```text
<id> stages:
  1. sequential: <agent> — <step prompt>
  2. parallel: <agent> — … ; <agent> — …
```

## Skills to author
| Slug | Used by | Trigger idea |
|---|---|---|

## MCP / connectors
| Name | Scope | Enable on |
|---|---|---|

## Out of scope
<explicit non-goals>
```

Rules while designing:

- Prefer the **smallest** topology that meets the requirements.
- Main Agent is app-owned `default` — do not invent a second "main".
- Workspaces are first-class when the requirements need shared memory, a PM,
  multi-agent collaboration, or space-scoped routines. Skip them when a flat
  specialist list is enough.
- Routines that must appear in the Routines dashboard are JSON files (not
  gateway `loop` / `start_loop`).
- Prefer **classic single-agent** routines (`prompt` + `target_agent_id`) unless
  the requirements need more than one agent or step. Use `stages` for pipelines.
- Never overwrite existing agents, routines, skills, or workspace configs on
  re-run — **missing-only** installs.

Confirm the brief with the user, then implement.

## 2. MonkeyApp config surface (source of truth)

| Piece | Types / files | Create via |
|---|---|---|
| Agent record | `AgentRecord` in home config | `GatewayBootstrapper.commitDraft(AgentDraft)` after CLI ready |
| Agent persona | `monkeybot_config/AGENT.md` | Draft `agent_md` / purpose on commit |
| Agent skills | agent `skills/<slug>/` | Draft `skill_slugs` → copied from global on commit |
| Agent MCP | `monkeybot_config/mcp.json` | Draft `connector_names` or ensure-enabled helper |
| Global skills | `~/.monkeybot/skills/<slug>/SKILL.md` (symlinked from Main workspace `global-skills/`) | Author packages; missing-only copy |
| Workspace | `WorkspaceRecord` (`id`, `name`, `memberAgentIDs`, `managerAgentID`, `resources`) | `createWorkspace` / `createWorkspaceWithManager` |
| Main routines | `~/.monkeybot/routines/<id>.json` | Missing-only seed; filename **must** equal `id` |
| Workspace routines | `workspaces/<id>/memory/routines/<id>.json` | Same schema, scoped path |
| Home config | `HomeConfig` | `defaultAgentID`, `agents[]`, `workspaces[]` |

Key TypeScript types: `src/shared/types.ts` (`AgentDraft`, `RoutineRecord`,
`WorkspaceRecord`, `HomeConfig`).

App skills for chat-driven single edits (not full topology):
`resources/Skills/creating-custom-agents`, `managing-routines`,
`creating-skills`, `customizing-the-default-agent`.

## 3. Skills packages

Each skill: `global-skills/<slug>/SKILL.md` (repo checkout for branch harness)
or write into the Main Agent's `global-skills/` for live home.

```markdown
---
name: Human Title
description: When to use + trigger phrases (slightly pushy).
---

# Body
Tools, steps, do-nots.
```

Reserved / internal slugs — do not create or overwrite:
`about-monkeybot`, `creating-custom-agents`, `creating-skills`,
`customizing-the-default-agent`, `managing-routines`, `monitoring-monkeybot`,
`document-analysis`, `browser`, `officecli`, `image-generator`, `loop`.

Install helpers must resolve the skills root from the **catalog source file**
(`import.meta.url` / `__dirname`), not the caller's path.

## 4. Branch harness — catalog pattern

Put catalogs under `electron/main/harness/` (or a clearly named sibling):

```
electron/main/harness/
  <Name>Topology.ts      # brief as code: agents, workspaces, routines, skill slugs
  <Name>AgentCatalog.ts
  <Name>RoutineCatalog.ts
  <Name>WorkspaceCatalog.ts
```

### Agent seed spec

```ts
export type AgentSeedSpec = {
  /** Stable id hint / slug base (optional; commitDraft may assign). */
  idHint?: string
  name: string
  purpose: string
  skillSlugs: string[]
  connectorNames: string[]
  agentMD: string
  /** Optional routing key if the product maps findings → specialists. */
  lens?: string
}
```

Required helpers:

1. `missingSeeds(givenAgents)` — skip if name (or lens) already covered
2. `installMissingGlobalSkills` / attach to Main when required
3. `ensureConnectorEnabled(agentMcp, fromGlobal)` — attach if missing, set
   `enabled: true` (bundled connectors default off)
4. `agentsToPrune` / `isHarnessAgent` — only when requirements ask to prune
5. Install via `commitDraft` **after** CLI is on PATH / bootstrap can scaffold

Hook agents from `GatewayBootstrapper` after Main Agent prepare / CLI sync —
not only from `ensureBundledLibrariesInstalled` (needs `monkeybot new`).

Main Agent persona: add a **last** `replaceSection` marker for harness Ops
copy (each replace truncates to EOF — order matters). Do not edit below
managed harness markers by hand.

### Routine catalog

Mirror missing-only JSON seeds. Classic routines omit `stages`. Multi-agent
pipelines set `stages` (stages always run **in order**; each stage's `mode` is
`sequential` = Then, or `parallel` = Together).

```ts
export type RoutineStepSeed = {
  id: string
  agent_id: string
  prompt: string
  name?: string | null
}

export type RoutineStageSeed = {
  id: string
  mode: 'sequential' | 'parallel'
  steps: RoutineStepSeed[]
}

export type RoutineSeed = {
  id: string
  name?: string
  /** Mirrors first step when `stages` is set (compat / list search). */
  prompt: string
  trigger: { type: 'interval' | 'wallclock'; value: string }
  /** Mirrors first step's agent_id when `stages` is set. */
  target_agent_id: string
  workspace_id?: string | null
  enabled?: boolean
  background_enabled?: boolean
  /** Omit / empty = classic single-agent. Non-empty = multi-step pipeline. */
  stages?: RoutineStageSeed[] | null
}
```

Multi-agent design rules:

- Keep top-level `prompt` and `target_agent_id` equal to the **first step**
  (UI + older clients read them; use `withPrimaryFields` / equivalent on seed).
- Do not invent a DAG — only ordered `stages` with sequential or parallel steps.
- Later steps receive prior results as context; prompts may use `{{prev}}`.
- Workspace-scoped step `agent_id`s must be **members** of that workspace.
- Full JSON authoring detail: `resources/Skills/managing-routines/SKILL.md`.

- `installMissingSeeds` — write only if file absent; **never overwrite**
- Main scope: home `routines/`
- Workspace scope: `workspaces/<id>/memory/routines/`
- Hook early from home/bootstrap library install (no CLI required)
- Tests: count, target agent (and first-step sync when multi-agent), stage
  modes / membership when `stages` present, workspace scope, idempotency

### Workspace catalog

```ts
export type WorkspaceSeed = {
  name: string
  /** Specialist names or ids resolved after agents exist */
  memberAgentNames: string[]
  createPM: boolean
  resources?: { path: string }[]
}
```

- Create workspace after member agents exist
- Prefer `createWorkspaceWithManager` when `createPM: true`
- Missing-only: skip if a workspace with the same name (or stable id) exists
- Attach space-scoped routines after the workspace id is known

## 5. Live home mode

When not shipping branch code:

1. Author skills into Main `global-skills/`
2. Create specialists via Agents Studio draft + `commitDraft` (or equivalent IPC)
3. Create workspaces via `workspaces.create` / `createWorkspaceWithManager`
4. Write routine JSON with confirmed schema (filename = `id`)
5. Still missing-only; still confirm destructive prune

Do not bypass Studio/draft for agent creation by hand-scaffolding
`agents/<id>/` unless the user explicitly wants raw home surgery.

## 6. Optional audience UI (branch-only)

Only when requirements ask for a presenter-facing shell:

| Goal | Touch points |
|---|---|
| Hide Memory Graph | Sidebar / directory / app menu |
| Hide Workspaces | Same + open-workspaces entry |
| Rename Agent Studio → Specialists | Hub title, sidebar, breadcrumbs, empty states |

Hide/rename only — do not delete feature code.

## 7. Tests (minimum)

- Topology brief matches seeded names / workspace membership
- `missingSeeds` / prune behavior
- Skill checkout path finds every slug
- Skill + routine + workspace install idempotent
- Connector enable does not duplicate `name-2`
- Routine seeds respect main vs workspace paths
- Multi-agent seeds: `stages` shape, primary fields match first step, workspace
  step agents ⊆ members
- If lenses/resolvers exist: names resolve correctly

## 8. Verify after rebuild / relaunch

1. Agents hub shows expected specialists (Main excluded)
2. Workspaces picker shows seeded spaces with correct members / PM
3. Routines dashboard shows seeded routines in the right scope (multi-agent
   rows show the pipeline summary, e.g. `A → B ∥ C`)
4. Main (and PM, if any) can use required MCP tools for the opening scenario
5. Second launch does not recreate or overwrite

## Anti-patterns

- Hard-coding a single customer demo (ITSCHR, etc.) into this skill — put
  customer specifics in a topology brief / harness module
- Editing Main Agent persona **after** managed markers (wiped on relaunch)
- Attaching MCP without `enabled: true`
- Seeding agents before CLI is ready
- Overwriting existing routine / skill / agent / workspace configs
- Using gateway `loop` for Routines-dashboard work
- Seeding multi-agent `stages` without syncing top-level `prompt` /
  `target_agent_id` to the first step
- Targeting a workspace routine step at a non-member agent
- Scaffolding a large topology when requirements ask for a thin pilot
- Forgetting workspaces when the story needs shared memory or a PM

## Knobs

- Agent draft fields: `resources/Skills/creating-custom-agents/SKILL.md`
- Routines schema: `resources/Skills/managing-routines/SKILL.md`
- Skill authoring: `resources/Skills/creating-skills/SKILL.md`
- Shared types: `src/shared/types.ts`
- Bootstrap / commit / workspace PM: `electron/main/bootstrap.ts`
- Home + workspace CRUD: `electron/main/home.ts`

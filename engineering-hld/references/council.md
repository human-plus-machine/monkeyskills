# Council

Load at the Council step, Full HLD only. The API is already locked. There is
no pattern library of “best” designs; **council** is three independent
candidates, then one winner. Earn still judges every extra box.

Single lever and Critique skip this file.

## Dispatch

Pack one brief from `ledger.md`, FR, NFR, entities, APIs, recon topology, and
gated numbers. Members are stateless: the brief is their only workspace.

Launch three `Task` calls in the **same turn**. Do **not** pass `model` on
Task — the subagent frontmatter selects the model (`subagents/hld-*.md`,
installed by this repo's `install.js`). Do not use `council-claude` /
`council-gpt` / `council-gemini` (MonkeyThink output format). Do not pass MonkeyThink,
MonkeyMode, or interview playbooks.

| Bias | `subagent_type` | Model (same as) |
|---|---|---|
| **simple** — fewest boxes that meet every FR | `hld-simple` | same model as `council-claude` |
| **isolate** — failure domains and async only where an NFR requires them | `hld-isolate` | same model as `council-gpt` |
| **operate** — mechanisms the team already runs | `hld-operate` | same model as `council-gemini` |

The council members use whichever models `subagents/council-claude.md`,
`council-gpt.md`, and `council-gemini.md` specify. If one of those models is
unavailable in the user's tool, the same prompt can be run with any available
model (degrade gracefully); the three distinct biases still apply.

`run_in_background: false`.

If a named HLD subagent is unavailable, **stop**. Tell the user to install
`hld-simple`, `hld-isolate`, and `hld-operate` (run this repo's `install.js`,
or copy `subagents/hld-*.md` into your tool's agents directory) **and then
restart your agent/IDE if the subagents are not picked up** — subagent types
are registered when a session starts, so files installed mid-session may not
be callable until restart. The run resumes at
Council from `ledger.md` and `design.md`; recon and contract are not redone.
Do not fall back to `general-purpose`, `model: inherit`, or one parent pass —
that is not a model council.

Each prompt is: this file’s brief template + that row’s bias + the packed
contract.

## Brief (identical except bias)

```text
Bias: {simple | isolate | operate}

Locked API and FRs (do not add endpoints or features):
{paste}

NFR and gated numbers:
{paste}

Entities and recon topology (extend unless a number earns replacement):
{paste}

Propose at most two candidates. Each candidate:
- meets every FR with the locked API
- lists boxes (services/stores only; caches/queues/shards as extras)
- names the first-bottleneck hypothesis
- lists extras that would still need earning
- names one kill condition

Start with ## Candidates. No preamble. No vendor SKU without a sourced
provider in the brief. No extra FR.
```

## Persist

Write under `{workspace}/.engineering-hld/{slug}/council/`:

- `simple.md` `isolate.md` `operate.md` (raw member text)
- `synthesis.md`

## Synthesis

`synthesis.md` contains:

| Candidate | Member | Extra boxes | Bottleneck hypothesis | Verdict |
|---|---|---|---|---|

- **consensus** — same box set from ≥2 members
- **unique** — one member only
- **contradiction** — members disagree on a topology-changing box

**Winner:** the candidate that meets every FR with the **fewest extra boxes**.
Surface contradictions to the user. If two tie on extra-box count, ask once
with a recommended winner, then stop until the user chooses. Do not earn
inside council. HLD boxes stay empty until Earn.

Losers go to Rejected alternatives with the rejection reason from this
synthesis.

**Done when:** three member files exist, `synthesis.md` names exactly one
winner, losers have rejection reasons, contradictions are listed, and the
HLD heading is still empty.

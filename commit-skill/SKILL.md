---
name: commit
description: Git workflow for MonkeyMode projects - always uses a topic branch prefixed `feat/` or `bugs/` from the change type (never main/develop), commits per story/phase, pushes only that branch, and optionally creates PRs to the repo default branch. Invoke with @commit or /commit after any MonkeyMode phase.
author: MonkeyMode Contributors
---
 
# Commit - Git Workflow for MonkeyMode
 
## Intent
 
This skill provides an opt-in git workflow that complements MonkeyMode. It reads MonkeyMode state and artifacts to generate intelligent commits, branches, and PRs — without coupling git logic into MonkeyMode itself.
 
**User invokes:** `@commit` or `/commit`
 
**Agent performs:** Context-aware git operations based on MonkeyMode state.
 
## When to Activate
 
- User says "commit", "commit my changes", "commit story X"
- User says "create a branch", "push my changes", "create a PR"
- User invokes `@commit` or `/commit`
 
## Workflow
 
### Step 1: Detect Context
 
1. **Check for MonkeyMode state:** Look for `{workspace}/.monkeymode/*/state.json`
   - If multiple features exist, list them and ask which one
   - If one feature exists, use it automatically
   - If no MonkeyMode state exists, fall back to [Generic Mode](#generic-mode)
2. **Read state.json** to determine:
   - `feature_name` — used for branch naming
   - `current_phase` — determines commit message prefix
   - `stories` — identifies which stories have been implemented
3. **Run `git status`** to see what's changed
4. **Run `git diff --stat`** to understand the scope of changes
5. **If nothing to commit**, tell the user and stop
 
### Step 2: Branch Management (topic branches: feat/ or bugs/)
 
**Protected integration branches:** Never commit or push on `main`, `develop`, or `master`. Changes always land on a **new or existing topic branch** (`feat/...` or `bugs/...`) so they can be merged via PR into the remote’s default branch (usually `main` or `develop` — detect with `git symbolic-ref refs/remotes/origin/HEAD` or `git remote show origin | awk '/HEAD branch/ {print $NF}'`).

#### Branch prefix: feat/ vs bugs/

Pick the prefix from what the code change is for (aligns with conventional commits: `feat` / `fix`):

| Use | Branch pattern | Signals |
|-----|----------------|--------|
| **`feat/`** | `feat/{slug}` | New behavior, new UI, new APIs, greenfield stories, design/docs for upcoming capability, MonkeyMode work that implements a **feature** story |
| **`bugs/`** | `bugs/{slug}` | Fixing incorrect behavior, regressions, crashes, wrong data, security patches to existing behavior; story or issue is a **bug**; commits will mainly be `fix(...)` |

**How to decide:** Infer from `git diff`, file paths, MonkeyMode story titles/type, and planned commit messages. If the work is clearly a defect fix → `bugs/{short-kebab-description}`. If it clearly adds or extends product behavior → `feat/{feature-name-or-short-description}`. If both (large mixed change), prefer **`bugs/`** when the primary goal is fixing a reported bug; otherwise **`feat/`**. If still ambiguous, ask the user: "Should this branch be `feat/...` or `bugs/...`?"

Slug tips: lowercase, hyphens, short (e.g. `feat/user-auth-oauth`, `bugs/login-redirect-loop`).

1. **Run `git branch --show-current`** to get the current branch name
2. **Always tell the user their current branch first:**
   - "You are currently on branch `{current-branch}`."
3. **If the current branch is `main`, `develop`, or `master`:**
   - Do **not** offer committing on it
   - Create a new branch before any commit:
     - Choose prefix **`feat/`** or **`bugs/`** per the table above
     - Default suggestion: `feat/{feature-name}` or `bugs/{slug}` from MonkeyMode state / change analysis, or `feat/{short-description}` / `bugs/{short-description}` in generic mode
     - Alternatively use a full branch name the user provides (may omit `feat/`/`bugs/` if they insist — prefer the prefix convention)
   - Run `git checkout -b {new-branch}` (or `git switch -c {new-branch}`)
   - Tell the user: "Created branch `{new-branch}` from `{previous-branch}`. Commits and push will go to this branch; open a PR into the repo default branch when ready."
4. **If the current branch is already a topic branch** (anything other than `main`, `develop`, `master`):
   - Proceed with commits on `{current-branch}` — it is already suitable for a PR
   - If the user asks for a different branch name, create or switch with `git checkout -b {name}` / `git checkout {name}` as usual
 
### Step 3: Stage & Commit
 
Analyze the changed files against MonkeyMode state to create meaningful commits.
 
#### Commit Strategy
 
**Phase-aware commits** — Group changes based on what MonkeyMode phase produced them:
 
| Changed files match | Commit message format | Example |
|---|---|---|
| `.monkeymode/**/design/**` | `docs({feature}): complete phase 1 design` | `docs(user-auth): complete phase 1 design` |
| `.monkeymode/**/stories/user_stories.md` | `docs({feature}): define user stories` | `docs(user-auth): define user stories` |
| `.monkeymode/**/stories/2b-acceptance.md` | `docs({feature}): draft acceptance checklist` | `docs(user-auth): draft acceptance checklist` |
| `.monkeymode/**/code_specs/**` | `docs({feature}): create code spec for {story}` | `docs(user-auth): create code spec for login-form` |
| Source files matching a story's `files_to_create`/`files_to_modify` | `feat({feature}): implement {story-title}` | `feat(user-auth): implement login form component` |
| Test files only | `test({feature}): add tests for {story-title}` | `test(user-auth): add tests for login form` |
| Mixed source + test for one story | `feat({feature}): implement {story-title}` | `feat(user-auth): implement auth service` |
| Files spanning multiple stories | One commit per story (split by story file boundaries) | Multiple commits |
| Integration phase files | `feat({feature}): integrate stories and add e2e tests` | `feat(user-auth): integrate stories and add e2e tests` |
| `.monkeymode/**/acceptance-report.md` or acceptance phase | `test({feature}): run acceptance checklist` | `test(user-auth): run acceptance checklist` |
| Unrecognized files (no story match) | `chore({feature}): update {brief description}` | `chore(user-auth): update dependencies` |
 
#### Splitting Logic
 
When changes span multiple stories:
1. Read each story's `files_to_create` and `files_to_modify` from state.json
2. Map each changed file to its owning story
3. Stage and commit per story, in story order
4. Files that don't map to any story go in a final `chore` commit
 
#### Commit Execution
 
For each commit:
1. **Show the user** what will be committed (files, message) and ask for confirmation
2. Stage the relevant files with `git add`
3. Commit with the generated message, appending a `Made-with: MonkeyMode` trailer on a blank-line-separated line at the end of the message body — run outside the sandbox with `required_permissions: ["all"]` since pre-commit hooks require full system access
 
   Example commit message format:
   ```
   feat(user-auth): implement login form component
 
   Made-with: MonkeyMode
   ```
4. **Handle hook-modified files:** After the commit attempt, run `git status` to check for unstaged changes on files that were just staged. Pre-commit hooks like `black`, `isort`, or `prettier` auto-format files and leave them unstaged. If any such files exist:
   - Tell the user: "Pre-commit hook modified {file(s)} (e.g. black reformatting). Restaging and retrying..."
   - Re-run `git add` on those files
   - Retry the commit with the same message
5. **Handle failing hooks:** If the commit fails due to a hook that cannot run in the current environment (e.g. `pytest: command not found`), inform the user:
   - "The `{hook}` hook failed because `{reason}`. All other hooks passed. Would you like to skip hooks (`--no-verify`) and proceed?"
   - Only use `--no-verify` with explicit user confirmation
6. Report success
 
### Step 4: Push After Successful Commit
 
After every successful commit, **automatically push the current branch to remote and provide the PR link** — no need for the user to ask separately — **unless** the current branch is a protected integration branch (see below).
 
1. **Before pushing:** If `HEAD` is `main`, `develop`, or `master`, **do not push**. Stop and explain: commits should not exist on these branches in this workflow; create a topic branch (`feat/...` or `bugs/...`), move commits with `git branch` / `cherry-pick` or reset and redo as appropriate. (This should not happen if Step 2 was followed.)
2. Push the topic branch only: `git push -u origin HEAD`
3. **Never** run `git push origin main`, `git push origin develop`, `git push origin master`, or any push that updates those branches as part of this skill.
4. Parse the remote output for the PR creation URL (Bitbucket/GitHub/GitLab often print it after a push)
5. Report to the user:
   - "Pushed to `origin/{branch}`. Open a PR **into** the default branch (`{default-branch}` if known). [Create PR →]({pr-url})"
6. If the push fails (e.g. no remote configured, auth error), report the error clearly and stop
 
### Step 5: Create PR (Only If Asked)
 
**Never auto-create PRs** — only provide the link. Only fully create a PR (via `gh pr create` or equivalent) when the user explicitly says "create PR", "open PR", or "make a pull request".
 
When creating a PR:
1. Ensure changes are pushed first from a **topic branch** (`feat/...` or `bugs/...`) (push if not); base branch = repo default (`main` / `develop` / etc.), compare branch = your branch — **never** open a PR from `main`/`develop`/`master` as the head branch for new work in this workflow
2. **Generate PR title:** Match the branch intent — `feat: {name}` for `feat/...` branches, `fix: {name}` for `bugs/...` branches (humanized slug)
3. **Generate PR body** from MonkeyMode artifacts:
 
```markdown
## Summary
 
{Read .monkeymode/{feature}/design/1a-discovery.md "Problem Statement" section for a 1-2 sentence summary}
 
## Changes
 
{For each implemented story from state.json, list:}
- **{story-title}**: {one-line description from stories/user_stories.md}
 
## Test Plan
 
{For each story, list test files created}
 
## MonkeyMode Artifacts
 
- Design: `.monkeymode/{feature}/design/`
- User Stories: `.monkeymode/{feature}/stories/user_stories.md`
- Acceptance Checklist: `.monkeymode/{feature}/stories/2b-acceptance.md`
- Code Specs: `.monkeymode/{feature}/code_specs/`
```
 
4. Create PR using `gh pr create`
5. Return the PR URL to the user
 
## Generic Mode
 
When no MonkeyMode state exists, operate as a standard smart commit helper:
 
1. Run `git status` and `git diff --stat`
2. **If on `main`, `develop`, or `master`:** create `feat/{short-description}` or `bugs/{short-description}` (from change type — [see prefix table](#branch-prefix-feat-vs-bugs)) or a user-provided name before committing — same rules as [Step 2](#step-2-branch-management-topic-branches-feat-or-bugs)
3. Analyze changed files to generate a concise, conventional commit message
4. Show the user the proposed commit and ask for confirmation
5. Commit, then push the topic branch only (never push `main`/`develop`/`master`) and provide the PR link
 
Conventional commit prefixes: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`, `perf`, `ci`, `build`
 
## Safety Rules
 
- **NEVER** commit on `main`, `develop`, or `master` — always create a topic branch (`feat/...` or `bugs/...`) first when the current branch is one of these
- **NEVER** `git push origin main`, `git push origin develop`, `git push origin master`, or otherwise push updates to those branches as part of this skill
- **NEVER** push when `HEAD` is `main`, `develop`, or `master` (topic branch required)
- **NEVER** force push (`--force`, `--force-with-lease`)
- **NEVER** commit files that look like secrets (`.env`, `*.pem`, `*.key`, `credentials.*`, `*secret*`)
- **NEVER** create PRs without explicit user request
- **NEVER** modify git config
- **NEVER** rebase or amend commits that have been pushed
- **NEVER** commit `node_modules/`, `__pycache__/`, `.venv/`, or other dependency/build directories
- **NEVER** use `--no-verify` without explicit user confirmation
- **ALWAYS** show what will be committed before committing
- **ALWAYS** ask for confirmation before each commit
- **ALWAYS** push the **topic branch** (`feat/...` or `bugs/...`) after a successful commit and provide the PR creation link (targeting the repo default branch)
- **ALWAYS** restage hook-modified files automatically before retrying a commit
 
## Examples
 
### Basic commit after Phase 4
 
```
User: @commit
Agent: "Reading MonkeyMode state for 'user-auth' (Phase 4: Implementation).
        
        You are currently on branch `main`. I'll create `feat/user-auth` so we don't commit on the default branch; you can open a PR into the repo default branch after push.
 
        Created branch `feat/user-auth` from `main`.
 
        3 stories implemented. I'll create these commits:
 
        1. feat(user-auth): implement login form component
           - src/components/LoginForm.tsx
           - src/components/LoginForm.test.tsx
 
        2. feat(user-auth): implement auth service
           - src/services/auth.ts
           - src/services/auth.test.ts
 
        3. feat(user-auth): implement session middleware
           - src/middleware/session.ts
           - src/middleware/session.test.ts
 
        Proceed with all 3 commits?"
```
 
### Custom branch name
 
```
User: @commit
Agent: "Reading MonkeyMode state for 'user-auth' (Phase 4: Implementation).
 
        You are currently on branch `develop`. I can't commit on `develop`; I'll use a topic branch. Default would be `feat/user-auth` — use a different name?"
 
User: use feature/JIRA-1234-user-auth
 
Agent: "Created branch `feature/JIRA-1234-user-auth` from `develop`.
 
        2 files changed. I'll commit:
 
        feat(user-auth): implement login form component
        - src/components/LoginForm.tsx
        - src/components/LoginForm.test.tsx
 
        Proceed?"
```
 
### Bugfix branch (bugs/)
 
```
User: @commit
Agent: "Reading MonkeyMode state for 'checkout' (Phase 4). Diff and stories indicate a regression fix, not a new feature.
 
        You are on `main`. I'll create `bugs/cart-double-charge` (fix work) instead of `feat/...`.
 
        Created branch `bugs/cart-double-charge` from `main`.
 
        Proceed with commit: fix(checkout): prevent duplicate payment intent...
        After push, PR title: fix: cart double charge"
```
 
### Commit + push + PR link
 
```
User: @commit
Agent: [branch selection + commits as above, then]
       "Committed feat(user-auth): implement auth service.
        Pushing topic branch to origin... Done.
 
        Open a PR into the default branch: [Create PR →](https://github.com/org/repo/pull-requests?create&sourceBranch=refs/heads/feat/user-auth)"
```
 
### Commit + full PR creation
 
```
User: @commit and create a PR
Agent: [branch selection + commits + push as above, then]
       "Creating PR...
 
        PR created: https://github.com/org/repo/pull/42
        Title: feat: user-auth
        3 stories implemented, 6 files changed"
```
 
### Design phase commit
 
```
User: @commit
Agent: "Reading MonkeyMode state for 'user-auth' (Phase 1: Design).
 
        You are already on `feat/user-auth` (topic branch). I'll commit the design artifacts here:
 
        docs(user-auth): complete phase 1 design
        - .monkeymode/user-auth/design/1a-discovery.md
        - .monkeymode/user-auth/design/1b-contracts.md
        - .monkeymode/user-auth/design/1c-operations.md
 
        Proceed?"
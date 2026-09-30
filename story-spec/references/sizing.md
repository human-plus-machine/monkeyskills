# Complexity sizing

Size on the **riskiest** dimension, not the average. Example: a one-line schema migration on a shared table is L/XL even if the diff is tiny.

| Size | Signal |
|---|---|
| XS | Single file, no new logic, no tests beyond existing coverage |
| S | Single module/repo, isolated change, straightforward tests |
| M | Single repo, multiple modules, or one cross-team dependency |
| L | Multiple repos, new integration surface, or non-trivial data/schema change |
| XL | Multiple repos + multiple teams, architectural change, or migration/backfill |

# Phase 1 — Draft

1. Search the named codebase(s) for modules/files the change touches.
2. If multiple repos/teams are involved and no sitemap/blueprint exists, **ask** which teams own the other repos. Do not guess.
3. Fill `templates/story.md`. Language must be concrete.
4. Size using `references/sizing.md` (riskiest dimension, not the average).
5. Regression checklist: name real suites/files and call sites. See template guidance.
6. Diagram: Mermaid `flowchart` or `sequenceDiagram` of components actually touched. One mermaid fence only — do not wrap it in an outer code fence. Chat may show Mermaid; many trackers will not. If the user wants to sync, generate a PNG to attach (see phase 2).
7. Present the full draft. Iterate on feedback before phase 2.

Then go to phase 2 only if the user wants the story created or updated in their tracker.

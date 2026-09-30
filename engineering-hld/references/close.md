# Close: artifact, diagrams, verify

Load this file only after every in-scope component has a deep-dive row.

1. **Write.** Read [template](templates/design.md) before writing. Create or
   replace `{workspace}/.engineering-hld/{kebab-case-name}/design.md` from that
   template. Omit inapplicable sections. Heading order follows
   [contract-first](contract-first.md) then spine records. Mermaid is the
   portable topology.
   Load the [greenfield Full HLD](../examples/greenfield-full-hld.md) only when
   artifact shape is unclear — shape, not values. Copy no numbers.
   **Done when:** the template's mode adaptation is filled, Full HLD Council
   matches `council/synthesis.md`, and every Mermaid matches APIs, data flow,
   names, and prose.

2. **Publish.** Resolve `<module>` as the workspace module, the module the user
   discussed, or the workspace root — never the home directory without
   asking. Copy `design.md` to
   `<module>/docs/architecture/engineering-hld-design.md`. Council drafts stay
   under `.engineering-hld/{slug}/`.
   **Done when:** the published file exists and `design.md` links to it.

3. **Diagrams (optional).** Mermaid in `design.md` is the portable topology. If
   the user wants rendered images, export them from the Mermaid source (for
   example with `mmdc`) to `<module>/docs/architecture/` and link the paths from
   `design.md`. Single lever: images only when the lever changes topology.
   Diagrams must match across markdown and any exported images.
   **Done when:** any requested diagram exports exist and `design.md` points at those paths.

4. **Falsify, then verify.** At least one measurable **kill condition**
   (signal + threshold + window + consequence) and one accepted failure.
   Re-read the artifact against [verify](verify.md).
   **Done when:** every verify.md check passes.

# Greenfield Full HLD — council synthesis (shape only)

Copy no numbers. Full HLD persist layout under
`.engineering-hld/{slug}/council/synthesis.md`.

| Candidate | Member | Extra boxes | Bottleneck hypothesis | Verdict |
|---|---|---|---|---|
| Evidence + membership + serving tables | simple | none required | Lookup scan vs membership key | **Winner** — fewest extras, all FRs |
| Evidence + membership + serving tables | operate | none required | Same | consensus with simple |
| Same + streaming processor | isolate | stream processor | Freshness | unique extra; contradiction on topology |

**Winner:** evidence + membership + serving (fewest extra boxes).

**Contradictions:** isolate adds a stream processor; simple/operate do not.

**Earn still empty:** no HLD boxes drawn yet.

# Design: {feature-name}

**Created:** {ISO8601 date}
**Source:** @explore exploration handoff
**Decision:** See `../decision.md`

## Overview

{2-3 paragraph summary of the chosen system}

## Goals and non-goals

**Goals:**
- ...

**Non-goals (this release):**
- ...

## Evidence from exploration

| Learning | Source |
|----------|--------|
| ... | `pocs/...` or iteration log |

## Architecture summary

{diagram or bullet architecture — maps to `components.md`}

## Cross-cutting concerns

### Security
...

### Performance
...

### Observability
...

### Deployment / rollout
...

## Open questions

- ...

## Detailed sections

- [Components](components.md)
- [Interactions](interactions.md)
- [API & contracts](api.md)
- [Data](data.md)

---

# Components (also save as components.md)

## {Service or module name}

- **Responsibility:**
- **Repo / path:**
- **Depends on:**
- **Owned by (team):**

---

# Interactions (also save as interactions.md)

## Flow: {name}

1. Actor A → ...
2. ...

**Failure modes:**
- ...

**Idempotency / retries:**

---

# API & contracts (also save as api.md)

## {Endpoint or event name}

- **Method / type:**
- **Request:**
- **Response:**
- **Errors:**

---

# Data (also save as data.md)

## Entity: {name}

| Field | Type | Notes |
|-------|------|-------|

**Storage:**
**Migrations:**
**Retention:**

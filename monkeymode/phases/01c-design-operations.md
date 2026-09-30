---
name: design-operations
description: Phase 1C - Production Readiness. Guides security, performance, deployment, observability, and risk assessment.
---
 
# Phase 1C: Production Readiness
 
## Purpose
Ensure the design is ready for production deployment with proper security, performance, and operational excellence.

## Output
An operational specification document (~400 lines) covering:
- Database migration strategy (ordering, rollback DDL, data backfill)
- Security design
- Performance & scalability strategy
- Deployment strategy
- Infrastructure decision + IaC (only when new/changed infrastructure is required)
- Observability (logging, metrics, tracing)
- Risk assessment
 
## Prerequisites
- Phase 1A and 1B complete
- Architecture, data model, and API contracts approved
 
## Phase 1C Process
 
### Step 7: Database Migration Strategy

> **Note:** Phase 1A defers migration strategy to this phase. For any feature that touches a database — new tables, schema changes, or data transformations — this section is **required**. If the feature has no database impact, write "N/A — no database changes" and move on.

```markdown
### Migration Ordering

Define the sequence of DDL operations and their dependencies:

| Order | Migration File | Description | Dependencies | Reversible? |
|-------|---------------|-------------|--------------|-------------|
| 1 | V001__create_favorites_table.sql | Create favorites table | users table must exist | Yes |
| 2 | V002__add_favorites_indexes.sql | Add composite indexes | V001 | Yes |
| 3 | V003__add_metadata_column.sql | Add metadata JSONB column | V001 | Yes |

**Deployment ordering constraints:**
- List any migrations that MUST run before the new application code deploys
- List any migrations that MUST run after the new application code deploys
- Identify migrations that can run concurrently with live traffic (e.g., CREATE INDEX CONCURRENTLY)

### Rollback DDL

For each migration, define the exact rollback operation:

| Migration | Rollback SQL | Data Loss Risk | Rollback Time Estimate |
|-----------|-------------|----------------|----------------------|
| V001 (create table) | DROP TABLE IF EXISTS favorites | All favorites data lost | < 1s |
| V002 (add indexes) | DROP INDEX idx_favorites_user_product | None — indexes only | < 1s |
| V003 (add column) | ALTER TABLE favorites DROP COLUMN metadata | Metadata values lost | Depends on table size |

**Rollback decision criteria:**
- Under what conditions should we rollback the migration?
- Is the rollback safe to run with live traffic?
- What's the maximum acceptable rollback window? (e.g., "rollback possible within 24h of deploy")

### Data Backfill Strategy

If the migration requires populating existing rows with new data:

- **Backfill scope:** How many rows need updating? (estimate)
- **Backfill approach:**
  - [ ] Inline migration (small dataset, < 10K rows)
  - [ ] Background job / async task (large dataset)
  - [ ] Lazy backfill on read (populate on first access)
  - [ ] No backfill needed (new column nullable / has default)
- **Backfill query:** Provide the SQL or pseudo-code
- **Performance impact:** Estimated time, lock contention risk, batching strategy
- **Verification:** How to confirm backfill completed correctly (row counts, checksums, spot checks)

### Zero-Downtime Migration Checklist

- [ ] No exclusive table locks during migration (use `CREATE INDEX CONCURRENTLY`, `ALTER TABLE ... ADD COLUMN` without defaults on large tables, etc.)
- [ ] Application code handles both old and new schema during rollout window
- [ ] Migrations tested against a production-sized dataset copy
- [ ] Rollback tested and documented
- [ ] Backfill (if any) can be paused and resumed safely
```

### Step 8: Security Design
 
```markdown
### Authentication
- JWT tokens with 1-hour expiration
- Refresh tokens with 30-day expiration
- Token validation on every request
 
### Authorization
- Users can only access their own favorites
- Admin role can view any user's favorites (for support)
- Service-to-service calls use API keys with IP whitelist
 
### Input Validation
- All UUIDs validated for format
- Request body size limited to 1KB
- Rate limiting: 100 req/min per user
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization, output encoding)
 
### Data Protection
- No PII in favorites table
- Audit log for all favorite additions/removals
- GDPR: Favorites deleted when user account deleted
- Encryption at rest: [Yes/No - specify method]
- Encryption in transit: TLS 1.3
 
### Security Headers
- CORS: Whitelist known domains only
- CSP: Restrict script sources
- HSTS: Force HTTPS (max-age=31536000)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
 
### Secrets Management
- Database credentials: [Vault / AWS Secrets Manager / etc.]
- API keys: Environment variables (never in code)
- Rotation policy: [Every X days]

### Threat Model Summary
*Example — replace per feature:*
| Threat | Asset | Mitigation | Verification |
|--------|-------|------------|--------------|
| [e.g., unauthorized access to resource] | [protected asset] | [control / mitigation] | [verification method — e.g., authz matrix tests in 1B] |

### OWASP ASVS Mapping (pick applicable level: L1/L2/L3)
*Example — replace per feature:*
| ASVS Control | How This Feature Satisfies It | Phase Verified |
|--------------|-------------------------------|----------------|
| [e.g., V4 Access Control] | [how this feature satisfies the control] | [Phase X + Y] |

### Supply Chain & Dependencies
- Allowed dependency sources (internal registry, npm/pypi only)
- Pinning policy (lock files committed)
- SCA tool and severity threshold that blocks merge/deploy

### Session & Browser Security (if applicable)
- Cookie flags: HttpOnly, Secure, SameSite
- CSRF strategy for cookie-based auth

### Security Monitoring & Response
- Alerts: failed auth rate, 403 spikes, unusual data export volume
- Audit log: who, what, when, outcome — tamper-evident storage
- Incident response: who is paged, rollback criteria for security incidents
- Vulnerability disclosure / CVE response SLA

### Security Sign-Off Criteria
- [ ] Threat model reviewed
- [ ] Authorization matrix complete in 1B
- [ ] No critical/high findings in IaC scan (if applicable)
- [ ] Security tests defined in 1B and traceable to stories
```
 
### Step 9: Performance & Scalability
 
```markdown
### Expected Load
- 1000 requests/second peak
- 10M users
- Average 50 favorites per user
- 500M total favorites records
 
### Performance Targets
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| p50 latency | < 50ms | > 100ms |
| p95 latency | < 200ms | > 400ms |
| p99 latency | < 500ms | > 1s |
| Error rate | < 0.1% | > 1% |
| Availability | 99.9% | < 99.5% |
 
### Optimization Strategy
 
**Database:**
- Composite index on (user_id, product_id)
- Index on product_id for reverse lookups
- Connection pooling (min: 10, max: 50)
- Query timeout: 5 seconds
 
**Caching:**
| Data | Cache | TTL | Invalidation |
|------|-------|-----|--------------|
| User's favorite list | Redis | 5min | On add/remove |
| Product existence | Redis | 1hour | On product delete |
| User's favorite count | Redis | 5min | On add/remove |
 
**Query Optimization:**
- Paginate favorites list (limit: 50 per page)
- Use SELECT only needed columns
- Avoid N+1 queries (batch product lookups)
- Use cursor-based pagination for large datasets
 
### Scalability Plan
 
**Horizontal Scaling:**
- Stateless service (can add more instances)
- Load balancer distributes traffic (round-robin)
- Auto-scaling: 2-10 instances based on CPU (target: 70%)
 
**Database Scaling:**
- Read replicas for favorite list queries (2 replicas)
- Write to primary for add/remove
- Partition by user_id if > 1B records
- Consider sharding strategy for global scale
 
**Caching Scaling:**
- Redis Cluster for > 100GB cache
- Cache-aside pattern for flexibility
- Circuit breaker on cache failures (fallback to DB)
```
 
### Step 10: Deployment Strategy

#### Platform-Specific Rollout (pre-pended when a platform supplement is loaded)

> **Gate:** This block runs only when `state.json.context.detected_stack.platform_supplement_loaded == true`. The trigger is the supplement's loaded status, **not** `platform != null` — see [SKILL.md → Platform Supplement Degradation Policy](../SKILL.md#platform-supplement-degradation-policy).

- **If `platform_supplement_loaded == true`:** Pre-pend the questions from the loaded platform supplement's `§11 Rollout questions` section before the general Rollout Approach checklist below. Platform rollout questions (data residency, tenant onboarding, cross-region failure-domain rules, environment-ladder ordering) MUST be answered before the general checklist begins.
- **If `platform_supplement_loaded == false` AND `platform != null`:** Skip the pre-pend. Surface every entry from `state.json.context.detected_stack.platform_supplement_warnings` at the top of the operations output, and add this explicit note: *"Platform-specific rollout questions were not asked because the supplement is missing — this rollout plan will not be checked against platform invariants until the supplement lands."*
- **If `platform == null`:** Do nothing — proceed straight to the general Rollout Approach checklist below.

```markdown
### Rollout Approach
- [ ] Big bang (all at once) - Simple features
- [x] Blue-green deployment - Zero downtime
- [ ] Canary release - High-risk changes
- [ ] Feature flags - Gradual enablement
 
### Deployment Pipeline
```
Code → Build → Unit Tests → SAST → SCA/Dependency Audit → Secret Scan →
Integration Tests → Staging Deploy → Smoke + Security Regression → Production Deploy → Health Checks
```
 
### Feature Flags (if applicable)
| Flag Name | Default | Description | Rollout Plan |
|-----------|---------|-------------|--------------|
| `enable_favorites_v2` | OFF | New favorites implementation | 1% → 10% → 50% → 100% |
 
### Health Checks
- **Liveness:** `/health/live` - App is running
- **Readiness:** `/health/ready` - App can serve traffic
- **Startup:** Allow 30s for initialization
 
### Rollback Plan
**Trigger Conditions:**
- Error rate > 5% for 5 minutes
- p99 latency > 2s for 5 minutes
- Health check failures > 3 consecutive
 
**Rollback Steps:**
1. Automatic: Deployment fails health checks → previous version restored
2. Manual: `kubectl rollout undo deployment/favorites` or equivalent
3. Database: [Migration rollback steps if applicable]
 
**Rollback Time Target:** < 5 minutes
 
### Post-Deployment Verification
- [ ] Health checks passing
- [ ] Key metrics within normal range
- [ ] No error spikes in logs
- [ ] Smoke tests passing
- [ ] Synthetic monitoring green
```
 
### Step 10B: Infrastructure Decision & IaC (optional)

This step decides whether the feature needs **new or changed infrastructure** and, only if it does, generates Infrastructure as Code. Most code changes ride on infrastructure that already exists — for those, existing CI/CD handles the deploy and no IaC is written.

#### Step 10B.1 — Decide if infrastructure work is required

Using the design you have produced so far (Phase 1A architecture + data model, Phase 1B integrations, and the Deployment/Scaling sections above), determine whether this feature introduces or changes any of the following:

- **Compute** — a new service, worker, serverless function, scheduled job, or a meaningful change to compute sizing/scaling
- **Data stores** — a new database, cache, object store, or a change requiring new provisioned capacity
- **Networking** — new load balancers, DNS, CDN, VPC/subnet/firewall changes
- **Messaging** — new queues, topics, streams, or event buses
- **Security** — new secrets, IAM roles/policies, certificates, or KMS keys
- **Observability** — new log groups, dashboards, or alerting targets that must be provisioned

**Decision:**

- **Code-only change** — the feature deploys onto infrastructure that already exists and the current CI/CD pipeline can ship it with no new provisioned resources. Set `context.infra_required = false`, write `"N/A — code-only change; existing CI/CD handles deployment"` in the Infrastructure section, and skip the rest of Step 10B.
- **New or changed infrastructure** — at least one item above applies. Confirm with the user before generating IaC:

```
"This feature appears to need new/changed infrastructure: {short list of what was detected}.

1. Yes — generate IaC for these resources
2. No — this is a code-only change; existing CI/CD will handle deployment"
```

If the user says it is code-only, set `context.infra_required = false` and skip the rest. Otherwise set `context.infra_required = true` and continue.

#### Step 10B.2 — Infrastructure inventory

Build a confirmed inventory of what must be provisioned. Cross-check the design against the code (dependency manifests and `*_URL`/`*_SECRET` env vars are hard evidence) and produce a table per category:

```markdown
| Resource | Purpose | Type / Tier | Environments | Open Questions |
|----------|---------|-------------|--------------|----------------|
| Primary DB | Application data | RDS PostgreSQL 15, db.t3.micro (dev) / db.t3.medium (prod) | dev, staging, prod | Multi-AZ for prod? |
```

Cover the relevant categories only: Compute, Data Stores, Networking, Messaging, Security, Observability. Record the **cloud provider** and **IaC tool** (detect from `context.detected_stack.cloud_provider`, existing `*.tf`/`cdk.json`, or SDK imports; default to Terraform if undetermined and confirm with the user). Resolve open questions with the user before generating code.

#### Step 10B.3 — IaC architecture & generation

Before writing any IaC, load the Terraform coding guidelines from this skill's `guides/` directory:

1. Always read `{skill_dir}/monkeymode/guides/TERRAFORM-CODING-GUIDELINES.md`.
2. Load the cloud supplement: `aws` → `{skill_dir}/monkeymode/guides/TERRAFORM-AWS-SUPPLEMENT.md`; `gcp` → `{skill_dir}/monkeymode/guides/TERRAFORM-GCP-SUPPLEMENT.md`. If none exists, follow the base guide plus conventions in existing workspace IaC.

Choose the layout by resource count: ≤ 5 resources → flat (`main.tf`); 6+ → modules per concern (`networking`, `compute`, `database`, `messaging`, `security`, `observability`) with explicit module inputs/outputs. Generate IaC into `{workspace}/infra/`:

```
infra/
├── modules/{networking,compute,database,observability}/{main,variables,outputs}.tf + README.md
├── environments/{dev,staging,prod}/{main.tf,terraform.tfvars,backend.tf}
└── README.md
```

Rules: no hardcoded secrets or credentials; every variable typed and described; every resource tagged; meaningful per-environment differences in each `terraform.tfvars`.

#### Step 10B.4 — Validation

Validate the generated IaC before declaring it ready — never skip this:

- **Syntax/schema:** `terraform fmt -check` + `terraform validate` per environment (or static HCL analysis if the CLI is unavailable: balanced blocks, `var.` references resolve, module source paths exist, tfvars cover required variables).
- **Security scan:** flag critical issues that block readiness — public S3 ACLs, unencrypted RDS (`storage_encrypted = false`), `0.0.0.0/0` on admin/DB ports (22/3389/5432/3306), `Action: "*"` + `Resource: "*"` IAM, `publicly_accessible = true`. Report by severity with remediation.
- **Cost:** provide a rough monthly cost estimate per environment.

Record findings in the Infrastructure section. **Zero critical security findings** is required before the infra is considered ready.

> **Note:** Single-cloud only. Cross-cloud / multi-provider generation is out of scope for the inline MonkeyMode infra step.
 
### Step 11: Observability
 
```markdown
### Logging
**Level Guidelines:**
- DEBUG: Detailed diagnostic info (disabled in prod)
- INFO: Normal operations (request/response summary)
- WARN: Unexpected but handled situations
- ERROR: Failures requiring attention
- CRITICAL: System-wide failures
 
**Log Format (Structured JSON):**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "favorites-service",
  "requestId": "abc123",
  "userId": "user456",
  "operation": "addFavorite",
  "productId": "prod789",
  "durationMs": 45,
  "message": "Favorite added successfully"
}
```
 
**What to Log:**
- All API requests (method, path, status, duration)
- Business operations (add, remove, list)
- Errors with stack traces
- External service calls (success/failure, duration)
 
**What NOT to Log:**
- Passwords, tokens, API keys
- Full credit card numbers
- Personal health information
- Large request/response bodies
 
### Metrics
| Metric | Type | Labels | Alert Threshold |
|--------|------|--------|-----------------|
| `http_requests_total` | Counter | method, path, status | N/A |
| `http_request_duration_seconds` | Histogram | method, path | p99 > 1s |
| `favorites_operations_total` | Counter | operation, status | error_rate > 1% |
| `db_connections_active` | Gauge | pool | > 80% capacity |
| `cache_hit_ratio` | Gauge | cache_name | < 80% |
 
### Tracing
- Distributed tracing with OpenTelemetry
- Trace context propagation via W3C headers
- Sample rate: 10% normal, 100% errors
 
### Alerting
| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | error_rate > 1% for 5min | Critical | Page on-call |
| High Latency | p99 > 1s for 5min | Warning | Slack notification |
| DB Connection Pool | > 80% for 5min | Warning | Slack notification |
| Service Down | health check fails 3x | Critical | Page on-call |
 
### Dashboards
- **Overview:** Request rate, error rate, latency percentiles
- **Database:** Query performance, connection pool, slow queries
- **Cache:** Hit ratio, memory usage, evictions
- **Business:** Favorites added/removed per hour, active users
```
 
### Step 12: Risk Assessment
 
```markdown
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Database write contention on favorites table | Medium | Medium | Optimistic locking, proper indexes | Backend |
| Product service unavailable | Low | High | Cache product existence for 5min, graceful degradation | Backend |
| Favorites table grows too large | High | Medium | Partition by user_id, archive inactive data | DBA |
| Race condition on duplicate favorites | Medium | Low | Unique constraint, idempotent operations | Backend |
| Cache stampede on popular products | Low | Medium | Cache warming, staggered TTLs | Backend |
 
### Risk Monitoring
- Set up alerts for each high/critical risk indicator
- Review risks weekly during initial rollout
- Update risk assessment after each incident
```
 
## Output Document Structure
 
```markdown
# Design: [Feature Name] - Phase 1C: Production Readiness
 
## Database Migration Strategy
[Migration ordering, rollback DDL, data backfill, zero-downtime checklist]
(Write "N/A — no database changes" if feature has no DB impact)

## Security Design
[Authentication, Authorization, Input Validation, Data Protection, Secrets]
 
## Performance & Scalability
[Expected Load, Performance Targets, Optimization, Scaling Strategy]
 
## Deployment Strategy
[Rollout Approach, Pipeline, Health Checks, Rollback Plan]

## Infrastructure
[Decision: code-only (N/A) or new infra. If new: inventory, IaC layout, validation results, cost estimate]
(Write "N/A — code-only change; existing CI/CD handles deployment" when no new infra is required)
 
## Observability
[Logging, Metrics, Tracing, Alerting, Dashboards]
 
## Risk Assessment
[Risks with Likelihood, Impact, Mitigation, Owner]
 
## Final Sign-Off
- [ ] Database migration strategy reviewed (or N/A)
- [ ] Security reviewed
- [ ] Performance targets achievable
- [ ] Deployment plan clear
- [ ] Infrastructure decision made (code-only, or IaC generated and validated)
- [ ] Observability in place
- [ ] Risks identified and mitigated
```
 
## Quality Checklist for Phase 1C
 
Before finalizing design, verify:
 
### Completeness
- [ ] Database migration strategy defined (or marked N/A)
- [ ] Migration rollback DDL documented for each migration
- [ ] Data backfill approach specified (if applicable)
- [ ] Security considered at every layer
- [ ] Threat model documented and linked to mitigations
- [ ] CI security gates defined with blocking severity thresholds
- [ ] Security monitoring alerts defined
- [ ] Supply chain / dependency policy documented
- [ ] Performance targets defined and achievable
- [ ] Deployment strategy defined
- [ ] Infrastructure decision recorded (code-only or IaC generated + validated)
- [ ] Monitoring and alerting defined
- [ ] All risks identified with mitigations
 
### Quality
- [ ] Scalability plan addresses 10x growth
- [ ] Rollback plan exists
- [ ] Production-ready (not just MVP thinking)
 
## Anti-Patterns to Avoid
 
❌ **No scalability consideration**
```
"It works for 100 users"
→ Plan for 10x growth: "It works for 1000 users and can scale to 10,000"
```
 
❌ **No rollback plan**
```
"Deploy and hope for the best"
→ Define rollback triggers, steps, and time targets
```
 
## Timeline Guidance
 
| Complexity | Security | Perf/Scale | Deploy/Observe | Total |
|------------|----------|------------|----------------|-------|
| Simple | 30 min | 30 min | 45 min | 1.75 hours |
| Medium | 1 hour | 1 hour | 1.5 hours | 3.5 hours |
| Complex | 2 hours | 2 hours | 2 hours | 6 hours |
 
## Definition of Done
 
Phase 1C is complete when:
- [ ] Database migration strategy reviewed (or marked N/A for no-DB features)
- [ ] Security considerations reviewed
- [ ] Performance targets defined
- [ ] Deployment strategy clear
- [ ] Infrastructure decision recorded (code-only, or IaC generated and validated with zero critical findings)
- [ ] Observability planned
- [ ] Risks assessed
- [ ] User approves: "Complete design ready for implementation"
- [ ] Document saved to `.monkeymode/{feature-name}/design/1c-operations.md`

Critique is optional — only if the user asks; see `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

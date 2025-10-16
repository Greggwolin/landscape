# DevOps Guide: Neon + Vercel CI/CD
**Version:** 1.0
**Date:** 2025-10-14
**Status:** ✅ Production Ready

## Overview

This guide covers the complete DevOps infrastructure for the Landscape Financial Engine, including:
- Neon database branching for preview environments
- GitHub Actions CI/CD workflows
- Vercel deployment pipeline
- Monitoring and observability
- Rollback procedures
- Security and secrets management

---

## Architecture

### Infrastructure Stack

```
GitHub → GitHub Actions → Neon (Database) + Vercel (Application)
   │            │               │                    │
   │            │               └─ Branching         └─ Preview/Production
   │            └─ CI/CD (Test, Build, Deploy)
   └─ Source Control
```

### Branch Strategy

| Branch Type | Trigger | Database | Deployment | Lifetime |
|-------------|---------|----------|------------|----------|
| **Main** | Push to main | Production (protected) | Vercel Production | Permanent |
| **PR** | PR open/sync | Ephemeral branch | Vercel Preview | Until PR closed |
| **Snapshot** | Pre-deploy | Tagged branch | - | 7 days |

---

## Neon Database Branching

### Concept

Neon's branching feature allows instant copy-on-write database branches:
- **Main**: Production database (protected)
- **PR Branch**: Isolated copy per PR (e.g., `pr-123`)
- **Snapshot**: Point-in-time backup for rollback

### Creating Preview Branch

When a PR is opened:

```bash
# Automated via GitHub Actions
./scripts/neon-branch-create.sh <PR_NUMBER>

# Manual creation
neonctl branches create \
  --project-id $NEON_PROJECT_ID \
  --name pr-123 \
  --parent main
```

**Result:**
- Instant branch created from main
- Isolated database for testing
- Connection string for Vercel preview

### Cleanup

When PR is closed/merged:

```bash
# Automated via GitHub Actions
./scripts/neon-branch-delete.sh <PR_NUMBER>

# Manual deletion
neonctl branches delete \
  --project-id $NEON_PROJECT_ID \
  --branch pr-123
```

---

## Database Roles

### Three-Role Security Model

#### 1. landscape_app (Application Role)
**Purpose:** Used by Next.js application
**Permissions:** DML only (SELECT, INSERT, UPDATE, DELETE)
**No:** DDL, CREATE, DROP

```sql
-- Usage in connection string
postgresql://landscape_app:password@host/land_v2
```

#### 2. landscape_migrate (Migration Role)
**Purpose:** Schema changes and migrations
**Permissions:** Full DDL (CREATE, ALTER, DROP)

```sql
-- Usage in CI/CD
postgresql://landscape_migrate:password@host/land_v2
```

#### 3. landscape_read (Analytics Role)
**Purpose:** Read-only analytics and reporting
**Permissions:** SELECT only

```sql
-- Usage for BI tools
postgresql://landscape_read:password@host/land_v2
```

### Setup Roles

```bash
# Run once on main branch
psql $DATABASE_URL -f ./scripts/setup-database-roles.sql
```

---

## CI/CD Workflows

### 1. Preview Environment Workflow

**File:** `.github/workflows/preview.yml`

**Triggers:** PR opened, synchronized, reopened

**Jobs:**
1. **Create Database** - Create Neon branch
2. **Migrate Database** - Run migrations
3. **Build and Test** - Lint, test, build
4. **Deploy Preview** - Deploy to Vercel
5. **API Tests** - Contract tests

**Timeline:** ~3-5 minutes

**Artifacts:**
- Preview URL (commented on PR)
- Database branch details
- Test coverage report

### 2. Cleanup Workflow

**File:** `.github/workflows/cleanup.yml`

**Triggers:** PR closed

**Jobs:**
1. **Delete Resources** - Remove Neon branch

**Timeline:** ~30 seconds

### 3. Production Deployment Workflow

**File:** `.github/workflows/production.yml`

**Triggers:** Push to main

**Jobs:**
1. **Test** - Full test suite
2. **Snapshot** - Create database backup
3. **Migrate** - Run production migrations
4. **Deploy** - Deploy to Vercel production
5. **Health Check** - Verify deployment

**Timeline:** ~5-8 minutes

**Safety:**
- Snapshot created before deployment
- Health checks before marking success
- Automatic rollback trigger on failure

---

## Migrations

### Migration File Structure

```
migrations/
├── 001_financial_engine_schema.sql
├── 002_dependencies_revenue_finance.sql
├── 002a_fix_dependency_views.sql
├── 003_*.sql
├── 006_lease_management.sql
├── 007_add_budget_timing_columns.sql
└── 008_add_multifamily_units.sql
```

### Naming Convention

```
<sequence>_<description>.sql

Examples:
001_initial_schema.sql
002_add_dependencies.sql
002a_hotfix_dependencies.sql  # Patch for same version
```

### Running Migrations

```bash
# Automated (CI/CD)
./scripts/run-migrations.sh <branch_name>

# Manual (local)
export DATABASE_URL="postgresql://..."
./scripts/run-migrations.sh main
```

### Migration Tracking

Migrations are tracked in `landscape._migrations`:

```sql
SELECT * FROM landscape._migrations ORDER BY migration_id DESC;

 migration_id |          migration_file          |        applied_at         |  checksum
--------------+----------------------------------+---------------------------+------------
            8 | 008_add_multifamily_units.sql    | 2025-10-14 17:00:00+00    | 9ab123...
            7 | 007_add_budget_timing_columns.sql| 2025-10-14 16:30:00+00    | 8cd456...
            6 | 006_lease_management.sql         | 2025-10-13 14:30:00+00    | abc123...
            5 | 002a_fix_dependency_views.sql    | 2025-10-12 10:15:00+00    | def456...
```

### Reversible Migrations

Always provide rollback DDL in comments:

```sql
-- Migration: Add new column
ALTER TABLE landscape.tbl_project ADD COLUMN new_field VARCHAR(50);

-- Rollback:
-- ALTER TABLE landscape.tbl_project DROP COLUMN new_field;
```

---

## Rollback Procedures

### Scenario 1: Bad Deployment (Application)

**Symptoms:** Application errors, but database is fine

**Solution:** Redeploy previous Vercel deployment

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
1. Go to Deployments
2. Find last good deployment
3. Click "Promote to Production"
```

**Time:** < 2 minutes

### Scenario 2: Bad Migration (Database)

**Symptoms:** Database errors after migration

**Solution:** Point-in-time restore from snapshot

```bash
# Use snapshot created pre-deployment
./scripts/rollback-production.sh <SNAPSHOT_ID>

# Follow prompts to:
1. Create rollback branch from snapshot
2. Test rollback branch
3. Set as primary
4. Update Vercel DATABASE_URL
5. Redeploy
```

**Time:** ~10-15 minutes

### Scenario 3: Data Corruption

**Symptoms:** Data integrity issues

**Solution:** Point-in-time restore to specific timestamp

```bash
# Restore to specific time
./scripts/rollback-production.sh "2025-10-13T14:30:00Z"

# Neon supports any timestamp within retention window (7 days default)
```

**Time:** ~15-20 minutes

### Rollback Decision Matrix

| Issue Type | Severity | Solution | Downtime |
|------------|----------|----------|----------|
| App bug | Low | Redeploy | None |
| App crash | High | Rollback deploy | <2 min |
| Bad migration | High | DB restore | ~15 min |
| Data loss | Critical | PITR restore | ~20 min |

---

## Monitoring & Observability

### Query Logging

**Enabled:** pg_stat_statements extension
**Threshold:** 200ms (slow query)

```sql
-- View slow queries
SELECT * FROM landscape.vw_slow_queries;

-- View top queries by total time
SELECT * FROM landscape.vw_top_queries_by_time;
```

### Performance Metrics

```sql
-- Database stats
SELECT * FROM landscape.vw_database_stats;

-- Table sizes
SELECT * FROM landscape.vw_table_sizes;

-- Index usage (identify unused indexes)
SELECT * FROM landscape.vw_index_usage;
```

### SLO Monitoring

**Targets:**
- API Latency (p95): < 250ms
- Cache Hit Ratio: > 99%
- Error Rate: < 0.5%

```sql
-- Check SLO status
SELECT * FROM landscape.vw_slo_metrics;
```

**Result:**
```
     metric          | value  | target | status
---------------------+--------+--------+--------
 API Latency (p95)   | 187.23 | 250.00 | PASS
 Cache Hit Ratio     | 99.47  | 99.00  | PASS
```

### Active Query Monitoring

```sql
-- Get currently running queries
SELECT * FROM landscape.get_active_queries();

-- Get cache hit ratio
SELECT * FROM landscape.get_cache_hit_ratio();
```

### Alerts

**Configure alerts in Neon Console:**
1. Slow query threshold exceeded
2. Connection pool exhausted
3. Disk space > 80%
4. Replica lag > 10s

---

## Secrets Management

### Environment Variables

**Never commit secrets to repository.**

#### Required Secrets

**GitHub Secrets:**
```
NEON_PROJECT_ID          # Neon project ID
NEON_API_KEY            # Neon API key
VERCEL_TOKEN            # Vercel deployment token
VERCEL_ORG_ID           # Vercel organization ID
VERCEL_PROJECT_ID       # Vercel project ID
DATABASE_URL            # Production database URL
```

**Vercel Environment Variables:**
```
DATABASE_URL            # Set per environment (Production, Preview)
NEON_PROJECT_ID         # For branch operations
```

#### Setting Secrets

**GitHub:**
```bash
# Via GitHub CLI
gh secret set NEON_API_KEY

# Via GitHub UI
Settings → Secrets and variables → Actions → New repository secret
```

**Vercel:**
```bash
# Via Vercel CLI
vercel env add DATABASE_URL production

# Via Vercel Dashboard
Settings → Environment Variables
```

### Secret Rotation

**Schedule:** Quarterly (every 3 months)

**Process:**
1. Generate new secret in Neon/Vercel
2. Update GitHub secrets
3. Update Vercel environment variables
4. Redeploy to apply changes
5. Revoke old secret after 48 hours

---

## Disaster Recovery

### Backup Strategy

**Neon Automatic Backups:**
- Continuous backup (WAL archiving)
- Point-in-time restore to any second
- Retention: 7 days (configurable to 30 days)

**Manual Snapshots:**
- Created before every production deployment
- Tagged with timestamp and commit SHA
- Retention: 7 days
- Location: Neon branches prefixed with `pre-deploy-`

### Recovery Time Objectives

| Scenario | RTO | RPO | Solution |
|----------|-----|-----|----------|
| Bad deploy | 2 min | 0 | Vercel rollback |
| Bad migration | 15 min | 0 | Snapshot restore |
| Data corruption | 20 min | 5 min | PITR restore |
| Total database loss | 30 min | 5 min | Neon restore |

### Weekly Disaster Drills

**Automated test every Sunday 2:00 AM UTC:**

```bash
# Automated via GitHub Actions scheduled workflow
1. Create test branch from production
2. Simulate data corruption
3. Perform PITR restore
4. Verify data integrity
5. Report results to Slack
6. Cleanup test resources
```

**Success Criteria:**
- Restore completes within 30 minutes
- Data integrity verified (checksum match)
- Zero downtime on production
- All stakeholders notified

---

## Performance Optimization

### Connection Pooling

**Vercel Postgres Pooler:**
- Max connections: 100 (adjust based on Vercel plan)
- Idle timeout: 60s
- Connection timeout: 30s

**Connection String:**
```
postgresql://user:pass@host/db?pgbouncer=true
```

### Query Optimization

**Identify slow queries:**
```sql
SELECT * FROM landscape.vw_slow_queries
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC;
```

**Check missing indexes:**
```sql
SELECT * FROM landscape.vw_index_usage
WHERE idx_scan = 0
AND pg_size_pretty(pg_relation_size(indexrelid)) > '1 MB';
```

### Cache Hit Ratio

**Target:** > 99%

**Check:**
```sql
SELECT * FROM landscape.get_cache_hit_ratio();
```

**If low (<95%):**
1. Increase Neon compute resources
2. Add missing indexes
3. Optimize queries
4. Consider materialized views

---

## Troubleshooting

### Common Issues

#### Issue: Preview branch creation fails

**Error:** `Branch already exists`

**Solution:**
```bash
# Delete existing branch
./scripts/neon-branch-delete.sh <PR_NUMBER>

# Recreate
./scripts/neon-branch-create.sh <PR_NUMBER>
```

#### Issue: Migration fails

**Error:** `Migration already applied`

**Solution:**
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM landscape._migrations"

# Manually mark as applied (if safe)
psql $DATABASE_URL -c "
  INSERT INTO landscape._migrations (migration_file, checksum)
  VALUES ('xxx.sql', 'checksum')
"
```

#### Issue: Vercel deployment fails

**Error:** `DATABASE_URL not set`

**Solution:**
```bash
# Set environment variable
vercel env add DATABASE_URL production

# Redeploy
vercel --prod
```

#### Issue: Connection pool exhausted

**Error:** `Too many connections`

**Solution:**
1. Check for connection leaks
2. Increase pool size in Neon
3. Add connection timeout
4. Use connection pooler (pgbouncer)

---

## Checklists

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Migrations reviewed and approved
- [ ] Snapshot created
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Post-Deployment Checklist

- [ ] Health checks passing
- [ ] SLO metrics within targets
- [ ] No error spike in logs
- [ ] Performance metrics stable
- [ ] Stakeholders notified of success
- [ ] Monitor for 1 hour

### Incident Response Checklist

- [ ] Identify issue severity
- [ ] Notify oncall team
- [ ] Check recent deployments
- [ ] Review error logs
- [ ] Decide: rollback vs hotfix
- [ ] Execute recovery plan
- [ ] Verify resolution
- [ ] Post-mortem scheduled

---

## File Reference

### Scripts

| File | Purpose |
|------|---------|
| `scripts/neon-branch-create.sh` | Create PR branch |
| `scripts/neon-branch-delete.sh` | Delete PR branch |
| `scripts/run-migrations.sh` | Run migrations |
| `scripts/rollback-production.sh` | Rollback database |
| `scripts/setup-database-roles.sql` | Create DB roles |
| `scripts/setup-monitoring.sql` | Enable monitoring |

### Workflows

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/preview.yml` | PR open | Preview environment |
| `.github/workflows/cleanup.yml` | PR close | Cleanup resources |
| `.github/workflows/production.yml` | Push to main | Production deploy |

---

## Support

### Escalation Path

1. **Level 1:** Check monitoring dashboards
2. **Level 2:** Review GitHub Actions logs
3. **Level 3:** Check Neon Console
4. **Level 4:** Contact Neon support
5. **Level 5:** Emergency rollback

### Documentation

- **Neon Docs:** https://neon.tech/docs
- **Vercel Docs:** https://vercel.com/docs
- **Internal Wiki:** (link to your wiki)

---

*Last Updated: 2025-10-14*
*Maintained by: DevOps Team*
*On-call: Check PagerDuty*

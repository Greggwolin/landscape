#!/bin/bash

# Scoped Production Data Sync
# Purpose: Safely sync selected data domains from local DB to production DB
# Supports: users, project_owners

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

usage() {
    cat <<'EOF'
Usage:
  ./scripts/sync-production-data.sh --components users,project_owners [options]

Options:
  --components <csv>   Required. Comma-separated list: users,project_owners
  --with-data <csv>    Alias for --components
  --local-url <url>    Optional source DB URL (defaults to LOCAL_DATABASE_URL or backend/.env DATABASE_URL)
  --prod-url <url>     Optional target DB URL (defaults to PRODUCTION_DATABASE_URL)
  --dry-run            Show backup/diff/update counts without mutating production
  -h, --help           Show this help

Environment:
  LOCAL_DATABASE_URL       Optional local/source DB URL override
  PRODUCTION_DATABASE_URL  Required unless --prod-url is passed
EOF
}

extract_env_value() {
    local file="$1"
    local key="$2"

    if [ ! -f "$file" ]; then
        return 1
    fi

    local raw
    raw="$(grep -E "^${key}=" "$file" | head -1 | cut -d= -f2- || true)"
    if [ -z "$raw" ]; then
        return 1
    fi

    # Strip one layer of matching surrounding quotes
    raw="${raw%\"}"
    raw="${raw#\"}"
    raw="${raw%\'}"
    raw="${raw#\'}"

    if [ -z "$raw" ]; then
        return 1
    fi
    echo "$raw"
}

url_host() {
    local url="$1"
    local host
    host="$(echo "$url" | sed -E 's#^[a-zA-Z0-9+.-]+://([^@/]+@)?([^:/?]+).*#\2#' || true)"
    if [ -n "$host" ]; then
        echo "$host"
    else
        echo "unknown-host"
    fi
}

contains_component() {
    local needle="$1"
    shift
    local item
    for item in "$@"; do
        if [ "$item" = "$needle" ]; then
            return 0
        fi
    done
    return 1
}

snapshot_users_by_email() {
    local db_url="$1"
    local out_file="$2"
    psql "$db_url" -X -t -F $'\t' -A -c "SELECT email, id, username FROM landscape.auth_user ORDER BY email;" > "$out_file"
}

compute_user_diff_counts() {
    local local_snapshot="$1"
    local prod_snapshot="$2"

    local missing_count
    local extra_count

    missing_count="$(join -t $'\t' -v 1 -1 1 -2 1 \
        <(sort -t $'\t' -k1,1 "$local_snapshot") \
        <(sort -t $'\t' -k1,1 "$prod_snapshot") | wc -l | tr -d '[:space:]')"
    extra_count="$(join -t $'\t' -v 2 -1 1 -2 1 \
        <(sort -t $'\t' -k1,1 "$local_snapshot") \
        <(sort -t $'\t' -k1,1 "$prod_snapshot") | wc -l | tr -d '[:space:]')"

    echo "${missing_count} ${extra_count}"
}

sync_users() {
    echo -e "${BLUE}--- Sync Component: users ---${NC}"

    local users_backup="$WORK_DIR/prod_auth_user_before.tsv"
    local profiles_backup="$WORK_DIR/prod_user_profile_before.tsv"
    local local_users_stage="$WORK_DIR/local_auth_user.tsv"
    local local_profiles_stage="$WORK_DIR/local_user_profile.tsv"
    local local_snapshot_before="$WORK_DIR/local_users_by_email_before.tsv"
    local prod_snapshot_before="$WORK_DIR/prod_users_by_email_before.tsv"
    local local_snapshot_after="$WORK_DIR/local_users_by_email_after.tsv"
    local prod_snapshot_after="$WORK_DIR/prod_users_by_email_after.tsv"

    local local_user_count
    local prod_user_count
    local local_profile_count
    local prod_profile_count
    local local_missing_before
    local prod_extra_before
    local local_missing_after
    local prod_extra_after

    local_user_count="$(psql "$LOCAL_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.auth_user;" | tr -d '[:space:]')"
    prod_user_count="$(psql "$PROD_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.auth_user;" | tr -d '[:space:]')"
    local_profile_count="$(psql "$LOCAL_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.user_profile;" | tr -d '[:space:]')"
    prod_profile_count="$(psql "$PROD_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.user_profile;" | tr -d '[:space:]')"

    echo "Local users:      $local_user_count"
    echo "Production users: $prod_user_count"
    echo "Local profiles:      $local_profile_count"
    echo "Production profiles: $prod_profile_count"

    echo "Creating production backups..."
    psql "$PROD_DB_URL" -X -F $'\t' -A -c "SELECT * FROM landscape.auth_user ORDER BY id;" > "$users_backup"
    psql "$PROD_DB_URL" -X -F $'\t' -A -c "SELECT * FROM landscape.user_profile ORDER BY user_id;" > "$profiles_backup"
    echo "Backups:"
    echo "  $users_backup"
    echo "  $profiles_backup"

    echo "Staging local export..."
    psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -c "\\copy (SELECT * FROM landscape.auth_user ORDER BY id) TO '$local_users_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')"
    psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -c "\\copy (SELECT * FROM landscape.user_profile ORDER BY user_id) TO '$local_profiles_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')"

    snapshot_users_by_email "$LOCAL_DB_URL" "$local_snapshot_before"
    snapshot_users_by_email "$PROD_DB_URL" "$prod_snapshot_before"
    read -r local_missing_before prod_extra_before < <(compute_user_diff_counts "$local_snapshot_before" "$prod_snapshot_before")
    echo "Pre-sync diff by email: local_missing_in_prod=$local_missing_before prod_extra_vs_local=$prod_extra_before"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}Dry run: skipping users mutation.${NC}"
        echo ""
        return 0
    fi

    echo "Applying users merge..."
    psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 <<SQL
BEGIN;

DROP TABLE IF EXISTS tmp_local_auth_user;
DROP TABLE IF EXISTS tmp_local_user_profile;
DROP TABLE IF EXISTS tmp_user_id_map;

CREATE TEMP TABLE tmp_local_auth_user (LIKE landscape.auth_user INCLUDING DEFAULTS);
CREATE TEMP TABLE tmp_local_user_profile (LIKE landscape.user_profile INCLUDING DEFAULTS);
CREATE TEMP TABLE tmp_user_id_map (
  old_id integer PRIMARY KEY,
  new_id integer NOT NULL,
  username varchar(150) NOT NULL
);

\\copy tmp_local_auth_user FROM '$local_users_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')
\\copy tmp_local_user_profile FROM '$local_profiles_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')

-- Insert users that do not exist by username and whose ID is available.
WITH candidates AS (
  SELECT l.*
  FROM tmp_local_auth_user l
  WHERE NOT EXISTS (SELECT 1 FROM landscape.auth_user p WHERE p.username = l.username)
    AND NOT EXISTS (SELECT 1 FROM landscape.auth_user p WHERE p.id = l.id)
)
INSERT INTO landscape.auth_user (
  id, password, last_login, is_superuser, username, first_name, last_name, email,
  is_staff, is_active, date_joined, phone, company, role, is_verified,
  created_at, updated_at, last_login_ip, demo_projects_provisioned, plain_password
)
SELECT
  id, password, last_login, is_superuser, username, first_name, last_name, email,
  is_staff, is_active, date_joined, phone, company, role, is_verified,
  created_at, updated_at, last_login_ip, demo_projects_provisioned, plain_password
FROM candidates;

-- Insert users missing by username but with occupied IDs, remapping to new IDs.
WITH conflicting AS (
  SELECT l.*, row_number() OVER (ORDER BY l.id) AS rn
  FROM tmp_local_auth_user l
  WHERE NOT EXISTS (SELECT 1 FROM landscape.auth_user p WHERE p.username = l.username)
    AND EXISTS (SELECT 1 FROM landscape.auth_user p WHERE p.id = l.id)
),
base AS (
  SELECT COALESCE(MAX(id), 0) AS max_id FROM landscape.auth_user
),
assigned AS (
  SELECT c.*, (b.max_id + c.rn) AS assigned_id
  FROM conflicting c
  CROSS JOIN base b
)
INSERT INTO landscape.auth_user (
  id, password, last_login, is_superuser, username, first_name, last_name, email,
  is_staff, is_active, date_joined, phone, company, role, is_verified,
  created_at, updated_at, last_login_ip, demo_projects_provisioned, plain_password
)
SELECT
  assigned_id, password, last_login, is_superuser, username, first_name, last_name, email,
  is_staff, is_active, date_joined, phone, company, role, is_verified,
  created_at, updated_at, last_login_ip, demo_projects_provisioned, plain_password
FROM assigned;

-- Build old->new ID map by username after inserts.
INSERT INTO tmp_user_id_map (old_id, new_id, username)
SELECT l.id AS old_id, p.id AS new_id, l.username
FROM tmp_local_auth_user l
JOIN landscape.auth_user p ON p.username = l.username
ON CONFLICT (old_id) DO UPDATE
SET new_id = EXCLUDED.new_id,
    username = EXCLUDED.username;

-- Insert any missing profiles for mapped users.
INSERT INTO landscape.user_profile (user_id, bio, avatar_url, timezone, preferences)
SELECT m.new_id, lp.bio, lp.avatar_url, lp.timezone, lp.preferences
FROM tmp_local_user_profile lp
JOIN tmp_user_id_map m ON m.old_id = lp.user_id
LEFT JOIN landscape.user_profile p ON p.user_id = m.new_id
WHERE p.user_id IS NULL;

-- Reset sequences.
SELECT setval(
  pg_get_serial_sequence('landscape.auth_user', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM landscape.auth_user),
  true
);
SELECT setval(
  pg_get_serial_sequence('landscape.user_profile', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM landscape.user_profile),
  true
);

COMMIT;

SELECT old_id, new_id, username
FROM tmp_user_id_map
WHERE old_id <> new_id
ORDER BY old_id;

SELECT COUNT(*) AS prod_auth_user_count FROM landscape.auth_user;
SELECT COUNT(*) AS prod_user_profile_count FROM landscape.user_profile;
SQL

    snapshot_users_by_email "$LOCAL_DB_URL" "$local_snapshot_after"
    snapshot_users_by_email "$PROD_DB_URL" "$prod_snapshot_after"
    read -r local_missing_after prod_extra_after < <(compute_user_diff_counts "$local_snapshot_after" "$prod_snapshot_after")
    echo "Post-sync diff by email: local_missing_in_prod=$local_missing_after prod_extra_vs_local=$prod_extra_after"
    echo ""
}

sync_project_owners() {
    echo -e "${BLUE}--- Sync Component: project_owners ---${NC}"

    local local_owner_stage="$WORK_DIR/local_project_owner_map.tsv"
    local prod_null_backup="$WORK_DIR/prod_projects_null_owner_before.tsv"

    echo "Creating production backup for null-owned projects..."
    psql "$PROD_DB_URL" -X -F $'\t' -A -c \
        "SELECT project_id, project_name, created_by_id FROM landscape.tbl_project WHERE created_by_id IS NULL ORDER BY project_id;" \
        > "$prod_null_backup"
    echo "Backup:"
    echo "  $prod_null_backup"

    echo "Staging local owner map..."
    psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -c \
        "\\copy (SELECT p.project_id, p.created_by_id, u.username FROM landscape.tbl_project p JOIN landscape.auth_user u ON u.id = p.created_by_id WHERE p.created_by_id IS NOT NULL ORDER BY p.project_id) TO '$local_owner_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')"

    local prod_null_before
    prod_null_before="$(psql "$PROD_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.tbl_project WHERE created_by_id IS NULL;" | tr -d '[:space:]')"
    echo "Production null-owned projects before: $prod_null_before"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}Dry run: computing candidate owner updates.${NC}"
        psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS tmp_local_project_owner_map;

CREATE TEMP TABLE tmp_local_project_owner_map (
  project_id integer,
  local_created_by_id integer,
  username varchar(150)
);
\\copy tmp_local_project_owner_map FROM '$local_owner_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')

SELECT COUNT(*) AS candidate_updates
FROM landscape.tbl_project p
JOIN tmp_local_project_owner_map l ON l.project_id = p.project_id
JOIN landscape.auth_user pu ON pu.username = l.username
WHERE p.created_by_id IS NULL;

SELECT p.project_id, p.project_name
FROM landscape.tbl_project p
WHERE p.created_by_id IS NULL
ORDER BY p.project_id
LIMIT 20;
SQL
        echo ""
        return 0
    fi

    echo "Applying owner backfill for null-owned projects..."
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 <<SQL
BEGIN;

DROP TABLE IF EXISTS tmp_local_project_owner_map;
DROP TABLE IF EXISTS tmp_updated_projects;

CREATE TEMP TABLE tmp_local_project_owner_map (
  project_id integer,
  local_created_by_id integer,
  username varchar(150)
);
\\copy tmp_local_project_owner_map FROM '$local_owner_stage' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')

CREATE TEMP TABLE tmp_updated_projects (
  project_id integer,
  project_name varchar(255),
  prod_user_id integer
);

WITH mapped AS (
  SELECT
    p.project_id,
    pu.id AS prod_user_id
  FROM landscape.tbl_project p
  JOIN tmp_local_project_owner_map l ON l.project_id = p.project_id
  JOIN landscape.auth_user pu ON pu.username = l.username
  WHERE p.created_by_id IS NULL
),
updated AS (
  UPDATE landscape.tbl_project p
  SET created_by_id = m.prod_user_id,
      updated_at = NOW()
  FROM mapped m
  WHERE p.project_id = m.project_id
    AND p.created_by_id IS NULL
  RETURNING p.project_id, p.project_name, m.prod_user_id
)
INSERT INTO tmp_updated_projects (project_id, project_name, prod_user_id)
SELECT project_id, project_name, prod_user_id
FROM updated;

COMMIT;

SELECT COUNT(*) AS updated_projects FROM tmp_updated_projects;
SELECT up.project_id, up.project_name, u.username, u.email
FROM tmp_updated_projects up
JOIN landscape.auth_user u ON u.id = up.prod_user_id
ORDER BY up.project_id;

SELECT COUNT(*) AS null_owned_remaining
FROM landscape.tbl_project
WHERE created_by_id IS NULL;

SELECT project_id, project_name
FROM landscape.tbl_project
WHERE created_by_id IS NULL
ORDER BY project_id
LIMIT 20;
SQL

    local prod_null_after
    prod_null_after="$(psql "$PROD_DB_URL" -X -t -A -c "SELECT COUNT(*) FROM landscape.tbl_project WHERE created_by_id IS NULL;" | tr -d '[:space:]')"
    echo "Production null-owned projects after: $prod_null_after"
    echo ""
}

COMPONENTS_CSV=""
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-}"
PROD_DB_URL="${PRODUCTION_DATABASE_URL:-}"
DRY_RUN=false

while [ $# -gt 0 ]; do
    case "$1" in
        --components|--with-data)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}Error: $1 requires a comma-separated value${NC}"
                usage
                exit 1
            fi
            COMPONENTS_CSV="$2"
            shift 2
            ;;
        --local-url)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}Error: --local-url requires a value${NC}"
                exit 1
            fi
            LOCAL_DB_URL="$2"
            shift 2
            ;;
        --prod-url)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}Error: --prod-url requires a value${NC}"
                exit 1
            fi
            PROD_DB_URL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

if [ -z "$COMPONENTS_CSV" ]; then
    echo -e "${RED}Error: --components is required${NC}"
    usage
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo -e "${RED}Error: psql is required but not installed${NC}"
    exit 1
fi

if [ -z "$LOCAL_DB_URL" ]; then
    LOCAL_DB_URL="$(extract_env_value "$PROJECT_ROOT/backend/.env" "DATABASE_URL" || true)"
fi
if [ -z "$LOCAL_DB_URL" ]; then
    LOCAL_DB_URL="$(extract_env_value "$PROJECT_ROOT/.env.local" "DATABASE_URL" || true)"
fi

if [ -z "$LOCAL_DB_URL" ]; then
    echo -e "${RED}Error: local DB URL not found (set LOCAL_DATABASE_URL, pass --local-url, or configure backend/.env DATABASE_URL)${NC}"
    exit 1
fi

if [ -z "$PROD_DB_URL" ]; then
    echo -e "${RED}Error: production DB URL not found (set PRODUCTION_DATABASE_URL or pass --prod-url)${NC}"
    exit 1
fi

IFS=',' read -r -a raw_components <<< "$COMPONENTS_CSV"
COMPONENTS=()
for raw in "${raw_components[@]}"; do
    component="$(echo "$raw" | tr -d '[:space:]')"
    [ -z "$component" ] && continue

    case "$component" in
        users|project_owners)
            if ! contains_component "$component" "${COMPONENTS[@]-}"; then
                COMPONENTS+=("$component")
            fi
            ;;
        *)
            echo -e "${RED}Error: Unsupported component '$component'${NC}"
            echo "Supported: users,project_owners"
            exit 1
            ;;
    esac
done

if [ "${#COMPONENTS[@]}" -eq 0 ]; then
    echo -e "${RED}Error: No valid components provided${NC}"
    exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="/tmp/landscape_data_sync_${TIMESTAMP}"
mkdir -p "$WORK_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Scoped Data Sync${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Components: ${COMPONENTS[*]}"
echo "Source DB:  $(url_host "$LOCAL_DB_URL")"
echo "Target DB:  $(url_host "$PROD_DB_URL")"
echo "Mode:       $([ "$DRY_RUN" = true ] && echo "dry-run" || echo "apply")"
echo "Artifacts:  $WORK_DIR"
echo ""

for component in "${COMPONENTS[@]}"; do
    case "$component" in
        users)
            sync_users
            ;;
        project_owners)
            sync_project_owners
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Scoped data sync complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Artifacts: $WORK_DIR"

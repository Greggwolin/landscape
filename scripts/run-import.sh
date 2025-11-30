#!/bin/bash
set -e

export DATABASE_URL="postgresql://neondb_owner:npg_bps3EShU9WFM@ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require"
export POSTGRES_URL="$DATABASE_URL"

# Run the script passed as argument, or default to import-peoria-timing
SCRIPT=${1:-scripts/import-peoria-timing.mjs}
node "$SCRIPT"

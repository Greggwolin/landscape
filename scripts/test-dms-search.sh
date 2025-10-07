#!/bin/bash

# DMS Step 3 - Search API Testing Script
# Tests Meilisearch indexing and search functionality

BASE_URL="http://localhost:3007"
API_URL="${BASE_URL}/api/dms"

echo "=========================================="
echo "DMS Step 3 - Search API Tests"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to run tests
run_test() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5

  echo -e "${YELLOW}Test: ${test_name}${NC}"

  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${API_URL}${endpoint}")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
    FAILED=$((FAILED + 1))
  fi

  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
}

echo "=========================================="
echo "1. Indexing Tests"
echo "=========================================="
echo ""

# Test 1: Initialize Meilisearch index
run_test "Initialize Meilisearch index" \
  "POST" \
  "/index" \
  '{"action": "init_index"}' \
  "200"

# Test 2: Full reindex
run_test "Full reindex (Meilisearch + MV)" \
  "POST" \
  "/index" \
  '{"action": "reindex"}' \
  "200"

# Test 3: Refresh materialized view only
run_test "Refresh materialized view" \
  "POST" \
  "/index" \
  '{"action": "refresh_mv"}' \
  "200"

# Test 4: Sync recent documents
run_test "Sync documents (last 24 hours)" \
  "POST" \
  "/index" \
  "{\"action\": \"sync\", \"filters\": {\"sinceDate\": \"$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)\"}}" \
  "200"

# Test 5: Get index statistics
run_test "Get index statistics" \
  "GET" \
  "/index" \
  "" \
  "200"

echo "=========================================="
echo "2. Search Tests (POST)"
echo "=========================================="
echo ""

# Test 6: Empty search (returns all documents)
run_test "Empty search (all documents)" \
  "POST" \
  "/search" \
  '{"query": "", "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 7: Text search
run_test "Text search for 'contract'" \
  "POST" \
  "/search" \
  '{"query": "contract", "limit": 20, "useDatabaseFallback": true}' \
  "200"

# Test 8: Filter by project_id
run_test "Filter by project_id=1" \
  "POST" \
  "/search" \
  '{"filters": {"project_id": 1}, "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 9: Filter by doc_type
run_test "Filter by doc_type=contract" \
  "POST" \
  "/search" \
  '{"filters": {"doc_type": "contract"}, "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 10: Filter by status
run_test "Filter by status=draft" \
  "POST" \
  "/search" \
  '{"filters": {"status": "draft"}, "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 11: Combined filters
run_test "Combined filters (project + doc_type)" \
  "POST" \
  "/search" \
  '{"query": "test", "filters": {"project_id": 1, "doc_type": "contract"}, "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 12: Search with facets
run_test "Search with facets" \
  "POST" \
  "/search" \
  '{"query": "", "facets": ["doc_type", "status", "discipline"], "limit": 5, "useDatabaseFallback": true}' \
  "200"

# Test 13: Pagination (offset)
run_test "Pagination (offset=5, limit=5)" \
  "POST" \
  "/search" \
  '{"query": "", "limit": 5, "offset": 5, "useDatabaseFallback": true}' \
  "200"

# Test 14: Date range filter
run_test "Date range filter" \
  "POST" \
  "/search" \
  "{\"filters\": {\"doc_date_from\": \"2025-01-01\", \"doc_date_to\": \"2025-12-31\"}, \"limit\": 10, \"useDatabaseFallback\": true}" \
  "200"

# Test 15: Contract value range
run_test "Contract value range" \
  "POST" \
  "/search" \
  '{"filters": {"contract_value_min": 100000, "contract_value_max": 1000000}, "limit": 10, "useDatabaseFallback": true}' \
  "200"

# Test 16: Validation error (invalid limit)
run_test "Validation error (limit too high)" \
  "POST" \
  "/search" \
  '{"limit": 1000}' \
  "400"

echo "=========================================="
echo "3. Search Tests (GET - Legacy)"
echo "=========================================="
echo ""

# Test 17: GET search (query param)
run_test "GET search with query param" \
  "GET" \
  "/search?q=contract&limit=10" \
  "" \
  "200"

# Test 18: GET search with filters
run_test "GET search with filters" \
  "GET" \
  "/search?project_id=1&doc_type=contract&limit=10" \
  "" \
  "200"

echo "=========================================="
echo "4. Cron Job Tests"
echo "=========================================="
echo ""

# Test 19: Get cron job status
run_test "Get cron job status" \
  "GET" \
  "/../cron/dms-sync" \
  "" \
  "200"

# Test 20: Trigger cron sync (will fail without auth in production)
run_test "Trigger cron sync" \
  "POST" \
  "/../cron/dms-sync" \
  '{}' \
  "200"

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✅${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed ❌${NC}"
  exit 1
fi

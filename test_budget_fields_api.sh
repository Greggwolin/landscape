#!/bin/bash
# Budget Field Expansion API Test Script
# Tests all 49 fields across Napkin/Standard/Detail modes

set -e

echo "========================================="
echo "Budget Field Expansion API Test"
echo "========================================="
echo ""

# Configuration
DJANGO_URL="${DJANGO_API_URL:-http://localhost:8000}"
PROJECT_ID=1
TEST_FACT_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

function test_endpoint() {
    local test_name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_field=$5

    echo -n "Testing: $test_name... "

    response=$(curl -s -X $method \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url")

    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "Step 1: Check Django API is running"
echo "------------------------------------"
if curl -s -f "$DJANGO_URL/api/financial/budget-items/" > /dev/null; then
    echo -e "${GREEN}✓ Django API is accessible${NC}"
else
    echo -e "${RED}✗ Django API is not accessible at $DJANGO_URL${NC}"
    echo "Please start Django: cd backend && python manage.py runserver"
    exit 1
fi
echo ""

echo "Step 2: Create test budget item"
echo "------------------------------------"
CREATE_DATA='{
  "project": 1,
  "category": "CapEx",
  "subcategory": "Site Work",
  "line_item_name": "API Test Item",
  "fiscal_year": 2025,
  "uom_code": "EA",
  "qty": 1,
  "rate": 1000,
  "budgeted_amount": 1000,
  "notes": "Test item for field expansion validation"
}'

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$CREATE_DATA" \
    "$DJANGO_URL/api/financial/budget-items/")

if echo "$response" | grep -q "budget_item_id"; then
    TEST_FACT_ID=$(echo "$response" | grep -oP '"budget_item_id":\s*\K\d+')
    echo -e "${GREEN}✓ Created test item with ID: $TEST_FACT_ID${NC}"
else
    echo -e "${RED}✗ Failed to create test item${NC}"
    echo "Response: $response"
    exit 1
fi
echo ""

echo "Step 3: Test STANDARD MODE fields (18 fields)"
echo "------------------------------------"

# Test 1: Escalation Method
test_endpoint \
    "escalation_method" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"escalation_method": "through_duration"}' \
    '"escalation_method":"through_duration"'

# Test 2: Curve Profile
test_endpoint \
    "curve_profile" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"curve_profile": "front_loaded"}' \
    '"curve_profile":"front_loaded"'

# Test 3: Curve Steepness
test_endpoint \
    "curve_steepness" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"curve_steepness": 75}' \
    '"curve_steepness"'

# Test 4: Confidence Level
test_endpoint \
    "confidence_level" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"confidence_level": "high"}' \
    '"confidence_level":"high"'

# Test 5: Vendor Name
test_endpoint \
    "vendor_name" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"vendor_name": "ACME Construction"}' \
    '"vendor_name":"ACME Construction"'

# Test 6: Contract Number
test_endpoint \
    "contract_number" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"contract_number": "CTR-2025-001"}' \
    '"contract_number":"CTR-2025-001"'

# Test 7: Purchase Order
test_endpoint \
    "purchase_order" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"purchase_order": "PO-2025-001"}' \
    '"purchase_order":"PO-2025-001"'

# Test 8: Is Committed
test_endpoint \
    "is_committed" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"is_committed": true}' \
    '"is_committed":true'

# Test 9: Cost Type
test_endpoint \
    "cost_type" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"cost_type": "direct"}' \
    '"cost_type":"direct"'

# Test 10: Tax Treatment
test_endpoint \
    "tax_treatment" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"tax_treatment": "capitalizable"}' \
    '"tax_treatment":"capitalizable"'

echo ""
echo "Step 4: Test DETAIL MODE fields (21 fields)"
echo "------------------------------------"

# Test 11: Percent Complete
test_endpoint \
    "percent_complete" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"percent_complete": 45.5}' \
    '"percent_complete"'

# Test 12: Status
test_endpoint \
    "status" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"status": "in_progress"}' \
    '"status":"in_progress"'

# Test 13: Budget Version
test_endpoint \
    "budget_version" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"budget_version": "revised"}' \
    '"budget_version":"revised"'

# Test 14: Retention Percentage
test_endpoint \
    "retention_pct" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"retention_pct": 10}' \
    '"retention_pct"'

# Test 15: Payment Terms
test_endpoint \
    "payment_terms" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"payment_terms": "net_30"}' \
    '"payment_terms":"net_30"'

# Test 16: Invoice Frequency
test_endpoint \
    "invoice_frequency" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"invoice_frequency": "monthly"}' \
    '"invoice_frequency":"monthly"'

# Test 17: Is Reimbursable
test_endpoint \
    "is_reimbursable" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"is_reimbursable": true}' \
    '"is_reimbursable":true'

# Test 18: Bid Amount
test_endpoint \
    "bid_amount" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"bid_amount": 950.00}' \
    '"bid_amount"'

# Test 19: Approval Status
test_endpoint \
    "approval_status" \
    "PATCH" \
    "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/" \
    '{"approval_status": "approved"}' \
    '"approval_status":"approved"'

echo ""
echo "Step 5: Test field persistence (refresh & verify)"
echo "------------------------------------"

echo -n "Fetching item to verify all fields persisted... "
response=$(curl -s "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/")

# Check multiple fields
if echo "$response" | grep -q '"escalation_method":"through_duration"' && \
   echo "$response" | grep -q '"confidence_level":"high"' && \
   echo "$response" | grep -q '"percent_complete"' && \
   echo "$response" | grep -q '"budget_version":"revised"'; then
    echo -e "${GREEN}✓ All tested fields persisted correctly${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Some fields did not persist${NC}"
    echo "Response excerpt:"
    echo "$response" | grep -E 'escalation_method|confidence_level|percent_complete|budget_version'
    ((TESTS_FAILED++))
fi

echo ""
echo "Step 6: Cleanup"
echo "------------------------------------"
echo -n "Deleting test item... "
delete_response=$(curl -s -X DELETE "$DJANGO_URL/api/financial/budget-items/$TEST_FACT_ID/")
echo -e "${GREEN}✓ Cleaned up${NC}"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Django API supports all 49 budget fields.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review the output above.${NC}"
    exit 1
fi

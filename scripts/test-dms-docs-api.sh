#!/bin/bash
# Test script for POST /api/dms/docs endpoint
# Tests: 1) Valid creation, 2) Duplicate detection, 3) Validation errors

BASE_URL="http://localhost:3007"
API_ENDPOINT="${BASE_URL}/api/dms/docs"

echo "======================================"
echo "DMS Docs API Test Suite"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Valid document creation
echo "Test 1: Valid Document Creation"
echo "--------------------------------"

RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "test-contract-001.pdf",
      "doc_type": "contract",
      "discipline": "legal",
      "storage_uri": "https://uploadthing.com/f/test-001.pdf",
      "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "mime_type": "application/pdf",
      "file_size_bytes": 102400,
      "version_no": 1,
      "uploaded_by": 42
    },
    "profile": {
      "description": "Master service agreement",
      "contract_value": 500000,
      "priority": "High"
    },
    "ai": {
      "source": "manual_upload",
      "raw": {
        "extracted_text": "Sample extracted text..."
      }
    }
  }')

STATUS=$(echo "$RESPONSE" | jq -r '.success // false')
DOC_ID=$(echo "$RESPONSE" | jq -r '.doc.doc_id // "null"')

if [ "$STATUS" == "true" ] && [ "$DOC_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Document created successfully (doc_id=${DOC_ID})"
else
    echo -e "${RED}✗ FAIL${NC}: Failed to create document"
    echo "Response: $RESPONSE"
fi

echo ""

# Test 2: Duplicate detection (same sha256 + project_id)
echo "Test 2: Duplicate Detection"
echo "--------------------------------"

RESPONSE2=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "test-contract-001-duplicate.pdf",
      "doc_type": "contract",
      "storage_uri": "https://uploadthing.com/f/test-001-dup.pdf",
      "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "mime_type": "application/pdf",
      "file_size_bytes": 102400
    }
  }')

DUPLICATE=$(echo "$RESPONSE2" | jq -r '.duplicate // false')
RETURNED_DOC_ID=$(echo "$RESPONSE2" | jq -r '.doc.doc_id // "null"')

if [ "$DUPLICATE" == "true" ] && [ "$RETURNED_DOC_ID" == "$DOC_ID" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Duplicate detected correctly (returned doc_id=${RETURNED_DOC_ID})"
else
    echo -e "${RED}✗ FAIL${NC}: Duplicate detection failed"
    echo "Response: $RESPONSE2"
fi

echo ""

# Test 3: Validation error (missing required fields)
echo "Test 3: Validation Error (Missing Fields)"
echo "--------------------------------"

RESPONSE3=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "doc_name": "invalid-doc.pdf"
    }
  }')

ERROR=$(echo "$RESPONSE3" | jq -r '.error // "none"')

if [ "$ERROR" == "Validation failed" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Validation error returned correctly"
else
    echo -e "${RED}✗ FAIL${NC}: Validation should have failed"
    echo "Response: $RESPONSE3"
fi

echo ""

# Test 4: Invalid sha256 length
echo "Test 4: Validation Error (Invalid SHA256)"
echo "--------------------------------"

RESPONSE4=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "invalid-hash.pdf",
      "doc_type": "general",
      "storage_uri": "https://uploadthing.com/f/test.pdf",
      "sha256": "short",
      "mime_type": "application/pdf",
      "file_size_bytes": 1024
    }
  }')

ERROR4=$(echo "$RESPONSE4" | jq -r '.error // "none"')

if [ "$ERROR4" == "Validation failed" ]; then
    echo -e "${GREEN}✓ PASS${NC}: SHA256 validation error returned correctly"
else
    echo -e "${RED}✗ FAIL${NC}: SHA256 validation should have failed"
    echo "Response: $RESPONSE4"
fi

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"

# Verify database entries
echo ""
echo "Verifying Database Entries..."
echo "--------------------------------"

export PGPASSWORD=npg_bps3EShU9WFM

# Check core_doc
DOC_COUNT=$(psql -h ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech -U neondb_owner -d land_v2 -t -c "SELECT COUNT(*) FROM landscape.core_doc WHERE doc_id = ${DOC_ID}")

if [ $DOC_COUNT -eq 1 ]; then
    echo -e "${GREEN}✓${NC} Document exists in core_doc table"
else
    echo -e "${RED}✗${NC} Document not found in core_doc table"
fi

# Check ai_ingestion_history
AI_COUNT=$(psql -h ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech -U neondb_owner -d land_v2 -t -c "SELECT COUNT(*) FROM landscape.ai_ingestion_history WHERE documents::text LIKE '%${DOC_ID}%'")

if [ $AI_COUNT -ge 1 ]; then
    echo -e "${GREEN}✓${NC} Ingestion history entry exists"
else
    echo -e "${YELLOW}⚠${NC} Ingestion history entry not found"
fi

echo ""
echo "All tests completed!"

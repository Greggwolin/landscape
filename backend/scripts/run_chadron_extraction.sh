#!/bin/bash
# Quick runner for Chadron rent roll extraction

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏢 Chadron Rent Roll Extraction & Validation"
echo "=============================================="
echo ""

# Check for virtual environment
if [ ! -d "$PROJECT_ROOT/venv" ]; then
    echo "❌ Virtual environment not found at $PROJECT_ROOT/venv"
    echo "   Run: python3 -m venv venv && source venv/bin/activate"
    exit 1
fi

# Activate venv
source "$PROJECT_ROOT/venv/bin/activate"

# Check for anthropic package
python3 -c "import anthropic" 2>/dev/null || {
    echo "📦 Installing anthropic package..."
    pip install anthropic
}

# Set PDF path
PDF_PATH="$PROJECT_ROOT/../reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf"

if [ ! -f "$PDF_PATH" ]; then
    echo "❌ PDF not found at: $PDF_PATH"
    exit 1
fi

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY environment variable not set"
    echo "   Export it or pass via --api-key flag"
    exit 1
fi

# Run extraction
echo "🚀 Running extraction..."
echo ""

python3 "$SCRIPT_DIR/extract_chadron_rent_roll.py" \
    --pdf-path="$PDF_PATH" \
    --output-json="$PROJECT_ROOT/chadron_rent_roll_extracted.json" \
    --output-report="$PROJECT_ROOT/chadron_reconciliation_report.md"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ Extraction and validation PASSED"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Review: $PROJECT_ROOT/chadron_reconciliation_report.md"
    echo "  2. Inspect: $PROJECT_ROOT/chadron_rent_roll_extracted.json"
    echo "  3. Run database import (if validation passed)"
else
    echo ""
    echo "=============================================="
    echo "❌ Extraction or validation FAILED"
    echo "=============================================="
    echo ""
    echo "Do NOT proceed with database import."
    echo "Review the validation errors above."
fi

exit $EXIT_CODE

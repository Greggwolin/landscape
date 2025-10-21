#!/bin/bash
#
# Setup script for Python Financial Engine
#
# This script:
# 1. Checks Python version
# 2. Installs Poetry (if needed)
# 3. Installs dependencies
# 4. Validates installation
#

set -e  # Exit on error

echo "================================================"
echo "Python Financial Engine - Setup"
echo "================================================"
echo ""

# Check Python version
echo "Checking Python version..."

# Try to find Python 3.11+ (prefer newer versions)
PYTHON_CMD=""
for py_version in python3.13 python3.12 python3.11 python3 python; do
    if command -v $py_version &> /dev/null; then
        # Check if this version is 3.11+
        if $py_version -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
            PYTHON_CMD=$py_version
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Error: Python 3.11+ not found"
    echo "Please install Python 3.11 or higher:"
    echo "  - macOS: brew install python@3.12"
    echo "  - Ubuntu: sudo apt install python3.12"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION (using $PYTHON_CMD)"
echo ""

# Check if Poetry is installed
echo "Checking Poetry..."
if ! command -v poetry &> /dev/null; then
    echo "Poetry not found. Installing Poetry..."
    curl -sSL https://install.python-poetry.org | $PYTHON_CMD -

    # Add Poetry to PATH for this session
    export PATH="$HOME/.local/bin:$PATH"

    echo "✅ Poetry installed"
else
    POETRY_VERSION=$(poetry --version 2>&1 | awk '{print $3}')
    echo "✅ Poetry $POETRY_VERSION"
fi
echo ""

# Install dependencies
echo "Installing dependencies..."
poetry install

echo ""
echo "✅ Dependencies installed"
echo ""

# Validate installation
echo "Validating installation..."
poetry run $PYTHON_CMD -c "
import numpy
import numpy_financial
import pandas
import scipy
import pydantic
import psycopg2
import loguru

print('✅ All dependencies validated')
print(f'   - numpy: {numpy.__version__}')
print(f'   - numpy-financial: {numpy_financial.__version__}')
print(f'   - pandas: {pandas.__version__}')
print(f'   - scipy: {scipy.__version__}')
print(f'   - pydantic: {pydantic.__version__}')
"

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Configure .env file with DATABASE_URL"
echo "  2. Run tests: poetry run pytest"
echo "  3. Test CLI: poetry run $PYTHON_CMD -m financial_engine.cli --help"
echo ""

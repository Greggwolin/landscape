#!/usr/bin/env bash
# Re-runs the land cash flow / IRR check against the live database (read-only)
# and writes a readable page to ./output/. Usage:
#   bash run_land_check.sh            # project 9 (Peoria Meadows)
#   CHECK_PROJECT_ID=8 bash run_land_check.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
ENV_DIR="${NB_ENV_DIR:-$HOME/.landscape-nbenv}"
if [ ! -x "$ENV_DIR/bin/python" ]; then
  python3 -m venv "$ENV_DIR"
  grep -ivE "^(fiona|gdal|geopandas|rasterio|cartopy|shapely|pyproj)" "$REPO/backend/requirements.txt" > "$ENV_DIR/req.txt"
  "$ENV_DIR/bin/pip" install -q -r "$ENV_DIR/req.txt" jupyter nbconvert python-dotenv
fi
mkdir -p "$HERE/output"
STAMP="$(TZ=America/Phoenix date +%Y-%m-%d_%H%M)"
LANDSCAPE_REPO="$REPO" "$ENV_DIR/bin/jupyter" nbconvert --to html --execute --no-input \
  --ExecutePreprocessor.timeout=300 "$HERE/land_cashflow_irr_check.ipynb" \
  --output-dir "$HERE/output" --output "land_cashflow_irr_check_p${CHECK_PROJECT_ID:-9}_${STAMP}"
echo "Written to $HERE/output/"

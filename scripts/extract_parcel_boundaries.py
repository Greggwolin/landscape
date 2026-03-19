"""
Extract parcel boundaries from the Floreo Overall Site Plan PDF
using watershed segmentation seeded by known parcel label locations.

Approach:
  1. Render PDF to high-res PNG
  2. Detect edges (boundary lines between parcels)
  3. Place seed markers at each known parcel centroid
  4. Watershed expands seeds until hitting edges
  5. Export clean polygon boundaries

Requirements:
    pip install pymupdf opencv-python-headless numpy

Usage:
    python3 scripts/extract_parcel_boundaries.py
"""

import sys
import time
import json
from pathlib import Path

import numpy as np

try:
    import fitz
except ImportError:
    sys.exit("ERROR: pip install pymupdf")

try:
    import cv2
except ImportError:
    sys.exit("ERROR: pip install opencv-python-headless")

# ---------------------------------------------------------------------------
# 0. Paths & config
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
PDF_PATH = REPO_ROOT / "reference" / "landdev" / "Teravalis" / "2025-05-12 - Floreo Overall Site Plan.pdf"
OUTPUT_DIR = PDF_PATH.parent

GEOJSON_PATH = OUTPUT_DIR / "floreo_polygons.geojson"
BOUNDARIES_PATH = OUTPUT_DIR / "floreo_boundaries_only.png"
OVERLAY_PATH = OUTPUT_DIR / "floreo_boundaries_overlay.png"

DPI = 200  # render resolution

t0 = time.time()

# ---------------------------------------------------------------------------
# 1. Render PDF page 1
# ---------------------------------------------------------------------------
print("Step 1: Rendering PDF...")
doc = fitz.open(str(PDF_PATH))
page = doc[0]
zoom = DPI / 72
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat, alpha=False)
png_path = str(OUTPUT_DIR / "floreo_page1_ws.png")
pix.save(png_path)
doc.close()

img = cv2.imread(png_path)
h, w = img.shape[:2]
print(f"  Size: {w}x{h} @ {DPI} DPI")

# ---------------------------------------------------------------------------
# 2. Scale factor: seed coords are for 7200x10800 (300 DPI)
#    Actual image is at DPI we chose — scale accordingly
# ---------------------------------------------------------------------------
REF_W, REF_H = 7200, 10800
sx = w / REF_W
sy = h / REF_H

# ---------------------------------------------------------------------------
# 3. Define ALL parcel seed points (x, y in 300-DPI reference coords)
#    Mapped by visually reading all quadrants of the hi-res image.
# ---------------------------------------------------------------------------
PARCELS = {
    # Development Unit 5
    "5.01": (1700, 1600),
    "5.02": (2400, 1300),
    "5.03": (2000, 950),
    "5.04": (2900, 1800),
    "5.05": (1600, 3000),
    "5.06": (2300, 2400),
    "5.07": (2900, 2100),
    "5.11A": (1100, 4200),
    "5.11B": (1500, 3600),
    "5.12": (1800, 3700),
    "5.13": (2200, 4100),
    "5.16": (900, 4700),
    "5.18A": (1400, 4900),
    "5.18B": (1100, 5200),
    "5.19": (2100, 5500),
    "5.20": (2300, 4700),
    "5.21_PARK": (2700, 4900),

    # Development Unit 4
    "4.08": (3400, 2200),
    "4.09": (3400, 2700),
    "4.10": (3300, 3900),
    "4.14": (2700, 2900),
    "4.15": (2700, 3500),
    "4.17A": (1900, 5800),
    "4.17B": (1700, 5500),
    "4.20": (3100, 4300),
    "4.21": (3100, 4700),
    "4.23": (2500, 5900),
    "4.24": (2900, 6200),
    "4.25_HIGH_SCHOOL": (1500, 6200),
    "4.26_MIXED_USE": (1100, 6400),
    "4.27": (3300, 3600),

    # Development Unit 1 (Future)
    "DU1_FUTURE_RESIDENTIAL": (4500, 2000),
    "DU1_FUTURE_SCHOOL": (5100, 2000),
    "DU1_FUTURE_COMMERCIAL": (5700, 2000),

    # Development Unit 2
    "DU2_1_FUTURE_RES": (5900, 3300),
    "DU2_2_FUTURE_RES": (5900, 4200),
    "DU2_3": (4800, 2900),
    "DU2_4": (5200, 3000),
    "DU2_5": (5300, 3600),
    "DU2_6": (5100, 4100),
    "DU2_7": (4800, 3900),
    "DU2_8": (4900, 3400),
    "DU2_9": (4900, 2900),
    "DU2_10": (4500, 2700),
    "DU2_11": (4300, 3400),
    "DU2_12": (4400, 3900),
    "DU2_13": (4100, 3100),
    "DU2_14": (4300, 2700),

    # Development Unit 3
    "DU3_30_MIXED_USE": (6200, 5100),
    "DU3_31_MIXED_USE": (6200, 5700),
    "DU3_32_35_VILLAGE_CORE": (5400, 5400),
    "DU3_33_MIXED_USE": (5300, 5000),
    "DU3_36_MIXED_USE": (5100, 5800),
    "DU3_37": (5100, 5300),
    "DU3_38": (5300, 4600),
    "DU3_39": (4800, 5100),
    "DU3_40": (5100, 5500),
    "DU3_41": (4700, 5400),
    "DU3_42": (4600, 5000),
    "DU3_43": (4900, 4800),
    "DU3_44": (4300, 4500),
    "DU3_45": (4600, 4600),
    "DU3_46": (3900, 5500),
    "DU3_47": (3700, 5100),
    "DU3_48": (4200, 4800),
    "DU3_49_PARK": (3800, 4300),

    # Special parcels (center)
    "50_WATER_CAMPUS": (3500, 6200),
    "51_PUBLIC_SAFETY": (3400, 6000),
    "52_NEIGHBORHOOD_COMM": (3700, 6600),
    "53_MIXED_USE": (3400, 6500),

    # Development Unit 6
    "6.01": (1000, 7400),
    "6.03_ELEMENTARY": (1800, 7300),
    "6.04": (2300, 7100),
    "6.05": (2600, 7300),
    "6.06A": (3100, 7100),
    "6.06B": (3100, 7500),
    "6.07": (3300, 6900),
    "6.08A": (1100, 7800),
    "6.08B": (900, 8200),
    "6.09_WATER_RECLAMATION": (2000, 8000),
    "6.10A": (2100, 7600),
    "6.10B": (2600, 7600),
    "6.11": (2500, 8200),
    "6.12": (3100, 7800),
    "6.14": (3200, 6800),
    "6.15_CAP_SUBSTATION": (2500, 7000),
    "6.16_COMMUNITY_PARK": (2600, 6600),
    "6.17_PARK": (1500, 7200),
}

print(f"\nStep 2: {len(PARCELS)} parcel seeds defined")

# ---------------------------------------------------------------------------
# 4. Preprocess: detect edges to define watershed barriers
# ---------------------------------------------------------------------------
print("\nStep 3: Edge detection for watershed barriers...")

# Convert to LAB for better color-boundary detection
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)

# Heavy bilateral filter: preserves color edges but kills text/hatching/roads
smooth = cv2.bilateralFilter(lab, 15, 75, 75)
smooth = cv2.bilateralFilter(smooth, 15, 75, 75)  # second pass

# Convert smoothed LAB back to grayscale for edge detection
smooth_bgr = cv2.cvtColor(smooth, cv2.COLOR_LAB2BGR)
gray = cv2.cvtColor(smooth_bgr, cv2.COLOR_BGR2GRAY)

# Additional Gaussian blur to further suppress fine detail
blurred = cv2.GaussianBlur(gray, (15, 15), 0)

# Higher Canny thresholds — only major color transitions
edges = cv2.Canny(blurred, 50, 150)

# Moderate dilation to close small gaps in boundary lines
edge_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
edges_thick = cv2.dilate(edges, edge_kernel, iterations=1)

print(f"  Edge pixels: {np.count_nonzero(edges_thick):,}")

# ---------------------------------------------------------------------------
# 5. Build marker image for watershed
# ---------------------------------------------------------------------------
print("\nStep 4: Building watershed markers...")

markers = np.zeros((h, w), dtype=np.int32)

# Marker 1 = background (edges and outside area)
# Use edges as background marker
markers[edges_thick > 0] = 1

# Place each parcel seed as a small circle marker
marker_id = 2  # start at 2 (1 is background)
parcel_ids = {}

for name, (rx, ry) in PARCELS.items():
    # Scale reference coords to actual image size
    px = int(rx * sx)
    py = int(ry * sy)

    # Clamp to image bounds
    px = max(10, min(w - 10, px))
    py = max(10, min(h - 10, py))

    # Draw a small filled circle as the seed region
    cv2.circle(markers, (px, py), 8, marker_id, -1)
    parcel_ids[marker_id] = name
    marker_id += 1

print(f"  Placed {len(parcel_ids)} seed markers")

# ---------------------------------------------------------------------------
# 6. Run watershed
# ---------------------------------------------------------------------------
print("\nStep 5: Running watershed segmentation...")

# Watershed needs a 3-channel image
watershed_img = img.copy()
cv2.watershed(watershed_img, markers)

# markers now contains:
#  -1 = boundary lines
#   1 = background
#   2+ = parcel regions

print("  Watershed complete")

# ---------------------------------------------------------------------------
# 7. Extract contours per parcel → GeoJSON
# ---------------------------------------------------------------------------
print("\nStep 6: Extracting parcel polygons...")

features = []
for mid, name in parcel_ids.items():
    # Binary mask for this parcel
    parcel_mask = (markers == mid).astype(np.uint8) * 255

    # Clean up with morphological close
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    parcel_mask = cv2.morphologyEx(parcel_mask, cv2.MORPH_CLOSE, kern)

    contours, _ = cv2.findContours(parcel_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        continue

    # Take the largest contour for this parcel
    cnt = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(cnt)

    if area < 500:
        continue

    # Simplify
    epsilon = 0.003 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)

    coords = approx.squeeze().tolist()
    if len(coords) < 3:
        continue
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    feature = {
        "type": "Feature",
        "properties": {
            "parcel_id": name,
            "area_px": round(area),
            "num_vertices": len(coords),
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords],
        },
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "properties": {
        "source": "Floreo Overall Site Plan",
        "method": "Watershed segmentation with manual seed points",
        "image_width": w,
        "image_height": h,
        "dpi": DPI,
        "crs": "pixel",
    },
    "features": features,
}

with open(str(GEOJSON_PATH), "w") as f:
    json.dump(geojson, f, indent=2)

print(f"  Saved {len(features)} parcel polygons to {GEOJSON_PATH}")

# ---------------------------------------------------------------------------
# 8. Boundaries-only image (black outlines on white)
# ---------------------------------------------------------------------------
print("\nStep 7: Generating boundaries-only image...")

canvas = np.ones((h, w, 3), dtype=np.uint8) * 255

for feat in features:
    coords = feat["geometry"]["coordinates"][0]
    pts = np.array(coords, dtype=np.int32)
    cv2.polylines(canvas, [pts], True, (0, 0, 0), 2)

cv2.imwrite(str(BOUNDARIES_PATH), canvas)
print(f"  Saved: {BOUNDARIES_PATH}")

# ---------------------------------------------------------------------------
# 9. Overlay on original
# ---------------------------------------------------------------------------
print("\nStep 8: Generating overlay image...")

overlay = img.copy()
for feat in features:
    coords = feat["geometry"]["coordinates"][0]
    pts = np.array(coords, dtype=np.int32)
    cv2.polylines(overlay, [pts], True, (0, 0, 255), 3)

    # Label at centroid
    M = cv2.moments(pts)
    if M["m00"] > 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        label = feat["properties"]["parcel_id"]
        # Shorten long names
        if "_" in label:
            label = label.split("_")[0]
            if label.startswith("DU"):
                label = feat["properties"]["parcel_id"].replace("DU2_", "").replace("DU3_", "").replace("DU1_", "")
        cv2.putText(overlay, label, (cx - 15, cy + 5),
                     cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 200), 1, cv2.LINE_AA)

cv2.imwrite(str(OVERLAY_PATH), overlay)
print(f"  Saved: {OVERLAY_PATH}")

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
elapsed = time.time() - t0
print(f"\n✓ Done in {elapsed:.1f}s — {len(features)} parcels extracted")
print(f"  Boundaries: {BOUNDARIES_PATH}")
print(f"  Overlay:    {OVERLAY_PATH}")
print(f"  GeoJSON:    {GEOJSON_PATH}")

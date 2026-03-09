"""
Backfill lat/lng for rental comparables with NULL coordinates.
Uses Census Geocoder API (free, no key required, US addresses).
Falls back to Nominatim for failures.
"""
import os
import sys
import time
import json
import urllib.request
import urllib.parse

# Load DATABASE_URL from .env.local
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('DATABASE_URL='):
                val = line.split('=', 1)[1].strip().strip('"').strip("'")
                os.environ['DATABASE_URL'] = val
                break

import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)


def geocode_census(address):
    """Geocode using US Census Bureau API."""
    encoded = urllib.parse.quote(address)
    url = f"https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address={encoded}&benchmark=Public_AR_Current&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Landscape/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            matches = data.get('result', {}).get('addressMatches', [])
            if matches:
                coords = matches[0]['coordinates']
                return float(coords['y']), float(coords['x'])  # lat, lng
    except Exception as e:
        print(f"    Census failed: {e}")
    return None, None


def geocode_nominatim(address):
    """Fallback geocoder using OpenStreetMap Nominatim."""
    encoded = urllib.parse.quote(address)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1&countrycodes=us"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Landscape/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"    Nominatim failed: {e}")
    return None, None


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get unique addresses needing geocoding
    cur.execute("""
        SELECT DISTINCT address
        FROM landscape.tbl_rental_comparable
        WHERE (latitude IS NULL OR longitude IS NULL)
        AND address IS NOT NULL AND TRIM(address) != ''
        ORDER BY address
    """)
    addresses = [row[0] for row in cur.fetchall()]
    print(f"Found {len(addresses)} unique addresses to geocode\n")

    # Geocode each unique address
    geocoded = {}
    failed = []

    for addr in addresses:
        print(f"  [{len(geocoded)+len(failed)+1}/{len(addresses)}] {addr}")

        # Try Census first
        lat, lng = geocode_census(addr)
        if lat and lng:
            print(f"    → Census: {lat:.6f}, {lng:.6f}")
            geocoded[addr] = (lat, lng)
            time.sleep(0.3)
            continue

        time.sleep(1.1)  # Nominatim rate limit

        # Fallback to Nominatim
        lat, lng = geocode_nominatim(addr)
        if lat and lng:
            print(f"    → Nominatim: {lat:.6f}, {lng:.6f}")
            geocoded[addr] = (lat, lng)
            time.sleep(1.1)
            continue

        print(f"    → FAILED both services")
        failed.append(addr)
        time.sleep(0.5)

    # Apply geocoded coordinates to all matching rows
    print(f"\nApplying {len(geocoded)} geocoded addresses to database...")
    updated = 0
    for addr, (lat, lng) in geocoded.items():
        cur.execute("""
            UPDATE landscape.tbl_rental_comparable
            SET latitude = %s, longitude = %s
            WHERE address = %s AND (latitude IS NULL OR longitude IS NULL)
        """, (lat, lng, addr))
        count = cur.rowcount
        updated += count
        print(f"  Updated {count} rows for: {addr}")

    conn.commit()

    # Report
    print(f"\n{'='*60}")
    print(f"Geocoded: {len(geocoded)} unique addresses → {updated} rows updated")
    if failed:
        print(f"Failed:   {len(failed)} addresses:")
        for addr in failed:
            print(f"  - {addr}")

    # Check remaining nulls
    cur.execute("""
        SELECT count(*) FROM landscape.tbl_rental_comparable
        WHERE latitude IS NULL OR longitude IS NULL
    """)
    remaining = cur.fetchone()[0]
    print(f"Remaining NULL lat/lng: {remaining}")

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()

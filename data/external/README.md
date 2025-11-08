# External GIS + Large Asset Storage

This directory keeps bulky data extracts and shapefiles out of the Next.js `src/app` tree. The files that live here are *not* committed to git (see `.gitignore`) and should instead live in a shared storage bucket or be generated locally when needed.

## Directory Layout

- `pinal-county/raw/` – source shapefiles and vendor-delivered archives.
- `pinal-county/processed/` – any converted GeoJSON/NDJSON/tiles produced by local tooling (`convert-shapefile.js`, etc.).

Both subdirectories contain `.gitkeep` sentinels so the folders exist in git even though the actual data is ignored.

## Runtime Configuration

Parcel-consuming components read from the URL defined by `NEXT_PUBLIC_PARCEL_DATA_URL`. In development we default to the lightweight sample located at `public/samples/pinal-parcels-sample.json`. For real data set this environment variable to a CDN/bucket URL (e.g. an object store download link or vector tile endpoint).

```
NEXT_PUBLIC_PARCEL_DATA_URL=https://storage.example.com/landscape/pinal/pinal_parcels.geojson
```

Keep large exports in object storage (S3, GCS, etc.) or attach via Git LFS when collaboration on the raw files is required.

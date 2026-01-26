"""
Location Intelligence models.

Note: This app uses raw SQL for spatial queries instead of Django ORM.
The tables are defined in:
  migrations/20260126_create_location_intelligence_schema.sql

Tables:
  - location_intelligence.block_groups
  - location_intelligence.demographics_cache
  - location_intelligence.ring_demographics
  - location_intelligence.poi_cache
  - location_intelligence.project_map_points
"""

# No Django ORM models - spatial queries use raw SQL with PostGIS

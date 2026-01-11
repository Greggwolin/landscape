"""HBACA permit data ingestion tool.

This tool parses HBACA (Home Builders Association of Central Arizona) permit history
files and normalizes them into market_activity records for persistence and analysis.

Supports two file formats:
- Master file: Full history with all months (HBACA_Permits_Master_Through_YYYY-MM.xlsx)
- Monthly update: Current year with rolling 2-year window (2025_SF_Permits_-_MM_Mon.xlsx)
"""

# Changelog

All notable changes to the Landscape project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Migration 013 - Project Type Code Standardization (2025-11-02)

#### Added
- **Standardized Project Type Codes**: Implemented 7 official project type codes (LAND, MF, OFF, RET, IND, HTL, MXU) to replace legacy codes (MPC, MULTIFAMILY, etc.)
- **Database Constraints**: Added CHECK constraint to enforce only valid project type codes
- **NOT NULL Constraint**: All projects must now have a project_type_code (defaults to 'LAND')
- **Backend Support**: Django models and serializers now include project_type_code field
- **Tab Routing Logic**: Updated getTabsForPropertyType() to recognize standardized LAND code
- **Dashboard Support**: Added standardized code labels and colors to dashboard displays

#### Changed
- **Database Schema**: Renamed `property_type_code` → `project_type_code` in `landscape.tbl_project`
- **Project Type Standardization**:
  - MPC → LAND
  - MULTIFAMILY → MF
  - RETAIL → RET
  - NULL/empty → LAND (default)
- **Frontend**: Updated 21 files to use `project_type_code` instead of `property_type_code`
- **API Responses**: All project endpoints now return `project_type_code` field
- **Function Renamed**: `normalizePropertyTypeCode()` → `normalizeProjectTypeCode()`

#### Fixed
- **Tab Routing Bug**: Project 7 (and all LAND projects) now correctly display Land Development tabs instead of Income Property tabs
- **Dashboard Stats**: Quick stats counters now correctly count projects by standardized codes
- **Django API Errors**: Fixed HTTP 500 errors on multifamily endpoints caused by deprecated column references
- **NULL Value Handling**: Migration now properly handles projects with NULL property_type_code values

#### Removed
- **Deprecated Columns**: Dropped `development_type_deprecated` and `property_type_code_deprecated` from database
- **Django Model Fields**: Removed deprecated field definitions from Project model

#### Migration Details
- **Migration File**: `db/migrations/013_project_type_reclassification.sql`
- **Rollback File**: `db/migrations/013_rollback.sql`
- **Backup Timestamp**: 2025-11-02 10:04:08 MST
- **Projects Migrated**: 10 projects successfully updated
- **Execution Time**: 2 minutes 22 seconds

#### Documentation
- [MIGRATION_013_EXECUTION_REPORT.md](MIGRATION_013_EXECUTION_REPORT.md) - Complete execution details
- [MIGRATION_013_BACKEND_UPDATES.md](MIGRATION_013_BACKEND_UPDATES.md) - Django backend changes
- [MIGRATION_013_TAB_ROUTING_FIX.md](MIGRATION_013_TAB_ROUTING_FIX.md) - Tab routing fix details
- [PROJECT_TYPE_CODE_MIGRATION_REPORT.md](PROJECT_TYPE_CODE_MIGRATION_REPORT.md) - Original migration plan

---

## [3.4.0] - 2025-10-25

### Added
- **PDF Report Generation**: ARGUS-quality PDF reports with cover pages, charts, and analysis
- **Progressive Assumptions System**: Napkin → Mid-level → Pro-forma assumption progression
- **Document Management System**: OCR processing, AI correction, and document extraction

### Changed
- **Navigation Structure**: Consolidated legacy navigation routes
- **PDF Output**: Enhanced report formatting and chart rendering

---

## [3.3.0] - 2025-10-20

### Added
- **Python Financial Engine**: 5-10x faster calculation engine
- **Container System**: Universal hierarchy (Area/Phase/Parcel OR Property/Building/Unit)
- **Budget Grid**: Spreadsheet-like interface with inline editing

### Changed
- **Database Schema**: Added 15+ new tables for container system
- **API Structure**: Migrated to container-based endpoints

---

## [3.2.0] - 2025-10-15

### Added
- **Rent Roll Interface**: DVL auto-fill system for multifamily properties
- **GIS Integration**: MapLibre boundary mapping and parcel selection
- **Market Intelligence**: Census ACS, BLS, FRED, FHFA data integration

### Changed
- **Multifamily Models**: Enhanced unit-level tracking with lease management
- **Map Interface**: Improved performance and user experience

---

## [3.1.0] - 2025-10-10

### Added
- **Lease Management**: Escalations, recoveries, percentage rent
- **Turn Analysis**: Unit turn tracking and occupancy reporting
- **Dependency Engine**: Automated timeline calculation with circular detection

### Changed
- **S-Curve Distribution**: Enhanced with 4 timing profiles
- **Calculation Engine**: Optimized for performance

---

## [3.0.0] - 2025-10-01

### Added
- **Initial Production Release**: Comprehensive financial modeling platform
- **117 Database Tables**: Complete data layer for MPC and income properties
- **Next.js 15 Frontend**: Modern React-based UI with TypeScript
- **Django Backend**: RESTful API with admin panel
- **Neon PostgreSQL**: Serverless database with branching

### Changed
- **Architecture**: Migrated from monolith to Next.js + Django microservices
- **Authentication**: Implemented JWT-based auth system
- **CI/CD**: Automated deployment pipeline with Vercel

---

## Version Numbering

**Format**: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, documentation updates

**Current Version**: 3.4.0 + Migration 013

---

## Migration History

| ID | Date | Description | Status |
|----|------|-------------|--------|
| 013 | 2025-11-02 | Project Type Code Standardization | ✅ Complete |
| 012 | 2025-10-30 | Document Management System | ✅ Complete |
| 011 | 2025-10-25 | PDF Reports & Progressive Assumptions | ✅ Complete |
| 010 | 2025-10-20 | Python Financial Engine | ✅ Complete |
| 009 | 2025-10-15 | Container System | ✅ Complete |
| 008 | 2025-10-10 | Rent Roll Interface | ✅ Complete |
| 007 | 2025-10-05 | GIS Integration | ✅ Complete |
| 006 | 2025-09-30 | Market Intelligence | ✅ Complete |
| 005 | 2025-09-25 | Lease Management | ✅ Complete |
| 004 | 2025-09-20 | Multifamily Enhancement | ✅ Complete |
| 003 | 2025-09-15 | Budget Grid | ✅ Complete |
| 002 | 2025-09-10 | Dependency Engine | ✅ Complete |
| 001 | 2025-09-01 | Initial Schema | ✅ Complete |

---

## Contributing

See [docs/00-getting-started/DEVELOPER_GUIDE.md](docs/00-getting-started/DEVELOPER_GUIDE.md) for contribution guidelines.

## License

Proprietary - All Rights Reserved

---

**Last Updated**: 2025-11-02 10:30 MST

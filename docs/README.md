# Landscape Pro-Forma Documentation

**Version:** 3.4
**Last Updated:** 2025-10-25
**Status:** Production Ready + PDF Reports + Progressive Assumptions

Welcome to the comprehensive documentation for the Landscape Pro-Forma financial modeling application.

---

## 🚀 Quick Start

**New to the project?** Start here:
1. [Developer Guide](00-getting-started/DEVELOPER_GUIDE.md) - Installation & setup
2. [Quick Start Guide](00-getting-started/QUICK_START_FINANCIAL_ENGINE.md) - Get running in 5 minutes
3. [System Architecture](01-architecture/DATABASE_SCHEMA.md) - Understand the system design

**Looking for specific features?**
- [PDF Report Generation](session-notes/2025-10-25-pdf-reports-navigation.md) - ⭐ **NEW: ARGUS-Quality Reports**
- [Progressive Assumptions System](session-notes/2025-10-25-pdf-reports-navigation.md#part-2-legacy-navigation-organization) - ⭐ **NEW: Napkin→Mid→Pro**
- [Financial Engine](02-features/financial-engine/IMPLEMENTATION_STATUS.md) - Complete status
- [Python Financial Engine](../services/financial_engine_py/README.md) - 5-10x faster calculations
- [Rent Roll Interface](02-features/rent-roll/UNIVERSAL_RENT_ROLL_INTERFACE.md) - DVL auto-fill system
- [Document Management](02-features/dms/DMS-Implementation-Status.md) - DMS implementation
- [GIS & Mapping](02-features/gis/) - MapLibre integration

---

## 📁 Documentation Structure

### [00-getting-started/](00-getting-started/)
New developer onboarding and quick start guides
- Developer Guide - Complete setup instructions
- Quick Start - Get running in 5 minutes

### [01-architecture/](01-architecture/)
System design, architecture, and technical overview
- Database Schema - Complete schema reference (151 active + 7 deprecated tables)
- System Architecture - Technology stack and design patterns

### [02-features/](02-features/)
Feature-specific documentation organized by domain

#### [financial-engine/](02-features/financial-engine/)
ARGUS-level financial modeling engine
- **[IMPLEMENTATION_STATUS.md](02-features/financial-engine/IMPLEMENTATION_STATUS.md)** ⭐ **MASTER DOCUMENT** - Complete feature inventory
- PHASE_1.5_SUMMARY.md - Dependencies & revenue modeling
- SCURVE_CALCULATION_ENGINE.md - S-curve timing distribution
- ARGUS_PARITY_CHECKLIST.md - ARGUS feature comparison
- TEST_FIXTURES.md - Test data reference

#### [rent-roll/](02-features/rent-roll/)
Universal Rent Roll Interface with DVL auto-fill
- **UNIVERSAL_RENT_ROLL_INTERFACE.md** - Complete implementation guide

#### [dms/](02-features/dms/)
Document Management System
- DMS-Implementation-Status.md - Current status
- DMS-Step-X-Complete.md - Implementation steps
- README_DMS_v1.md - DMS overview

#### [gis/](02-features/gis/)
GIS & Mapping integration
- maplibre_integration_ai_first.md - MapLibre setup
- gis_implementation_ai_first.md - GIS implementation
- GIS_TEST_RESULTS.md - Testing results

#### [land-use/](02-features/land-use/)
Land use management and taxonomy
- UNIFIED_LANDUSE_SYSTEM.md - Unified system design
- land-use-taxonomy-implementation.md - Taxonomy structure
- universal-container-system.md - Container system

### [03-api-reference/](03-api-reference/)
API endpoint documentation
- API_REFERENCE_PHASE2.md - Phase 2 endpoints
- budget_grid_api_spec.md - Budget grid API

### [04-ui-components/](04-ui-components/)
UI component documentation and prototypes
- UI_COMPONENTS_PHASE4.md - Phase 4 components
- prototypes/ - Component prototypes

### [05-database/](05-database/)
Database schema, migrations, and test fixtures
- **[TABLE_INVENTORY.md](05-database/TABLE_INVENTORY.md)** - Complete inventory: 151 active + 7 deprecated tables by functional area
- **[DATABASE_SCHEMA.md](05-database/DATABASE_SCHEMA.md)** - Technical schema specification
- **[MIGRATION-SUMMARY.md](05-database/MIGRATION-SUMMARY.md)** - Migration history and changes
- [README.md](05-database/README.md) - Database documentation index
- db-schema.md - Auto-generated schema dump

### [06-devops/](06-devops/)
DevOps, CI/CD, and deployment
- DEVOPS_GUIDE.md - Complete DevOps handbook
- Unified-Extractor-Integration-Complete.md - Integration status

### [07-testing/](07-testing/)
Testing strategy and validation results
- VALIDATION_COMPLETE.md - Validation summary
- VALIDATION_RESULTS.md - Test results
- VALIDATION_SUMMARY.md - Testing overview

### [08-migration-history/](08-migration-history/)
Historical migration and consolidation records
- Budget-Consolidation-Migration-Complete.md
- Budget-Finance-Schema-Overlap-Analysis.md
- Schema-Coverage-Analysis.md
- Schema-Naming-Convention-Analysis.md

### [09-technical-dd/](09-technical-dd/)
Technical due diligence documentation
- 01-executive-summary/ - Executive summary
- 02-architecture/ - Architecture analysis
- 03-codebase-analysis/ - Code quality metrics
- 04-feature-functionality/ - Feature matrix
- 05-security-assessment/ - Security assessment

### [10-correspondence/](10-correspondence/)
Project correspondence and business documents
- ASU-2-pager.docx - ASU 2-page project summary
- ASU-3-pager.docx - ASU 3-page project summary
- ASU-memo_re-landscape.pdf - ASU landscape memo

### [11-implementation-status/](11-implementation-status/)
Implementation status reports and completion documentation
- IMPLEMENTATION_STATUS.md - Current implementation status
- IMPLEMENTATION_STATUS_OLD.md - Historical status
- CONTAINER_CRUD_IMPLEMENTATION_STATUS.md - Container CRUD status
- CORE_UI_MIGRATION_COMPLETE.md - UI migration completion
- PHASE_1_DEPLOYMENT_COMPLETE.md - Phase 1 deployment
- CONTAINER_INTEGRATION_COMPLETE.md - Container integration
- BUDGET_CONTAINER_INTEGRATION_COMPLETE.md - Budget integration
- CONTAINER_CRUD_FRONTEND_COMPLETE.md - Frontend completion

### [12-migration-plans/](12-migration-plans/)
Migration plans and deprecation strategies
- BUDGET_CONTAINER_MIGRATION.md - Budget container migration
- PLANNING_WIZARD_CONTAINER_MIGRATION.md - Planning wizard migration
- CONTAINER_MIGRATION_CHECKLIST.md - Migration checklist
- PE_LEVEL_DEPRECATION_PLAN.md - PE level deprecation

### [13-testing-docs/](13-testing-docs/)
Testing documentation, POCs, and test results
- TESTING_PLANNING_WIZARD_CONTAINERS.md - Planning wizard tests
- TESTING_BREADCRUMB_DEMO.md - Breadcrumb demo tests
- MULTIFAMILY_TEST_RESULTS.md - Multifamily testing
- DYNAMIC_BREADCRUMB_POC.md - Breadcrumb POC

### [14-specifications/](14-specifications/)
Feature specifications and integration documentation
- BUDGET_API_CONTAINER_INTEGRATION.md - Budget API integration
- PROJECT_SETUP_WIZARD.md - Project setup wizard spec

### [session-notes/](session-notes/)
Development session notes and implementation logs
- **[2025-10-25-pdf-reports-navigation.md](session-notes/2025-10-25-pdf-reports-navigation.md)** - ⭐ PDF Report Generation + Progressive Assumptions
- [2025-10-25-multifamily-overview-integration.md](session-notes/2025-10-25-multifamily-overview-integration.md) - Property-type-aware Overview + Tab Fixes
- [2025-10-24-multifam-django-consolidation.md](session-notes/2025-10-24-multifam-django-consolidation.md) - Django Backend Consolidation
- [2025-10-23-multifam-rent-roll-prototype.md](session-notes/2025-10-23-multifam-rent-roll-prototype.md) - Rent Roll Prototype Development

### [archive/](archive/)
Legacy and superseded documentation

---

## 🎯 Most Important Documents

### For New AI Chat Sessions
Use **[IMPLEMENTATION_STATUS.md](02-features/financial-engine/IMPLEMENTATION_STATUS.md)** - This single document provides complete context:
- All 32 tables + 12 views
- All implemented features
- Code metrics and progress
- Technology stack
- File references

### For Feature Development
- **Financial Engine:** [IMPLEMENTATION_STATUS.md](02-features/financial-engine/IMPLEMENTATION_STATUS.md)
- **Rent Roll:** [UNIVERSAL_RENT_ROLL_INTERFACE.md](02-features/rent-roll/UNIVERSAL_RENT_ROLL_INTERFACE.md)
- **Database:** [DATABASE_SCHEMA.md](05-database/DATABASE_SCHEMA.md)
- **APIs:** [API_REFERENCE_PHASE2.md](03-api-reference/API_REFERENCE_PHASE2.md)

### For Operations
- **DevOps:** [DEVOPS_GUIDE.md](06-devops/DEVOPS_GUIDE.md)
- **Testing:** [VALIDATION_COMPLETE.md](07-testing/VALIDATION_COMPLETE.md)

---

## 🔍 Finding Documentation

### By Technology
- **Next.js 15.5.0** - See [Developer Guide](00-getting-started/DEVELOPER_GUIDE.md)
- **PostgreSQL/Neon** - See [Database Schema](05-database/DATABASE_SCHEMA.md)
- **AG-Grid** - See [Rent Roll](02-features/rent-roll/UNIVERSAL_RENT_ROLL_INTERFACE.md)
- **TypeScript** - See [API Reference](03-api-reference/API_REFERENCE_PHASE2.md)

### By Task
- **Setting up dev environment** → [Developer Guide](00-getting-started/DEVELOPER_GUIDE.md)
- **Understanding database** → [Database Schema](05-database/DATABASE_SCHEMA.md)
- **Working on financial engine** → [Financial Engine Status](02-features/financial-engine/IMPLEMENTATION_STATUS.md)
- **Working on rent roll** → [Rent Roll Interface](02-features/rent-roll/UNIVERSAL_RENT_ROLL_INTERFACE.md)
- **Deploying to production** → [DevOps Guide](06-devops/DEVOPS_GUIDE.md)
- **Running tests** → [Validation Complete](07-testing/VALIDATION_COMPLETE.md)

### By Role
- **Developer** → Start with [Developer Guide](00-getting-started/DEVELOPER_GUIDE.md)
- **Architect** → See [Database Schema](05-database/DATABASE_SCHEMA.md) + [DEVOPS_GUIDE](06-devops/DEVOPS_GUIDE.md)
- **Product Manager** → See [IMPLEMENTATION_STATUS](02-features/financial-engine/IMPLEMENTATION_STATUS.md) + [Feature Matrix](09-technical-dd/04-feature-functionality/feature-functionality-matrix.md)
- **QA/Testing** → See [Testing](07-testing/)

---

## 📊 Project Metrics

| Metric | Count |
|--------|-------|
| **Database Tables (Active)** | 151 |
| **Database Tables (Deprecated)** | 7 |
| **Total Database Tables** | 158 |
| **Total Columns** | ~2,400+ |
| **API Endpoints** | 25+ |
| **UI Components** | 10+ major components |
| **Lines of Code** | ~17,000 |
| **Documentation Files** | 65+ |
| **Test Fixtures** | 3 complete projects |
| **Migrations Executed** | 8 |

---

## 🎉 Current Status

**Production Ready Features:**
✅ Financial Engine (Phases 1, 1.5, 2, 3, 4, 5, 7, 8)
✅ PDF Report Generation (Property Summary, Cash Flow, Rent Roll)
✅ Progressive Assumptions System (Napkin → Mid → Pro)
✅ Universal Rent Roll Interface with DVL auto-fill
✅ Multifamily property tracking
✅ Document Management System
✅ GIS & Mapping integration
✅ Land use management system
✅ CI/CD pipeline with Neon branching

**Core Features: 88% Complete**

---

## 🤝 Contributing

### Updating Documentation
When adding new features or making changes:
1. Update relevant feature documentation in `02-features/`
2. Update [IMPLEMENTATION_STATUS.md](02-features/financial-engine/IMPLEMENTATION_STATUS.md) if core feature
3. Update this README if adding new categories
4. Keep documentation in sync with code

### Documentation Standards
- Use markdown (.md) format
- Include "Last Updated" date at top of file
- Add file to appropriate category folder
- Update category README with link to new file
- Use relative links between docs

---

## 📞 Support

### Quick Links
- [GitHub Repository](https://github.com/your-org/landscape)
- [Developer Guide](00-getting-started/DEVELOPER_GUIDE.md)
- [API Reference](03-api-reference/API_REFERENCE_PHASE2.md)

### Getting Help
- Check relevant feature documentation first
- Review [IMPLEMENTATION_STATUS.md](02-features/financial-engine/IMPLEMENTATION_STATUS.md) for current state
- Consult [DevOps Guide](06-devops/DEVOPS_GUIDE.md) for operations issues

---

**Maintained by:** Engineering Team
**Documentation Version:** 3.4
**Last Major Update:** October 25, 2025
**Next Review:** Upon next major feature release

---

## 📂 Documentation Organization

All project documentation is now organized into numbered folders for easy navigation:
- **00-09**: Core documentation (getting started, architecture, features, etc.)
- **10**: Business correspondence and project documents
- **11**: Implementation status and completion reports
- **12**: Migration plans and deprecation strategies
- **13**: Testing documentation and POCs
- **14**: Feature specifications and integration docs

Only the main project README.md remains in the root directory. All other documentation has been organized into the docs/ folder structure.

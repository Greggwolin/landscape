# Data Validation Lists Reference

This document defines all enumerated values and validation lists used throughout the Landscape application.

---

## 1. Project Configuration

### tbl_project.analysis_type

**Type:** VARCHAR(50) with CHECK constraint
**Values:**
- Land Development
- Income Property

**Description:** Top-level analysis category that determines the financial modeling approach and available features.

**Usage:**
- Land Development: For development feasibility analysis, lot absorption, phased infrastructure, and residual value calculations
- Income Property: For NOI analysis, cap rates, leasing, stabilization, and existing property valuation

---

### tbl_project.property_subtype

**Type:** VARCHAR(100)
**Cascading Values by Analysis Type:**

#### When analysis_type = 'Land Development':
- Master Planned Community
- Subdivision
- Multifamily Development
- Commercial Development
- Industrial Development
- Mixed-Use Development

#### When analysis_type = 'Income Property':

**Multifamily Income:**
- Garden Multifamily
- Mid-Rise Multifamily
- High-Rise Multifamily
- Student Housing
- Senior Housing
- Affordable Housing

**Office Income:**
- Class A Office
- Class B Office
- Class C Office
- Medical Office
- Flex/R&D
- Coworking

**Retail Income:**
- Neighborhood Retail
- Community Retail
- Power Center
- Lifestyle Center
- Strip Center
- Regional Mall

**Industrial Income:**
- Warehouse/Distribution
- Manufacturing
- Flex Space
- Cold Storage
- Self-Storage

**Other Income:**
- Hotel
- Mixed-Use Office/Retail
- Mixed-Use Office/Multifamily
- Mixed-Use Retail/Multifamily

**Description:** Specific property use type that cascades from the selected analysis_type. This determines which financial models, templates, and assumptions are available.

---

### tbl_project.property_class

**Type:** VARCHAR(50)
**Applies to:** Income Property only
**Values:**
- Class A
- Class B
- Class C
- Class D

**Description:** Quality/institutional grade classification for income-producing properties. This field is hidden/disabled for Land Development projects.

**Definitions:**
- **Class A**: Highest quality, newest construction, premier locations, institutional-grade finishes
- **Class B**: Good quality, may be older but well-maintained, solid locations, attractive to regional investors
- **Class C**: Older properties, functional but dated, secondary locations, value-add opportunities
- **Class D**: Significant deferred maintenance, marginal locations, requires substantial renovation

---

## 2. Financial Configuration

### tbl_project.calculation_frequency

**Type:** VARCHAR(20)
**Values:**
- Monthly
- Quarterly
- Annual

**Default:** Monthly

**Description:** Determines the granularity of financial calculations and cash flow projections.

---

### tbl_project.financial_model_type

**Type:** VARCHAR(50)
**Values:**
- Development
- Acquisition
- Refinance
- Disposition

**Default:** Development (when analysis_type = 'Land Development')

**Description:** The type of financial analysis being performed.

---

## 3. Geographic Configuration

### tbl_project.jurisdiction_state

**Type:** VARCHAR(10)
**Values:** Standard US state abbreviations (CA, AZ, NV, etc.)

**Description:** Two-letter state code for the project jurisdiction.

---

### tbl_project.country

**Type:** VARCHAR(100)
**Default:** United States

**Description:** Country where the project is located.

---

## 4. Container Configuration

### tbl_container.container_type

**Type:** VARCHAR(50)
**Values:**
- Revenue
- Expense
- Asset
- Liability
- Equity

**Description:** Financial statement category for universal container system.

---

### tbl_container.level_type

**Type:** VARCHAR(50)
**Values:**
- L1 (Top Level)
- L2 (Category)
- L3 (Subcategory)
- L4 (Line Item)

**Description:** Hierarchical level in the universal container taxonomy.

---

## 5. Land Use Configuration

### gis_plan_parcel.land_use_label

**Type:** VARCHAR(100)
**Cascading Values by Analysis Type:**

#### When analysis_type = 'Land Development':
**Residential:**
- Single Family Detached
- Single Family Attached
- Townhome
- Condominium
- Live/Work

**Commercial:**
- Office
- Retail
- Restaurant
- Hotel
- Mixed-Use

**Civic:**
- School
- Park
- Fire Station
- Police Station
- Library
- Community Center

**Infrastructure:**
- Street
- Utility Corridor
- Stormwater Basin
- Open Space

#### When analysis_type = 'Income Property':
**Multifamily:**
- Studio Unit
- 1-Bedroom Unit
- 2-Bedroom Unit
- 3-Bedroom Unit
- Penthouse Unit

**Office:**
- Ground Floor Retail
- Office Floor
- Executive Suite
- Common Area

**Retail:**
- Anchor Space
- Inline Shop
- Pad Site
- Food Court

**Industrial:**
- Warehouse Bay
- Office Component
- Dock Area
- Yard Storage

**Description:** Land use designation for parcels within the project. Available options cascade based on the project's analysis_type.

---

## 6. Multifamily Configuration

### tbl_multifamily_unit_type.bedroom_count

**Type:** INTEGER
**Values:**
- 0 (Studio)
- 1
- 2
- 3
- 4
- 5+

**Description:** Number of bedrooms in the unit type.

---

### tbl_multifamily_unit_type.bathroom_count

**Type:** NUMERIC(3,1)
**Common Values:**
- 1.0
- 1.5
- 2.0
- 2.5
- 3.0
- 3.5+

**Description:** Number of bathrooms in the unit type (allows for half-baths).

---

## 7. Lease Configuration

### tbl_lease.lease_type

**Type:** VARCHAR(50)
**Values:**
- Gross
- Modified Gross
- Triple Net (NNN)
- Percentage Rent
- Ground Lease

**Description:** Type of commercial lease structure.

---

### tbl_lease.lease_status

**Type:** VARCHAR(50)
**Values:**
- Active
- Expired
- Month-to-Month
- Proposed
- Terminated

**Description:** Current status of the lease.

---

## 8. Contact Configuration

### tbl_contacts.role

**Type:** VARCHAR(100)
**Values:**
- Owner
- Developer
- Architect
- Engineer
- Contractor
- Lender
- Equity Partner
- Broker
- Consultant
- Attorney
- Appraiser

**Description:** Role of the contact in relation to the project.

---

## 9. Document Configuration

### core_doc.doc_type

**Type:** VARCHAR(50)
**Values:**
- Offering Memorandum
- Rent Roll
- Operating Statement
- Appraisal
- Site Plan
- Financial Model
- Legal Document
- Survey
- Environmental Report
- Other

**Description:** Classification of uploaded documents for AI extraction routing.

---

## 10. Approval Configuration

### tbl_approval.approval_type

**Type:** VARCHAR(100)
**Values:**
- Zoning
- Subdivision Map
- Conditional Use Permit
- Variance
- Design Review
- Environmental (CEQA/NEPA)
- Building Permit
- Grading Permit
- Encroachment Permit

**Description:** Type of government approval or permit required for the project.

---

### tbl_approval.approval_status

**Type:** VARCHAR(50)
**Values:**
- Not Started
- In Progress
- Approved
- Denied
- Appealed
- Expired

**Description:** Current status of the approval process.

---

## Version History

- **2025-10-31**: Initial version created with new analysis_type taxonomy structure
- Migration 013 applied: Restructured project taxonomy to separate analysis type from property use type

---

## Related Documentation

- [Universal Container System](./universal-containers.md)
- [GIS Integration](./gis-integration.md)
- [AI Document Extraction](./02-features/dms/README.md)
- [Land Use Labels Implementation](./LAND_USE_LABELS_IMPLEMENTATION.md)

---

**GZ-5**

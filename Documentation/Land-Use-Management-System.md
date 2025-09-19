# Land Use Management System

## Overview

The Land Use Management System provides a visual interface for managing land use codes within development projects. It supports both flat (direct) and hierarchical (subtype-based) data structures to accommodate different organizational needs and legacy data imports.

## System Architecture

### Data Hierarchy

The system supports two organizational patterns:

```
Pattern 1: Hierarchical Structure
Family → Subtype → Land Use Code
  ↓         ↓         ↓
Residential → SF, LDR → SFD, MF

Pattern 2: Direct Association  
Family → Land Use Code
  ↓         ↓
Open Space → OS, GOLF
```

### Database Tables

- **`landscape.lu_family`** - Land use families (e.g., Residential, Commercial, Open Space)
- **`landscape.lu_subtype`** - Subtypes within families (e.g., Single Family, Low Density Residential)
- **`landscape.tbl_landuse`** - Individual land use codes with optional subtype association
- **`landscape.tbl_parcel`** - Legacy parcel data with `landuse_code` column

## User Interface Components

### Family Cards

Family cards display differently based on their data structure:

#### 🔹 Direct Land Uses Cards
**When**: Family has no subtypes but has direct land use codes  
**Display**:
- "Direct Land Uses:" header
- List of land use codes with descriptions
- Example: Open Space showing "OS - OS" and "GOLF - Golf Course"

#### 🔹 Add Subtype Cards  
**When**: Family has no subtypes and no direct land use codes  
**Display**:
- Central "Add Subtype" button
- Used for empty families that need structure

#### 🔹 Subtype Structure Cards
**When**: Family has subtypes  
**Display**:
- List of subtypes (e.g., "SF - Single Family")
- Land use count for each subtype
- Hover actions: "+ Add Subtype" and "+ Add / Manage Land Uses"
- Example: Residential family with multiple housing types

### Family Color Coding

Each family has a designated color scheme:

- **Residential**: Blue (`bg-blue-600`)
- **Commercial**: Red (`bg-red-600`)
- **Industrial**: Gray (`bg-gray-600`)
- **Open Space**: Green (`bg-green-600`)
- **Common Areas**: Yellow (`bg-yellow-600`)
- **Institutional**: Purple (`bg-purple-600`)
- **Mixed Use**: Indigo (`bg-indigo-600`)
- **Utilities**: Cyan (`bg-cyan-600`)
- **Transportation**: Slate (`bg-slate-600`)

## Legacy Data Integration

### Land Use Match Wizard

The system includes a built-in wizard for mapping legacy parcel data to the structured land use system.

#### Accessing the Wizard
1. Navigate to the Land Use page
2. Click the "🔧 Map Legacy Codes" button in the header
3. The wizard will analyze your project's parcel data

#### Wizard Features

**Automatic Analysis**:
- Compares legacy parcel codes with current system codes
- Identifies unmatched codes requiring attention
- Shows mapping statistics and recommendations

**Mapping Options**:
- **Map to Existing**: Link legacy code to existing system code
- **Create New**: Add the legacy code as a new land use type

**Success Scenarios**:
- If all codes match: Displays "All Land Use Codes Matched!" message
- If mismatches exist: Provides interactive mapping interface

### API Endpoints

#### Analysis Endpoint
```
GET /api/landuse/mapping?action=analyze&project_id=7
```
Returns analysis of legacy vs. current land use codes.

#### Create Mapping
```
POST /api/landuse/mapping
{
  "legacy_code": "GOLF",
  "target_landuse_id": null,
  "create_new": true,
  "new_landuse_data": {
    "name": "Golf Course",
    "landuse_type": "Open Space",
    "description": "Golf course and related facilities"
  }
}
```

## Management Operations

### Adding Land Use Codes

#### Via API
```bash
curl -X POST 'http://localhost:3009/api/landuse/codes' \
  -H 'Content-Type: application/json' \
  -d '{
    "landuse_code": "GOLF",
    "landuse_type": "Open Space", 
    "name": "Golf Course",
    "description": "Golf course and related facilities",
    "active": true,
    "subtype_id": null
  }'
```

#### Via User Interface
1. Use the Land Use Match Wizard for guided creation
2. Or use family card action buttons for structured addition

### Managing Families and Subtypes

#### Creating Subtypes
- Click "Add Subtype" on family cards
- Use hover actions on existing subtype cards
- Subtypes automatically organize land use codes

#### Family Management  
- Families are auto-selected and color-coded
- Toggle family visibility using header tiles
- Each family maintains its own organizational structure

## Best Practices

### Data Organization

**Use Subtypes When**:
- Family has multiple distinct categories (e.g., Residential: SF, MF, Townhome)
- Need detailed classification for analysis
- Managing complex development types

**Use Direct Association When**:
- Simple, single-purpose families (e.g., Open Space: OS, GOLF, PARK)
- Legacy data doesn't require subdivision
- Streamlined classification is preferred

### Legacy Data Migration

1. **Analyze First**: Always run the mapping analysis before making changes
2. **Batch Process**: Use the wizard to handle multiple mappings at once  
3. **Preserve History**: Consider creating new codes rather than modifying existing ones
4. **Validate Results**: Review family cards after mapping to ensure correct display

### Performance Considerations

- **Project-Specific Loading**: System loads only relevant data for the current project
- **Jurisdiction Filtering**: Can filter codes by project jurisdiction when enabled
- **Lazy Loading**: Family cards load content as needed

## Troubleshooting

### Common Issues

**Cards Not Displaying Content**:
- Check if land use codes have correct `subtype_id` associations
- Verify family has either subtypes or direct land use codes
- Ensure codes are marked as `active: true`

**Legacy Codes Missing**:
- Run the Land Use Match Wizard to identify unmatched codes
- Check if parcel `landuse_code` column contains expected values
- Verify family pattern matching in `getDirectFamilyLandUses()` function

**API Errors**:
- Check database schema matches expected table structure
- Ensure jurisdiction filtering parameters are correctly formatted
- Verify POST endpoints exist for creation operations

### Debug Information

Enable development mode to see:
- Family selection states
- API response data
- Component rendering decisions
- Database query results

## Technical Implementation

### Key Components

- **`LandUseSchema.tsx`**: Main page component with family tiles
- **`LandUseCanvas.tsx`**: Card display and interaction logic  
- **`LandUseMatchWizard.tsx`**: Legacy data mapping interface
- **`/api/landuse/mapping/route.ts`**: Analysis and mapping API
- **`/api/landuse/codes/route.ts`**: CRUD operations for land use codes

### Pattern Matching Logic

```typescript
const familyPatterns = {
  'Open Space': ['OS', 'GOLF', 'PARK', 'REC'],
  'Commercial': ['C', 'RET', 'OFF'],  
  'Residential': ['SFD', 'MF', 'HDR', 'MDR', 'MHDR', 'MLDR'],
  'Mixed Use': ['MU']
};
```

This pattern matching enables automatic association of legacy codes with appropriate families.

## Future Enhancements

### Planned Features

- **Drag-and-Drop**: Reorganize land use codes between families/subtypes
- **Bulk Import**: CSV/Excel import for large legacy datasets
- **Custom Families**: User-defined family creation and color schemes
- **Validation Rules**: Enforce business rules for land use assignments
- **Audit Trail**: Track changes to land use mappings over time

### Integration Opportunities

- **GIS Integration**: Link land use codes to mapping systems
- **Financial Modeling**: Connect codes to development cost assumptions
- **Regulatory Compliance**: Map codes to zoning and permitting requirements
- **Reporting**: Generate land use summaries and compliance reports

---

*This documentation reflects the current state of the Land Use Management System as of September 2025. For technical support or feature requests, contact the development team.*
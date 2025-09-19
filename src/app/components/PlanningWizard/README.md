# Planning Wizard

A visual drag-and-drop land development planning interface that replicates ARGUS Developer functionality for master planned communities.

## Features

### 🎯 Visual Canvas System
- **Project Canvas**: Main planning interface with drag-and-drop zones
- **Phase Canvas**: Drill-down view for detailed parcel planning
- **Progressive Disclosure**: Start simple, add complexity as needed

### 🎨 Drag-and-Drop Functionality
- Drag "Areas" from sidebar to create development areas
- Drag "Phases" onto areas to create development phases  
- Drag "Add Parcel" to create individual parcels with land use details
- Visual feedback during drag operations
- Smart drop zone validation

### 📊 Auto-Generated IDs
- Areas: "Area 1", "Area 2", etc.
- Phases: "Phase 1.1", "Phase 1.2", "Phase 2.1", etc.
- Parcels: "Parcel: 1.201", "Parcel: 1.202", etc.

### 🏠 Land Use Types
- **LDR**: Low Density Residential (1-3 units/acre)
- **MDR**: Medium Density Residential (4-8 units/acre) 
- **HDR**: High Density Residential (12-25 units/acre)
- **MHDR**: Very High Density Residential (25+ units/acre)
- **C**: Commercial
- **MU**: Mixed Use
- **OS**: Open Space

### 🎨 Color Coding
- **Areas**: Purple/lavender backgrounds
- **Parcels**: Color-coded by land use type
  - Green shades for residential (lighter = lower density)
  - Red/orange for commercial
  - Blue for open space

## Components

### Core Components
- `PlanningWizard.tsx` - Main container with state management
- `ProjectCanvas.tsx` - Top-level project view with areas and phases
- `PhaseCanvas.tsx` - Detailed view for individual phases and parcels

### UI Components  
- `Sidebar.tsx` - Draggable tiles sidebar
- `DraggableTile.tsx` - Individual draggable elements
- `DropZone.tsx` - Drop target areas with visual feedback

### Forms
- `ParcelForm.tsx` - Modal form for adding parcel details

## Usage

### 1. Access the Planning Wizard
Navigate to the "Planning Wizard" section in the main application navigation.

### 2. Create Areas
- Drag "Areas" from the left sidebar onto the main canvas
- Areas will appear as purple rectangles with auto-generated names

### 3. Add Phases  
- Drag "Phases" from the sidebar onto existing areas
- Phases appear as smaller rectangles within areas
- Naming follows the pattern: Phase 1.1, 1.2, 2.1, etc.

### 4. Drill Down to Phases
- Click on any phase to open the detailed Phase Canvas
- Breadcrumb navigation shows: Project Name › Area Name › Phase Name

### 5. Add Parcels
- In Phase Canvas, drag "Add Parcel" or click the add button
- Fill out the parcel form with:
  - Land use type (auto-calculates density)
  - Acreage
  - Unit count (estimated based on land use)
- Parcels appear as color-coded tiles

### 6. Navigate Back
- Click breadcrumb links to return to project view
- All data is maintained in component state

## Data Structure

```javascript
{
  id: "project-1",
  name: "Project Name", 
  areas: [
    {
      id: "area-1",
      name: "Area 1",
      phases: [
        {
          id: "phase-1-1",
          name: "Phase 1.1", 
          parcels: [
            {
              id: "parcel-1-1-01",
              name: "Parcel: 1.201",
              landUse: "MDR",
              acres: 14.5,
              units: 55
            }
          ]
        }
      ]
    }
  ]
}
```

## Technical Implementation

### Technologies
- **React 18+** with hooks for state management
- **React DnD** for drag-and-drop functionality  
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### State Management
- Built-in React state (no external libraries)
- Hierarchical data structure (Project → Areas → Phases → Parcels)
- Auto-ID generation with consistent naming patterns

### Responsive Design
- Works on desktop and tablet
- Clean, professional ARGUS Developer aesthetic
- Modern flat design with subtle shadows

## Integration Points

### Export/Import
- Project data can be exported as JSON
- Future: Save to PostgreSQL backend
- Future: Import existing project data

### Future Enhancements
- Parcel editing and deletion
- Drag-and-drop reordering
- Phase scheduling and timeline
- Integration with land use lookup tables
- Bulk operations and validation
- Performance optimization for large projects (100+ parcels)

## Development

### File Structure
```
src/app/components/PlanningWizard/
├── PlanningWizard.tsx      # Main component
├── ProjectCanvas.tsx       # Project-level view  
├── PhaseCanvas.tsx         # Phase-level view
├── Sidebar.tsx            # Draggable tiles sidebar
├── DraggableTile.tsx      # Individual drag items
├── DropZone.tsx           # Drop target areas
└── forms/
    └── ParcelForm.tsx     # Parcel details form
```

### Getting Started
1. Install dependencies: `npm install react-dnd react-dnd-html5-backend`
2. Import `PlanningWizard` component 
3. Add to your navigation/routing system
4. Start planning!

## Keyboard Accessibility
- Tab navigation through interactive elements
- Enter/Space to activate buttons and forms
- Escape to close modal forms
- ARIA labels for screen readers
# GIS Foundation Implementation - AI-First Workflow

## Context
Implementing GIS navigation for Landscape land development app using **AI-first document ingestion**. Property packages (site plans + pricing + regulations) are processed by AI to create complete project structures. No data reconciliation complexity - pure creation workflow.

**Database:** `land_v2`  
**Schema:** `landscape`  
**Key Change:** Multi-document AI ingestion replaces complex reconciliation workflow

## Architecture Overview

### Two User Choices
1. **Simple Projects**: Project → Phase → Parcel
2. **Master Plans**: Project → Area → Phase → Parcel  

### Workflow: AI-First Creation
1. User selects tax parcels to define project boundary (MapLibre interface)
2. AI ingests property package (multiple documents: site plans, pricing, regulations)  
3. AI creates complete project hierarchy + parcel geometry
4. Users navigate via interactive map with clickable parcels

### Data Flow
**Tax Parcels** (Maricopa County) → **Project Boundary** → **AI Property Package** → **Plan Parcels** → **Map Navigation**

## Phase 1: Database Schema Migration

### Step 1.1: Execute Migration
Run the updated SQL against Neon `land_v2` database:

```bash
# Execute the AI-first migration
psql $DATABASE_URL -f gis_foundation_ai_first.sql
```

**Critical Changes:**
- Added `parcel_code VARCHAR(20)` to `landscape.tbl_parcel`
- Simplified to pure creation workflow
- Added AI document ingestion tracking
- Added confidence scoring for AI extractions
- Removed complex reconciliation functions

### Step 1.2: Verify Schema
```sql
-- Verify parcel_code field exists
\d landscape.tbl_parcel;

-- Verify new AI functions
SELECT proname FROM pg_proc WHERE proname LIKE '%ai_property_package%';

-- Check document ingestion table
SELECT COUNT(*) FROM landscape.gis_document_ingestion;
```

## Phase 2: API Implementation

### Step 2.1: Property Package Ingestion Endpoint
Create `app/api/ai/ingest-property-package/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await req.json();
    const projectId = Number(body?.projectId);
    const packageName = String(body?.packageName);
    const documents = body?.documents; // AI analysis results
    const userChoice = String(body?.userChoice || 'simple');

    if (!Number.isFinite(projectId)) {
      return Response.json({ error: 'projectId required', requestId }, { status: 400 });
    }
    if (!Array.isArray(documents)) {
      return Response.json({ error: 'documents[] required', requestId }, { status: 400 });
    }

    // Process property package with AI results
    const [result] = await sql`
      SELECT landscape.ingest_ai_property_package(
        ${projectId}::int,
        ${packageName}::text,
        ${JSON.stringify(documents)}::jsonb,
        ${userChoice}::text
      ) as ingestion_result
    `;

    const ingestionResult = result.ingestion_result;

    return Response.json({
      requestId,
      success: (ingestionResult.errors || []).length === 0,
      projectId,
      packageName,
      results: {
        parcels_created: ingestionResult.parcels_created || 0,
        geometry_added: ingestionResult.geometry_added || 0,
        areas_created: ingestionResult.areas_created || 0,
        phases_created: ingestionResult.phases_created || 0,
        errors: ingestionResult.errors || []
      }
    });
  } catch (error: any) {
    console.error('Property package ingestion error:', error);
    return Response.json({ 
      error: error?.message || 'Internal server error', 
      requestId 
    }, { status: 500 });
  }
}
```

### Step 2.2: User Choice Endpoint
Create `app/api/projects/[id]/choose-structure/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = Number(params.id);
    const { choice } = await req.json(); // 'simple' or 'master_plan'

    if (!['simple', 'master_plan'].includes(choice)) {
      return Response.json({ error: 'choice must be "simple" or "master_plan"' }, { status: 400 });
    }

    // Store user choice in project metadata
    await sql`
      UPDATE landscape.tbl_project 
      SET project_metadata = COALESCE(project_metadata, '{}'::jsonb) || jsonb_build_object('structure_choice', ${choice})
      WHERE project_id = ${projectId}
    `;

    return Response.json({
      projectId,
      choice,
      nextStep: choice === 'simple' ? 'select-parcels' : 'select-parcels'
    });
  } catch (error: any) {
    return Response.json({ error: error?.message }, { status: 500 });
  }
}
```

### Step 2.3: Plan Parcels Endpoint (Updated)
Update `app/api/gis/plan-parcels/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get('projectId'));

    if (!Number.isFinite(projectId)) {
      return Response.json({ error: 'projectId required' }, { status: 400 });
    }

    const parcels = await sql`
      SELECT 
        parcel_id,
        parcel_code, 
        landuse_code as land_use,
        acres_gross,
        units_total,
        area_no,
        phase_no,
        parcel_no,
        ST_AsGeoJSON(geom)::json as geometry,
        source_doc,
        confidence
      FROM landscape.vw_map_plan_parcels 
      WHERE project_id = ${projectId}
      ORDER BY parcel_code
    `;

    return Response.json(parcels);
  } catch (error) {
    console.error('Error fetching plan parcels:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Phase 3: User Choice Interface

### Step 3.1: Project Structure Selector
Create `components/setup/ProjectStructureChoice.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface ProjectStructureChoiceProps {
  projectId: number;
  onChoiceSelected: (choice: 'simple' | 'master_plan') => void;
}

export default function ProjectStructureChoice({ 
  projectId, 
  onChoiceSelected 
}: ProjectStructureChoiceProps) {
  const [selectedChoice, setSelectedChoice] = useState<'simple' | 'master_plan' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedChoice) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/choose-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: selectedChoice })
      });

      if (response.ok) {
        onChoiceSelected(selectedChoice);
      }
    } catch (error) {
      console.error('Error saving structure choice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Choose Project Structure</h2>
      <p className="text-gray-600 mb-8">
        Select how you want to organize your land development project:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Simple Structure */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
            selectedChoice === 'simple' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => setSelectedChoice('simple')}
        >
          <div className="flex items-center mb-4">
            <input
              type="radio"
              checked={selectedChoice === 'simple'}
              onChange={() => setSelectedChoice('simple')}
              className="mr-3"
            />
            <h3 className="text-xl font-semibold">Simple Projects</h3>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Project → Phase → Parcel
          </div>
          <div className="text-gray-700">
            Best for smaller developments or single-phase projects. 
            Streamlined hierarchy focuses on parcels within phases.
          </div>
          <div className="mt-4 text-sm text-green-600 font-medium">
            ✓ Faster setup • ✓ Simpler navigation • ✓ Less complexity
          </div>
        </div>

        {/* Master Plan Structure */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
            selectedChoice === 'master_plan' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => setSelectedChoice('master_plan')}
        >
          <div className="flex items-center mb-4">
            <input
              type="radio"
              checked={selectedChoice === 'master_plan'}
              onChange={() => setSelectedChoice('master_plan')}
              className="mr-3"
            />
            <h3 className="text-xl font-semibold">Master Planned Communities</h3>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Project → Area → Phase → Parcel
          </div>
          <div className="text-gray-700">
            For large developments with multiple plan areas. 
            Supports complex hierarchy and area-based phasing.
          </div>
          <div className="mt-4 text-sm text-blue-600 font-medium">
            ✓ Area organization • ✓ Complex phasing • ✓ Enterprise scale
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedChoice || isSubmitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 font-medium"
        >
          {isSubmitting ? 'Saving...' : 'Continue with Structure'}
        </button>
      </div>
    </div>
  );
}
```

## Phase 4: Property Package Upload

### Step 4.1: Property Package Uploader
Create `components/GIS/PropertyPackageUpload.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface PropertyPackageUploadProps {
  projectId: number;
  userChoice: 'simple' | 'master_plan';
  onPackageProcessed: (results: any) => void;
}

export default function PropertyPackageUpload({ 
  projectId, 
  userChoice, 
  onPackageProcessed 
}: PropertyPackageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [processingStep, setProcessingStep] = useState<string>('');

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      if (!packageName && e.target.files.length > 0) {
        // Auto-generate package name from first file
        const firstName = e.target.files[0].name.split('.')[0];
        setPackageName(firstName.replace(/_/g, ' '));
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !packageName) return;

    setIsProcessing(true);
    setProcessingStep('Uploading files...');

    try {
      // Step 1: Upload and analyze files with AI
      const aiResults = [];
      for (const file of files) {
        setProcessingStep(`Processing ${file.name} with AI...`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId.toString());
        formData.append('userChoice', userChoice);

        const analysisResponse = await fetch('/api/ai/analyze-document', {
          method: 'POST',
          body: formData
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          aiResults.push({
            filename: file.name,
            type: determineDocumentType(file.name),
            ai_analysis: analysisResult
          });
        }
      }

      // Step 2: Ingest complete property package
      setProcessingStep('Creating project structure...');
      
      const ingestionResponse = await fetch('/api/ai/ingest-property-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          packageName,
          documents: aiResults,
          userChoice
        })
      });

      if (ingestionResponse.ok) {
        const result = await ingestionResponse.json();
        onPackageProcessed(result);
      } else {
        throw new Error('Package ingestion failed');
      }
    } catch (error: any) {
      console.error('Property package upload error:', error);
      setProcessingStep(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const determineDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('site') || lower.includes('plan')) return 'site_plan';
    if (lower.includes('pricing') || lower.includes('price')) return 'pricing_sheet';
    if (lower.includes('regulation') || lower.includes('code')) return 'regulation_summary';
    return 'other';
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Upload Property Package</h2>
      <p className="text-gray-600 mb-8">
        Upload your complete property package. AI will extract parcel data, pricing, 
        and regulatory information to build your project structure.
      </p>

      <div className="space-y-6">
        {/* Package Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Package Name
          </label>
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Red Valley Ranch Phase 1"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Documents
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFilesSelected}
              className="hidden"
              id="package-upload"
            />
            <label htmlFor="package-upload" className="cursor-pointer">
              <div className="text-gray-500 mb-2">
                Drop files here or click to browse
              </div>
              <div className="text-sm text-gray-400">
                PDF, JPG, PNG files accepted • Site plans, pricing sheets, regulations
              </div>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700">Selected Files:</div>
              {files.map((file, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
              <div className="text-blue-700">{processingStep}</div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || !packageName || isProcessing}
            className="px-8 py-3 bg-green-600 text-white rounded-lg disabled:bg-gray-400 font-medium"
          >
            {isProcessing ? 'Processing...' : 'Process Property Package'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Phase 5: Integration Workflow

### Step 5.1: Main GIS Setup Component
Create `components/GIS/GISSetupWorkflow.tsx`:

```typescript
'use client';

import { useState } from 'react';
import ProjectStructureChoice from '../setup/ProjectStructureChoice';
import ProjectBoundarySetup from './ProjectBoundarySetup';
import PropertyPackageUpload from './PropertyPackageUpload';
import PlanNavigation from './PlanNavigation';

interface GISSetupWorkflowProps {
  projectId: number;
}

type WorkflowStep = 'structure' | 'boundary' | 'package' | 'navigation';

export default function GISSetupWorkflow({ projectId }: GISSetupWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('structure');
  const [userChoice, setUserChoice] = useState<'simple' | 'master_plan' | null>(null);
  const [boundarySet, setBoundarySet] = useState(false);

  const handleStructureChoice = (choice: 'simple' | 'master_plan') => {
    setUserChoice(choice);
    setCurrentStep('boundary');
  };

  const handleBoundarySet = () => {
    setBoundarySet(true);
    setCurrentStep('package');
  };

  const handlePackageProcessed = (results: any) => {
    if (results.success) {
      setCurrentStep('navigation');
    }
  };

  return (
    <div className="h-screen">
      {currentStep === 'structure' && (
        <ProjectStructureChoice
          projectId={projectId}
          onChoiceSelected={handleStructureChoice}
        />
      )}
      
      {currentStep === 'boundary' && (
        <ProjectBoundarySetup
          projectId={projectId}
          onBoundaryConfirmed={handleBoundarySet}
        />
      )}
      
      {currentStep === 'package' && userChoice && (
        <PropertyPackageUpload
          projectId={projectId}
          userChoice={userChoice}
          onPackageProcessed={handlePackageProcessed}
        />
      )}
      
      {currentStep === 'navigation' && (
        <PlanNavigation projectId={projectId} />
      )}
    </div>
  );
}
```

## Success Criteria
- [ ] Database migration adds parcel_code field and AI functions
- [ ] User can choose simple vs master plan structure
- [ ] Tax parcel boundary selection works via MapLibre
- [ ] Multi-document property packages process via AI
- [ ] Plan parcels appear on interactive map for navigation
- [ ] Complete workflow from structure choice to map navigation

## Key Differences from Previous Version
- **Eliminated reconciliation complexity** - pure creation workflow
- **Added user choice** for project structure (simple vs master plan)
- **Multi-document support** for complete property packages
- **AI confidence scoring** for extraction quality
- **Simplified API endpoints** - no conflict resolution needed

RS01

'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Rocket, Settings, Sparkles } from 'lucide-react'
import PathCard from './PathCard'
import AIDocumentPrompt from './AIDocumentPrompt'
import Badge from './Badge'
import type { NewProjectFormData, UploadedDocument } from './types'

type PathSelectionProps = {
  formData: NewProjectFormData
  uploadedDocuments: UploadedDocument[]
  extractionPending: boolean
  onCreateNow: () => void
  onExtendedSetup: () => void
  onAIExtraction: () => void
  onUploadNow: () => void
  onManualEntry: () => void
  hasError?: boolean
}

const PathSelection = ({
  formData,
  uploadedDocuments,
  extractionPending,
  onCreateNow,
  onExtendedSetup,
  onAIExtraction,
  onUploadNow,
  onManualEntry,
  hasError = false
}: PathSelectionProps) => {
  const hasDocuments = uploadedDocuments.length > 0

  return (
    <section
      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Creation path</h3>
        <p className="text-sm text-slate-400">
          Choose how you want to finish setting up <span className="font-semibold text-slate-200">{formData.project_name || 'this project'}</span>.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <PathCard
          icon={<Rocket className="h-8 w-8" />}
          title="Create Project"
          description="Launch with minimum data now and refine from the project tabs."
          action="Create Now"
          onClick={onCreateNow}
          recommended={!hasDocuments}
        />

        <PathCard
          icon={<Settings className="h-8 w-8" />}
          title="Continue Setup"
          description="Walk through additional assumptions before creating the project."
          action="Setup Wizard"
          onClick={onExtendedSetup}
          badge="Coming soon"
          disabled
        />

        <PathCard
          icon={<Sparkles className="h-8 w-8" />}
          title="AI Extraction"
          description="Process uploaded documents and populate the project automatically."
          action="Let AI extract"
          onClick={onAIExtraction}
          disabled={!hasDocuments}
          recommended={hasDocuments}
          badge={hasDocuments ? (extractionPending ? 'Pending extraction' : '~2-3 min') : 'Requires docs'}
        />
      </div>

      <AIDocumentPrompt step={3} final>
        {!hasDocuments ? (
          <div className="flex items-start gap-3 text-amber-200">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-400" />
            <div className="space-y-3 text-slate-200">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">Landscaper recommendation:</p>
                <p className="mt-1 text-sm text-slate-200">
                  You haven&apos;t uploaded any documents yet. You&apos;ll need to manually enter financial data and assumptions.
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Uploading the offering memo now can save 30+ minutes of data entry.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={onUploadNow}>
                  📎 Upload documents now
                </Button>
                <Button type="button" variant="ghost" onClick={onManualEntry}>
                  I&apos;ll enter everything manually
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 text-emerald-200">
            <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
            <div className="space-y-3 text-slate-200">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">Landscaper status:</p>
                <p className="mt-1 text-sm text-slate-200">
                  Documents ready for processing:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {uploadedDocuments.map(doc => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <span>• {doc.filename}</span>
                      {typeof doc.pages === 'number' && (
                        <Badge size="sm" variant="secondary">
                          {doc.pages} pages
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-300">
                  Estimated extraction time: 2-3 minutes.
                </p>
                <p className="text-sm text-slate-300">
                  Landscaper can extract unit mix, rents, expenses, comps, site details, and descriptive copy.
                </p>
              </div>
            </div>
          </div>
        )}
      </AIDocumentPrompt>
    </section>
  )
}

export default PathSelection

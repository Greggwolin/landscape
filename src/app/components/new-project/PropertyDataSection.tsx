'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AIDocumentPrompt from './AIDocumentPrompt'
import type { NewProjectFormData } from './types'
import { Lightbulb } from 'lucide-react'

type PropertyDataSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  onAddDocuments: () => void
  onContinueWithout: () => void
  hasError?: boolean
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs text-rose-400">{message}</p> : null

const PropertyDataSection = ({ form, onAddDocuments, onContinueWithout, hasError = false }: PropertyDataSectionProps) => {
  const {
    register,
    watch,
    formState: { errors }
  } = form

  const developmentType = watch('development_type')
  const scaleMethod = watch('scale_input_method')

  const renderIncomePropertyFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Building size <span className="text-rose-400">*</span>
        </label>
        <p className="text-xs text-slate-400">Provide at least one metric.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Units
            </label>
            <Input
              {...register('total_units')}
              type="number"
              min={1}
              placeholder="113"
              className="mt-1 border-slate-700 bg-slate-900/40 text-slate-100"
            />
          </div>
          <div className="text-center text-xs text-slate-500">— OR —</div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Building Square Feet
            </label>
            <Input
              {...register('building_sf')}
              type="number"
              min={1}
              placeholder="138504"
              className="mt-1 border-slate-700 bg-slate-900/40 text-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500">
            Enter at least one. Both preferred for accurate calculations.
          </p>
        </div>
        <FieldError message={errors.total_units?.message as string} />
        <FieldError message={errors.building_sf?.message as string} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Site size (optional)
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_minmax(90px,120px)]">
          <Input
            {...register('site_area')}
            type="number"
            min={0}
            step="0.01"
            placeholder="1.42"
            className="border-slate-700 bg-slate-900/40 text-slate-100"
          />
          <select
            {...register('site_area_unit')}
            className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="AC">Acres</option>
            <option value="SF">SF</option>
            <option value="SM">SM</option>
          </select>
        </div>
        <FieldError message={errors.site_area?.message as string} />
      </div>
    </div>
  )

  const renderLandDevelopmentFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Total site <span className="text-rose-400">*</span>
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_minmax(110px,150px)]">
          <Input
            {...register('site_area')}
            type="number"
            min={0.01}
            step="0.01"
            placeholder="450"
            className="border-slate-700 bg-slate-900/40 text-slate-100"
          />
          <select
            {...register('site_area_unit')}
            className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="AC">Acres</option>
            <option value="SF">Square Feet</option>
          </select>
        </div>
        <FieldError message={errors.site_area?.message as string} />
      </div>

      <fieldset className="space-y-3 rounded-lg border border-slate-700 p-4">
        <legend className="px-2 text-sm font-semibold text-slate-100">
          Planned development scale <span className="text-rose-400">*</span>
        </legend>

        <label className="flex items-start gap-3 rounded-md border border-transparent p-2 hover:border-blue-500/40">
          <input
            type="radio"
            value="units"
            {...register('scale_input_method')}
            checked={scaleMethod === 'units'}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100">Total Lots / Units</div>
            <Input
              {...register('total_lots_units')}
              type="number"
              min={1}
              placeholder="450"
              className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
            />
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-transparent p-2 hover:border-blue-500/40">
          <input
            type="radio"
            value="density"
            {...register('scale_input_method')}
            checked={scaleMethod === 'density'}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100">Approximate Density</div>
            <Input
              {...register('density')}
              type="number"
              min={0.1}
              step="0.1"
              placeholder="3.2"
              className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">Units per acre</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-transparent p-2 hover:border-blue-500/40">
          <input
            type="radio"
            value="later"
            {...register('scale_input_method')}
            checked={scaleMethod === 'later'}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100">
              Will determine later
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Capture detailed planning assumptions once you are ready.
            </p>
          </div>
        </label>

        <FieldError message={errors.total_lots_units?.message as string} />
        <FieldError message={errors.density?.message as string} />
      </fieldset>
    </div>
  )

  return (
    <section
      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Property data</h3>
        <p className="text-sm text-slate-400">
          Minimum size metrics to populate the project home.
        </p>
      </header>

      {developmentType === 'Income Property'
        ? renderIncomePropertyFields()
        : renderLandDevelopmentFields()}

      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Analysis start date (optional)
        </label>
        <Input
          {...register('analysis_start_date')}
          type="date"
          className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
        />
      </div>

      <AIDocumentPrompt step={2}>
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 text-blue-300" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-200">Landscaper says:</p>
            <p className="mt-1 text-sm text-slate-200">
              "I can help size your project from:"
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              <li>• Rent rolls (gets unit count + mix)</li>
              <li>• Site plans (calculates acreage)</li>
              <li>• Appraisals (captures all building metrics)</li>
            </ul>
            <p className="mt-2 text-sm text-slate-300">
              Upload now or add detailed assumptions later?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onAddDocuments}>
                📎 Add more documents
              </Button>
              <Button type="button" variant="ghost" onClick={onContinueWithout}>
                Continue without
              </Button>
            </div>
          </div>
        </div>
      </AIDocumentPrompt>
    </section>
  )
}

export default PropertyDataSection

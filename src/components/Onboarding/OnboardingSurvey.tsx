'use client';

import { useMemo, useState } from 'react';
import { LandscaperProfile } from '@/services/landscaperProfile';

export interface SurveyAnswers {
  role_primary: 'appraiser' | 'land_developer' | 'cre_investor_multifamily' | '';
  role_property_type: string;
  ai_proficiency: 'expert' | 'comfortable' | 'novice' | 'new' | '';
  communication_tone: 'casual' | 'formal' | '';
  primary_tool: 'argus' | 'excel' | 'both' | 'other' | 'none' | '';
  markets_text: string;
}

const ROLE_OPTIONS = [
  { value: 'appraiser', label: 'Appraiser', description: 'Valuation, comp analysis, and MAI-style reporting' },
  { value: 'land_developer', label: 'Land Developer', description: 'Entitlements, subdivision planning, and feasibility' },
  { value: 'cre_investor_multifamily', label: 'CRE Investor (Multifamily)', description: 'Acquisitions, underwriting, and asset management' },
];

const ROLE_DETAIL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  appraiser: [
    { value: 'multifamily', label: 'Multifamily' },
    { value: 'land_subdivision', label: 'Land / Subdivision' },
  ],
  land_developer: [
    { value: 'entitled_land', label: 'Entitled land' },
    { value: 'raw_land', label: 'Raw land' },
    { value: 'both', label: 'Both' },
  ],
  cre_investor_multifamily: [
    { value: 'value_add', label: 'Value-add' },
    { value: 'core', label: 'Core / Core+' },
    { value: 'opportunistic', label: 'Opportunistic' },
  ],
};

const AI_PROFICIENCY_OPTIONS = [
  { value: 'expert', label: 'Expert — I use custom instructions, projects, and advanced features' },
  { value: 'comfortable', label: 'Comfortable — I’m a regular user' },
  { value: 'novice', label: 'Novice — I’ve tried it a few times' },
  { value: 'new', label: 'New — I’ve never used one' },
];

const PRIMARY_TOOL_OPTIONS = [
  { value: 'argus', label: 'ARGUS' },
  { value: 'excel', label: 'Excel' },
  { value: 'both', label: 'Both equally' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None — I’m new to underwriting' },
];

const TONE_EXAMPLES = [
  {
    tone: 'casual',
    title: 'Casual',
    body:
      "Easy — hit the '+' button in the top nav, give your project a name, and pick whether it's a land deal or multifamily. You can always change the details later, so don't overthink it. Want me to walk you through the first one?",
  },
  {
    tone: 'formal',
    title: 'Formal',
    body:
      "To create a new project, select the '+' icon in the primary navigation bar. You'll be prompted to enter a project name and select the property type (Land Development or Multifamily). Each field can be modified after initial setup. I can provide step-by-step guidance if you'd prefer.",
  },
];

interface OnboardingSurveyProps {
  profile?: LandscaperProfile;
  onComplete: (answers: SurveyAnswers) => Promise<void>;
}

export default function OnboardingSurvey({ profile, onComplete }: OnboardingSurveyProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({
    role_primary: (profile?.role_primary as SurveyAnswers['role_primary']) || '',
    role_property_type: profile?.role_property_type || '',
    ai_proficiency: (profile?.ai_proficiency as SurveyAnswers['ai_proficiency']) || '',
    communication_tone: (profile?.communication_tone as SurveyAnswers['communication_tone']) || '',
    primary_tool: (profile?.primary_tool as SurveyAnswers['primary_tool']) || '',
    markets_text: profile?.markets_text || '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const progress = useMemo(() => Math.round(((step + 1) / 5) * 100), [step]);

  const detailOptions = answers.role_primary ? ROLE_DETAIL_OPTIONS[answers.role_primary] || [] : [];

  const isStepValid = () => {
    switch (step) {
      case 0:
        return answers.role_primary && answers.role_property_type;
      case 1:
        return Boolean(answers.ai_proficiency);
      case 2:
        return Boolean(answers.communication_tone);
      case 3:
        return Boolean(answers.primary_tool);
      case 4:
        return answers.markets_text.trim().length > 0;
      default:
        return false;
    }
  };

  const handleRoleChange = (value: SurveyAnswers['role_primary']) => {
    setAnswers((prev) => ({
      ...prev,
      role_primary: value,
      role_property_type: prev.role_primary === value ? prev.role_property_type : '',
    }));
  };

  const handleNext = async () => {
    if (!isStepValid()) return;
    if (step === 4) {
      setIsSaving(true);
      setError('');
      try {
        await onComplete(answers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save your responses.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
                <p className="text-2xl font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#ffffff' }}>
                Question 1 · Role
              </p>
              <div className="grid gap-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleChange(role.value as SurveyAnswers['role_primary'])}
                    className="rounded-2xl border text-left transition"
                    style={{
                      color: 'var(--text-primary)',
                      borderColor: answers.role_primary === role.value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                      backgroundColor:
                        answers.role_primary === role.value ? 'var(--cui-primary-bg-subtle)' : 'var(--surface-card)',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <span className="font-semibold text-lg">{role.label}</span>
                    <p className="text-sm mt-2 whitespace-normal leading-relaxed" style={{ color: 'var(--cui-secondary-color)' }}>
                      {role.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {detailOptions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  What best describes your focus?
                </p>
                <div className="flex flex-wrap gap-2">
                  {detailOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, role_property_type: option.value }))
                      }
                    className="rounded-full text-sm border transition"
                    style={{
                      color: 'var(--text-primary)',
                      borderColor:
                        answers.role_property_type === option.value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                      backgroundColor:
                        answers.role_property_type === option.value ? 'var(--cui-primary-bg)' : 'transparent',
                      padding: '0.5rem 1rem',
                    }}
                  >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
                <p className="text-2xl font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#ffffff' }}>
              Question 2 · AI experience
            </p>
            <div className="space-y-3">
                {AI_PROFICIENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, ai_proficiency: option.value }))}
                    className="w-full rounded-2xl border text-left transition"
                    style={{
                      color: 'var(--text-primary)',
                      borderColor:
                        answers.ai_proficiency === option.value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                      backgroundColor:
                        answers.ai_proficiency === option.value ? 'var(--cui-primary-bg-subtle)' : 'var(--surface-card)',
                      padding: '0.75rem 1rem',
                    }}
                  >
                  <p className="font-semibold">{option.value.toUpperCase()}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
                <p className="text-2xl font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#ffffff' }}>
              Question 3 · Tone
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {TONE_EXAMPLES.map((tone) => (
                  <button
                    key={tone.tone}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, communication_tone: tone.tone as SurveyAnswers['communication_tone'] }))
                    }
                    className="rounded-2xl border text-left transition"
                    style={{
                      color: 'var(--text-primary)',
                      borderColor:
                        answers.communication_tone === tone.tone ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                      backgroundColor:
                        answers.communication_tone === tone.tone ? 'var(--cui-primary-bg-subtle)' : 'var(--surface-card)',
                      padding: '0.75rem 1rem',
                    }}
                  >
                  <p className="font-semibold mb-2">{tone.title}</p>
                  <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                    {tone.body}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-2xl font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#ffffff' }}>
              Question 4 · Primary tool
            </p>
            <div className="grid gap-3">
              {PRIMARY_TOOL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, primary_tool: option.value }))}
                    className="w-full rounded-2xl border text-left transition"
                    style={{
                      color: 'var(--text-primary)',
                      borderColor:
                        answers.primary_tool === option.value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                      backgroundColor:
                        answers.primary_tool === option.value ? 'var(--cui-primary-bg-subtle)' : 'var(--surface-card)',
                      padding: '0.75rem 1rem',
                    }}
                  >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <p className="text-2xl font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#ffffff' }}>
              Question 5 · Markets
            </p>
            <textarea
              value={answers.markets_text}
              onChange={(e) => setAnswers((prev) => ({ ...prev, markets_text: e.target.value }))}
              rows={4}
              placeholder="e.g., Phoenix, Tucson, Dallas-Fort Worth"
              className="w-full rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--surface-card)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <div className="rounded-3xl border border-line-soft bg-surface-card p-8 shadow-lg" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--cui-secondary-color)' }}>
              Onboarding survey
            </p>
            <p className="text-sm font-semibold">Question {step + 1} of 5</p>
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--cui-secondary-color)' }}>
            {progress}% complete
          </div>
        </div>
        <div
          className="relative h-1 mb-6 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--cui-border-color)' }}
        >
          <span
            className="absolute inset-0"
            style={{ width: `${progress}%`, backgroundColor: 'var(--cui-primary)' }}
          />
        </div>
        {error && (
          <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ color: 'var(--track-change-deletion)', borderColor: 'var(--track-change-deletion)' }}>
            {error}
          </div>
        )}
        {renderStep()}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || isSaving}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--cui-border-color)',
              color: 'var(--text-primary)',
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || isSaving}
            className="rounded-full px-5 py-2 text-sm font-semibold transition"
            style={{
              backgroundColor: !isStepValid() || isSaving ? 'var(--line-soft)' : 'var(--cui-primary)',
              color: 'var(--text-inverse)',
            }}
          >
            {step === 4 ? (isSaving ? 'Saving...' : 'Complete survey') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

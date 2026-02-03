'use client';

import { useEffect, useState } from 'react';
import { OnboardingSurvey, OnboardingChat, SurveyAnswers } from '@/components/Onboarding';
import {
  compileLandscaperInstructions,
  fetchLandscaperProfile,
  LandscaperProfile,
  updateLandscaperProfile,
} from '@/services/landscaperProfile';

export default function LandingOnboardingPage() {
  const [profile, setProfile] = useState<LandscaperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await fetchLandscaperProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const refreshProfile = async () => {
    try {
      const data = await fetchLandscaperProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSurveyComplete = async (answers: SurveyAnswers) => {
    setLoading(true);
    setError('');
    try {
      await updateLandscaperProfile({
        ...answers,
        survey_completed_at: new Date().toISOString(),
      });
      await compileLandscaperInstructions();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save survey responses.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cui-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
        <p style={{ color: 'var(--text-primary)' }}>
          {error || 'Unable to load onboarding content.'}
        </p>
      </div>
    );
  }

  const needsSurvey = !profile.survey_completed_at;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      {needsSurvey ? (
        <OnboardingSurvey profile={profile} onComplete={handleSurveyComplete} />
      ) : (
        <div className="flex min-h-screen">
          <div className="flex-1">
            <OnboardingChat profile={profile} onProfileRefresh={refreshProfile} />
          </div>
        </div>
      )}
    </div>
  );
}

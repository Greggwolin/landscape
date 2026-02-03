'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLandscaperProfile,
  fetchLandscaperProfile,
} from '@/services/landscaperProfile';

export default function LoginForm() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !redirecting) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, redirecting, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tosAccepted) {
      setError('Please accept the Terms of Service before logging in.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login({ username, password });
      await createLandscaperProfile({ tos_accepted_at: new Date().toISOString() });
      const isAdmin = result.user?.role === 'admin';
      if (isAdmin) {
        setRedirecting(true);
        router.push('/dashboard');
        return;
      }
      const profile = await fetchLandscaperProfile();
      const target = profile.survey_completed_at ? '/dashboard' : '/onboarding';
      setRedirecting(true);
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        color: 'var(--cui-body-color)',
      }}
    >
      <div
        className="w-full md:w-2/5 flex flex-col justify-center px-6 py-10"
        style={{ backgroundColor: 'var(--surface-card)' }}
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-invert.png"
            alt="Landscape"
            width={260}
            height={70}
            priority
          />
        </div>
        <div
          className="rounded-3xl border border-line-soft shadow-2xl p-8"
          style={{ backgroundColor: 'var(--surface-card-header)' }}
        >
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Sign in to Alpha
          </h2>
          {error && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--chip-soft-costs-bg)', color: 'var(--track-change-deletion)' }}
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Enter your username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div />
              <Link
                href="/forgot-password"
                className="text-xs font-medium"
                style={{ color: 'var(--cui-primary)' }}
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !tosAccepted}
              className="w-full rounded-xl px-4 py-3 font-semibold transition"
              style={{
                backgroundColor: isSubmitting || !tosAccepted ? 'var(--line-soft)' : 'var(--cui-primary)',
                color: 'var(--text-inverse)',
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg
                    className="h-4 w-4 text-current animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <div className="mt-6 rounded-2xl border p-4 md:hidden" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--surface-card)' }}>
            <label className="flex items-center text-sm gap-3" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="h-4 w-4 rounded border"
                style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--surface-bg)' }}
              />
              <span>
                I accept the{' '}
                <Link href="/terms" className="font-medium" style={{ color: 'var(--cui-primary)' }}>
                  Alpha Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium" style={{ color: 'var(--cui-primary)' }}>
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <p className="text-xs mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
              These documents explain how Landscape keeps your insights private during onboarding.
            </p>
          </div>
          <p className="mt-6 text-xs text-center" style={{ color: 'var(--cui-secondary-color)' }}>
            Need an account?{' '}
            <Link href="/register" className="font-medium" style={{ color: 'var(--cui-primary)' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
      <div
        className="hidden md:flex w-full md:w-3/5 flex-col justify-center px-10 py-14 space-y-8"
        style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
      >
        <div>
          <p className="text-sm uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
            Alpha experience
          </p>
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            A better Landscaper onboarding
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--cui-secondary-color)' }}>
            We pair you with a calibrated Landscaper assistant, tailored to your role, tone, and tooling.
            Your onboarding answers map directly to how the chat introduces itself, suggests documents, and
            keeps confidential insights locked to your private workspace.
          </p>
        </div>
        <div className="rounded-2xl border border-line-soft p-6 space-y-3" style={{ backgroundColor: 'var(--surface-card)' }}>
          <div className="flex items-start gap-3">
            <input
              id="tos"
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--surface-bg)' }}
            />
            <label htmlFor="tos" className="text-sm" style={{ color: 'var(--text-primary)' }}>
              I accept the{' '}
              <Link href="/terms" className="font-medium" style={{ color: 'var(--cui-primary)' }}>
                Alpha Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium" style={{ color: 'var(--cui-primary)' }}>
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            These documents will appear during sign in so you always know how Landscape keeps your insights private.
          </p>
        </div>
      </div>
    </div>
  );
}

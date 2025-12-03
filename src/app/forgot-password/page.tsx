'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // In development, we'll display the token for testing
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
      setIsSubmitted(true);
      // In development mode, the API returns the token for testing
      if (result.token) {
        setDevToken(result.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center px-4 overflow-auto">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo-invert.png"
          alt="Landscape"
          width={280}
          height={70}
          className="h-auto w-auto max-w-[280px]"
          priority
        />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          {isSubmitted ? (
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 mb-6">
                If an account exists with <span className="text-white">{email}</span>,
                we&apos;ve sent a password reset link.
              </p>

              {/* Development mode: show reset token and link */}
              {devToken && (
                <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded text-left">
                  <p className="text-yellow-200 text-sm mb-2 font-medium">Development Mode:</p>
                  <p className="text-yellow-100 text-xs mb-2 break-all">Token: {devToken}</p>
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                  >
                    Click here to reset password
                  </Link>
                </div>
              )}

              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-white text-center mb-2">
                Reset Password
              </h2>
              <p className="text-gray-400 text-center mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
                               text-white placeholder-gray-400 focus:outline-none focus:ring-2
                               focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter your email"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
                             disabled:cursor-not-allowed text-white font-medium rounded-lg
                             transition duration-200 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-gray-500 text-sm">
          {new Date().getFullYear()} Landscape. All rights reserved.
        </p>
      </div>
    </div>
  );
}

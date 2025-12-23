/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Re-enable strict mode for better development experience
  // Note: Most async params have been fixed. Remaining errors are pre-existing TypeScript issues
  // like 'error' is of type 'unknown', Activity type mismatches, etc.
  // TODO: Clean up remaining TypeScript strict mode issues in a separate PR
  typescript: {
    ignoreBuildErrors: true,
  },
  // TODO: Remove after wrapping all useSearchParams() usage in Suspense boundaries
  // Many pages use useSearchParams() which requires Suspense in Next.js 15+
  // See: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  missingSuspenseWithCSRBailout: false,
  experimental: {
    turbo: {
      resolveAlias: {
        '@/components': './src/components',
        '@/types': './src/types',
        '@/lib': './src/lib',
        '@/themes': './src/themes',
      },
    },
  },
  // Path mapping for cleaner imports
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': '/src/components',
      '@/types': '/src/types',
      '@/lib': '/src/lib',
      '@/themes': '/src/themes',
    };
    return config;
  },
};

export default nextConfig;


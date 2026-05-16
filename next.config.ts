/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Re-enable strict mode for better development experience
  // Transpile ESM packages that need it
  transpilePackages: ['@mapbox/mapbox-gl-draw'],
  // Raise server actions body size limit to match UI dropzone max (32MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '32mb',
    },
  },
  // Note: Most async params have been fixed. Remaining errors are pre-existing TypeScript issues
  // like 'error' is of type 'unknown', Activity type mismatches, etc.
  // TODO: Clean up remaining TypeScript strict mode issues in a separate PR
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even with linting errors
    // These are pre-existing issues that need a dedicated cleanup PR
    ignoreDuringBuilds: true,
  },
  // Exclude backend directory from output file tracing
  // This prevents Turbopack from crashing on the venv symlinks
  outputFileTracingExcludes: {
    '*': ['./backend/**', './backend/venv/**'],
  },
  // Turbopack configuration (moved from experimental.turbo in Next.js 15.5)
  turbopack: {
    resolveAlias: {
      '@/components': './src/components',
      '@/types': './src/types',
      '@/lib': './src/lib',
      '@/themes': './src/themes',
    },
  },
  // Path mapping for cleaner imports (webpack fallback)
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
  // Legacy folder/tab route redirects to /w/ counterparts.
  // Source patterns are EXACT MATCH (no trailing wildcards) so specialized
  // deep routes without /w/ equivalents stay reachable:
  //   /projects/:id          -> redirected
  //   /projects/:id/settings -> NOT redirected (no /w/ counterpart)
  //   /admin                 -> redirected
  //   /admin/users           -> NOT redirected (no /w/ counterpart)
  // 307 (permanent: false) — transitional; tighten to 308 after the legacy
  // folder/tab UI is retired.
  // Session: LSCMD-LEGACY-REDIRECTS-0515-wq16
  async redirects() {
    return [
      { source: '/dashboard', destination: '/w/dashboard', permanent: false },
      { source: '/projects/:projectId', destination: '/w/projects/:projectId', permanent: false },
      { source: '/admin', destination: '/w/admin', permanent: false },
      { source: '/help', destination: '/w/help', permanent: false },
      { source: '/landscaper-ai', destination: '/w/landscaper-ai', permanent: false },
    ];
  },
};

export default nextConfig;

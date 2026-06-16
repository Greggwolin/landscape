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
  // TypeScript build errors are now ENFORCED (the ~1,040-error backlog was burned
  // down in #43). `next build` fails on type errors; CI also runs `npm run typecheck`.
  // The only two known-deferred items carry tracked `TODO(#43)` suppressions.
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
  //   /projects/:id          -> handled in middleware.ts (cookie-gated, see below)
  //   /projects/:id/settings -> NOT redirected (no /w/ counterpart)
  //   /admin                 -> redirected
  //   /admin/users           -> NOT redirected (no /w/ counterpart)
  // 307 (permanent: false) — transitional; tighten to 308 after the legacy
  // folder/tab UI is retired.
  //
  // NOTE: /projects/:projectId is deliberately NOT here. next.config redirects
  // run BEFORE middleware and cannot read the ui_mode cookie, so the classic-view
  // toggle (Session: LSCMD-DUALUI-0616-ec7) moved that redirect into
  // src/middleware.ts where the cookie is readable. The remaining entries have
  // no per-user conditionality and stay static.
  // Session: LSCMD-LEGACY-REDIRECTS-0515-wq16
  async redirects() {
    return [
      { source: '/dashboard', destination: '/w/dashboard', permanent: false },
      { source: '/admin', destination: '/w/admin', permanent: false },
      { source: '/help', destination: '/w/help', permanent: false },
      { source: '/landscaper-ai', destination: '/w/landscaper-ai', permanent: false },
    ];
  },
};

export default nextConfig;

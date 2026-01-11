'use client';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import nextDynamic from 'next/dynamic';

/**
 * Import existing page components dynamically
 * This avoids refactoring existing pages - we just import and render them
 * Note: Cost Library and Benchmarks have moved to /admin routes
 */
const ProductLibraryPage = nextDynamic(() => import('@/app/benchmarks/products/page'), {
  ssr: false,
});
const TaxonomyPage = nextDynamic(() => import('@/app/settings/taxonomy/page'), {
  ssr: false,
});

/**
 * Global Preferences Page
 *
 * Unified page for global/reference data management
 * Uses query parameter routing (?tab=products|taxonomy)
 * Default tab is 'products' (Product Library)
 *
 * Note: Cost Library moved to /admin/benchmarks/cost-library
 * Note: Benchmarks moved to /admin/benchmarks
 */
function PreferencesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  // Redirect old tabs to new locations
  useEffect(() => {
    if (activeTab === 'unit-costs') {
      router.replace('/admin/benchmarks/cost-library');
      return;
    }
    if (activeTab === 'benchmarks') {
      router.replace('/admin/benchmarks');
      return;
    }
    // Redirect to default tab if none specified
    if (!activeTab) {
      router.replace('/preferences?tab=products');
    }
  }, [activeTab, router]);

  // Show nothing while redirecting
  if (!activeTab || activeTab === 'unit-costs' || activeTab === 'benchmarks') {
    return null;
  }

  return (
    <>
      {activeTab === 'products' && <ProductLibraryPage />}
      {activeTab === 'taxonomy' && <TaxonomyPage />}
    </>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>}>
      <PreferencesPageContent />
    </Suspense>
  );
}

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

/**
 * Import existing page components dynamically
 * This avoids refactoring existing pages - we just import and render them
 */
const GlobalBenchmarksPage = dynamic(() => import('@/app/admin/benchmarks/page'), {
  ssr: false,
});
const UnitCostsPage = dynamic(() => import('@/app/benchmarks/unit-costs/page'), {
  ssr: false,
});
const ProductLibraryPage = dynamic(() => import('@/app/benchmarks/products/page'), {
  ssr: false,
});
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), {
  ssr: false,
});

/**
 * Global Preferences Page
 *
 * Unified page for all global/reference data management
 * Uses query parameter routing (?tab=unit-costs|products|taxonomy|benchmarks)
 * Default tab is 'unit-costs' (Cost Library)
 */
export default function PreferencesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  // Redirect to default tab if none specified
  useEffect(() => {
    if (!activeTab) {
      router.replace('/preferences?tab=unit-costs');
    }
  }, [activeTab, router]);

  // Show nothing while redirecting
  if (!activeTab) {
    return null;
  }

  return (
    <>
      {activeTab === 'benchmarks' && <GlobalBenchmarksPage />}
      {activeTab === 'unit-costs' && <UnitCostsPage />}
      {activeTab === 'products' && <ProductLibraryPage />}
      {activeTab === 'taxonomy' && <TaxonomyPage />}
    </>
  );
}

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

/**
 * Import existing page components dynamically
 * This avoids refactoring existing pages - we just import and render them
 * Note: Cost Library and Benchmarks have moved to /admin routes
 */
const ProductLibraryPage = dynamic(() => import('@/app/benchmarks/products/page'), {
  ssr: false,
});
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), {
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
export default function PreferencesPage() {
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

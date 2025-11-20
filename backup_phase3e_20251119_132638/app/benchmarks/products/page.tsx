import ProductLibraryPanel from '@/components/benchmarks/products/ProductLibraryPanel';

export default function ProductsPage() {
  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border overflow-hidden">
        <ProductLibraryPanel />
      </div>
    </div>
  );
}

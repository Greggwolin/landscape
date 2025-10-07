'use client';

import Link from 'next/link';

interface MissingCoreUIProps {
  branch?: string;
}

const CoreUIShellPlaceholder: React.FC<MissingCoreUIProps> = ({ branch = 'feature/coreui-prototype' }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-gray-700 p-10 text-center">
      <div className="text-6xl">🧪</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">CoreUI prototype lives on another branch</h2>
        <p className="text-muted-foreground">
          Checkout the <code>{branch}</code> branch locally to try the full CoreUI shell.
          Once that branch is present, this entry will automatically render the real experience.
        </p>
      </div>
      <div className="space-x-4">
        <Link
          href="https://github.com/Greggwolin/landscape/tree/feature/coreui-prototype"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
          target="_blank"
          rel="noreferrer"
        >
          View branch on GitHub
        </Link>
        <span className="text-sm text-muted-foreground">
          git fetch origin {branch} && git checkout {branch}
        </span>
      </div>
    </div>
  );
};

export default CoreUIShellPlaceholder;

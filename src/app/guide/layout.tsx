import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Guide — Landscape',
  description: 'Landscape platform user guide and documentation',
};

/**
 * Guide Layout
 *
 * Minimal layout — no folder tabs, no Landscaper panel.
 * NavigationLayout (top nav + auth) is provided by the root layout.
 * Full-height so the guide shell fills the viewport.
 */
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

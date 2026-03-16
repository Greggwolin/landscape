import GuideClient from './GuideClient';

/**
 * User Guide Route — /guide
 *
 * Auth is enforced by AuthProvider at the root layout level.
 * NavigationLayout wraps this page automatically via RootLayout.
 */
export default function GuidePage() {
  return <GuideClient />;
}

import { redirect } from 'next/navigation';

/**
 * Wrapper root — redirects to the Projects page.
 */
export default function WrapperRootPage() {
  redirect('/w/projects');
}

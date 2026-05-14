import { redirect } from 'next/navigation';

/**
 * Wrapper root — redirects to the user dashboard.
 *
 * Phase 1 of LF-USERDASH-0514: the chat-forward UI's authenticated landing
 * is /w/dashboard, not the project list. The Projects surface is still
 * reachable via the sidebar.
 */
export default function WrapperRootPage() {
  redirect('/w/dashboard');
}

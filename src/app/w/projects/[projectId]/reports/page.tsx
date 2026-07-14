/**
 * Legacy per-project reports route — inert stub.
 *
 * The parent layout (`../layout.tsx`) redirects every /w/projects/[id]* path
 * into /studio/[id] and returns null without rendering children, so nothing
 * here ever mounts. Reports now live at /studio/[id]?folder=reports.
 *
 * This file must still EXIST: a route segment without a page.tsx doesn't match
 * in the App Router, so deleting it would 404 cached /w/projects/[id]/reports
 * URLs instead of redirecting them. The file is the route; the layout is the
 * behavior.
 *
 * Its previous body called useWrapperProject() and passed the project to
 * ReportsTab. WrapperProjectProvider is mounted ONLY in studio/[projectId]/
 * layout.tsx, so that hook would have thrown the moment this page mounted —
 * a latent crash surviving only behind the redirect. Gutting the body removes
 * the trap rather than leaving it armed for whoever revives this route.
 * See DB1 (PR #164) for the same defect caught live on /w/dashboard.
 */
export default function WrapperReportsPage() {
  return null;
}

/**
 * Legacy per-project map route — inert stub.
 *
 * The parent layout (`../layout.tsx`) redirects every /w/projects/[id]* path
 * into /studio/[id] and returns null without rendering children, so nothing
 * here ever mounts. The map now lives at /studio/[id]?folder=map, which mounts
 * the same MapTab — no capability is lost by emptying this file.
 *
 * This file must still EXIST: a route segment without a page.tsx doesn't match
 * in the App Router, so deleting it would 404 cached /w/projects/[id]/map URLs
 * instead of redirecting them. The file is the route; the layout is the
 * behavior.
 *
 * Its previous body called useWrapperProject() + useWrapperProjectRefetch() and
 * adapted the project into MapTab's Project shape. WrapperProjectProvider is
 * mounted ONLY in studio/[projectId]/layout.tsx, so that hook would have thrown
 * the moment this page mounted — a latent crash surviving only behind the
 * redirect. Gutting the body removes the trap rather than leaving it armed for
 * whoever revives this route.
 * See DB1 (PR #164) for the same defect caught live on /w/dashboard.
 */
export default function WrapperMapPage() {
  return null;
}

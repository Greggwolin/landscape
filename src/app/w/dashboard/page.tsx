'use client';

/**
 * /w/dashboard — authenticated landing route for the chat-forward UI.
 *
 * The route's center surface is rendered by UserDashboard via the route-aware
 * swap in `src/app/w/layout.tsx` (CenterChatPanel is replaced by UserDashboard
 * when pathname matches /w/dashboard). This page renders nothing — the layout
 * handles the column.
 *
 * The empty render is intentional. Treating /w/dashboard as a chat-like route
 * (wrapper-main hidden, CenterChatPanel-column owned by UserDashboard) keeps
 * the dashboard from competing with the existing chat empty state and avoids
 * a 3rd panel of content on a launcher-only surface.
 *
 * Phase 1 scope: layout shell + recent chats. Phase 3 wires real prompt
 * submission. Phase 4 adds the new-project staging flow. Phase 5 adds
 * platform navigation tools.
 */
export default function WrapperDashboardPage() {
  return null;
}

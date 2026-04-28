// Selector inventory for the unified-UI suite. Centralized so a single
// classname/route change rolls into one place rather than every spec.
//
// The codebase doesn't use `data-testid` — selectors are class names, ids,
// or roles. When the components add testids in the future, this file is
// the migration point.

export const selectors = {
  // ── Login (/login) ──────────────────────────────────────────────────
  // Refs: src/app/login/LoginForm.tsx
  login: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: 'form button[type="submit"]',
    errorMessage: 'form >> .. >> div.rounded-lg.text-sm', // best-effort
  },

  // ── Sidebar (always present on /w/* routes) ──────────────────────────
  // Refs: src/components/wrapper/WrapperSidebar.tsx
  sidebar: {
    root: '.wrapper-sidebar',
    newChatButton: '.sb-new-chat-stub',
    searchButton: '.sb-search',
    threadsSection: '.sb-section', // there are multiple — narrow per test
    threadItem: '.sb-thread',
    threadDot: '.sb-thread-dot',
    activeThreadDot: '.sb-thread-dot.active',
    seeMoreButton: '.sb-thread-more',
  },

  // ── Center chat panel ───────────────────────────────────────────────
  // Refs: src/components/wrapper/CenterChatPanel.tsx +
  //       src/components/landscaper/LandscaperChatThreaded.tsx
  centerChat: {
    root: '.wrapper-chat-center',
    body: '.wrapper-chat-body',
    headerTitle: '.wrapper-header-title',
    // The chat input lives inside LandscaperChatThreaded (mounted inside the
    // center panel). It's a textarea — there's only one in the panel scope.
    textarea: '.wrapper-chat-center textarea',
    sendButton: '.wrapper-chat-center button:has-text("Send")',
    // Loading state during initializeThread() — covers the 23:07 spinner
    loadingMarker: '.wrapper-chat-center :text("Loading conversation")',
  },

  // ── Right artifact panel ────────────────────────────────────────────
  // Refs: src/app/w/layout.tsx + src/components/wrapper/ProjectArtifactsPanel.tsx
  artifacts: {
    panelExpanded: '.artifacts-panel',
    panelCollapsed: '.artifacts-collapsed',
    expandButton: '.artifacts-expand-btn',
    dragHandle: '.wrapper-drag-handle',
  },

  // ── Common ──────────────────────────────────────────────────────────
  common: {
    // Generic toast/error banner (Cowork CSS conventions vary; best-effort).
    errorBanner: 'text=/Request timed out|Error|Failed/i',
  },
};

export type Selectors = typeof selectors;

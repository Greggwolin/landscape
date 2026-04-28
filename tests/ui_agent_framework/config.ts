// Centralized config for the UI E2E suite. Loaded by every spec/helper.
//
// Credentials: `admin` / `admin123` per backend/CLAUDE.md. The admin user
// is the safest default — it has data (threads, projects) and the role=admin
// branch in LoginForm redirects directly to /dashboard, skipping onboarding.
//
// Replace with a dedicated `ui_test` user if/when one is provisioned.

export const config = {
  baseURL: 'http://localhost:3000',
  djangoURL: 'http://localhost:8000',

  credentials: {
    username: 'admin',
    password: 'admin123',
  },

  // After successful login, role=admin lands here. Non-admin would land
  // on /onboarding (skipped for our tests).
  postLoginRoute: '/dashboard',

  // Routes under test
  routes: {
    login: '/login',
    chat: '/w/chat',
    project: (id: number | string) => `/w/projects/${id}`,
    chatThread: (uuid: string) => `/w/chat/${uuid}`,
  },

  // Timeouts (ms). Tuned against today's observed timings.
  timeouts: {
    pageLoad: 10_000,
    sidebarPopulate: 30_000,
    aiReply: 30_000,
    threadAutoName: 60_000,
    artifactRender: 30_000,
  },

  // Test message we send for first-message scenarios. Chosen to be:
  // - short enough that auto-naming should produce a sensible title
  // - distinct enough that we can substring-match against the resulting title
  testMessages: {
    firstMessage: 'Hello from S-UI-3 — confirm thread creation',
    t12Request: 'show me the T-12 operating statement',
  },
};

export type AppConfig = typeof config;

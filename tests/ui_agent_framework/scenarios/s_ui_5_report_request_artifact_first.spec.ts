// S-UI-5 — Report request: artifact-first, modal-as-fallback.
//
// Per Gregg's correction (4): the artifact is the PRIMARY flow, not the
// modal. The four-tier hierarchy is:
//   1. Project with full DB → artifact rendered from DB
//   2. Project with empty DB but populated DMS → artifact extracted from docs
//   3. Project with neither → explicit "I don't have enough information"
//      message; NO artifact, NO modal, NO fabrication
//   4. User explicitly asks for the modal → modal opens
//
// Plus an anti-fabrication test that simulates today's finding #10:
// Brownstone-named doc misattached to a Chadron-like project. The expected
// behavior is to either flag the mismatch or fall through to Tier 3.
// Currently expected to fail — the AI behavior fix has not shipped.
//
// All four tier tests are currently marked test.fail() because the design
// is aspirational — today's session showed Landscaper produces prose, not
// artifacts, for natural-language report requests. The tests document the
// intended behavior and fail until the artifact-first dispatcher lands.

import { test, expect } from '../helpers/fixtures';
import { config } from '../config';
import { selectors } from '../helpers/selectors';
import { gotoProject } from '../helpers/navigation';
import { sendMessage, expectReplyRendered } from '../helpers/chat';

const T12_REQUEST = config.testMessages.t12Request;

// Project ids — these are the local dev DB's known fixtures. Adjust as the
// test data evolves. Today (2026-04-27) project_id=17 is the active Chadron
// Terrace MF project that has full DB data populated.
const PROJECT_FULL_DB = 17;

test.describe('S-UI-5: Report request — artifact-first, modal-as-fallback', () => {
  // ── Tier 1: full DB → artifact ──
  test.fail(
    'Tier 1: project with full DB renders artifact from DB (currently fails — finding #4)',
    async ({ authedPage }) => {
      const { page } = authedPage;
      await gotoProject(page, PROJECT_FULL_DB);

      await sendMessage(page, T12_REQUEST);
      await expectReplyRendered(page, T12_REQUEST, config.timeouts.aiReply);

      // Artifact panel should render an HTML artifact (T-12 statement) within
      // the artifact-render budget. This currently fails because Landscaper
      // produces prose in chat, not an artifact.
      const artifact = page.locator(selectors.artifacts.panelExpanded);
      await expect(artifact).toBeVisible({ timeout: config.timeouts.artifactRender });

      // Artifact should contain populated DB values — sanity-check via any
      // numeric-looking content. (Specific values depend on fixture state.)
      await expect(artifact).toContainText(/\$|NOI|Operating|Revenue/i);
    },
  );

  // ── Tier 2: DMS-only → extracted artifact ──
  test.fail(
    'Tier 2: empty DB but populated DMS renders artifact extracted from docs (not yet implemented)',
    async () => {
      // No reliable empty-DB-with-DMS fixture exists yet. Test will need a
      // dedicated fixture project once the team designates one.
      // Documented placeholder so the gap is visible in the suite output.
      throw new Error('No fixture project for Tier 2 yet — designate one and update PROJECT_DMS_ONLY const');
    },
  );

  // ── Tier 3: neither → explicit "not enough info" ──
  test.fail(
    'Tier 3: empty project renders explicit "not enough info" + no fabrication (currently fails — finding #4)',
    async () => {
      // Same fixture-gap caveat as Tier 2. Test documents intent; needs a
      // fully-empty fixture project to actually run.
      throw new Error('No fixture project for Tier 3 yet — need a project with no DB rows + no DMS docs');
    },
  );

  // ── Tier 4: explicit modal request ──
  test.fail(
    'Tier 4: user explicitly requests modal → modal opens (currently fails — finding #4)',
    async ({ authedPage }) => {
      const { page } = authedPage;
      await gotoProject(page, PROJECT_FULL_DB);

      await sendMessage(page, 'open the operating statement input modal');
      await expectReplyRendered(page, 'operating statement input modal', config.timeouts.aiReply);

      // A modal in CoreUI/shadcn pattern is typically role=dialog. Accept any.
      await expect(page.locator('[role="dialog"]')).toBeVisible({
        timeout: config.timeouts.artifactRender,
      });
    },
  );

  // ── Anti-fabrication test (finding #10) ──
  test.fail(
    'anti-fabrication: mismatched-name doc does NOT get scaled into the answer (currently fails — finding #10)',
    async ({ authedPage }) => {
      const { page } = authedPage;
      await gotoProject(page, PROJECT_FULL_DB);

      await sendMessage(page, T12_REQUEST);
      await expectReplyRendered(page, T12_REQUEST, config.timeouts.aiReply);

      // The reply must NOT contain "scaled" / "extrapolated" / "Brownstone"
      // when the user asked for Chadron's T-12. Today's session produced
      // exactly this fabrication pattern.
      const replyText = await page.locator('.wrapper-chat-body').innerText();
      expect(replyText).not.toMatch(/\bscaled\b/i);
      expect(replyText).not.toMatch(/\bextrapolat/i);
      expect(replyText).not.toMatch(/Brownstone Apartments \(Chadron Terrace\)/i);
    },
  );
});

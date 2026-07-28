/**
 * Unit tests for thread-destination derivation (LSCMD-THREADDEST-0728-TA).
 *
 * These cover the pure decision points: given a tool result, what (if
 * anything) should reopening the thread put back on screen. The restoration
 * itself is panel + router work and is visual-gated.
 *
 * The cases that matter most are the NEGATIVE ones. Writing a destination that
 * cannot be acted on is worse than writing none — it makes reopen look broken
 * instead of intentionally inert — and roughly nine threads in ten are
 * expected to have no destination at all.
 */

import {
  artifactHostRoute,
  deriveDestination,
  destinationFromPageContext,
  isThreadDestination,
  routeShowsArtifacts,
  screenKeyFromRoute,
} from './threadDestination';

const NOW = () => '2026-07-28T12:00:00.000Z';
const PROJECT = 9;

describe('deriveDestination — things the chat MADE', () => {
  it('a generic artifact result points at the artifact', () => {
    const d = deriveDestination(
      'get_budget_schedule',
      { action: 'show_artifact', artifact_id: 412, title: 'Budget' },
      PROJECT,
      NOW,
    );
    expect(d).toEqual({
      kind: 'artifact',
      artifactId: 412,
      tool: 'get_budget_schedule',
      label: 'Budget',
      at: NOW(),
    });
  });

  it('open_clarification is found even though its artifact is nested', () => {
    // The generic top-level artifact_id check never sees this shape, which is
    // exactly why handleToolResult carries a dedicated branch for it.
    const d = deriveDestination(
      'open_clarification',
      { artifact_created: true, artifact: { artifact_id: 77 } },
      PROJECT,
      NOW,
    );
    expect(d).toMatchObject({ kind: 'artifact', artifactId: 77 });
  });

  it('a location brief restores through the ordinary artifact path', () => {
    const d = deriveDestination(
      'generate_location_brief',
      { action: 'show_location_brief', location_brief_config: {}, artifact_id: 88 },
      PROJECT,
      NOW,
    );
    expect(d).toMatchObject({ kind: 'artifact', artifactId: 88 });
  });

  it('show_artifact WITHOUT a usable id yields nothing, not a dead pointer', () => {
    expect(
      deriveDestination('create_artifact', { action: 'show_artifact' }, PROJECT, NOW),
    ).toBeNull();
    expect(
      deriveDestination(
        'create_artifact',
        { action: 'show_artifact', artifact_id: 'not-a-number' },
        PROJECT,
        NOW,
      ),
    ).toBeNull();
  });

  it('rejects non-positive and non-integer ids', () => {
    for (const bad of [0, -3, 1.5, null, undefined]) {
      expect(
        deriveDestination('create_artifact', { artifact_id: bad }, PROJECT, NOW),
      ).toBeNull();
    }
  });
});

describe('deriveDestination — things the chat CHANGED', () => {
  // The reported bug. The overlay change is already persisted server-side; all
  // reopening owes the user is the map. It must resolve to a SCREEN, never an
  // artifact, and must carry no instruction to re-apply anything.
  it('an overlay change points at the map, not at a replay', () => {
    const d = deriveDestination(
      'control_map_overlay',
      { action: 'control_map_overlay', overlay_command: { action: 'set_opacity' }, applied: true },
      PROJECT,
      NOW,
    );
    expect(d).toEqual({
      kind: 'screen',
      route: '/w/projects/9/map',
      screen: 'map',
      tool: 'control_map_overlay',
      at: NOW(),
    });
    expect(d).not.toHaveProperty('overlay_command');
    expect(d).not.toHaveProperty('artifactId');
  });

  it('honours an explicit navigate_to over the derived map route', () => {
    const d = deriveDestination(
      'control_map_overlay',
      { action: 'control_map_overlay', overlay_command: {}, navigate_to: '/studio/9' },
      PROJECT,
      NOW,
    );
    expect(d).toMatchObject({ kind: 'screen', route: '/studio/9' });
  });

  it('plan extraction points at the map', () => {
    expect(
      deriveDestination('extract_plan_image', { action: 'place_plan_overlay', overlay: {} }, PROJECT, NOW),
    ).toMatchObject({ kind: 'screen', screen: 'map' });
  });

  it('a map tool with no project yields nothing rather than a broken route', () => {
    expect(
      deriveDestination('control_map_overlay', { overlay_command: {} }, null, NOW),
    ).toBeNull();
  });
});

describe('deriveDestination — navigation', () => {
  it('in-place studio navigation records folder and tab', () => {
    expect(
      deriveDestination('navigate_to_screen', { action: 'navigate_screen', folder: 'budget', tab: 'grid' }, PROJECT, NOW),
    ).toMatchObject({ kind: 'screen', folder: 'budget', tab: 'grid' });
  });

  it('route navigation records the route', () => {
    expect(
      deriveDestination('navigate_to_project', { action: 'navigate', target_url: '/w/projects/9/reports' }, PROJECT, NOW),
    ).toMatchObject({ kind: 'screen', route: '/w/projects/9/reports', screen: 'reports' });
  });

  it('navigate_screen with no folder yields nothing', () => {
    expect(
      deriveDestination('navigate_to_screen', { action: 'navigate_screen' }, PROJECT, NOW),
    ).toBeNull();
  });
});

describe('deriveDestination — deliberate non-destinations', () => {
  it('a plain answer records nothing', () => {
    expect(deriveDestination('get_deal_summary', { rows: [] }, PROJECT, NOW)).toBeNull();
  });

  it('a form does NOT become a destination', () => {
    // Decision 4a: reopening returns you to the screen, it never re-opens a
    // form uninvited.
    expect(
      deriveDestination('open_input_modal', { action: 'open_modal', modal_name: 'loan_inputs' }, PROJECT, NOW),
    ).toBeNull();
  });

  it('the excel audit records nothing while it remains unpersisted', () => {
    // Slice 2 (decision 3a) promotes it to a real artifact, at which point it
    // starts flowing through the artifact path above with no change here.
    expect(
      deriveDestination('run_formula_integrity', { action: 'show_excel_audit', excel_audit_config: {} }, PROJECT, NOW),
    ).toBeNull();
  });
});

describe('destinationFromPageContext — legacy threads', () => {
  it("returns the map for the reported thread's context", () => {
    expect(destinationFromPageContext('map', 9, NOW)).toEqual({
      kind: 'screen',
      route: '/w/projects/9/map',
      screen: 'map',
      tool: 'page_context_fallback',
      at: NOW(),
    });
  });

  it('ignores the four contexts that name no screen', () => {
    // 504 of 565 existing threads carry one of these. They must resolve to
    // null so reopen leaves the screen alone.
    for (const ctx of ['home', 'general', 'projects', 'dashboard']) {
      expect(destinationFromPageContext(ctx, 9, NOW)).toBeNull();
    }
  });

  it('ignores contexts with no known route rather than guessing', () => {
    for (const ctx of ['operations', 'capital', 'mf_valuation', 'feasibility']) {
      expect(destinationFromPageContext(ctx, 9, NOW)).toBeNull();
    }
  });

  it('needs both a context and a project', () => {
    expect(destinationFromPageContext(null, 9, NOW)).toBeNull();
    expect(destinationFromPageContext('map', null, NOW)).toBeNull();
  });
});

describe('isThreadDestination', () => {
  it('accepts well-formed values', () => {
    expect(isThreadDestination({ kind: 'artifact', artifactId: 1, tool: 't', at: 'x' })).toBe(true);
    expect(isThreadDestination({ kind: 'screen', route: '/w', tool: 't', at: 'x' })).toBe(true);
    expect(isThreadDestination({ kind: 'screen', folder: 'budget', tool: 't', at: 'x' })).toBe(true);
  });

  it('rejects anything unrestorable', () => {
    for (const bad of [null, undefined, 'x', 42, {}, { kind: 'artifact' }, { kind: 'screen' }, { kind: 'other', route: '/w' }]) {
      expect(isThreadDestination(bad)).toBe(false);
    }
  });
});

describe('routeShowsArtifacts — where an artifact can actually appear', () => {
  it('the four routes that mount an artifact surface', () => {
    expect(routeShowsArtifacts('/w/chat')).toBe(true);
    expect(routeShowsArtifacts('/w/chat/88ffe3ee-eb14-4e9e-8b74-bd371fc42571')).toBe(true);
    expect(routeShowsArtifacts('/w/dashboard')).toBe(true);
    expect(routeShowsArtifacts('/w/projects/9')).toBe(true);
    expect(routeShowsArtifacts('/w/projects/9/')).toBe(true);
  });

  it('the full-page routes that have no artifact slot', () => {
    // The reported case is the first of these.
    expect(routeShowsArtifacts('/w/projects/9/map')).toBe(false);
    expect(routeShowsArtifacts('/w/projects/9/reports')).toBe(false);
    expect(routeShowsArtifacts('/w/projects/9/documents')).toBe(false);
    expect(routeShowsArtifacts('/w/tools')).toBe(false);
    expect(routeShowsArtifacts('/w/admin')).toBe(false);
  });

  it('the project LIST is not the project root', () => {
    // '/w/projects' renders its own RightContentPanel and must not be mistaken
    // for '/w/projects/9'.
    expect(routeShowsArtifacts('/w/projects')).toBe(false);
  });
});

describe('artifactHostRoute', () => {
  it('sends you to the project root, carrying the thread', () => {
    expect(artifactHostRoute('/w/projects/9/map', 9, 'abc')).toBe('/w/projects/9?thread=abc');
  });

  it('omits the thread when there is none', () => {
    expect(artifactHostRoute('/w/projects/9/reports', 9, null)).toBe('/w/projects/9');
  });

  it('stays put when the route can already show artifacts', () => {
    expect(artifactHostRoute('/w/projects/9', 9, 'abc')).toBeNull();
    expect(artifactHostRoute('/w/chat/abc', null, 'abc')).toBeNull();
    expect(artifactHostRoute('/w/dashboard', 9, 'abc')).toBeNull();
  });

  it('stays put when there is no project to fall back to', () => {
    expect(artifactHostRoute('/w/tools', null, 'abc')).toBeNull();
  });
});

describe('screenKeyFromRoute', () => {
  it('labels known screens and shrugs at unknown ones', () => {
    expect(screenKeyFromRoute('/w/projects/9/map')).toBe('map');
    expect(screenKeyFromRoute('/w/projects/9/documents')).toBe('documents');
    expect(screenKeyFromRoute('/w/dashboard')).toBeUndefined();
  });
});

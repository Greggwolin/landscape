/**
 * Unit tests for shouldRenderTps — the read-only render branch predicate
 * (SS15, LSCMD-SS-READONLY-TPS-PARITY). It decides whether a saved overlay draws as a
 * TPS warp (canvas source) or the 4-corner quad. The canvas warp + delegation are DOM /
 * MapLibre bound and covered by the visual gate; this pins the branch logic that decides
 * which path a saved overlay takes.
 */

import { shouldRenderTps } from './tpsOverlay';

const cp = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ img: { x: i, y: i }, map: [-112 + i, 33 + i] }));

describe('shouldRenderTps', () => {
  it('true when warp_mode is tps and there are >=3 control points', () => {
    expect(shouldRenderTps({ warp_mode: 'tps', control_points: cp(3) })).toBe(true);
    expect(shouldRenderTps({ warp_mode: 'tps', control_points: cp(6) })).toBe(true);
  });

  it('false for a quad (4-corner) overlay regardless of control points', () => {
    expect(shouldRenderTps({ warp_mode: 'quad', control_points: cp(5) })).toBe(false);
    expect(shouldRenderTps({ warp_mode: undefined, control_points: cp(5) })).toBe(false);
    expect(shouldRenderTps({ warp_mode: null, control_points: cp(5) })).toBe(false);
  });

  it('false when TPS mode lacks the 3 control points the warp needs', () => {
    expect(shouldRenderTps({ warp_mode: 'tps', control_points: cp(2) })).toBe(false);
    expect(shouldRenderTps({ warp_mode: 'tps', control_points: [] })).toBe(false);
    expect(shouldRenderTps({ warp_mode: 'tps', control_points: null })).toBe(false);
    expect(shouldRenderTps({ warp_mode: 'tps' })).toBe(false);
  });
});

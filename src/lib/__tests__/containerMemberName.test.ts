import { containerMemberName } from '../containerMemberName';

/**
 * The doubling this exists to prevent, 2026-08-25.
 *
 * Four screens render a container as `{level label} {name}` after stripping the
 * literal word "Area" from the name. That worked only because the configured
 * label was ALWAYS "Area" — the hook reading it asked for a key the endpoint
 * does not return and fell through to its default on every project.
 *
 * Fixing that read is what makes the hard-coded strip wrong. Containers are
 * NAMED using the configured label when they are created, so the first one
 * added to a project called "Village" is stored as "Village 5", the strip does
 * not fire, and the tile reads "Village Village 5".
 */

describe('the doubling', () => {
  it('strips the project\'s own label, not just the default', () => {
    expect(containerMemberName('Village 5', 'Village')).toBe('5');
    expect(containerMemberName('Neighborhood 2', 'Neighborhood')).toBe('2');
    expect(containerMemberName('Buildings 3', 'Buildings')).toBe('3');
  });

  it('still strips the legacy default on containers created before the fix', () => {
    /* A project renamed from Area to Village holds containers of both vintages
     * and they have to render identically. */
    expect(containerMemberName('Area 1', 'Village')).toBe('1');
    expect(containerMemberName('Village 5', 'Village')).toBe('5');
  });

  it('is what the old code did, for the case the old code handled', () => {
    expect(containerMemberName('Area 1', 'Area')).toBe('1');
    expect(containerMemberName('Village Area 1', 'Village')).toBe('1');
  });
});

describe('a real name is left alone', () => {
  it('keeps a container someone actually named', () => {
    expect(containerMemberName('Riverbend', 'Village')).toBe('Riverbend');
    expect(containerMemberName('North Ridge 2', 'Village')).toBe('North Ridge 2');
  });

  it('keeps the original when stripping would leave nothing', () => {
    /* The name was ONLY the label. Better to show "Village" than an empty
     * cell after the label, which reads as a rendering fault. */
    expect(containerMemberName('Village', 'Village')).toBe('Village');
    expect(containerMemberName('Area', 'Area')).toBe('Area');
  });

  it('handles an absent or empty name without throwing', () => {
    expect(containerMemberName(null, 'Village')).toBe('');
    expect(containerMemberName(undefined, 'Village')).toBe('');
    expect(containerMemberName('   ', 'Village')).toBe('');
  });

  it('works with no configured label at all', () => {
    expect(containerMemberName('Area 1')).toBe('1');
    expect(containerMemberName('Village 5')).toBe('Village 5');
  });
});

describe('a label is not a regular expression', () => {
  it('does not blow up on punctuation in a configured label', () => {
    /* The label comes from project setup and is free text. Interpolating it
     * into a pattern unescaped would throw on a bracket and silently
     * mis-match on a dot. */
    expect(containerMemberName('Block (A) 3', 'Block (A)')).toBe('3');
    expect(containerMemberName('Tract.1 7', 'Tract.1')).toBe('7');
    expect(() => containerMemberName('anything', 'C++ [x]')).not.toThrow();
  });

  it('only strips whole words', () => {
    /* "Areawide 3" is a name, not a labelled container. */
    expect(containerMemberName('Areawide 3', 'Area')).toBe('Areawide 3');
  });

  it('ignores case, the way the old strip did', () => {
    expect(containerMemberName('VILLAGE 5', 'Village')).toBe('5');
    expect(containerMemberName('area 1', 'Village')).toBe('1');
  });
});

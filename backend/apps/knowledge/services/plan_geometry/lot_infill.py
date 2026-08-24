"""
Name the shapes the plat's own file does not name.

A CAD export can flatten a lot's number into line-work while leaving its
neighbours as live text. On the Red Valley final plat that happened to 22 of
286 lots: their outlines came back perfectly, and nothing could be done with
them because nothing knew what they were called. `lot_match` works from the
numbers outward — it iterates tokens, not faces — so a face with no number is
never even considered.

This is `derive_missing_lots` run backwards. That step has an outline missing
and a name present; this one has the name missing and the outline present. The
discipline is the same, and it is Gregg's: an unnamed shape sitting between lot
103 and lot 107, with exactly three unnamed shapes in the chain, is 104, 105 and
106 — and if the count does not come out exactly, it refuses rather than
guessing.

Three rules, and the second is the one that is easy to get wrong
----------------------------------------------------------------
**Adjacency is the relation, not rows.** A plat numbers lots by walking the
block boundary, so consecutive lots abut — they do not share a y coordinate.
Lot 103 is the foot of a column and 104 turns the corner into the row below it;
any rule phrased as "the same row" refuses that run, which is the very run the
rule was described by. So the walk chains face to face through shared edges and
does not care which direction the block turns.

**The stated area is a veto, never the identifier.** Eleven of those 22 lots
state 5040 sq ft, and every candidate face matches 5040 sq ft. An assignment
agreeing with the stated area therefore proves nothing, because every
alternative agrees exactly as well — this is the circularity that has cost a day
before. Area is used in one direction only: if a chained assignment lands on a
face whose area disagrees, the run is refused. A check that can only say no is
worth having; one that says yes to everything is worse than none.

**Any ambiguity refuses the whole run.** The path from one anchor to the next
must be unique. A branch, or two walks of the right length, or a chain that
cannot be closed, refuses every lot in that run — never "three of them are
probably right". Numbering falls out of walking the chain, in order, not out of
sorting the faces by position afterwards.

Session: LSCMD-PLANFILL-0818-MK55
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Sequence

logger = logging.getLogger(__name__)

__all__ = ["InfillResult", "infill_by_position", "build_adjacency"]

#: Two faces are neighbours when they share this much boundary, in points. A
#: lot shares a whole side with the next lot — 42 ft at 1in = 50ft is about
#: 60 pt — so this only has to be large enough to reject faces that meet at a
#: single corner, which are diagonal neighbours and not consecutive.
MIN_SHARED_EDGE_PT = 5.0

#: Interiors that overlap by more than this are not neighbours: one contains
#: the other, or they are the same region recovered twice.
MAX_OVERLAP_PT2 = 1.0

#: Longest run this will attempt. A gap longer than this is not a few labels
#: lost in export; it is a sheet that did not read, and walking it would be
#: guessing at scale.
MAX_RUN = 12

#: Give up proving uniqueness after this many candidate walks. Hitting the cap
#: refuses the run — an unproven chain is treated exactly like an ambiguous one.
MAX_PATHS_EXPLORED = 4000

#: A chained assignment whose area disagrees with the schedule by more than
#: this refuses its run. Matches `lot_match.AREA_TOLERANCE`.
AREA_TOLERANCE = 0.01


@dataclass
class InfillResult:
    """Lots named by position, and the runs that refused to resolve."""

    #: lot number -> the face it was identified as, in page coordinates.
    assigned: dict[int, object]
    #: (lot numbers, plain-English reason) for every run that was refused whole.
    refusals: list[tuple[list[int], str]]

    @property
    def count(self) -> int:
        return len(self.assigned)


def build_adjacency(faces: Sequence) -> dict[int, set[int]]:
    """Which faces share an edge with which.

    Uses an STRtree so this stays workable on a sheet carrying a few hundred
    faces. Two faces are neighbours only if they share a real length of
    boundary AND their interiors do not overlap — a face that contains another
    is a merged region, and treating containment as adjacency would let a walk
    step from a lot into the block that swallowed it.
    """
    from shapely.strtree import STRtree

    adjacency: dict[int, set[int]] = {i: set() for i in range(len(faces))}
    if not faces:
        return adjacency
    tree = STRtree(list(faces))
    for i, face in enumerate(faces):
        for j in tree.query(face):
            j = int(j)
            if j <= i:
                continue
            other = faces[j]
            try:
                shared = face.intersection(other)
            except Exception:  # noqa: BLE001 — invalid geometry is not adjacency
                continue
            if shared.is_empty or shared.area > MAX_OVERLAP_PT2:
                continue
            if shared.length < MIN_SHARED_EDGE_PT:
                continue
            adjacency[i].add(j)
            adjacency[j].add(i)
    return adjacency


def _walks(adjacency, start: int, end: int, allowed: set[int], length: int) -> list[list[int]]:
    """Every distinct walk from `start` to `end` through exactly `length`
    allowed nodes, with no node repeated.

    Enumerates rather than short-circuiting on the first hit, because the
    question being asked is whether the walk is UNIQUE. Finding one path is not
    the answer; finding exactly one is.
    """
    found: list[list[int]] = []
    explored = 0

    def step(node: int, path: list[int]):
        nonlocal explored
        explored += 1
        if explored > MAX_PATHS_EXPLORED:
            return
        if len(path) == length:
            if end in adjacency[node]:
                found.append(list(path))
            return
        for nxt in sorted(adjacency[node]):
            if nxt in allowed and nxt not in path:
                path.append(nxt)
                step(nxt, path)
                path.pop()

    step(start, [])
    if explored > MAX_PATHS_EXPLORED:
        return []  # unproven — the caller refuses, same as ambiguous
    return found


def infill_by_position(
    named: dict[int, object],
    unnamed: Sequence,
    stated_areas: dict[int, int],
    scale_sqft_per_pt2: float,
    unassigned: Optional[set[int]] = None,
) -> InfillResult:
    """Identify unnamed faces from the numbering of their neighbours.

    `named` must contain only anchors whose own area has been verified against
    the schedule — an anchor whose face swallowed its neighbour would drag a
    whole run onto the wrong shapes. Verifying the anchor is a refusal, not a
    selection, so it does not make the identification circular.

    `unassigned` is every schedule number still without an outline anywhere in
    the drawing. A run is only attempted when EVERY number between its two
    anchors is unassigned; if one of them was matched on another sheet then the
    two anchors are not consecutive in the numbering and the gap is not a run.
    """
    assigned: dict[int, object] = {}
    refusals: list[tuple[list[int], str]] = []
    used_nodes: set[int] = set()
    if not named or not unnamed or not scale_sqft_per_pt2:
        return InfillResult(assigned, refusals)

    unassigned = unassigned if unassigned is not None else set(stated_areas) - set(named)
    schedule = sorted(stated_areas)
    anchors = sorted(named)

    faces = [named[n] for n in anchors] + list(unnamed)
    anchor_index = {n: i for i, n in enumerate(anchors)}
    unnamed_ids = set(range(len(anchors), len(faces)))
    adjacency = build_adjacency(faces)

    def _try_run(left, right, between):
        """Attempt to walk one run between two anchors. Returns True if placed."""
        if any(n not in unassigned or n in assigned for n in between):
            return False
        if len(between) > MAX_RUN:
            refusals.append((between, f"{len(between)} lots in one gap — too long a run to walk"))
            return False

        walks = _walks(
            adjacency,
            start=anchor_index[left],
            end=anchor_index[right],
            allowed=unnamed_ids - used_nodes,
            length=len(between),
        )
        if not walks:
            refusals.append((
                between,
                f"no unbroken chain of exactly {len(between)} unnamed shapes runs "
                f"from lot {left} to lot {right}",
            ))
            return False
        if len(walks) > 1:
            refusals.append((
                between,
                f"{len(walks)} different ways to walk from lot {left} to lot {right} "
                f"through {len(between)} unnamed shapes — which shape is which is not decided",
            ))
            return False

        walk = walks[0]
        disagreeing = []
        for number, node in zip(between, walk):
            got = faces[node].area * scale_sqft_per_pt2
            stated = stated_areas[number]
            if abs(got - stated) / stated > AREA_TOLERANCE:
                disagreeing.append((number, round(got), stated))
        if disagreeing:
            refusals.append((
                between,
                "the chain closed but the shapes are the wrong size for these lots: "
                + ", ".join(f"lot {n} would be {g:,} sq ft against {s:,} stated"
                            for n, g, s in disagreeing),
            ))
            return False

        for number, node in zip(between, walk):
            assigned[number] = faces[node]
            used_nodes.add(node)
        logger.info("named by position: %s between lots %d and %d", between, left, right)
        return True

    # PASS 1 — same hundred block (the safe, original rule)
    for left, right in zip(anchors, anchors[1:]):
        between = [n for n in schedule if left < n < right]
        if not between:
            continue
        if left // 100 != right // 100:
            continue
        _try_run(left, right, between)

    # PASS 2 — cross hundred-block boundary.
    #
    # A plat numbers lots sequentially around a block perimeter: ...180, 181,
    # 182, 183 then 201, 202... The gap from 183 to 201 is typically 17
    # numbers (184-200) with zero actual lots in between — the hundred-block
    # boundary is a NAMING convention, not a physical gap.
    #
    # But some plats have lots right at the boundary where the last lot of one
    # block (e.g. 183) abuts the first of the next (201), with only a drainage
    # tract between them. The original rule refused all cross-boundary pairs,
    # which meant any unnamed lots at a block boundary were unrecoverable.
    #
    # The safety here is the same as everywhere: the walk must be unique, the
    # count must be exact, and every area must agree with the schedule. The
    # hundred-block check was a heuristic for "these anchors are probably far
    # apart"; the adjacency graph is the real answer. Two anchors that are NOT
    # adjacent through unnamed faces fail the walk test and refuse, whether or
    # not they share a hundred block.
    #
    # Additional guard: only attempt cross-boundary when the two anchors are
    # adjacent (graph distance ≤ MAX_RUN + 1), AND the between-list is short
    # (≤ 3 lots), AND every number in between is still unassigned.
    for left, right in zip(anchors, anchors[1:]):
        if left // 100 == right // 100:
            continue  # already handled in pass 1
        between = [n for n in schedule if left < n < right]
        if not between or len(between) > 3:
            continue  # only short cross-boundary runs
        # Check that the anchors are actually nearby on this sheet (not on
        # opposite sides of the drawing)
        li, ri = anchor_index[left], anchor_index[right]
        if not _reachable(adjacency, li, ri, unnamed_ids - used_nodes, max_depth=len(between) + 1):
            continue
        _try_run(left, right, between)

    return InfillResult(assigned, refusals)


def _reachable(adjacency, start: int, end: int, allowed: set[int], max_depth: int) -> bool:
    """BFS check: can we reach `end` from `start` through `allowed` nodes
    within `max_depth` steps?"""
    visited = {start}
    frontier = {start}
    for _ in range(max_depth):
        next_frontier = set()
        for node in frontier:
            for nb in adjacency.get(node, ()):
                if nb == end:
                    return True
                if nb in allowed and nb not in visited:
                    visited.add(nb)
                    next_frontier.add(nb)
        frontier = next_frontier
        if not frontier:
            break
    return False

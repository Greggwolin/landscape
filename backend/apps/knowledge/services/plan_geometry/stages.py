"""
The plan progression.

A project's drawings arrive as a sequence, each more binding than the last and
each typically drawn on top of the previous stage's geometry.  An underwriter
will hold *some* of these, rarely all, and essentially never the engineering
source files — so the system must accept whatever arrived, place each document
in the sequence, and be explicit about how firm the resulting geometry is.

Stage governs two things:
  1. Which version of a parcel's geometry wins when several exist.
  2. Whether the geometry is allowed to feed a calculation that produces money.
"""

from enum import IntEnum


class PlanStage(IntEnum):
    """
    Ordered by authority.  Higher supersedes lower.

    The integer value is stored on the geometry row and used directly for the
    supersede comparison, so values must never be renumbered — append only.
    """

    #: Zoning / PAD exhibit.  Parcels sketched over a site plan.  Land use,
    #: density and approximate acreage are meaningful; boundaries are not.
    ZONING_EXHIBIT = 10

    #: Landscape / theming concept.  Contributes no parcel geometry of its own;
    #: recorded so that character and amenity intent can be attributed, and so
    #: competing iterations can be told apart.
    CONCEPT = 20

    #: Marketing or land-planner site plan.  Parcel-level boundaries drawn to
    #: look right rather than to be measured.  This is the common starting
    #: point in an underwriting file.
    SITE_PLAN = 30

    #: Preliminary plat.  The first document carrying survey-accurate geometry.
    PRELIMINARY_PLAT = 40

    #: Preliminary landscape plan, drawn on preplat geometry.  Inherits the
    #: preplat's accuracy for anything it does not itself move.
    PRELIMINARY_LANDSCAPE = 45

    #: Final plat.  Recorded and binding.  Supersedes everything above it.
    FINAL_PLAT = 60

    #: Final landscape plan, drawn on final geometry.
    FINAL_LANDSCAPE = 65

    #: Boundaries taken from the county assessor rather than from a drawing.
    #: Authoritative for the outer envelope, silent on internal subdivision.
    RECORDED_SURVEY = 70


#: Stages whose geometry may be used in a calculation that produces a dollar
#: figure.  Everything else is presentation and analysis only, and must be
#: labelled approximate wherever it is surfaced.
#:
#: This is deliberately restrictive.  An illustrative lot line that quietly
#: becomes a frontage number in a budget is the class of error nobody catches
#: until it is expensive.
TRUST_FOR_MONEY = frozenset({
    PlanStage.PRELIMINARY_PLAT,
    PlanStage.PRELIMINARY_LANDSCAPE,
    PlanStage.FINAL_PLAT,
    PlanStage.FINAL_LANDSCAPE,
    PlanStage.RECORDED_SURVEY,
})


#: Human labels, for anything the user reads.  Plain English, no jargon.
STAGE_LABELS = {
    PlanStage.ZONING_EXHIBIT: "Zoning exhibit",
    PlanStage.CONCEPT: "Design concept",
    PlanStage.SITE_PLAN: "Site plan",
    PlanStage.PRELIMINARY_PLAT: "Preliminary plat",
    PlanStage.PRELIMINARY_LANDSCAPE: "Preliminary landscape plan",
    PlanStage.FINAL_PLAT: "Final plat",
    PlanStage.FINAL_LANDSCAPE: "Final landscape plan",
    PlanStage.RECORDED_SURVEY: "Recorded survey",
}


def is_approximate(stage: PlanStage) -> bool:
    """True when geometry from this stage must be surfaced as approximate."""
    return PlanStage(stage) not in TRUST_FOR_MONEY


def supersedes(new: PlanStage, existing: PlanStage) -> bool:
    """
    Whether `new` should become the active version over `existing`.

    Equal stages do not supersede — a second site plan does not automatically
    displace the first.  That case is a revision within a stage and is resolved
    by document date, which the caller owns.
    """
    return PlanStage(new) > PlanStage(existing)


def describe_trust(stage: PlanStage) -> str:
    """One plain-English sentence about what this geometry can be used for."""
    if PlanStage(stage) in TRUST_FOR_MONEY:
        return (
            f"{STAGE_LABELS[PlanStage(stage)]} — survey-accurate; "
            "safe to use in pricing and yield calculations."
        )
    return (
        f"{STAGE_LABELS[PlanStage(stage)]} — approximate; "
        "use for orientation and presentation only, not for pricing."
    )

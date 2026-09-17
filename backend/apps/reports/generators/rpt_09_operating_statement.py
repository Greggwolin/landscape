"""RPT_09 — the Operating Statement, rendered from the operating-statement SURFACE.

Rewritten 2026-09-14 on Gregg's answer to Q5a. What was here computed its own
P&L twice — once in ``generate_preview`` and once in ``generate_pdf`` — and the
two disagreed with each other and with the artifact he actually reads. Three
statements for one property, all on screen the same afternoon:

    artifact (the chat UI)   NOI  $1,217,834
    this report's PDF        NOI    $940,198
    this report's preview    NOI  $2,147,404

They were never three models. ``SUM(market_rent) × 12`` is $3,513,960 and
``SUM(current_rent) × 12`` is $2,696,514; the difference, the net loss to lease,
is $817,446 — and $3,513,960 − $817,446 lands exactly on $2,696,514, where the
artifact starts. The reports were walking down from market to in-place and
getting the walk wrong.

**Q5a: the operating statement states the property as it trades today.** In-place
rents, actual physical vacancy — 11 of 113 units, 9.7%, not an assumption. So
there is no walk to get wrong: this renders the same schema the artifact does.

TWO DEFECTS THIS DELETES RATHER THAN FIXES
-------------------------------------------
* **The loss-to-lease line is gone, not corrected.** Gregg, 2026-09-14: *"Loss to
  lease shouldn't be on an op statement. Its more suited to a rent roll."* He is
  right, and it is the convention — a statement that starts at in-place rent has
  loss to lease already embedded in the number it starts from; showing it again
  as a deduction subtracts it twice. It belongs on the rent roll, which already
  carries it per unit as ``market − in_place`` and totals it SIGNED, so a unit
  renting above market nets off correctly there.

  The old query was also wrong on its own terms: ``WHERE market_rent >
  current_rent`` counted the 79 units below market and discarded the 34 above
  it, overstating the deduction by **$339,247** of gain to lease.

* **The preview's assumptions never loaded.** Its query selected a column
  ``credit_loss_rate`` that does not exist on ``tbl_income_approach``; the read
  failed silently and every rate fell back to a platform default. Nothing here
  reads that table — the payload carries the project's own figures.

The bespoke fifteen-column PDF is gone too. It was a second layout of a second
computation; the base class renders the shared schema to PDF and Excel.
"""

from .surface_preview import SurfacePreviewGenerator


class OperatingStatementGenerator(SurfacePreviewGenerator):
    report_code = 'RPT_09'
    report_name = 'Operating Statement'
    surface_tool = 'get_operating_statement'

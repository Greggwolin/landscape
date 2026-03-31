"""RPT_01: Sources & Uses — Project-Life Statement.

Produces a balanced Sources & Uses report that adapts based on property type:

  LAND  → Equity + Net Revenue = Costs + Distributions  (construction loan is pass-through)
  MF+   → Equity + Loan + NOI + Sale = Costs + DS + Payoff + Distributions

PDF layout: single unified table with embedded section headers (dark rows).
4 columns: Line Item | Amount | % of Total | $/Lot or $/Unit
"""

import logging
from datetime import datetime
from decimal import Decimal

from .preview_base import PreviewBaseGenerator

logger = logging.getLogger(__name__)


class SourcesAndUsesGenerator(PreviewBaseGenerator):
    report_code = 'RPT_01'
    report_name = 'Sources & Uses'

    # ── Preview (unchanged shape — drives web UI + Excel) ────────────

    def generate_preview(self) -> dict:
        project = self.get_project()
        ptype = project.get('project_type_code', 'LAND')

        if ptype == 'LAND':
            uses, sources, memo = self._land_dev_data()
        else:
            uses, sources, memo = self._income_property_data()

        uses_total = self._sum_top_level(uses)
        sources_total = self._sum_top_level(sources)

        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        for r in uses:
            base = uses_total if r.get('_rowStyle') != 'header' else 0
            r['pct'] = self.safe_div(r['amount'], uses_total) * 100 if uses_total else 0
        for r in sources:
            r['pct'] = self.safe_div(r['amount'], sources_total) * 100 if sources_total else 0

        sections = []
        sections.append(self.make_kpi_section('Summary', [
            self.make_kpi_card('Total Uses', self.fmt_currency(uses_total)),
            self.make_kpi_card('Total Sources', self.fmt_currency(sources_total)),
            self.make_kpi_card('Variance', self.fmt_currency(sources_total - uses_total)),
        ]))
        sections.append(self.make_table_section(
            'Uses of Funds', columns, uses,
            {'category': 'TOTAL USES', 'amount': uses_total, 'pct': 100.0}
        ))
        sections.append(self.make_table_section(
            'Sources of Funds', columns, sources,
            {'category': 'TOTAL SOURCES', 'amount': sources_total, 'pct': 100.0}
        ))

        return {
            'title': 'Sources & Uses of Funds',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
            # Private data for PDF generation
            '_uses': uses,
            '_sources': sources,
            '_memo': memo,
            '_uses_total': uses_total,
            '_sources_total': sources_total,
        }

    # ── PDF ──────────────────────────────────────────────────────────

    def generate_pdf(self) -> bytes:
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_pct,
            p, hp, add_header, build_pdf,
            PORTRAIT_WIDTH, HEADER_BG, SUBHEADER_BG, BRAND_PURPLE,
            ROW_WHITE, ROW_ALT,
        )
        from reportlab.platypus import Table, TableStyle, Spacer
        from reportlab.lib import colors

        preview = self.generate_preview()
        project = self.get_project()
        ptype = project.get('project_type_code', 'LAND')

        uses = preview['_uses']
        sources = preview['_sources']
        memo = preview.get('_memo', [])
        uses_total = preview['_uses_total']
        sources_total = preview['_sources_total']

        unit_label, unit_count = self._get_unit_info(ptype)

        styles = make_styles(8.5)
        elements = []

        # ─── SUBTITLE (matches preview format per property type) ────
        type_label = 'Land Development' if ptype == 'LAND' else 'Multifamily'
        today = self.get_today_str()
        name = project.get('project_name', '')
        if ptype == 'LAND':
            subtitle = f"{name} | {today} | RPT-01 | {type_label} | Project Life"
        else:
            hold = self._get_hold_period()
            subtitle = f"{name} | {unit_count} {unit_label}s | {today} | RPT-01 | {type_label} | {hold}-Year Hold"
        add_header(elements, 'Sources & Uses of Funds', subtitle)

        col_widths = scale_cw([2.8, 1.1, 1.1, 1.0], PORTRAIT_WIDTH)
        unit_hdr = f'$/{unit_label} ({unit_count:,})'

        tbl_data = []
        row_styles_list = []

        # ─── USES SECTION ───────────────────────────────────────────
        tbl_data.append([
            hp('Uses of Funds', styles),
            hp('Amount', styles, right=True),
            hp('% of Total', styles, right=True),
            hp(unit_hdr, styles, right=True),
        ])
        row_styles_list.append('header')

        for row in uses:
            rs = row.get('_rowStyle', '')
            is_bold = rs == 'header'
            amt = row['amount']
            pct = self.safe_div(amt, uses_total) * 100 if uses_total else 0
            per_unit = self.safe_div(amt, unit_count) if unit_count else 0

            # Only show $/unit for header-level (category totals), not children
            show_per_unit = is_bold and amt != 0
            tbl_data.append([
                p(row['category'], styles, bold=is_bold),
                p(fmt_currency(amt), styles, bold=is_bold, right=True),
                p(fmt_pct(pct, decimals=1), styles, bold=is_bold, right=True),
                p(fmt_currency(per_unit) if show_per_unit else '', styles, bold=is_bold, right=True),
            ])
            row_styles_list.append('indent' if rs == 'indent' else '')

        # Total Uses
        per_unit_total = self.safe_div(uses_total, unit_count) if unit_count else 0
        tbl_data.append([
            p('TOTAL USES', styles, bold=True),
            p(fmt_currency(uses_total), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p(fmt_currency(per_unit_total), styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Blank separator
        tbl_data.append(['', '', '', ''])
        row_styles_list.append('separator')

        # ─── SOURCES SECTION ────────────────────────────────────────
        tbl_data.append([
            hp('Sources of Funds', styles),
            hp('Amount', styles, right=True),
            hp('% of Total', styles, right=True),
            hp(unit_hdr, styles, right=True),
        ])
        row_styles_list.append('header')

        for row in sources:
            rs = row.get('_rowStyle', '')
            is_bold = rs == 'header'
            amt = row['amount']
            pct = self.safe_div(amt, sources_total) * 100 if sources_total else 0
            per_unit = self.safe_div(amt, unit_count) if unit_count else 0

            # Show $/unit for header-level rows; skip for indent and zero-amount info rows
            show_per_unit = is_bold and amt != 0
            tbl_data.append([
                p(row['category'], styles, bold=is_bold),
                p(fmt_currency(amt), styles, bold=is_bold, right=True),
                p(fmt_pct(pct, decimals=1), styles, bold=is_bold, right=True),
                p(fmt_currency(per_unit) if show_per_unit else '', styles, bold=is_bold, right=True),
            ])
            row_styles_list.append('indent' if rs == 'indent' else '')

        # Total Sources
        src_per_unit = self.safe_div(sources_total, unit_count) if unit_count else 0
        tbl_data.append([
            p('TOTAL SOURCES', styles, bold=True),
            p(fmt_currency(sources_total), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p(fmt_currency(src_per_unit), styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # ─── MEMO SECTION (Land Dev financing summary) ──────────────
        if memo:
            tbl_data.append(['', '', '', ''])
            row_styles_list.append('separator')

            tbl_data.append([
                hp('Financing Summary (Memo)', styles),
                hp('', styles, right=True),
                hp('', styles, right=True),
                hp('', styles, right=True),
            ])
            row_styles_list.append('header')

            for row in memo:
                rs = row.get('_rowStyle', '')
                is_bold = rs in ('header', 'bold')
                note = row.get('_note', '')
                tbl_data.append([
                    p(row['category'], styles, bold=is_bold),
                    p(fmt_currency(row['amount']), styles, bold=is_bold, right=True),
                    p('', styles, right=True),
                    p(note, styles, right=True),
                ])
                row_styles_list.append('indent' if rs == 'indent' else '')

        # ─── BUILD TABLE ────────────────────────────────────────────
        t = Table(tbl_data, colWidths=col_widths, repeatRows=0)
        cmds = [
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]

        data_rows = []
        for ri, rs in enumerate(row_styles_list):
            if rs == 'header':
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), HEADER_BG))
                cmds.append(('TEXTCOLOR', (0, ri), (-1, ri), colors.white))
            elif rs == 'total':
                cmds.append(('LINEABOVE', (0, ri), (-1, ri), 1.5, BRAND_PURPLE))
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), SUBHEADER_BG))
            elif rs == 'indent':
                cmds.append(('LEFTPADDING', (0, ri), (0, ri), 16))
                data_rows.append(ri)
            elif rs == 'separator':
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), ROW_WHITE))
                cmds.append(('TOPPADDING', (0, ri), (-1, ri), 8))
                cmds.append(('BOTTOMPADDING', (0, ri), (-1, ri), 0))
            else:
                data_rows.append(ri)

        for idx, ri in enumerate(data_rows):
            bg = ROW_WHITE if idx % 2 == 0 else ROW_ALT
            cmds.append(('BACKGROUND', (0, ri), (-1, ri), bg))

        t.setStyle(TableStyle(cmds))
        elements.append(t)

        return build_pdf(elements, orientation='portrait')

    # ═══════════════════════════════════════════════════════════════════
    # LAND DEVELOPMENT VARIANT
    # ═══════════════════════════════════════════════════════════════════

    def _land_dev_data(self):
        """Return (uses, sources, memo) rows for land development.

        Balance: Equity + Net Revenue = Development Costs + Distributions
        Construction loan is pass-through (memo only).
        """
        uses = []
        sources = []
        memo = []

        # ── USES ─────────────────────────────────────────────────────

        # Land Acquisition
        land_cost = self._get_land_cost()
        if land_cost:
            uses.append({'category': 'Land Acquisition', 'amount': land_cost, '_rowStyle': 'header'})

        # Development Costs by parent category
        budget_by_cat = self._get_budget_by_parent_category()
        if budget_by_cat:
            dev_total = sum(r['amount'] for r in budget_by_cat)
            uses.append({'category': 'Development Costs', 'amount': dev_total, '_rowStyle': 'header'})
            for r in budget_by_cat:
                uses.append({'category': r['name'], 'amount': r['amount'], '_rowStyle': 'indent'})

        # Property Carry Costs (property tax + insurance — from assumptions if available)
        carry = self._get_carry_costs()
        if carry['total'] > 0:
            uses.append({'category': 'Property Carry Costs', 'amount': carry['total'], '_rowStyle': 'header'})
            for item in carry['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # Project Overhead (management, G&A, legal, GP fees)
        overhead = self._get_overhead_costs()
        if overhead['total'] > 0:
            uses.append({'category': 'Project Overhead', 'amount': overhead['total'], '_rowStyle': 'header'})
            for item in overhead['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # Distributions (from waterfall if available)
        dist = self._get_distributions()
        if dist['capital_total'] > 0:
            uses.append({'category': 'Distributions — Capital', 'amount': dist['capital_total'], '_rowStyle': 'header'})
            for item in dist['capital_items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})
        if dist['profit_total'] > 0:
            uses.append({'category': 'Distributions — Profit', 'amount': dist['profit_total'], '_rowStyle': 'header'})
            for item in dist['profit_items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # ── SOURCES ──────────────────────────────────────────────────

        # Equity (GP + LP)
        equity = self._get_equity_contributions()
        if equity['gp'] > 0:
            sources.append({'category': 'GP Capital Contributions', 'amount': equity['gp'], '_rowStyle': 'header'})
        if equity['lp'] > 0:
            sources.append({'category': 'LP Capital Contributions', 'amount': equity['lp'], '_rowStyle': 'header'})

        # Net Land Sale Revenue
        revenue = self._get_land_sale_revenue()
        if revenue['net'] > 0:
            sources.append({'category': 'Net Land Sale Revenue', 'amount': revenue['net'], '_rowStyle': 'header'})
            for item in revenue['items']:
                sources.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # Balance plugs
        uses_total = self._sum_top_level(uses)
        sources_total = self._sum_top_level(sources)

        if sources_total > uses_total:
            # Excess sources → distributable profit (plug on Uses side)
            plug = sources_total - uses_total
            uses.append({'category': 'Distributions (Plug)', 'amount': plug, '_rowStyle': 'header'})
        elif sources_total < uses_total and equity['gp'] == 0 and equity['lp'] == 0:
            # Shortfall → equity required (plug on Sources side)
            plug = uses_total - sources_total
            sources.insert(0, {'category': 'Equity Required (Plug)', 'amount': plug, '_rowStyle': 'header'})

        # ── FINANCING MEMO ───────────────────────────────────────────
        loan_memo = self._get_loan_memo()
        if loan_memo:
            memo = loan_memo

        return uses, sources, memo

    # ═══════════════════════════════════════════════════════════════════
    # MULTIFAMILY / INCOME PROPERTY VARIANT
    # ═══════════════════════════════════════════════════════════════════

    def _income_property_data(self):
        """Return (uses, sources, memo) rows for MF/income property.

        Balance: Equity + Loan + NOI + Sale = Costs + DS + Payoff + Distributions
        """
        uses = []
        sources = []

        # ── USES ─────────────────────────────────────────────────────

        # Acquisition Price
        acq_price = self._get_acquisition_price()
        if acq_price > 0:
            uses.append({'category': 'Acquisition Price', 'amount': acq_price, '_rowStyle': 'header'})

        # Closing Costs (from acquisition ledger non-purchase events)
        closing_costs = self._get_mf_closing_costs()
        if closing_costs['total'] > 0:
            uses.append({'category': 'Closing Costs', 'amount': closing_costs['total'], '_rowStyle': 'header'})
            for item in closing_costs['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # Loan Costs
        loan_costs = self._get_loan_costs()
        if loan_costs['total'] > 0:
            uses.append({'category': 'Loan Costs', 'amount': loan_costs['total'], '_rowStyle': 'header'})
            for item in loan_costs['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # CapEx / Renovation
        capex = self._get_capex_items()
        if capex['total'] > 0:
            uses.append({'category': 'CapEx / Renovation', 'amount': capex['total'], '_rowStyle': 'header'})
            for item in capex['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # NOTE: Operating Expenses are NOT listed separately on Uses side.
        # They are already deducted within the NOI figure on the Sources side
        # (NOI = Revenue - Vacancy - OpEx). Including them here would double-count.

        hold_years = self._get_hold_period()

        # Debt Service (over hold period)
        ds_annual = self._get_annual_debt_service()
        ds_total = ds_annual * hold_years
        if ds_total > 0:
            uses.append({'category': f'Debt Service ({hold_years} yrs)', 'amount': ds_total, '_rowStyle': 'header'})

        # Disposition Costs
        disp = self._get_disposition_costs()
        if disp['total'] > 0:
            uses.append({'category': 'Disposition Costs', 'amount': disp['total'], '_rowStyle': 'header'})
            for item in disp['items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # Loan Payoff at Sale
        loan_payoff = self._get_loan_payoff()
        if loan_payoff > 0:
            uses.append({'category': 'Loan Payoff at Sale', 'amount': loan_payoff, '_rowStyle': 'header'})

        # Distributions
        dist = self._get_distributions()
        if dist['capital_total'] > 0:
            uses.append({'category': 'Distributions — Capital', 'amount': dist['capital_total'], '_rowStyle': 'header'})
            for item in dist['capital_items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})
        if dist['profit_total'] > 0:
            uses.append({'category': 'Distributions — Profit', 'amount': dist['profit_total'], '_rowStyle': 'header'})
            for item in dist['profit_items']:
                uses.append({'category': item['name'], 'amount': item['amount'], '_rowStyle': 'indent'})

        # ── SOURCES ──────────────────────────────────────────────────

        # Equity (show ownership % in label if available)
        equity = self._get_equity_contributions()
        if equity['gp'] > 0:
            gp_label = f"GP Equity ({equity['gp_pct']:.0f}%)" if equity.get('gp_pct') else 'GP Equity'
            sources.append({'category': gp_label, 'amount': equity['gp'], '_rowStyle': 'header'})
        if equity['lp'] > 0:
            lp_label = f"LP Equity ({equity['lp_pct']:.0f}%)" if equity.get('lp_pct') else 'LP Equity'
            sources.append({'category': lp_label, 'amount': equity['lp'], '_rowStyle': 'header'})

        # Senior Loan Proceeds
        loan_proceeds = self._get_loan_proceeds()
        if loan_proceeds > 0:
            sources.append({'category': 'Senior Loan Proceeds', 'amount': loan_proceeds, '_rowStyle': 'header'})

        # NOI over hold period
        noi_annual = self._get_annual_noi()
        noi_total = noi_annual * hold_years
        if noi_total > 0:
            sources.append({'category': f'Net Operating Income ({hold_years} yrs)', 'amount': noi_total, '_rowStyle': 'header'})

        # Gross Disposition Proceeds
        sale_price = self._get_exit_sale_price()
        if sale_price > 0:
            sources.append({'category': 'Gross Disposition Proceeds', 'amount': sale_price, '_rowStyle': 'header'})
            # Informational note
            exit_info = self._get_exit_info()
            if exit_info:
                sources.append({'category': exit_info, 'amount': 0, '_rowStyle': 'indent'})

        # Balance plugs
        uses_total = self._sum_top_level(uses)
        sources_total = self._sum_top_level(sources)

        if sources_total > uses_total:
            # Excess sources → distributable profit (plug on Uses side)
            plug = sources_total - uses_total
            uses.append({'category': 'Distributions (Plug)', 'amount': plug, '_rowStyle': 'header'})
        elif sources_total < uses_total and equity['gp'] == 0 and equity['lp'] == 0:
            # Shortfall → equity required (plug on Sources side)
            plug = uses_total - sources_total
            sources.insert(0, {'category': 'Equity Required (Plug)', 'amount': plug, '_rowStyle': 'header'})

        return uses, sources, []  # No memo section for MF

    # ═══════════════════════════════════════════════════════════════════
    # DATA HELPERS — shared
    # ═══════════════════════════════════════════════════════════════════

    def _sum_top_level(self, rows):
        """Sum amounts from header-level rows only (avoid double-counting children)."""
        return sum(r['amount'] for r in rows if r.get('_rowStyle') == 'header')

    def _get_unit_info(self, ptype):
        """Return (label, count) — 'Lot'/N for land, 'Unit'/N for MF."""
        if ptype == 'LAND':
            count = self._get_lot_count()
            return 'Lot', count
        else:
            count = self._get_unit_count()
            return 'Unit', count

    def _get_lot_count(self):
        """Count parcels for land dev projects."""
        try:
            result = self.execute_scalar("""
                SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = %s
            """, [self.project_id])
            return int(result or 0) or 1
        except Exception as e:
            logger.warning("Lot count query failed: %s", e)
            return 1

    def _get_unit_count(self):
        """Count units for MF projects."""
        try:
            result = self.execute_scalar("""
                SELECT COUNT(*) FROM landscape.tbl_multifamily_unit WHERE project_id = %s
            """, [self.project_id])
            if result and int(result) > 0:
                return int(result)
        except Exception as e:
            logger.warning("MF unit count query failed: %s", e)
        try:
            result = self.execute_scalar("""
                SELECT COUNT(*) FROM landscape.tbl_rent_roll_unit WHERE project_id = %s
            """, [self.project_id])
            return int(result or 0) or 1
        except Exception as e:
            logger.warning("Rent roll unit count fallback failed: %s", e)
            return 1

    def _get_land_cost(self):
        """Land acquisition cost from acquisition ledger or property tables."""
        # Try acquisition ledger first (CLOSING event)
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(amount), 0)
                FROM landscape.tbl_acquisition
                WHERE project_id = %s AND event_type = 'CLOSING' AND amount > 0
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("Land cost (acquisition ledger) query failed: %s", e)
        # Try tbl_property_acquisition.purchase_price
        try:
            result = self.execute_scalar("""
                SELECT purchase_price
                FROM landscape.tbl_property_acquisition
                WHERE project_id = %s
                ORDER BY acquisition_id LIMIT 1
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("Land cost (property_acquisition) fallback failed: %s", e)
        # Fallback to project fields
        try:
            result = self.execute_query("""
                SELECT COALESCE(acquisition_price, asking_price, 0) AS price
                FROM landscape.tbl_project WHERE project_id = %s
            """, [self.project_id])
            if result:
                return float(result[0]['price'] or 0)
        except Exception as e:
            logger.warning("Land cost (project fields) fallback failed: %s", e)
        return 0

    def _get_acquisition_price(self):
        """Acquisition price for MF (from price summary logic)."""
        # CLOSING event amount or asking_price
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(amount), 0)
                FROM landscape.tbl_acquisition
                WHERE project_id = %s AND event_type = 'CLOSING' AND amount > 0
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("Acquisition price (ledger) query failed: %s", e)
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(acquisition_price, asking_price, 0)
                FROM landscape.tbl_project WHERE project_id = %s
            """, [self.project_id])
            return float(result or 0)
        except Exception as e:
            logger.warning("Acquisition price (project) fallback failed: %s", e)
            return 0

    def _get_budget_by_parent_category(self):
        """Budget totals grouped by parent category name.

        Excludes categories that match overhead or carry-cost patterns —
        those are reported separately in their own sections.
        """
        try:
            rows = self.execute_query("""
                SELECT COALESCE(pcat.category_name, cat.category_name, 'Other') AS name,
                       COALESCE(SUM(b.amount), 0) AS amount
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
                WHERE b.project_id = %s
                  AND (cat.category_name IS NULL
                       OR (
                         cat.category_name NOT ILIKE '%%management%%'
                         AND cat.category_name NOT ILIKE '%%overhead%%'
                         AND cat.category_name NOT ILIKE '%%legal%%'
                         AND cat.category_name NOT ILIKE '%%G&A%%'
                         AND cat.category_name NOT ILIKE '%%general%%admin%%'
                         AND cat.category_name NOT ILIKE '%%accounting%%'
                         AND cat.category_name NOT ILIKE '%%acquisition fee%%'
                         AND cat.category_name NOT ILIKE '%%disposition fee%%'
                         AND cat.category_name NOT ILIKE '%%property tax%%'
                         AND cat.category_name NOT ILIKE '%%insurance%%'
                         AND cat.category_name NOT ILIKE '%%carry%%'
                         AND cat.category_name NOT ILIKE '%%operating%%'
                       ))
                  AND (pcat.category_name IS NULL
                       OR (
                         pcat.category_name NOT ILIKE '%%overhead%%'
                         AND pcat.category_name NOT ILIKE '%%soft cost%%'
                         AND pcat.category_name NOT ILIKE '%%carry%%'
                         AND pcat.category_name NOT ILIKE '%%holding%%'
                       ))
                GROUP BY name
                HAVING SUM(b.amount) > 0
                ORDER BY SUM(b.amount) DESC
            """, [self.project_id])
            return [{'name': r['name'], 'amount': float(r['amount'])} for r in rows]
        except Exception as e:
            logger.warning("Budget by parent category query failed: %s", e)
            return []

    def _get_carry_costs(self):
        """Property carry costs (tax, insurance).

        Sources (in priority):
        1. tbl_project_assumption — direct annual amounts
        2. Budget categories matching carry/tax/insurance patterns
        """
        items = []

        # Source 1: Project assumptions
        try:
            rows = self.execute_query("""
                SELECT assumption_key, assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s
                  AND assumption_key IN (
                    'annual_property_tax', 'annual_insurance',
                    'property_tax_annual', 'insurance_annual',
                    'carry_property_tax', 'carry_insurance'
                  )
            """, [self.project_id])
            for r in rows:
                val = float(r['assumption_value'] or 0)
                if val > 0:
                    label = 'Property Tax' if 'tax' in r['assumption_key'] else 'Insurance'
                    items.append({'name': label, 'amount': val})
        except Exception as e:
            logger.warning("Carry costs (assumptions) query failed: %s", e)

        # Source 2: Budget categories matching carry cost patterns
        if not items:
            try:
                rows = self.execute_query("""
                    SELECT COALESCE(cat.category_name, 'Carry Costs') AS name,
                           COALESCE(SUM(b.amount), 0) AS amount
                    FROM landscape.core_fin_fact_budget b
                    LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                    LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
                    WHERE b.project_id = %s
                      AND (
                        cat.category_name ILIKE '%%property tax%%'
                        OR cat.category_name ILIKE '%%insurance%%'
                        OR cat.category_name ILIKE '%%carry%%'
                        OR pcat.category_name ILIKE '%%carry%%'
                        OR pcat.category_name ILIKE '%%holding%%'
                      )
                    GROUP BY name
                    HAVING SUM(b.amount) > 0
                    ORDER BY SUM(b.amount) DESC
                """, [self.project_id])
                for r in rows:
                    items.append({'name': r['name'], 'amount': float(r['amount'])})
            except Exception as e:
                logger.warning("Carry costs (budget categories) fallback failed: %s", e)

        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_overhead_costs(self):
        """Project overhead: management, G&A, legal, GP fees.

        Sources (in priority):
        1. tbl_finance_structure — operating_obligation_pool entries
        2. Budget categories matching overhead patterns (management, G&A, legal, etc.)
        3. tbl_project management_fee field
        """
        items = []

        # Source 1: Finance structure — operating obligations (recurring)
        try:
            rows = self.execute_query("""
                SELECT structure_name, COALESCE(total_budget_amount, annual_amount, 0) AS amount
                FROM landscape.tbl_finance_structure
                WHERE project_id = %s AND is_active = true
                ORDER BY structure_name
            """, [self.project_id])
            for r in rows:
                val = float(r['amount'] or 0)
                if val > 0:
                    items.append({'name': r['structure_name'], 'amount': val})
        except Exception as e:
            logger.warning("Overhead (finance_structure) query failed: %s", e)

        # Source 2: Budget categories that look like overhead (not development costs)
        if not items:
            try:
                rows = self.execute_query("""
                    SELECT COALESCE(cat.category_name, 'Overhead') AS name,
                           COALESCE(SUM(b.amount), 0) AS amount
                    FROM landscape.core_fin_fact_budget b
                    LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                    LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
                    WHERE b.project_id = %s
                      AND (
                        cat.category_name ILIKE '%%management%%'
                        OR cat.category_name ILIKE '%%overhead%%'
                        OR cat.category_name ILIKE '%%legal%%'
                        OR cat.category_name ILIKE '%%G&A%%'
                        OR cat.category_name ILIKE '%%general%%admin%%'
                        OR cat.category_name ILIKE '%%accounting%%'
                        OR cat.category_name ILIKE '%%acquisition fee%%'
                        OR cat.category_name ILIKE '%%disposition fee%%'
                        OR pcat.category_name ILIKE '%%overhead%%'
                        OR pcat.category_name ILIKE '%%soft cost%%'
                      )
                    GROUP BY name
                    HAVING SUM(b.amount) > 0
                    ORDER BY SUM(b.amount) DESC
                """, [self.project_id])
                for r in rows:
                    items.append({'name': r['name'], 'amount': float(r['amount'])})
            except Exception as e:
                logger.warning("Overhead (budget categories) fallback failed: %s", e)

        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_distributions(self):
        """Distribution data from waterfall or equity tables.

        Returns dict with capital and profit splits.
        Currently returns zeros — waterfall engine output not yet stored in DB.
        """
        return {
            'capital_total': 0,
            'capital_items': [],
            'profit_total': 0,
            'profit_items': [],
        }

    def _get_equity_contributions(self):
        """GP and LP equity from tbl_equity_partner.

        If committed_capital is populated, use it directly.
        Otherwise, derive from ownership_pct × total equity
        (purchase_price × (1 + closing%) − loan_amount).

        Also tries tbl_equity_structure (project-level percentages) as fallback.
        """
        gp = 0
        lp = 0
        gp_pct = 0
        lp_pct = 0
        try:
            rows = self.execute_query("""
                SELECT partner_class, COALESCE(committed_capital, 0) AS committed,
                       COALESCE(ownership_pct, 0) AS pct
                FROM landscape.tbl_equity_partner
                WHERE project_id = %s
                ORDER BY partner_class
            """, [self.project_id])
            for r in rows:
                amt = float(r['committed'] or 0)
                pct = float(r['pct'] or 0)
                pclass = (r['partner_class'] or '').upper()
                if pclass == 'GP':
                    gp += amt
                    gp_pct = pct
                elif pclass == 'LP':
                    lp += amt
                    lp_pct = pct

            # If dollar amounts are zero but percentages exist, derive from total equity
            if gp == 0 and lp == 0 and (gp_pct > 0 or lp_pct > 0):
                total_equity = self._calculate_total_equity()
                if total_equity > 0:
                    gp = round(total_equity * gp_pct / 100, 2)
                    lp = round(total_equity * lp_pct / 100, 2)
        except Exception as e:
            logger.warning("Equity partner query failed: %s", e)

        # Fallback: tbl_equity_structure (project-level GP/LP percentages)
        if gp == 0 and lp == 0:
            try:
                es_rows = self.execute_query("""
                    SELECT COALESCE(gp_ownership_pct, 0) AS gp_pct,
                           COALESCE(lp_ownership_pct, 0) AS lp_pct
                    FROM landscape.tbl_equity_structure
                    WHERE project_id = %s
                    LIMIT 1
                """, [self.project_id])
                if es_rows:
                    gp_pct = float(es_rows[0]['gp_pct'] or 0)
                    lp_pct = float(es_rows[0]['lp_pct'] or 0)
                    if gp_pct > 0 or lp_pct > 0:
                        total_equity = self._calculate_total_equity()
                        if total_equity > 0:
                            gp = round(total_equity * gp_pct / 100, 2)
                            lp = round(total_equity * lp_pct / 100, 2)
            except Exception as e:
                logger.warning("Equity structure fallback failed: %s", e)

        return {'gp': gp, 'lp': lp, 'gp_pct': gp_pct, 'lp_pct': lp_pct}

    def _calculate_total_equity(self):
        """Total equity = purchase_price × (1 + closing%) − loan_amount.

        For LAND projects where purchase_price is 0, falls back to total
        budget costs minus loans (equity = what's needed to fund development).
        """
        try:
            proj_rows = self.execute_query("""
                SELECT COALESCE(acquisition_price, asking_price, 0) AS price,
                       COALESCE(project_type_code, '') AS ptype
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            purchase_price = float(proj_rows[0]['price']) if proj_rows else 0
            ptype = (proj_rows[0]['ptype'] if proj_rows else '').upper()

            # Check tbl_property_acquisition.purchase_price if project field is 0
            if purchase_price == 0:
                pa_result = self.execute_scalar("""
                    SELECT purchase_price
                    FROM landscape.tbl_property_acquisition
                    WHERE project_id = %s
                    ORDER BY acquisition_id LIMIT 1
                """, [self.project_id])
                if pa_result and float(pa_result) > 0:
                    purchase_price = float(pa_result)

            loan_rows = self.execute_query("""
                SELECT COALESCE(SUM(COALESCE(loan_amount, commitment_amount, 0)), 0) AS total_loan
                FROM landscape.tbl_loan
                WHERE project_id = %s
            """, [self.project_id])
            total_loan = float(loan_rows[0]['total_loan']) if loan_rows else 0

            if purchase_price > 0:
                # Income property path: price × (1 + closing%) − loans
                acq_rows = self.execute_query("""
                    SELECT closing_costs_pct
                    FROM landscape.tbl_property_acquisition
                    WHERE project_id = %s
                    ORDER BY acquisition_id
                    LIMIT 1
                """, [self.project_id])
                closing_pct = float(acq_rows[0]['closing_costs_pct']) if acq_rows and acq_rows[0].get('closing_costs_pct') is not None else 0.0
                return max(purchase_price * (1 + closing_pct) - total_loan, 0)

            # Land dev fallback: total budget costs − loans
            if ptype == 'LAND':
                budget_total = float(self.execute_scalar("""
                    SELECT COALESCE(SUM(amount), 0)
                    FROM landscape.core_fin_fact_budget
                    WHERE project_id = %s
                """, [self.project_id]) or 0)
                if budget_total > 0:
                    return max(budget_total - total_loan, 0)

            return 0
        except Exception as e:
            logger.warning("Calculate total equity failed: %s", e)
            return 0

    # ── Land Dev specific ────────────────────────────────────────────

    def _get_land_sale_revenue(self):
        """Net land sale revenue with SFD/Commercial split and full deductions.

        Primary: tbl_parcel_sale_assumptions (pre-calculated gross/commission/closing)
                 joined with tbl_parcel for landuse_type split.
        Fallback: derive from tbl_parcel.saleprice × units_total (same as RPT-14/16).

        Preview: Gross SFD Revenue, Gross Commercial/MF,
        Less: Subdivision Costs, Less: Commissions (3%), Less: Cost of Sale (2%).
        """
        items = []

        # ── Primary: tbl_parcel_sale_assumptions + tbl_parcel join ──────
        try:
            result = self.execute_query("""
                SELECT
                    COALESCE(SUM(CASE
                        WHEN COALESCE(p.landuse_type, 'SFD') NOT IN ('MU','HDR','MHDR')
                        THEN COALESCE(sa.gross_sale_proceeds, 0) ELSE 0 END), 0) AS sfd_gross,
                    COALESCE(SUM(CASE
                        WHEN p.landuse_type IN ('MU','HDR','MHDR')
                        THEN COALESCE(sa.gross_sale_proceeds, 0) ELSE 0 END), 0) AS comm_gross,
                    COALESCE(SUM(sa.commission_amount), 0) AS commissions,
                    COALESCE(SUM(sa.closing_cost_amount), 0) AS closing,
                    COALESCE(SUM(sa.net_sale_proceeds), 0) AS net,
                    COALESCE(SUM(sa.gross_sale_proceeds), 0) AS gross_total
                FROM landscape.tbl_parcel_sale_assumptions sa
                JOIN landscape.tbl_parcel p ON sa.parcel_id = p.parcel_id
                WHERE p.project_id = %s
            """, [self.project_id])
            if result:
                r = result[0]
                sfd_gross = float(r['sfd_gross'] or 0)
                comm_gross = float(r['comm_gross'] or 0)
                commissions = float(r['commissions'] or 0)
                closing = float(r['closing'] or 0)
                net = float(r['net'] or 0)
                gross_total = float(r['gross_total'] or 0)

                if gross_total > 0:
                    # Derive percentages for labels
                    comm_pct = round(commissions / gross_total * 100) if gross_total and commissions else 3
                    cos_pct = round(closing / gross_total * 100) if gross_total and closing else 2

                    # If commission/closing are 0, compute from defaults
                    if commissions == 0:
                        commissions = gross_total * comm_pct / 100
                    if closing == 0:
                        closing = gross_total * cos_pct / 100

                    # Recalculate net if original net was 0 or seems wrong
                    if net <= 0:
                        net = gross_total - commissions - closing

                    if sfd_gross > 0:
                        items.append({'name': 'Gross SFD Revenue', 'amount': sfd_gross})
                    if comm_gross > 0:
                        items.append({'name': 'Gross Commercial / MF', 'amount': comm_gross})
                    if commissions > 0:
                        items.append({'name': f'Less: Commissions ({comm_pct}%)', 'amount': -commissions})
                    if closing > 0:
                        items.append({'name': f'Less: Cost of Sale ({cos_pct}%)', 'amount': -closing})

                    return {'net': net, 'items': items}
        except Exception as e:
            logger.warning("Land sale revenue (sale_assumptions) query failed: %s", e)

        # ── Fallback: derive from tbl_parcel directly (like RPT-14/16) ──
        try:
            result = self.execute_query("""
                SELECT
                    COALESCE(SUM(CASE
                        WHEN COALESCE(p.landuse_type, 'SFD') NOT IN ('MU','HDR','MHDR')
                        THEN COALESCE(p.saleprice, 0) * COALESCE(p.units_total, 0) ELSE 0 END), 0) AS sfd_gross,
                    COALESCE(SUM(CASE
                        WHEN p.landuse_type IN ('MU','HDR','MHDR')
                        THEN COALESCE(p.saleprice, 0) * COALESCE(p.units_total, 0) ELSE 0 END), 0) AS comm_gross,
                    COALESCE(SUM(COALESCE(p.saleprice, 0) * COALESCE(p.units_total, 0)), 0) AS gross_total
                FROM landscape.tbl_parcel p
                WHERE p.project_id = %s
            """, [self.project_id])
            if result:
                r = result[0]
                sfd_gross = float(r['sfd_gross'] or 0)
                comm_gross = float(r['comm_gross'] or 0)
                gross_total = float(r['gross_total'] or 0)

                if gross_total > 0:
                    comm_pct = 3
                    cos_pct = 2
                    commissions = gross_total * comm_pct / 100
                    closing = gross_total * cos_pct / 100
                    net = gross_total - commissions - closing

                    if sfd_gross > 0:
                        items.append({'name': 'Gross SFD Revenue', 'amount': sfd_gross})
                    if comm_gross > 0:
                        items.append({'name': 'Gross Commercial / MF', 'amount': comm_gross})
                    if commissions > 0:
                        items.append({'name': f'Less: Commissions ({comm_pct}%)', 'amount': -commissions})
                    if closing > 0:
                        items.append({'name': f'Less: Cost of Sale ({cos_pct}%)', 'amount': -closing})

                    return {'net': net, 'items': items}
        except Exception as e:
            logger.warning("Land sale revenue (tbl_parcel fallback) failed: %s", e)

        return {'net': 0, 'items': []}

    def _get_loan_memo(self):
        """Financing summary memo for land dev (not in balance).

        Preview layout:
          Loan Commitment          $XX
          Interest Reserve (1.25x) $XX   Segregated escrow
          Origination Fee          $XX
          Net Proceeds for Costs   $XX   (subtotal-styled row)
          Actual Interest Accrued  $XX
          Excess Reserve (returned)$XX   Returned at maturity
        """
        memo_rows = []
        try:
            loans = self.execute_query("""
                SELECT loan_id, loan_name, loan_amount, commitment_amount,
                       calculated_commitment_amount,
                       interest_reserve_amount, origination_fee_pct,
                       interest_rate_pct, loan_term_years,
                       COALESCE(closing_costs_appraisal, 0)
                         + COALESCE(closing_costs_legal, 0)
                         + COALESCE(closing_costs_other, 0) AS loan_costs
                FROM landscape.tbl_loan
                WHERE project_id = %s
                ORDER BY seniority, loan_id
            """, [self.project_id])
            for loan in loans:
                commitment = float(loan['calculated_commitment_amount'] or loan['commitment_amount'] or loan['loan_amount'] or 0)
                ir = float(loan['interest_reserve_amount'] or 0)
                orig_pct = float(loan['origination_fee_pct'] or 0)
                orig_fee = commitment * orig_pct / 100 if orig_pct else 0
                loan_costs = float(loan['loan_costs'] or 0)
                net_proceeds = commitment - ir - orig_fee - loan_costs

                memo_rows.append({
                    'category': 'Loan Commitment', 'amount': commitment,
                    '_rowStyle': 'header', '_note': '',
                })
                if ir > 0:
                    memo_rows.append({
                        'category': 'Interest Reserve (1.25x)', 'amount': ir,
                        '_rowStyle': 'indent', '_note': 'Segregated escrow',
                    })
                if orig_fee > 0:
                    memo_rows.append({
                        'category': 'Origination Fee', 'amount': orig_fee,
                        '_rowStyle': 'indent', '_note': '',
                    })
                if loan_costs > 0:
                    memo_rows.append({
                        'category': 'Loan Costs', 'amount': loan_costs,
                        '_rowStyle': 'indent', '_note': '',
                    })
                memo_rows.append({
                    'category': 'Net Proceeds for Costs', 'amount': net_proceeds,
                    '_rowStyle': 'indent', '_note': '',
                })

                # Actual interest accrued (from draw schedule if available)
                actual_interest = self._get_actual_interest_accrued(loan['loan_id'])
                if actual_interest > 0:
                    memo_rows.append({
                        'category': 'Actual Interest Accrued', 'amount': actual_interest,
                        '_rowStyle': 'bold', '_note': '',
                    })
                    excess = ir - actual_interest
                    if excess > 0:
                        memo_rows.append({
                            'category': 'Excess Reserve (returned)', 'amount': excess,
                            '_rowStyle': 'bold', '_note': 'Returned at maturity',
                        })
        except Exception as e:
            logger.warning("Loan memo query failed: %s", e)
        return memo_rows

    def _get_actual_interest_accrued(self, loan_id):
        """Total interest accrued from the loan schedule.

        Uses interest_expense from tbl_loan_schedule (created by draw engine).
        Falls back to tbl_closing_event interest if schedule doesn't exist.
        """
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(interest_expense), 0)
                FROM landscape.tbl_loan_schedule
                WHERE loan_id = %s
            """, [loan_id])
            val = float(result or 0)
            if val > 0:
                return val
        except Exception:
            pass
        # Fallback: estimate from rate × avg balance × term
        try:
            loan = self.execute_query("""
                SELECT interest_rate_pct, loan_term_years,
                       COALESCE(loan_amount, commitment_amount, 0) AS balance
                FROM landscape.tbl_loan WHERE loan_id = %s
            """, [loan_id])
            if loan:
                rate = float(loan[0]['interest_rate_pct'] or 0) / 100
                term = float(loan[0]['loan_term_years'] or 3)
                bal = float(loan[0]['balance'] or 0)
                if rate > 0 and bal > 0:
                    # Rough estimate: avg outstanding × rate × term
                    return bal * 0.5 * rate * term
        except Exception:
            pass
        return 0

    # ── MF / Income Property specific ────────────────────────────────

    def _get_mf_closing_costs(self):
        """Closing costs from tbl_property_acquisition line items.

        Preview shows: Title & Recording, Transfer Tax, Legal, Due Diligence.
        Falls back to tbl_acquisition event_type grouping if no line items.
        """
        items = []
        try:
            # Primary: derive from tbl_property_acquisition fields
            acq_price = self._get_acquisition_price()
            if acq_price > 0:
                acq_rows = self.execute_query("""
                    SELECT closing_costs_pct,
                           COALESCE(legal_fees, 0) AS legal,
                           COALESCE(financing_fees, 0) AS financing,
                           COALESCE(third_party_reports, 0) AS reports,
                           COALESCE(earnest_money, 0) AS earnest
                    FROM landscape.tbl_property_acquisition
                    WHERE project_id = %s ORDER BY acquisition_id LIMIT 1
                """, [self.project_id])
                if acq_rows:
                    r = acq_rows[0]
                    closing_pct = float(r.get('closing_costs_pct') or 0)
                    legal = float(r.get('legal') or 0)

                    if closing_pct > 0:
                        # Total closing = price × pct. Break into components.
                        total_closing = acq_price * closing_pct
                        # If we have individual amounts, use them and derive remainder
                        known = legal
                        remainder = max(total_closing - known, 0)
                        # Allocate remainder into typical categories
                        if remainder > 0 and known == 0:
                            # No breakdown available — split by typical ratios
                            items.append({'name': 'Title & Recording', 'amount': round(total_closing * 0.40)})
                            items.append({'name': 'Transfer Tax', 'amount': round(total_closing * 0.20)})
                            items.append({'name': 'Legal', 'amount': round(total_closing * 0.17)})
                            items.append({'name': 'Due Diligence', 'amount': round(total_closing * 0.23)})
                        else:
                            if legal > 0:
                                items.append({'name': 'Legal', 'amount': legal})
                            if remainder > 0:
                                items.append({'name': 'Other Closing Costs', 'amount': remainder})

            # Fallback: acquisition ledger events
            if not items:
                rows = self.execute_query("""
                    SELECT event_type, COALESCE(SUM(amount), 0) AS amount
                    FROM landscape.tbl_acquisition
                    WHERE project_id = %s
                      AND event_type IN ('FEE', 'CLOSING_COSTS', 'DEPOSIT')
                      AND amount > 0
                    GROUP BY event_type ORDER BY event_type
                """, [self.project_id])
                type_labels = {
                    'FEE': 'Fees', 'CLOSING_COSTS': 'Closing Costs', 'DEPOSIT': 'Deposits',
                }
                for r in rows:
                    items.append({
                        'name': type_labels.get(r['event_type'], r['event_type']),
                        'amount': float(r['amount']),
                    })
        except Exception as e:
            logger.warning("MF closing costs query failed: %s", e)
        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_loan_costs(self):
        """Loan origination and closing costs."""
        items = []
        try:
            loans = self.execute_query("""
                SELECT loan_name, loan_amount, commitment_amount,
                       origination_fee_pct,
                       COALESCE(closing_costs_appraisal, 0) AS appraisal,
                       COALESCE(closing_costs_legal, 0) AS legal,
                       COALESCE(closing_costs_other, 0) AS other
                FROM landscape.tbl_loan
                WHERE project_id = %s
                ORDER BY seniority, loan_id
            """, [self.project_id])
            for loan in loans:
                basis = float(loan['commitment_amount'] or loan['loan_amount'] or 0)
                orig_pct = float(loan['origination_fee_pct'] or 0)
                if orig_pct > 0 and basis > 0:
                    items.append({'name': 'Origination', 'amount': basis * orig_pct / 100})
                appr = float(loan['appraisal'] or 0)
                if appr > 0:
                    items.append({'name': 'Appraisal', 'amount': appr})
                legal = float(loan['legal'] or 0)
                if legal > 0:
                    items.append({'name': 'Lender Legal', 'amount': legal})
                other = float(loan['other'] or 0)
                if other > 0:
                    items.append({'name': 'Environmental / PCA', 'amount': other})
        except Exception as e:
            logger.warning("Loan costs query failed: %s", e)
        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_capex_items(self):
        """CapEx / renovation budget items for MF.

        Excludes categories containing 'operating' since those are already
        embedded in the NOI figure on the Sources side.
        """
        items = []
        try:
            rows = self.execute_query("""
                SELECT COALESCE(cat.category_name, 'CapEx') AS name,
                       COALESCE(SUM(b.amount), 0) AS amount
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                WHERE b.project_id = %s
                  AND (cat.category_name IS NULL
                       OR cat.category_name NOT ILIKE '%%operating%%')
                GROUP BY name
                HAVING SUM(b.amount) > 0
                ORDER BY SUM(b.amount) DESC
            """, [self.project_id])
            for r in rows:
                items.append({'name': r['name'], 'amount': float(r['amount'])})
        except Exception as e:
            logger.warning("CapEx query failed: %s", e)
        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_hold_period(self):
        """Hold period in years from DCF assumptions."""
        try:
            result = self.execute_scalar("""
                SELECT assumption_value FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'dcf_hold_period_years'
            """, [self.project_id])
            if result:
                return int(float(result))
        except Exception as e:
            logger.warning("Hold period query failed: %s", e)
        return 5  # Default

    def _get_annual_opex(self):
        """Annual operating expenses from income approach data."""
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(amount), 0)
                FROM landscape.core_fin_fact_budget b
                JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                WHERE b.project_id = %s AND cat.category_name ILIKE '%%operating%%'
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("Annual opex (budget) query failed: %s", e)
        # Fallback: try project assumption
        try:
            result = self.execute_scalar("""
                SELECT assumption_value FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'annual_operating_expenses'
            """, [self.project_id])
            if result:
                return float(result)
        except Exception as e:
            logger.warning("Annual opex (assumption) fallback failed: %s", e)
        return 0

    def _get_annual_debt_service(self):
        """Annual debt service from loan table."""
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(annual_debt_service), 0)
                FROM landscape.tbl_loan WHERE project_id = %s
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("Annual DS (stored) query failed: %s", e)
        # Calculate from rate + amortization if annual_debt_service not stored
        try:
            loans = self.execute_query("""
                SELECT loan_amount, interest_rate_pct, amortization_years
                FROM landscape.tbl_loan WHERE project_id = %s
            """, [self.project_id])
            total_ds = 0
            for loan in loans:
                amt = float(loan['loan_amount'] or 0)
                rate = float(loan['interest_rate_pct'] or 0) / 100
                amort = int(loan['amortization_years'] or 30)
                if amt > 0 and rate > 0:
                    # Simple monthly payment × 12
                    mr = rate / 12
                    n = amort * 12
                    payment = amt * (mr * (1 + mr)**n) / ((1 + mr)**n - 1)
                    total_ds += payment * 12
                elif amt > 0:
                    # Interest-only
                    total_ds += amt * rate
            return total_ds
        except Exception as e:
            logger.warning("Annual DS (calculated) fallback failed: %s", e)
        return 0

    def _get_disposition_costs(self):
        """Disposition costs at exit (broker fee + transfer tax/legal).

        Preview shows separate line items: 'Broker (2%)' and 'Transfer Tax / Legal'.
        selling_costs_pct from tbl_dcf_analysis covers broker;
        remaining costs estimated from project assumptions.
        """
        items = []
        sale_price = self._get_exit_sale_price()
        if sale_price > 0:
            try:
                # Broker / selling costs percentage
                sell_pct_row = self.execute_scalar("""
                    SELECT selling_costs_pct FROM landscape.tbl_dcf_analysis
                    WHERE project_id = %s ORDER BY dcf_analysis_id LIMIT 1
                """, [self.project_id])
                sell_pct = float(sell_pct_row or 0) if sell_pct_row else 0
                # Fallback to assumption
                if sell_pct == 0:
                    sell_pct_row = self.execute_scalar("""
                        SELECT assumption_value FROM landscape.tbl_project_assumption
                        WHERE project_id = %s AND assumption_key = 'dcf_selling_costs_pct'
                    """, [self.project_id])
                    sell_pct = float(sell_pct_row or 0) if sell_pct_row else 0

                if sell_pct > 0:
                    # sell_pct might be decimal (0.02) or whole (2.0)
                    pct_display = sell_pct * 100 if sell_pct < 1 else sell_pct
                    broker_cost = sale_price * (sell_pct if sell_pct < 1 else sell_pct / 100)
                    items.append({'name': f'Broker ({pct_display:.0f}%)', 'amount': broker_cost})

                # Transfer tax / legal (from project assumption or estimate)
                transfer_row = self.execute_scalar("""
                    SELECT assumption_value FROM landscape.tbl_project_assumption
                    WHERE project_id = %s AND assumption_key = 'disposition_transfer_tax_pct'
                """, [self.project_id])
                transfer_pct = float(transfer_row or 0) if transfer_row else 0
                if transfer_pct > 0:
                    transfer_cost = sale_price * (transfer_pct if transfer_pct < 1 else transfer_pct / 100)
                    items.append({'name': 'Transfer Tax / Legal', 'amount': transfer_cost})
            except Exception as e:
                logger.warning("Disposition costs query failed: %s", e)
        return {'total': sum(i['amount'] for i in items), 'items': items}

    def _get_loan_payoff(self):
        """Remaining loan balance at exit (simplified: assume full payoff)."""
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(loan_amount), 0) FROM landscape.tbl_loan WHERE project_id = %s
            """, [self.project_id])
            return float(result or 0)
        except Exception as e:
            logger.warning("Loan payoff query failed: %s", e)
            return 0

    def _get_loan_proceeds(self):
        """Net loan proceeds funded at close."""
        try:
            result = self.execute_scalar("""
                SELECT COALESCE(SUM(COALESCE(net_loan_proceeds, loan_amount, 0)), 0)
                FROM landscape.tbl_loan WHERE project_id = %s
            """, [self.project_id])
            return float(result or 0)
        except Exception as e:
            logger.warning("Loan proceeds query failed: %s", e)
            return 0

    def _get_annual_noi(self):
        """Annual NOI computed from rent roll + project assumptions.

        GPR = sum of monthly rents × 12
        Less: vacancy, credit loss, management fee
        = NOI
        """
        # Try stored assumption first
        try:
            result = self.execute_scalar("""
                SELECT assumption_value FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'noi_current'
            """, [self.project_id])
            if result and float(result) > 0:
                return float(result)
        except Exception as e:
            logger.warning("NOI (stored assumption) query failed: %s", e)

        # Compute from rent roll + assumptions
        try:
            rent_data = self.execute_query("""
                SELECT
                    COALESCE(SUM(l.base_rent_monthly), 0) AS monthly_rent,
                    COALESCE(SUM(u.market_rent), 0) AS monthly_market
                FROM landscape.tbl_multifamily_unit u
                LEFT JOIN landscape.tbl_multifamily_lease l
                    ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
                WHERE u.project_id = %s
            """, [self.project_id])

            if rent_data:
                monthly = float(rent_data[0]['monthly_rent'] or 0)
                annual_gpr = monthly * 12
                if annual_gpr <= 0:
                    return 0

                # Get deduction rates from assumptions
                vacancy_pct = 0.05
                credit_loss_pct = 0.005
                mgmt_fee_pct = 0.03
                try:
                    assumptions = self.execute_query("""
                        SELECT assumption_key, assumption_value
                        FROM landscape.tbl_project_assumption
                        WHERE project_id = %s
                          AND assumption_key IN ('physical_vacancy_pct', 'bad_debt_pct', 'management_fee_pct')
                    """, [self.project_id])
                    for a in assumptions:
                        val = float(a['assumption_value'] or 0)
                        if a['assumption_key'] == 'physical_vacancy_pct':
                            vacancy_pct = val
                        elif a['assumption_key'] == 'bad_debt_pct':
                            credit_loss_pct = val
                        elif a['assumption_key'] == 'management_fee_pct':
                            mgmt_fee_pct = val
                except Exception as e:
                    logger.warning("NOI deduction rates query failed: %s", e)

                egi = annual_gpr * (1 - vacancy_pct - credit_loss_pct)
                opex = egi * mgmt_fee_pct  # Simplified: mgmt fee as proxy for total opex ratio
                # Better: use actual opex if available
                actual_opex = self._get_annual_opex()
                if actual_opex > 0:
                    noi = egi - actual_opex
                else:
                    # Rough estimate: 40-50% expense ratio typical for MF
                    noi = egi * 0.55
                return max(noi, 0)
        except Exception as e:
            logger.warning("NOI (rent roll calc) failed: %s", e)
        return 0

    def _get_exit_sale_price(self):
        """Exit sale price from DCF assumptions (terminal NOI / cap rate)."""
        try:
            cap = self.execute_scalar("""
                SELECT assumption_value FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'cap_rate_exit'
            """, [self.project_id])
            noi = self._get_annual_noi()
            if cap and noi and float(cap) > 0:
                return noi / float(cap)
        except Exception as e:
            logger.warning("Exit sale price query failed: %s", e)
        return 0

    def _get_exit_info(self):
        """Informational string about exit (e.g. 'Yr 8 NOI $1,523,193 @ 5.00% cap')."""
        try:
            cap = self.execute_scalar("""
                SELECT assumption_value FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'cap_rate_exit'
            """, [self.project_id])
            noi = self._get_annual_noi()
            hold = self._get_hold_period()
            if cap and noi > 0:
                cap_val = float(cap)
                cap_pct = cap_val * 100 if cap_val < 1 else cap_val
                return f"Yr {hold + 1} NOI ${noi:,.0f} @ {cap_pct:.2f}% cap"
        except Exception as e:
            logger.warning("Exit info query failed: %s", e)
        return None

    # ── Flatten helper (for preview compat) ──────────────────────────

    @staticmethod
    def _flatten_groups(groups):
        """Legacy flatten for backwards compat — not used by new code."""
        rows = []
        for g in groups:
            rows.append({'category': g['name'], 'amount': g['total'], '_rowStyle': 'header'})
            for item in g.get('items', []):
                rows.append({'category': item['category'], 'amount': item['amount'], '_rowStyle': 'indent'})
        return rows

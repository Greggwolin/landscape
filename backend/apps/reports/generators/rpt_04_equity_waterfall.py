"""RPT_04: Equity Waterfall / Distribution Schedule generator."""

from .preview_base import PreviewBaseGenerator


class EquityWaterfallGenerator(PreviewBaseGenerator):
    report_code = 'RPT_04'
    report_name = 'Equity Waterfall'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Equity investors
        investors = self.execute_query("""
            SELECT
                COALESCE(investor_label, investor_type, 'Investor') AS investor,
                investor_type,
                COALESCE(commitment_amount, 0) AS commitment,
                COALESCE(ownership_pct, 0) AS ownership_pct,
                COALESCE(preferred_return_pct, 0) AS pref_return,
                COALESCE(promote_pct, 0) AS promote_pct
            FROM landscape.tbl_equity_investor
            WHERE project_id = %s
            ORDER BY sort_order, investor_type
        """, [self.project_id])

        if not investors:
            return {
                'title': 'Equity Waterfall',
                'subtitle': project.get('project_name', ''),
                'message': 'No equity investors configured. Set up equity structure in the Capitalization tab.',
                'sections': [],
            }

        total_equity = sum(float(i['commitment']) for i in investors)

        # KPIs
        sections.append(self.make_kpi_section('Equity Summary', [
            self.make_kpi_card('Total Equity', self.fmt_currency(total_equity)),
            self.make_kpi_card('Investors', str(len(investors))),
        ]))

        # Investor detail
        columns = [
            {'key': 'investor', 'label': 'Investor', 'align': 'left'},
            {'key': 'type', 'label': 'Type', 'align': 'left'},
            {'key': 'commitment', 'label': 'Commitment', 'align': 'right', 'format': 'currency'},
            {'key': 'ownership_pct', 'label': 'Ownership', 'align': 'right', 'format': 'percentage'},
            {'key': 'pref_return', 'label': 'Pref Return', 'align': 'right', 'format': 'percentage'},
            {'key': 'promote_pct', 'label': 'Promote', 'align': 'right', 'format': 'percentage'},
        ]

        rows = [
            {
                'investor': i['investor'],
                'type': i.get('investor_type', ''),
                'commitment': float(i['commitment']),
                'ownership_pct': float(i['ownership_pct']),
                'pref_return': float(i['pref_return']),
                'promote_pct': float(i['promote_pct']),
            }
            for i in investors
        ]

        totals = {'commitment': total_equity}
        sections.append(self.make_table_section('Investor Structure', columns, rows, totals))

        # Distribution tiers (if waterfall tiers exist)
        tiers = self.execute_query("""
            SELECT
                tier_number,
                tier_label,
                COALESCE(hurdle_rate, 0) AS hurdle_rate,
                COALESCE(gp_split_pct, 0) AS gp_split,
                COALESCE(lp_split_pct, 0) AS lp_split
            FROM landscape.tbl_equity_waterfall_tier
            WHERE project_id = %s
            ORDER BY tier_number
        """, [self.project_id])

        if tiers:
            tier_cols = [
                {'key': 'tier_label', 'label': 'Tier', 'align': 'left'},
                {'key': 'hurdle_rate', 'label': 'Hurdle', 'align': 'right', 'format': 'percentage'},
                {'key': 'gp_split', 'label': 'GP Split', 'align': 'right', 'format': 'percentage'},
                {'key': 'lp_split', 'label': 'LP Split', 'align': 'right', 'format': 'percentage'},
            ]
            tier_rows = [
                {
                    'tier_label': t['tier_label'] or f"Tier {t['tier_number']}",
                    'hurdle_rate': float(t['hurdle_rate']),
                    'gp_split': float(t['gp_split']),
                    'lp_split': float(t['lp_split']),
                }
                for t in tiers
            ]
            sections.append(self.make_table_section('Waterfall Tiers', tier_cols, tier_rows))

        return {
            'title': 'Equity Waterfall',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

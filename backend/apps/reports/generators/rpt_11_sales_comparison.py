"""RPT_11: Sales Comparison Approach generator.

Mirrors the Sales Comparison tab UI:
  1. Comparable details grid (MF/income comps only — excludes LAND)
  2. Adjustment matrix (transaction + property adjustments per comp)
  3. Indicated value summary (raw vs adjusted $/unit, weighted avg, total)

Land sales are excluded — they belong to the Cost Approach (land valuation).
"""

from .preview_base import PreviewBaseGenerator


class SalesComparisonGenerator(PreviewBaseGenerator):
    report_code = 'RPT_11'
    report_name = 'Sales Comparison Approach'

    # Adjustment type ordering matching ComparablesGrid UI
    TRANSACTION_ADJUSTMENTS = [
        ('property_rights', 'Property Rights'),
        ('financing', 'Financing'),
        ('sale_conditions', 'Conditions of Sale'),
        ('market_conditions', 'Market Conditions'),
        ('other', 'Other'),
    ]
    PROPERTY_ADJUSTMENTS = [
        ('location', 'Location'),
        ('physical_condition', 'Physical Condition'),
        ('physical_age', 'Age / Condition'),
        ('physical_unit_mix', 'Unit Mix'),
        ('physical_size', 'Size'),
        ('physical_building_sf', 'Building SF'),
        ('physical_stories', 'Stories'),
        ('economic', 'Economic'),
        ('legal', 'Legal'),
    ]

    def generate_preview(self) -> dict:
        project = self.get_project()
        project_type = (project.get('project_type_code') or 'MF').upper()
        sections = []

        # ── 1. Fetch comps (exclude LAND property_type) ──────────────
        comps = self.execute_query("""
            SELECT
                comparable_id,
                comp_number,
                COALESCE(property_name, address, 'Unnamed') AS property_name,
                COALESCE(city, '') AS city,
                state,
                sale_date,
                COALESCE(sale_price, 0) AS sale_price,
                units,
                COALESCE(price_per_unit, 0) AS price_per_unit,
                COALESCE(price_per_sf, 0) AS price_per_sf,
                year_built,
                building_sf,
                cap_rate,
                distance_from_subject,
                latitude,
                longitude
            FROM landscape.tbl_sales_comparables
            WHERE project_id = %s
              AND (property_type IS NULL OR UPPER(property_type) != 'LAND')
            ORDER BY comp_number, comparable_id
        """, [self.project_id])

        if not comps:
            return {
                'title': 'Sales Comparison Approach',
                'subtitle': project.get('project_name', ''),
                'message': 'No comparable sales found. Add comps in the Valuation tab.',
                'sections': [],
            }

        comp_ids = [c['comparable_id'] for c in comps]

        # ── 2. Fetch all adjustments for these comps ─────────────────
        adjustments = self.execute_query("""
            SELECT
                comparable_id,
                adjustment_type,
                adjustment_pct,
                user_adjustment_pct
            FROM landscape.tbl_sales_comp_adjustments
            WHERE comparable_id = ANY(%s)
            ORDER BY comparable_id, adjustment_type
        """, [comp_ids])

        # Index: comparable_id → { adjustment_type → effective_pct }
        adj_map: dict[int, dict[str, float]] = {}
        for a in adjustments:
            cid = a['comparable_id']
            atype = a['adjustment_type']
            pct = float(a['user_adjustment_pct']
                        if a['user_adjustment_pct'] is not None
                        else (a['adjustment_pct'] or 0))
            adj_map.setdefault(cid, {})[atype] = pct

        # ── 3. Subject property info ─────────────────────────────────
        subject = self.execute_query("""
            SELECT
                COALESCE(total_units, target_units, 0) AS subject_units,
                city AS subject_city,
                year_built AS subject_year_built,
                location_lon AS lng,
                location_lat AS lat,
                project_name
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [self.project_id])
        subject_units = int(subject[0]['subject_units']) if subject else 0
        subject_lng = float(subject[0]['lng']) if subject and subject[0].get('lng') else None
        subject_lat = float(subject[0]['lat']) if subject and subject[0].get('lat') else None
        subject_name = subject[0].get('project_name', 'Subject') if subject else 'Subject'

        # ── 4. KPI summary ──────────────────────────────────────────
        prices_raw = [float(c['price_per_unit']) for c in comps if c['price_per_unit']]
        adjusted_prices = []
        for c in comps:
            base = float(c['price_per_unit']) if c['price_per_unit'] else 0
            if base <= 0:
                continue
            total_adj = sum(adj_map.get(c['comparable_id'], {}).values())
            adjusted_prices.append(base * (1 + total_adj))

        avg_raw = self.safe_div(sum(prices_raw), len(prices_raw)) if prices_raw else 0
        avg_adj = self.safe_div(sum(adjusted_prices), len(adjusted_prices)) if adjusted_prices else 0
        indicated_value = avg_adj * subject_units if subject_units else 0

        sections.append(self.make_kpi_section('Sales Comparison Summary', [
            self.make_kpi_card('Comparables', str(len(comps))),
            self.make_kpi_card('Avg $/Unit (Raw)', self.fmt_currency(avg_raw)),
            self.make_kpi_card('Avg $/Unit (Adj)', self.fmt_currency(avg_adj)),
            self.make_kpi_card('Subject Units', str(subject_units)),
            self.make_kpi_card('Indicated Value', self.fmt_currency(indicated_value)),
        ]))

        # ── 4b. Comparable locations map ───────────────────────────────
        COMP_COLORS = [
            '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
            '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
            '#dcbeff', '#9A6324', '#800000', '#aaffc3', '#808000',
        ]

        if subject_lng and subject_lat:
            map_markers = [{
                'id': 'subject',
                'coordinates': [subject_lng, subject_lat],
                'color': '#2d8cf0',
                'label': 'Subject',
                'name': subject_name,
                'variant': 'pin',
            }]
            for idx, c in enumerate(comps):
                clat = c.get('latitude')
                clng = c.get('longitude')
                if clat and clng:
                    map_markers.append({
                        'id': f"comp-{c['comparable_id']}",
                        'coordinates': [float(clng), float(clat)],
                        'color': COMP_COLORS[idx % len(COMP_COLORS)],
                        'label': str(c['comp_number'] or idx + 1),
                        'name': c['property_name'] or f"Comp {c['comp_number'] or idx + 1}",
                        'variant': 'numbered',
                    })

            sections.append(self.make_map_section(
                'Comparable Locations', [subject_lng, subject_lat], map_markers
            ))

        # ── 5. Comparable details table ──────────────────────────────
        detail_cols = [
            {'key': 'comp_label', 'label': 'Comp', 'align': 'left'},
            {'key': 'city', 'label': 'City', 'align': 'left'},
            {'key': 'sale_date', 'label': 'Sale Date', 'align': 'left'},
            {'key': 'sale_price', 'label': 'Sale Price', 'align': 'right', 'format': 'currency'},
            {'key': 'units', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'price_per_unit', 'label': '$/Unit', 'align': 'right', 'format': 'currency'},
            {'key': 'price_per_sf', 'label': '$/SF', 'align': 'right', 'format': 'currency'},
            {'key': 'year_built', 'label': 'Year Built', 'align': 'right'},
            {'key': 'cap_rate_display', 'label': 'Cap Rate', 'align': 'right'},
        ]

        detail_rows = []
        for c in comps:
            # Format cap rate
            cap_display = ''
            if c['cap_rate'] is not None:
                try:
                    cap_display = f"{float(c['cap_rate']) * 100:.1f}%"
                except (ValueError, TypeError):
                    cap_display = str(c['cap_rate'])

            # Format sale date
            sale_date_display = ''
            if c['sale_date']:
                try:
                    from datetime import datetime as dt
                    d = c['sale_date']
                    if hasattr(d, 'strftime'):
                        sale_date_display = d.strftime('%b %Y')
                    else:
                        sale_date_display = dt.strptime(str(d)[:10], '%Y-%m-%d').strftime('%b %Y')
                except Exception:
                    sale_date_display = str(c['sale_date'])

            detail_rows.append({
                'comp_label': f"#{c['comp_number'] or '—'}: {c['property_name']}",
                'city': c['city'],
                'sale_date': sale_date_display,
                'sale_price': float(c['sale_price']),
                'units': int(c['units']) if c['units'] else 0,
                'price_per_unit': float(c['price_per_unit']),
                'price_per_sf': float(c['price_per_sf']),
                'year_built': str(c['year_built'] or ''),
                'cap_rate_display': cap_display,
            })

        sections.append(self.make_table_section('Comparable Properties', detail_cols, detail_rows))

        # ── 6. Adjustment matrix ─────────────────────────────────────
        # Build rows: each adjustment type is a row, each comp is a column
        all_adj_types = self.TRANSACTION_ADJUSTMENTS + self.PROPERTY_ADJUSTMENTS

        adj_cols = [{'key': 'adjustment', 'label': 'Adjustment', 'align': 'left'}]
        for c in comps:
            label = f"#{c['comp_number'] or c['comparable_id']}"
            adj_cols.append({
                'key': f"comp_{c['comparable_id']}",
                'label': label,
                'align': 'right',
                'format': 'percentage',
            })

        adj_rows = []

        # Transaction header
        adj_rows.append(self._section_header_row(comps, 'Transaction Adjustments'))
        for atype, alabel in self.TRANSACTION_ADJUSTMENTS:
            adj_rows.append(self._adjustment_row(comps, adj_map, atype, alabel))

        # Transaction subtotal
        adj_rows.append(self._subtotal_row(comps, adj_map, self.TRANSACTION_ADJUSTMENTS, 'Transaction Subtotal'))

        # Property header
        adj_rows.append(self._section_header_row(comps, 'Property Adjustments'))
        for atype, alabel in self.PROPERTY_ADJUSTMENTS:
            adj_rows.append(self._adjustment_row(comps, adj_map, atype, alabel))

        # Property subtotal
        adj_rows.append(self._subtotal_row(comps, adj_map, self.PROPERTY_ADJUSTMENTS, 'Property Subtotal'))

        # Net adjustment
        net_row = {'adjustment': 'Net Adjustment', '_rowStyle': 'total'}
        for c in comps:
            total = sum(adj_map.get(c['comparable_id'], {}).values())
            net_row[f"comp_{c['comparable_id']}"] = round(total * 100, 1)
        adj_rows.append(net_row)

        sections.append(self.make_table_section('Comparable Sales Adjustment Grid', adj_cols, adj_rows))

        # ── 7. Indicated value table ─────────────────────────────────
        iv_cols = [
            {'key': 'comp_label', 'label': 'Comparable', 'align': 'left'},
            {'key': 'raw_price', 'label': 'Raw $/Unit', 'align': 'right', 'format': 'currency'},
            {'key': 'net_adj', 'label': 'Net Adj %', 'align': 'right', 'format': 'percentage'},
            {'key': 'adjusted_price', 'label': 'Adj $/Unit', 'align': 'right', 'format': 'currency'},
        ]

        iv_rows = []
        for c in comps:
            base = float(c['price_per_unit']) if c['price_per_unit'] else 0
            total_adj = sum(adj_map.get(c['comparable_id'], {}).values())
            adj_price = base * (1 + total_adj) if base > 0 else 0

            iv_rows.append({
                'comp_label': f"#{c['comp_number'] or '—'}: {c['property_name']}",
                'raw_price': base,
                'net_adj': round(total_adj * 100, 1),
                'adjusted_price': round(adj_price, 0),
            })

        iv_totals = {
            'raw_price': avg_raw,
            'adjusted_price': avg_adj,
        }
        sections.append(self.make_table_section('Indicated Value', iv_cols, iv_rows, iv_totals))

        # ── 8. Value conclusion text ─────────────────────────────────
        if adjusted_prices and subject_units:
            min_adj = min(adjusted_prices)
            max_adj = max(adjusted_prices)
            narrative = (
                f"The Sales Comparison Approach analyzed {len(adjusted_prices)} comparable "
                f"{'sales' if len(adjusted_prices) != 1 else 'sale'} to derive an indicated value "
                f"for the subject property. After applying adjustments for location, condition, "
                f"size, and market conditions, the adjusted price per unit ranged from "
                f"{self.fmt_currency(min_adj)} to {self.fmt_currency(max_adj)} per unit, "
                f"yielding a weighted average of {self.fmt_currency(avg_adj)} per unit. "
                f"Applied to the subject's {subject_units} units, the Sales Comparison Approach "
                f"indicates a value of {self.fmt_currency(indicated_value)}."
            )
            sections.append(self.make_text_section('Value Conclusion', narrative))

        return {
            'title': 'Sales Comparison Approach',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    # ── helpers ───────────────────────────────────────────────────────

    def _adjustment_row(self, comps, adj_map, atype, label):
        """Build one adjustment row across all comps."""
        row = {'adjustment': label, '_rowStyle': 'indent'}
        for c in comps:
            pct = adj_map.get(c['comparable_id'], {}).get(atype, 0)
            row[f"comp_{c['comparable_id']}"] = round(pct * 100, 1)
        return row

    def _subtotal_row(self, comps, adj_map, adj_types, label):
        """Build subtotal row for a group of adjustment types."""
        type_keys = [t[0] for t in adj_types]
        row = {'adjustment': label, '_rowStyle': 'subtotal'}
        for c in comps:
            comp_adjs = adj_map.get(c['comparable_id'], {})
            subtotal = sum(comp_adjs.get(t, 0) for t in type_keys)
            row[f"comp_{c['comparable_id']}"] = round(subtotal * 100, 1)
        return row

    def _section_header_row(self, comps, label):
        """Build a section header row (label only, empty values)."""
        row = {'adjustment': label, '_rowStyle': 'header'}
        for c in comps:
            row[f"comp_{c['comparable_id']}"] = ''
        return row

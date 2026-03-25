"""RPT_14: Parcel Inventory generator."""

from .preview_base import PreviewBaseGenerator


class ParcelTableGenerator(PreviewBaseGenerator):
    report_code = 'RPT_14'
    report_name = 'Parcel Inventory'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        parcels = self.execute_query("""
            SELECT
                p.parcel_id,
                COALESCE(p.parcel_name, p.parcel_code, CAST(p.parcel_id AS TEXT)) AS parcel_label,
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COALESCE(p.lot_product, p.landuse_type, 'Unassigned') AS land_use,
                COALESCE(p.acres_gross, 0) AS acres,
                COALESCE(p.units_total, 0) AS lot_count,
                COALESCE(p.saleprice, 0) AS price_per_unit,
                COALESCE(p.saleprice * p.units_total, 0) AS total_value
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            ORDER BY ph.phase_name, p.parcel_name
        """, [self.project_id])

        if not parcels:
            return {
                'title': 'Parcel Inventory',
                'subtitle': project.get('project_name', ''),
                'message': 'No parcels found. Add parcels in the Property tab.',
                'sections': [],
            }

        # KPIs
        total_parcels = len(parcels)
        total_acres = sum(float(p['acres']) for p in parcels)
        total_lots = sum(int(p['lot_count']) for p in parcels)
        total_value = sum(float(p['total_value']) for p in parcels)

        sections.append(self.make_kpi_section('Inventory Summary', [
            self.make_kpi_card('Parcels', str(total_parcels)),
            self.make_kpi_card('Total Acres', self.fmt_number(total_acres, 1)),
            self.make_kpi_card('Total Lots', self.fmt_number(total_lots)),
            self.make_kpi_card('Total Value', self.fmt_currency(total_value)),
        ]))

        # Detail table
        columns = [
            {'key': 'parcel_label', 'label': 'Parcel', 'align': 'left'},
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'land_use', 'label': 'Land Use', 'align': 'left'},
            {'key': 'acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
            {'key': 'lot_count', 'label': 'Lots', 'align': 'right', 'format': 'number'},
            {'key': 'price_per_unit', 'label': '$/Unit', 'align': 'right', 'format': 'currency'},
            {'key': 'total_value', 'label': 'Total Value', 'align': 'right', 'format': 'currency'},
        ]

        rows = [
            {
                'parcel_label': p['parcel_label'],
                'phase_name': p['phase_name'],
                'land_use': p['land_use'],
                'acres': float(p['acres']),
                'lot_count': int(p['lot_count']),
                'price_per_unit': float(p['price_per_unit']),
                'total_value': float(p['total_value']),
            }
            for p in parcels
        ]

        totals = {
            'acres': total_acres,
            'lot_count': total_lots,
            'total_value': total_value,
        }
        sections.append(self.make_table_section('Parcel Detail', columns, rows, totals))

        # Summary by phase
        phase_rows = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COUNT(*) AS parcel_count,
                COALESCE(SUM(p.acres_gross), 0) AS acres,
                COALESCE(SUM(p.units_total), 0) AS lots,
                COALESCE(SUM(p.saleprice * p.units_total), 0) AS value
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            GROUP BY COALESCE(ph.phase_name, 'Unphased')
            ORDER BY phase_name
        """, [self.project_id])

        if phase_rows:
            phase_cols = [
                {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
                {'key': 'parcel_count', 'label': 'Parcels', 'align': 'right', 'format': 'number'},
                {'key': 'acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
                {'key': 'lots', 'label': 'Lots', 'align': 'right', 'format': 'number'},
                {'key': 'value', 'label': 'Value', 'align': 'right', 'format': 'currency'},
            ]
            formatted = [
                {
                    'phase_name': r['phase_name'],
                    'parcel_count': r['parcel_count'],
                    'acres': float(r['acres']),
                    'lots': int(r['lots']),
                    'value': float(r['value']),
                }
                for r in phase_rows
            ]
            sections.append(self.make_table_section('Summary by Phase', phase_cols, formatted))

        return {
            'title': 'Parcel Inventory',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

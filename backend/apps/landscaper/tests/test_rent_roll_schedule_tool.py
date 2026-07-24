"""RR1 — rent-roll schedule artifact builder + registration tests.

Pure-function tests (no DB): the builder assembles the fixed schema from unit
rows, keeps in-place/market/status editable and loss-to-lease calculated, and
applies the data-granularity Driver-1 floor. Registration tests confirm
get_rent_roll_schedule is advertised and gated MF-only. Session: LSCMD-RR-RENTROLL-0724.
"""

from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
from apps.landscaper.tools.rent_roll_artifact_builder import (
    build_rent_roll_artifact_schema,
    create_rent_roll_artifact,
)


# A rich roll: two buildings, market rents, one Section 8, one delinquency, one reno.
_UNITS = [
    {'unit_id': 1, 'unit_number': 'A-101', 'building_name': 'A', 'unit_type': '1BR/1BA',
     'square_feet': 720.0, 'market_rent': 1690.0, 'current_rent': 1540.0,
     'occupancy_status': 'Occupied', 'lease_end_date': None, 'past_due_amount': 0.0,
     'is_section8': False, 'renovation_status': ''},
    {'unit_id': 2, 'unit_number': 'B-205', 'building_name': 'B', 'unit_type': '2BR/2BA',
     'square_feet': 1050.0, 'market_rent': 2100.0, 'current_rent': 1950.0,
     'occupancy_status': 'Occupied', 'lease_end_date': None, 'past_due_amount': 320.0,
     'is_section8': True, 'renovation_status': 'Renovated'},
    {'unit_id': 3, 'unit_number': 'B-206', 'building_name': 'B', 'unit_type': '2BR/2BA',
     'square_feet': 1050.0, 'market_rent': 2100.0, 'current_rent': 0.0,
     'occupancy_status': 'Vacant', 'lease_end_date': None, 'past_due_amount': 0.0,
     'is_section8': False, 'renovation_status': ''},
]


def _build(units=None):
    units = _UNITS if units is None else units
    occupied = sum(1 for u in units if (u.get('occupancy_status') or '').lower() == 'occupied')
    in_place = sum((u.get('current_rent') or 0) for u in units)
    any_market = any(u.get('market_rent') is not None for u in units)
    market = sum((u.get('market_rent') or 0) for u in units) if any_market else None
    ltl = (sum(u['market_rent'] - u['current_rent'] for u in units
               if u.get('market_rent') is not None and u.get('current_rent') is not None)
           if any_market else None)
    return build_rent_roll_artifact_schema(
        units, unit_count=len(units), occupied_count=occupied,
        total_in_place=in_place, total_market=market, total_loss_to_lease=ltl,
    )


def test_two_blocks_kpi_and_grid():
    blocks = _build()['blocks']
    assert blocks[0]['id'] == 'rent_roll_kpis'
    assert blocks[1]['id'] == 'rent_roll_grid'
    assert len(blocks) == 2


def test_kpi_header_reconciles():
    kpis = {p['label']: p['value'] for p in _build()['blocks'][0]['pairs']}
    assert kpis['Units'] == 3
    assert kpis['Occupancy'] == '66.7%'                # 2 of 3 occupied
    assert kpis['In-Place Rent (mo)'] == round(1540 + 1950 + 0)
    assert kpis['Market Rent (mo)'] == round(1690 + 2100 + 2100)
    assert kpis['Loss-to-Lease (mo)'] == round((1690 - 1540) + (2100 - 1950) + (2100 - 0))


def test_in_place_editable_loss_to_lease_calculated():
    cols = {c['key']: c for c in _build()['blocks'][1]['columns']}
    assert cols['in_place']['editable'] is True
    assert cols['market']['editable'] is True
    assert cols['status']['editable'] is True
    assert cols['loss_to_lease']['editable'] is False   # calculated
    assert cols['unit']['editable'] is False
    assert cols['unit_type']['editable'] is False


def test_loss_to_lease_is_market_minus_in_place():
    rows = _build()['blocks'][1]['rows']
    first = rows[0]['cells']
    assert first['loss_to_lease'] == 1690.0 - 1540.0


def test_granularity_columns_show_when_data_present():
    keys = [c['key'] for c in _build()['blocks'][1]['columns']]
    assert 'building' in keys        # two buildings
    assert 'market' in keys          # market rents present
    assert 'loss_to_lease' in keys   # market beside in-place
    assert 'subsidy' in keys         # one Section 8 unit
    assert 'delinquency' in keys     # one past-due unit
    assert 'reno' in keys            # one renovated unit


def test_granularity_columns_hide_when_data_absent():
    plain = [{
        'unit_id': 1, 'unit_number': '101', 'building_name': 'A', 'unit_type': '1BR/1BA',
        'square_feet': None, 'market_rent': None, 'current_rent': 1500.0,
        'occupancy_status': 'Occupied', 'lease_end_date': None, 'past_due_amount': 0.0,
        'is_section8': False, 'renovation_status': '',
    }]
    keys = [c['key'] for c in _build(units=plain)['blocks'][1]['columns']]
    assert 'building' not in keys       # single building
    assert 'market' not in keys         # no market rents
    assert 'loss_to_lease' not in keys
    assert 'subsidy' not in keys
    assert 'delinquency' not in keys
    assert 'reno' not in keys


def test_create_rent_roll_artifact_rejects_empty_without_touching_db():
    result = create_rent_roll_artifact(
        project_id=9, project_name='X', unit_rows=[], unit_count=0,
        occupied_count=0, total_in_place=0, total_market=None, total_loss_to_lease=None,
    )
    assert result['success'] is False


def test_get_rent_roll_schedule_advertised_and_gated_mf_only():
    advertised = {t['name'] for t in LANDSCAPER_TOOLS}
    assert 'get_rent_roll_schedule' in advertised
    mf_tools = get_tools_for_page('chat', project_type_code='mf')
    land_tools = get_tools_for_page('chat', project_type_code='land')
    assert 'get_rent_roll_schedule' in mf_tools
    assert 'get_rent_roll_schedule' not in land_tools

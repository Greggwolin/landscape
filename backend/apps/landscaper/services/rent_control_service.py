"""
Rent Control Service

Provides rent control awareness for Loss to Lease and Year 1 Buyer NOI calculations.

Key considerations:
- California AB 1482 (Tenant Protection Act): Caps annual rent increases at 5% + CPI or 10%, whichever is lower
- Local rent control ordinances (LA, SF, Oakland, etc.): More restrictive, often 3-5% caps
- Exemptions: New construction (15 years), single-family homes, small landlords (varies)
- Costa-Hawkins: Allows vacancy decontrol (can raise to market on turnover) in CA

Impact on Loss to Lease:
- Without rent control: LTL recovered when leases expire
- With rent control: Recovery capped at allowable increase rate
- Time to recover LTL much longer under rent control
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Any, Optional, List
from django.db import connection
import logging

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Known Rent Control Jurisdictions
# ─────────────────────────────────────────────────────────────────────────────

# Cities with local rent control (stricter than AB 1482)
LOCAL_RENT_CONTROL_CITIES = {
    # California
    'los angeles': {'state': 'CA', 'max_increase': Decimal('0.04'), 'ordinance': 'LA RSO'},
    'san francisco': {'state': 'CA', 'max_increase': Decimal('0.025'), 'ordinance': 'SF Rent Ordinance'},
    'oakland': {'state': 'CA', 'max_increase': Decimal('0.03'), 'ordinance': 'Oakland Rent Adjustment'},
    'berkeley': {'state': 'CA', 'max_increase': Decimal('0.065'), 'ordinance': 'Berkeley Rent Stabilization'},
    'san jose': {'state': 'CA', 'max_increase': Decimal('0.05'), 'ordinance': 'Apartment Rent Ordinance'},
    'santa monica': {'state': 'CA', 'max_increase': Decimal('0.03'), 'ordinance': 'SM Rent Control'},
    'west hollywood': {'state': 'CA', 'max_increase': Decimal('0.03'), 'ordinance': 'WeHo Rent Stabilization'},
    'beverly hills': {'state': 'CA', 'max_increase': Decimal('0.03'), 'ordinance': 'BH Rent Stabilization'},
    'east palo alto': {'state': 'CA', 'max_increase': Decimal('0.10'), 'ordinance': 'EPA Rent Stabilization'},
    'hayward': {'state': 'CA', 'max_increase': Decimal('0.05'), 'ordinance': 'Hayward Rent Review'},
    'mountain view': {'state': 'CA', 'max_increase': Decimal('0.05'), 'ordinance': 'CSFRA'},
    'richmond': {'state': 'CA', 'max_increase': Decimal('0.03'), 'ordinance': 'Richmond Rent Control'},

    # New York
    'new york': {'state': 'NY', 'max_increase': Decimal('0.03'), 'ordinance': 'NYC Rent Stabilization'},

    # Oregon (statewide)
    # Note: Oregon has statewide rent control (SB 608) - 7% + CPI

    # Washington DC
    'washington': {'state': 'DC', 'max_increase': Decimal('0.02'), 'ordinance': 'DC Rent Control'},
}

# States with statewide rent control
STATEWIDE_RENT_CONTROL = {
    'CA': {'max_increase': Decimal('0.10'), 'ordinance': 'AB 1482', 'effective_date': '2020-01-01'},
    'OR': {'max_increase': Decimal('0.07'), 'ordinance': 'SB 608', 'effective_date': '2019-02-28'},
    # NY has complex statewide laws that vary by building type
}


@dataclass
class RentControlStatus:
    """Rent control status for a property."""
    is_rent_controlled: bool
    is_exempt: bool
    exemption_reason: Optional[str]
    ordinance_name: Optional[str]
    max_annual_increase: Optional[Decimal]
    allows_vacancy_decontrol: bool  # Can raise to market on turnover
    jurisdiction_city: Optional[str]
    jurisdiction_state: Optional[str]
    notes: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_rent_controlled': self.is_rent_controlled,
            'is_exempt': self.is_exempt,
            'exemption_reason': self.exemption_reason,
            'ordinance_name': self.ordinance_name,
            'max_annual_increase': float(self.max_annual_increase) if self.max_annual_increase else None,
            'allows_vacancy_decontrol': self.allows_vacancy_decontrol,
            'jurisdiction_city': self.jurisdiction_city,
            'jurisdiction_state': self.jurisdiction_state,
            'notes': self.notes,
        }


@dataclass
class RentControlImpact:
    """Impact of rent control on Loss to Lease recovery."""
    has_impact: bool
    max_annual_increase: Optional[Decimal]
    years_to_full_recovery: Optional[float]
    annual_recovery_potential: Optional[Decimal]
    unrealized_ltl_year1: Optional[Decimal]  # LTL that cannot be recovered in Year 1
    notes: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'has_impact': self.has_impact,
            'max_annual_increase': float(self.max_annual_increase) if self.max_annual_increase else None,
            'years_to_full_recovery': self.years_to_full_recovery,
            'annual_recovery_potential': float(self.annual_recovery_potential) if self.annual_recovery_potential else None,
            'unrealized_ltl_year1': float(self.unrealized_ltl_year1) if self.unrealized_ltl_year1 else None,
            'notes': self.notes,
        }


class RentControlService:
    """
    Service for rent control awareness in underwriting.

    Determines:
    1. Whether property is subject to rent control
    2. What the maximum allowable increase is
    3. Impact on Loss to Lease recovery timeline
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._property_data: Optional[Dict[str, Any]] = None

    def get_rent_control_status(self) -> RentControlStatus:
        """
        Determine rent control status for the property.

        Checks:
        1. Property-level rent_control_exempt flag (from OM extraction)
        2. Jurisdiction lookup (city + state)
        3. Year built exemption (new construction)
        """
        data = self._get_property_data()

        city = (data.get('city') or data.get('jurisdiction_city') or '').lower().strip()
        state = (data.get('state') or data.get('jurisdiction_state') or '').upper().strip()
        year_built = data.get('year_built')
        is_exempt_flag = data.get('rent_control_exempt')
        stored_ordinance = data.get('rent_control_ordinance')

        # If explicitly marked exempt in database
        if is_exempt_flag is True:
            return RentControlStatus(
                is_rent_controlled=False,
                is_exempt=True,
                exemption_reason=stored_ordinance or 'Property marked as exempt',
                ordinance_name=None,
                max_annual_increase=None,
                allows_vacancy_decontrol=True,
                jurisdiction_city=city or None,
                jurisdiction_state=state or None,
                notes='Property flagged as rent control exempt in project data.',
            )

        # Check for new construction exemption (15 years in CA)
        if year_built and state == 'CA':
            from datetime import date
            current_year = date.today().year
            if year_built > current_year - 15:
                return RentControlStatus(
                    is_rent_controlled=False,
                    is_exempt=True,
                    exemption_reason=f'New construction (built {year_built})',
                    ordinance_name=None,
                    max_annual_increase=None,
                    allows_vacancy_decontrol=True,
                    jurisdiction_city=city or None,
                    jurisdiction_state=state or None,
                    notes=f'Property built in {year_built} is exempt from rent control under AB 1482 new construction exemption (15 years).',
                )

        # Check for local rent control first (more restrictive)
        if city in LOCAL_RENT_CONTROL_CITIES:
            local = LOCAL_RENT_CONTROL_CITIES[city]
            if local['state'] == state:
                # CA cities generally allow vacancy decontrol (Costa-Hawkins)
                allows_decontrol = state == 'CA'

                return RentControlStatus(
                    is_rent_controlled=True,
                    is_exempt=False,
                    exemption_reason=None,
                    ordinance_name=local['ordinance'],
                    max_annual_increase=local['max_increase'],
                    allows_vacancy_decontrol=allows_decontrol,
                    jurisdiction_city=city,
                    jurisdiction_state=state,
                    notes=f'Subject to {local["ordinance"]}. Max annual increase: {local["max_increase"] * 100:.1f}%.' +
                          (' Vacancy decontrol allowed.' if allows_decontrol else ' No vacancy decontrol.'),
                )

        # Check for statewide rent control
        if state in STATEWIDE_RENT_CONTROL:
            statewide = STATEWIDE_RENT_CONTROL[state]
            return RentControlStatus(
                is_rent_controlled=True,
                is_exempt=False,
                exemption_reason=None,
                ordinance_name=statewide['ordinance'],
                max_annual_increase=statewide['max_increase'],
                allows_vacancy_decontrol=state == 'CA',  # Costa-Hawkins
                jurisdiction_city=city or None,
                jurisdiction_state=state,
                notes=f'Subject to statewide {statewide["ordinance"]}. Max annual increase: {statewide["max_increase"] * 100:.0f}%.',
            )

        # No rent control detected
        return RentControlStatus(
            is_rent_controlled=False,
            is_exempt=False,
            exemption_reason=None,
            ordinance_name=None,
            max_annual_increase=None,
            allows_vacancy_decontrol=True,
            jurisdiction_city=city or None,
            jurisdiction_state=state or None,
            notes='No rent control ordinance detected for this jurisdiction.',
        )

    def calculate_ltl_recovery_impact(
        self,
        annual_loss_to_lease: Decimal,
        total_current_rent: Decimal,
        avg_months_to_expiration: Optional[float] = None,
    ) -> RentControlImpact:
        """
        Calculate impact of rent control on Loss to Lease recovery.

        Args:
            annual_loss_to_lease: Total annual LTL gap
            total_current_rent: Total current monthly rent
            avg_months_to_expiration: Average months until lease expires

        Returns:
            RentControlImpact with recovery timeline and constraints
        """
        status = self.get_rent_control_status()

        if not status.is_rent_controlled or status.is_exempt:
            return RentControlImpact(
                has_impact=False,
                max_annual_increase=None,
                years_to_full_recovery=None,
                annual_recovery_potential=None,
                unrealized_ltl_year1=None,
                notes='No rent control - LTL can be fully recovered when leases expire.',
            )

        if status.allows_vacancy_decontrol:
            # With vacancy decontrol, can recover LTL on turnover
            # But existing tenants are capped
            max_increase = status.max_annual_increase or Decimal('0.05')
            annual_rent = total_current_rent * 12

            # How much can we recover per year from existing tenants?
            max_annual_recovery = annual_rent * max_increase

            # How many years to fully recover LTL (from existing tenants)?
            if max_annual_recovery > 0:
                years_to_recover = float(annual_loss_to_lease / max_annual_recovery)
            else:
                years_to_recover = None

            # How much LTL remains unrealized in Year 1?
            year1_recovery = min(max_annual_recovery, annual_loss_to_lease)
            unrealized_year1 = annual_loss_to_lease - year1_recovery

            return RentControlImpact(
                has_impact=True,
                max_annual_increase=max_increase,
                years_to_full_recovery=years_to_recover,
                annual_recovery_potential=max_annual_recovery,
                unrealized_ltl_year1=unrealized_year1,
                notes=f'Rent increases capped at {max_increase * 100:.0f}% annually for existing tenants. '
                      f'Can raise to market on turnover (vacancy decontrol). '
                      f'Est. {years_to_recover:.1f} years to fully recover LTL if no turnover.',
            )
        else:
            # No vacancy decontrol - recovery severely constrained
            max_increase = status.max_annual_increase or Decimal('0.03')
            annual_rent = total_current_rent * 12
            max_annual_recovery = annual_rent * max_increase

            if max_annual_recovery > 0:
                years_to_recover = float(annual_loss_to_lease / max_annual_recovery)
            else:
                years_to_recover = None

            year1_recovery = min(max_annual_recovery, annual_loss_to_lease)
            unrealized_year1 = annual_loss_to_lease - year1_recovery

            return RentControlImpact(
                has_impact=True,
                max_annual_increase=max_increase,
                years_to_full_recovery=years_to_recover,
                annual_recovery_potential=max_annual_recovery,
                unrealized_ltl_year1=unrealized_year1,
                notes=f'Strict rent control: {max_increase * 100:.0f}% cap with no vacancy decontrol. '
                      f'LTL recovery constrained even on turnover. '
                      f'Est. {years_to_recover:.1f} years to fully recover LTL.',
            )

    def _get_property_data(self) -> Dict[str, Any]:
        """Get property data from database."""
        if self._property_data is not None:
            return self._property_data

        with connection.cursor() as cursor:
            # Get data from tbl_multifamily_property and tbl_project
            cursor.execute("""
                SELECT
                    p.jurisdiction_city,
                    p.jurisdiction_state,
                    p.city,
                    p.state,
                    mp.year_built,
                    mp.rent_control_exempt,
                    mp.rent_control_ordinance
                FROM landscape.tbl_project p
                LEFT JOIN landscape.tbl_multifamily_property mp ON p.project_id = mp.project_id
                WHERE p.project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            if row:
                columns = [col[0] for col in cursor.description]
                self._property_data = dict(zip(columns, row))
            else:
                self._property_data = {}

        return self._property_data


def format_rent_control_summary(
    status: RentControlStatus,
    impact: Optional[RentControlImpact] = None,
) -> str:
    """Format rent control status and impact for Landscaper responses."""
    lines = ["## Rent Control Analysis", ""]

    if not status.is_rent_controlled:
        if status.is_exempt:
            lines.extend([
                f"**Status:** Exempt from rent control",
                f"**Reason:** {status.exemption_reason}",
                "",
                "Loss to Lease can be fully recovered when leases expire.",
            ])
        else:
            lines.extend([
                "**Status:** No rent control ordinance applies",
                "",
                "Loss to Lease can be fully recovered when leases expire.",
            ])
    else:
        lines.extend([
            f"**Status:** Subject to rent control",
            f"**Ordinance:** {status.ordinance_name}",
            f"**Max Annual Increase:** {status.max_annual_increase * 100:.1f}%",
            f"**Vacancy Decontrol:** {'Yes' if status.allows_vacancy_decontrol else 'No'}",
        ])

        if status.notes:
            lines.extend(["", status.notes])

        if impact and impact.has_impact:
            lines.extend([
                "",
                "### Impact on Loss to Lease Recovery",
                f"- Max recoverable per year: ${impact.annual_recovery_potential:,.0f}",
                f"- LTL not recoverable in Year 1: ${impact.unrealized_ltl_year1:,.0f}",
                f"- Years to full recovery: {impact.years_to_full_recovery:.1f}",
            ])

    return "\n".join(lines)

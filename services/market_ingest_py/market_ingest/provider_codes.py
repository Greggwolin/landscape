"""
Turn a series template plus a geography into the code a publisher expects.

WHY THIS FILE EXISTS (2026-09-29, chat MQ)
------------------------------------------
Until today several metro- and state-level series carried a publisher code that
named ONE place -- ``PHOE004NA`` (Phoenix payrolls), ``ATNHPIUS38060Q`` (Phoenix
home prices), ``PHOE004BP1FHSA`` (Phoenix permits), ``AZPOP``, ``AZMARI3POP``.
The runner fetched that code for every geography the series was requested for,
so Tucson and Los Angeles were stored with Phoenix's figures (215 rows, found
and quarantined 2026-09-29). Two templates also never resolved at all
(``{AREA_CODE}``, ``{PLACE_CODE}``) and two BLS templates were the wrong length,
which is why metro and state unemployment stopped updating after 2024-12.

The rules this module enforces:

1. A code for a geography below the nation must be derived FROM that geography.
   A template with no placeholder is refused for any level but US, unless an
   explicit per-geography override exists (``public.series_geo_alias``).
2. A template that still contains ``{`` after substitution is refused. Nothing
   is ever sent to a publisher half-built.
3. Refusal is ``None`` plus a reason -- the caller skips that one series for that
   one geography and says so. It never fails the whole geography.

BLS code shapes (verified against the live BLS API 2026-09-29):
  LAUS  = 'LA' + adj('U'|'S') + area(15) + measure(2)
          area ST = 'ST' + st + 11 zeros       -> LAUST040000000000003
          area MT = 'MT' + st + cbsa + 6 zeros -> LAUMT043806000000003
          area CN = 'CN' + st + cty + 8 zeros  -> LAUCN040130000000003
          area CT = 'CT' + st + place + 6 zeros -> LAUCT045500000000003 (cities 25k+)
  CES   = 'SM' + adj('U'|'S') + st(2) + area(5) + industry(8) + datatype(2)
          state area = '00000', metro area = cbsa -> SMU04380600000000001
"""

from __future__ import annotations

import re
from typing import Optional, Tuple

# Two-letter postal code by state FIPS. Kept here rather than imported so this
# module stays free of the database layer and can be unit-tested on its own.
FIPS_TO_ABBR = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY", "72": "PR",
}

_PLACEHOLDER = re.compile(r"\{[A-Z_]+\}")


def laus_area(geo_level: str, state_fips: Optional[str], cbsa: Optional[str] = None,
              county_fips: Optional[str] = None, place_fips: Optional[str] = None) -> Optional[str]:
    """15-character BLS LAUS area code, or None if the geography cannot carry one."""
    st = (state_fips or "").zfill(2) if state_fips else None
    if not st:
        return None
    if geo_level == "STATE":
        return "ST" + st + "0" * 11
    if geo_level in ("MSA", "MICRO"):
        if not cbsa or len(cbsa) != 5:
            return None  # CSA codes (3 digits) have no LAUS area
        return "MT" + st + cbsa + "0" * 6
    if geo_level == "COUNTY":
        cty = (county_fips or "")[-3:]
        if len(cty) != 3:
            return None
        return "CN" + st + cty + "0" * 8
    if geo_level == "CITY":
        # Cities of 25,000+ only; smaller places simply return no data.
        place = (place_fips or "")[-5:]
        if len(place) != 5:
            return None
        return "CT" + st + place + "0" * 6
    return None


def ces_area(geo_level: str, state_fips: Optional[str], cbsa: Optional[str] = None) -> Optional[str]:
    """7-character CES state+area prefix (state 2 + area 5), or None."""
    st = (state_fips or "").zfill(2) if state_fips else None
    if not st:
        return None
    if geo_level == "STATE":
        return st + "00000"
    if geo_level in ("MSA", "MICRO"):
        if not cbsa or len(cbsa) != 5:
            return None
        return st + cbsa
    return None


def resolve_provider_code(
    template: Optional[str],
    *,
    geo_level: str,
    state_fips: Optional[str] = None,
    county_fips: Optional[str] = None,
    place_fips: Optional[str] = None,
    cbsa_code: Optional[str] = None,
    override: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Return ``(code, None)`` when a publisher code can be built for this geography,
    or ``(None, reason)`` when it cannot. ``override`` (from series_geo_alias) wins
    outright -- it is a code a person verified for exactly this geography.
    """
    if override:
        return override, None
    if not template:
        return None, "no publisher code recorded for this series"

    has_placeholder = bool(_PLACEHOLDER.search(template))
    if not has_placeholder and geo_level != "US":
        return None, (
            f"code '{template}' names one fixed place, so it cannot be used for a "
            f"{geo_level} geography without a per-geography override"
        )

    st = state_fips.zfill(2) if state_fips else None
    values = {
        "{STATE_FIPS}": st,
        "{STATE_ABBR}": FIPS_TO_ABBR.get(st or ""),
        "{COUNTY_FIPS}": (county_fips or "")[-3:] or None,
        "{PLACE_FIPS}": place_fips,
        "{CBSA_CODE}": cbsa_code,
        "{CBSA}": cbsa_code,
        "{LAUS_AREA}": laus_area(geo_level, st, cbsa_code, county_fips, place_fips),
        "{CES_AREA}": ces_area(geo_level, st, cbsa_code),
    }
    code = template
    for key, val in values.items():
        if key in code:
            if not val:
                return None, f"{key} cannot be derived for this {geo_level} geography"
            code = code.replace(key, val)

    if "{" in code:
        return None, f"template '{template}' has a placeholder this module does not know"
    return code, None

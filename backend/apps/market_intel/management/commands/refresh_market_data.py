"""Monthly refresh of the market data the platform already tracks.

WHAT THIS RUNS
--------------
A thin wrapper around ``market_ingest.runner.main`` in ``services/market_ingest_py``
-- the same CLI a person runs by hand today. It adds no fetching logic of its own;
it decides *what* to ask for and runs the existing engine once per geography.

The precedent for reaching that package is
``backend/apps/location_intelligence/management/commands/load_block_groups.py``,
which does the same ``sys.path`` work. Note that the three ``ingest_*.py`` commands
in this same directory are NOT the precedent -- they import from
``backend/tools/market_ingest/``, a different package that ships inside ``backend/``.
This one does not ship to Railway at all (the Railway build context is ``backend/``
only), which is why it is scheduled from GitHub Actions instead.

THE DEFAULT REQUEST
-------------------
Geographies: every geography in ``public.market_data`` except the four listed in
EXCLUDED_GEOS below. That is 31 geographies carrying 228 geography/series pairs
across 70 distinct series codes, as measured 2026-08-23.

This job exists to stop data that is already tracked from going stale. Choosing
NEW coverage is a separate decision with cost attached, and burying it inside a
plumbing change is how scope arrives unannounced -- so the set is derived from
what the database already holds, not from a hardcoded list that would drift.

Window: 36 months back from today, to the current date.
  * Long enough for a trailing-12-month comparison with a full year of slack, so
    the CPI baseline view has room even if a run is missed.
  * Covers three annual observations, so the December census/ACS drop always falls
    inside the window no matter which month the job happens to run.
  * Short enough that each provider request stays small; the upsert is keyed on
    (series_id, geo_id, date), so re-fetching an existing point overwrites in place
    and also recaptures upstream revisions, which FRED issues for up to ~2 years.

EXCLUSIONS -- deliberate, dated, do not "helpfully" restore
----------------------------------------------------------
Oregon (STATE 41) and Multnomah County (41051) are excluded by Gregg's direction,
2026-08-23: no project is in Oregon, so refreshing it every month buys nothing.
Their existing rows stay in the database; they are simply not re-fetched.

The two Arizona census tracts (04013610800 "6108", 04021001714 "17.14") are
excluded for a different reason: between them they hold 18 observations, newest
2023-01, of a single series. Excluding them drops ACS_TRACT_MEDIAN_HH_INC from the
refresh set entirely -- it exists at no other geography. That is accepted; nothing
reads it.
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

# Geographies deliberately not refreshed. See the module docstring.
EXCLUDED_GEOS = ('41', '41051', '04013610800', '04021001714')

DEFAULT_WINDOW_MONTHS = 36


def _load_runner():
    """Put services/market_ingest_py on the path and import the engine."""
    package_path = Path(settings.BASE_DIR).parent / 'services' / 'market_ingest_py'
    if not package_path.exists():
        raise CommandError(
            f'market_ingest package not found at {package_path}. This command cannot run '
            'from a deployment whose build context excludes services/ (e.g. Railway); it is '
            'scheduled from GitHub Actions, which checks out the whole repository.'
        )
    if str(package_path) not in sys.path:
        sys.path.insert(0, str(package_path))
    from market_ingest import runner  # noqa: PLC0415  -- deliberately late

    return runner


def _refresh_set():
    """(geo_id, geo_level, geo_name, [series_code, ...]) for every tracked geography."""
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT md.geo_id,
                   gx.geo_level,
                   gx.geo_name,
                   array_agg(DISTINCT ms.series_code ORDER BY ms.series_code) AS series_codes
              FROM public.market_data md
              JOIN public.geo_xwalk gx ON gx.geo_id = md.geo_id
              JOIN public.market_series ms ON ms.series_id = md.series_id
             WHERE md.geo_id <> ALL(%s)
               AND ms.is_active = TRUE
             GROUP BY md.geo_id, gx.geo_level, gx.geo_name
             ORDER BY gx.geo_level, md.geo_id
            """,
            (list(EXCLUDED_GEOS),),
        )
        return cur.fetchall()


class Command(BaseCommand):
    help = 'Re-fetch the market series this platform already tracks. Monthly; see module docstring.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--window-months', type=int, default=DEFAULT_WINDOW_MONTHS,
            help=f'How far back to re-fetch (default {DEFAULT_WINDOW_MONTHS}).',
        )
        parser.add_argument(
            '--geo-id', action='append', dest='only_geos',
            help='Restrict to one geography. Repeatable. Useful for a smoke test.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Fetch and normalise but write nothing.',
        )
        parser.add_argument(
            '--list', action='store_true',
            help='Print the refresh set and exit without fetching.',
        )

    def handle(self, *args, **options):
        window_months = options['window_months']
        only_geos = options.get('only_geos')
        dry_run = options['dry_run']

        end = date.today()
        start = end - timedelta(days=int(window_months * 30.44))

        targets = _refresh_set()
        if only_geos:
            targets = [t for t in targets if t[0] in set(only_geos)]
            if not targets:
                raise CommandError(f'No tracked geography matches {only_geos}.')

        pairs = sum(len(t[3]) for t in targets)
        self.stdout.write(
            f'Refresh set: {len(targets)} geographies, {pairs} geography/series pairs, '
            f'window {start.isoformat()} -> {end.isoformat()} ({window_months} months).'
        )
        if EXCLUDED_GEOS:
            self.stdout.write(f'Excluded by design: {", ".join(EXCLUDED_GEOS)} (see docstring).')

        if options['list']:
            for geo_id, geo_level, geo_name, codes in targets:
                self.stdout.write(f'  {geo_level:<7} {geo_id:<12} {geo_name:<36} {len(codes):>3} series')
            return

        runner = _load_runner()

        succeeded, failed = [], []
        for index, (geo_id, geo_level, geo_name, codes) in enumerate(targets, start=1):
            label = f'[{index}/{len(targets)}] {geo_level} {geo_id} ({geo_name})'
            self.stdout.write(f'{label}: {len(codes)} series')

            argv = [
                '--geo-id', geo_id,
                '--start', start.isoformat(),
                '--end', end.isoformat(),
                '--series', *codes,
            ]
            if dry_run:
                argv.append('--dry-run')

            try:
                runner.main(argv)
                succeeded.append(geo_id)
            except Exception as exc:  # one bad geography must not abort the month
                failed.append((geo_id, str(exc)))
                self.stderr.write(self.style.WARNING(f'{label}: FAILED -- {exc}'))

        self.stdout.write('')
        self.stdout.write(f'Succeeded: {len(succeeded)}/{len(targets)}')
        if failed:
            self.stdout.write(self.style.ERROR(f'Failed: {len(failed)}'))
            for geo_id, reason in failed:
                self.stdout.write(f'  {geo_id}: {reason}')
            # Non-zero exit so the scheduled run is not recorded as clean.
            raise CommandError(f'{len(failed)} of {len(targets)} geographies failed.')

        self.stdout.write(self.style.SUCCESS('Market refresh complete.'))

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { GeoTarget } from './components/GeoToggleChips';
import MarketChart, { MarketSeries } from './components/MarketChart';
// import YoYBar from './components/YoYBar';
import KPIStat from './components/KPIStat';
import CoverageBadge from './components/CoverageBadge';
import CombinedTile, { MultiGeoKPIData } from './components/CombinedTile';

type MarketSeriesResponse = {
  series: Array<
    MarketSeries & {
      seasonal: string | null;
      category: string;
      subcategory: string | null;
    }
  >;
};

type GeoResponse = {
  base: {
    geo_id: string;
    geo_level: string;
    geo_name: string;
  };
  targets: GeoTarget[];
  notice?: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

const formatNumber = (value: number, fraction = 1) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: fraction }) : '-';

const asNumber = (value: string | null): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const latestPoint = (series: MarketSeries | undefined) => {
  if (!series || !series.data.length) return null;
  const last = series.data[series.data.length - 1];
  return asNumber(last.value);
};

const latestYoY = (series: MarketSeries | undefined) => {
  if (!series || series.data.length < 13) return null;
  const last = series.data[series.data.length - 1];
  const priorIndex = series.data.findIndex((pt) => pt.date.slice(0, 7) === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4, 7)}`);
  if (priorIndex === -1) return null;
  const current = asNumber(last.value);
  const prior = asNumber(series.data[priorIndex].value);
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
};

const GEO_PRIORITY: Record<string, number> = {
  CITY: 0,
  COUNTY: 1,
  MSA: 2,
  STATE: 3,
  US: 4,
};

const MarketPage: React.FC = () => {
  const { activeProject } = useProjectContext();
  const [targets, setTargets] = useState<GeoTarget[]>([]);
  const [baseGeoId, setBaseGeoId] = useState<string | null>(null);
  const [selectedGeoIds, setSelectedGeoIds] = useState<string[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isResolvingGeos, setResolvingGeos] = useState(false);
  const [activeTab, setActiveTab] = useState('macro');

  useEffect(() => {
    const city = activeProject?.jurisdiction_city;
    const state = activeProject?.jurisdiction_state;
    if (!city || !state) {
      setTargets([]);
      setBaseGeoId(null);
      setSelectedGeoIds([]);
      setGeoError('Active project is missing city/state information.');
      setResolvingGeos(false);
      return;
    }

    let cancelled = false;

    const resolveGeos = async () => {
      try {
        const response = await fetch(
          `/api/market/geos?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
        );

        if (cancelled) return;

        if (response.status === 404) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          // Don't stop - try to show US-level data at minimum
          // const stateCode = state.toUpperCase();
          const usGeoId = '01000US';  // US geo_id
          setTargets([{ geo_id: usGeoId, geo_level: 'US', geo_name: 'United States' }]);
          setBaseGeoId(usGeoId);
          setSelectedGeoIds([usGeoId]);
          setGeoError(payload?.error ?? `Geography not found for "${city}, ${state}". Showing national data.`);
          setResolvingGeos(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = (await response.json()) as GeoResponse;

        const fallbackMessage =
          data.notice ??
          (data.base.geo_level === 'CITY'
            ? null
            : 'City-level geography not found; defaulting to state coverage.');
        setGeoError(fallbackMessage);
        setTargets(data.targets);
        setBaseGeoId(data.base.geo_id);
        const targetIds = data.targets.map((target) => target.geo_id);
        if (!targetIds.includes(data.base.geo_id)) {
          targetIds.unshift(data.base.geo_id);
        }
        setSelectedGeoIds(Array.from(new Set(targetIds)));
        setResolvingGeos(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to resolve geos', error);
        setTargets([]);
        setBaseGeoId(null);
        setSelectedGeoIds([]);
        setGeoError('Could not resolve project geography in geo_xwalk.');
        setResolvingGeos(false);
      }
    };

    setResolvingGeos(true);
    void resolveGeos();

    return () => {
      cancelled = true;
      setResolvingGeos(false);
    };
  }, [activeProject?.jurisdiction_city, activeProject?.jurisdiction_state]);

  const geoQuery = selectedGeoIds.length ? selectedGeoIds.join(',') : null;

  const macroKey = geoQuery ? `/api/market/series?category=PRICES_RATES&geo_ids=${geoQuery}` : null;
  const laborKey = geoQuery ? `/api/market/series?category=LABOR,INCOME&geo_ids=${geoQuery}` : null;
  const housingKey = geoQuery ? `/api/market/series?category=HOUSING&geo_ids=${geoQuery}` : null;
  const demographicsKey = geoQuery ? `/api/market/series?category=DEMOGRAPHICS&geo_ids=${geoQuery}` : null;
  const cityKey = geoQuery
    ? `/api/market/series?codes=${[
        'ACS_POPULATION',
        'ACS_HOUSEHOLDS',
        'ACS_MEDIAN_HH_INC',
        'PERMIT_PLACE_TOTAL',
        'PERMIT_PLACE_1UNIT',
        'PERMIT_PLACE_5PLUS',
        'LAUS_PLACE_UNRATE',
        'LAUS_PLACE_EMPLOYED',
      ].join(',')}&geo_ids=${geoQuery}`
    : null;

  const { data: macroData, error: macroError } = useSWR<MarketSeriesResponse>(macroKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { data: laborData, error: laborError } = useSWR<MarketSeriesResponse>(laborKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { data: housingData, error: housingError } = useSWR<MarketSeriesResponse>(housingKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { data: demographicsData } = useSWR<MarketSeriesResponse>(demographicsKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { data: cityData, error: cityError } = useSWR<MarketSeriesResponse>(cityKey, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });

  const hasGeoSelection = selectedGeoIds.length > 0;
  // Only show loading screen during initial geo resolution, not when series data updates
  const isLoading = isResolvingGeos;

  const seriesByCode = useMemo(() => {
    const map = new Map<string, MarketSeries[]>();
    const collect = (payload?: MarketSeriesResponse) => {
      payload?.series.forEach((serie) => {
        const list = map.get(serie.series_code) ?? [];
        list.push(serie);
        map.set(serie.series_code, list);
      });
    };
    collect(macroData);
    collect(laborData);
    collect(housingData);
    collect(demographicsData);
    collect(cityData);

    return map;
  }, [macroData, laborData, housingData, demographicsData, cityData]);

  const coverageNotes = useMemo(() => {
    const notes = new Set<string>();
    seriesByCode.forEach((list) => {
      list.forEach((serie) => {
        if (serie.geo_id !== baseGeoId) return;
        const note = serie.data.find((point) => point.coverage_note)?.coverage_note;
        if (note) notes.add(note);
      });
    });
    return Array.from(notes);
  }, [seriesByCode, baseGeoId]);

  const primarySeries = (code: string): MarketSeries | undefined => {
    const entries = seriesByCode.get(code);
    if (!entries || !entries.length) return undefined;
    const exactMatch = entries.find((item) => item.geo_id === baseGeoId && item.data.length);
    if (exactMatch) return exactMatch;
    const sorted = entries
      .filter((item) => item.data.length)
      .sort((a, b) => (GEO_PRIORITY[a.geo_level] ?? Number.MAX_SAFE_INTEGER) - (GEO_PRIORITY[b.geo_level] ?? Number.MAX_SAFE_INTEGER));
    if (sorted.length) return sorted[0];
    return entries[0];
  };

  const getMultiGeoKPIData = (codes: string | string[], formatter?: (value: number) => string): MultiGeoKPIData[] => {
    const codeArray = Array.isArray(codes) ? codes : [codes];
    const geoLevels = ['US', 'STATE', 'MSA', 'COUNTY', 'TRACT', 'CITY'];

    // Get dynamic labels from targets when available
    const targetsByLevel = new Map<string, GeoTarget>();
    targets.forEach((target) => {
      if (target.geo_level && !targetsByLevel.has(target.geo_level)) {
        targetsByLevel.set(target.geo_level, target);
      }
    });

    const result: MultiGeoKPIData[] = [];

    for (const level of geoLevels) {
      let serie: MarketSeries | undefined;

      // Get the preferred geo_id for this level from targets
      const target = targetsByLevel.get(level);
      const preferredGeoId = target?.geo_id;

      // Try all provided codes to find data for this geo level
      for (const code of codeArray) {
        const entries = seriesByCode.get(code);
        if (!entries) continue;

        // First: try exact geo_id match if we have a preferred target
        if (preferredGeoId) {
          serie = entries.find(e => e.geo_id === preferredGeoId && e.data && e.data.length > 0);
          if (serie) break;
        }

        // Second: try geo_level match
        serie = entries.find(e => e.geo_level === level && e.data && e.data.length > 0);
        if (serie) break;
      }

      const value = latestPoint(serie);

      // For percentage-based series, calculate incremental change (pp) instead of YoY %
      const isPercentSeries = serie?.units?.toLowerCase().includes('percent');
      let yoy: number | null = null;
      if (serie && serie.data.length >= 13) {
        const last = serie.data[serie.data.length - 1];
        const priorIndex = serie.data.findIndex((pt) => pt.date.slice(0, 7) === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4, 7)}`);
        if (priorIndex !== -1) {
          const current = asNumber(last.value);
          const prior = asNumber(serie.data[priorIndex].value);
          if (current != null && prior != null) {
            if (isPercentSeries) {
              // For percentage series, show incremental change (percentage points)
              yoy = current - prior;
            } else {
              // For non-percentage series, show percentage change
              if (prior !== 0) {
                yoy = ((current - prior) / prior) * 100;
              }
            }
          }
        }
      }

      // Get the actual geo name from targets, or use serie name
      let geoName = serie?.geo_name ?? target?.geo_name ?? '-';

      // Format geo names based on level
      if (geoName !== '-') {
        if (level === 'CITY') {
          // Remove trailing "city", "town", etc. suffixes
          geoName = geoName.replace(/\s+(city|town|village|municipality)$/i, '');
          // Add "City of" prefix if not already present
          if (!/^(city|town|village|municipality) of /i.test(geoName)) {
            geoName = `City of ${geoName}`;
          }
        } else if (level === 'COUNTY' && !/county$/i.test(geoName)) {
          geoName = `${geoName} County`;
        } else if (level === 'TRACT' && !/^tract /i.test(geoName)) {
          geoName = `Tract ${geoName}`;
        }
      }

      // Calculate YoY label
      let changeLabel: string | null = null;
      if (yoy != null) {
        if (isPercentSeries) {
          // For percentage series, show as percentage points
          const sign = yoy >= 0 ? '+' : '';
          changeLabel = `${sign}${yoy.toFixed(1)} pp`;
        } else {
          // For regular series, show as % YoY
          changeLabel = `${yoy.toFixed(1)}% YoY`;
        }
      }

      // Format geoLevel display
      let geoLevelDisplay = level;
      if (level === 'US') {
        geoLevelDisplay = 'United States';
      } else if (level === 'TRACT') {
        geoLevelDisplay = 'Tract';
      } else if (target?.geo_name) {
        geoLevelDisplay = target.geo_name;
      }

      result.push({
        geoLevel: geoLevelDisplay,
        geoName,
        value: value != null ? (formatter ? formatter(value) : formatNumber(value)) : 'NAV',
        yoy,
        changeLabel
      });
    }

    return result;
  };

  const householdsSeries = primarySeries('ACS_HOUSEHOLDS');
  const incomeSeries = primarySeries('ACS_MEDIAN_HH_INC') ?? primarySeries('PERSONAL_INCOME_PC_STATE');
  const populationSeries = primarySeries('ACS_POPULATION');

  const population = latestPoint(populationSeries);
  const income = latestPoint(incomeSeries);
  const households = latestPoint(householdsSeries);

  const populationYoY = latestYoY(populationSeries);

  /* Unused for now - keeping for future multi-geo toggle feature
  const handleToggleGeo = (geoId: string) => {
    setSelectedGeoIds((prev) => {
      if (geoId === baseGeoId) return prev;
      if (prev.includes(geoId)) {
        return prev.filter((id) => id !== geoId);
      }
      return [...prev, geoId];
    });
  };
  */

  const macroSeries = useMemo(
    () => macroData?.series.filter((serie) => ['CPIAUCSL', 'CPIAUCNS', 'PPIACO', 'FEDFUNDS', 'MORTGAGE30US', 'MORTGAGE15US'].includes(serie.series_code)) ?? [],
    [macroData]
  );
  const laborSeries = useMemo(
    () => laborData?.series.filter((serie) => ['PAYEMS', 'CES_STATE_TOTAL', 'LAUS_STATE_UNRATE', 'LAUS_PLACE_UNRATE', 'LAUS_PLACE_EMPLOYED'].includes(serie.series_code)) ?? [],
    [laborData]
  );
  const housingSeries = useMemo(
    () =>
      housingData?.series.filter((serie) =>
        [
          'PERMIT_TOTAL',
          'PERMIT_1UNIT',
          'PERMIT_5PLUS',
          'PERMIT_PLACE_TOTAL',
          'PERMIT_PLACE_1UNIT',
          'PERMIT_PLACE_5PLUS',
          'FHFA_HPI_US_SA',
          'FHFA_HPI_STATE_SA',
          'FHFA_HPI_MSA_SA',
          'SPCSUSHPISA',
          'HSN1F',
          'MSPNHSUS',
        ].includes(serie.series_code)
      ) ?? [],
    [housingData]
  );

  if (!activeProject) {
    return (
      <div className="p-8 text-gray-400">
        Select a project to view market intelligence.
      </div>
    );
  }

  const hasSeriesError = macroError || laborError || housingError || cityError;

  if (geoError && !hasGeoSelection) {
    return (
      <div className="p-8 text-amber-300">
        {geoError}
      </div>
    );
  }

  if (hasSeriesError) {
    console.error('Series fetch errors:', { macroError, laborError, housingError, cityError });
  }

  if (isLoading) {
    return (
      <div className="p-8 text-gray-400">
        Loading market data…
      </div>
    );
  }

  if (!hasGeoSelection) {
    return (
      <div className="p-8 text-gray-400">
        Select a geography to view market intelligence.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {activeProject.project_name} - Market Intelligence
            </h1>
            <p className="text-sm text-gray-400">
              Automated macro-to-micro indicators anchored to Appraisal market analysis workflows.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex flex-wrap gap-1">
              {coverageNotes.map((note) => (
                <CoverageBadge key={note} note={note} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CombinedTile
            title="Population"
            multiGeoKPIs={getMultiGeoKPIData(['ACS_POPULATION', 'ACS_COUNTY_POPULATION', 'POP_COUNTY', 'POP_MSA', 'POP_STATE', 'POP_US'], (value) => formatNumber(value, 0))}
            series={demographicsData?.series.filter(s => ['ACS_POPULATION', 'ACS_COUNTY_POPULATION', 'POP_COUNTY', 'POP_MSA', 'POP_STATE', 'POP_US'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="Employment"
            multiGeoKPIs={getMultiGeoKPIData(['LAUS_PLACE_EMPLOYED', 'PAYEMS_MSA', 'CES_STATE_TOTAL', 'PAYEMS'], (value) => formatNumber(value, 0))}
            series={laborData?.series.filter(s => ['LAUS_PLACE_EMPLOYED', 'PAYEMS_MSA', 'CES_STATE_TOTAL', 'PAYEMS'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="Unemployment Rate"
            multiGeoKPIs={getMultiGeoKPIData(['LAUS_PLACE_UNRATE', 'LAUS_MSA_UNRATE', 'LAUS_STATE_UNRATE', 'LAUS_UNRATE'], (value) => `${value.toFixed(1)}%`)}
            series={laborData?.series.filter(s => ['LAUS_PLACE_UNRATE', 'LAUS_MSA_UNRATE', 'LAUS_STATE_UNRATE', 'LAUS_UNRATE'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="Median Household Income"
            multiGeoKPIs={getMultiGeoKPIData(['ACS_MEDIAN_HH_INC', 'ACS_COUNTY_MEDIAN_HH_INC', 'MEHOINUSAZA646N', 'MEHOINUSA646N'], (value) => `$${formatNumber(value, 0)}`)}
            series={laborData?.series.filter(s => ['ACS_MEDIAN_HH_INC', 'ACS_COUNTY_MEDIAN_HH_INC', 'MEHOINUSAZA646N', 'MEHOINUSA646N'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="Building Permits (1-Unit)"
            multiGeoKPIs={getMultiGeoKPIData(['PERMIT_PLACE_1UNIT', 'PERMIT_MSA_1UNIT', 'AZBP1FHSA', 'PERMIT1'], (value) => formatNumber(value, 0))}
            series={housingData?.series.filter(s => ['PERMIT_PLACE_1UNIT', 'PERMIT_MSA_1UNIT', 'AZBP1FHSA', 'PERMIT1'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="FHFA HPI"
            multiGeoKPIs={getMultiGeoKPIData(['HPI_MSA', 'FHFA_HPI_MSA_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_US_SA'], (value) => formatNumber(value, 1))}
            series={housingData?.series.filter(s => ['HPI_MSA', 'FHFA_HPI_MSA_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_US_SA'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
          />
          <CombinedTile
            title="S&P Case-Shiller HPI"
            multiGeoKPIs={getMultiGeoKPIData(['SPCSUSHPISA', 'SPCS20RSA'], (value) => formatNumber(value, 1))}
            series={housingData?.series.filter(s => ['SPCSUSHPISA', 'SPCS20RSA'].includes(s.series_code)) ?? []}
            useIndexed={true}
            narrowChart={true}
            footnote="MSA/State/US only - no city or county level data"
          />
        </div>

        <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
          <TabsPrimitive.List className="flex space-x-2 border-b border-gray-800 pb-2">
            <TabsPrimitive.Trigger value="macro" className="px-3 py-1 text-sm rounded bg-gray-800 data-[state=active]:bg-blue-600">
              Macro Trends
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="labor" className="px-3 py-1 text-sm rounded bg-gray-800 data-[state=active]:bg-blue-600">
              Labor &amp; Income
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="housing" className="px-3 py-1 text-sm rounded bg-gray-800 data-[state=active]:bg-blue-600">
              Housing &amp; Construction
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="city" className="px-3 py-1 text-sm rounded bg-gray-800 data-[state=active]:bg-blue-600">
              City Snapshot
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

          <TabsPrimitive.Content value="macro" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CombinedTile
                title="Inflation"
                singleKPI={true}
                narrowChart={true}
                toggleOptions={[
                  { label: 'SA', value: 'SA' },
                  { label: 'NSA', value: 'NSA' },
                ]}
                defaultToggle="SA"
                kpis={[
                  {
                    title: 'Consumer Price Index',
                    value: latestPoint(primarySeries('CPIAUCSL')) != null ? formatNumber(latestPoint(primarySeries('CPIAUCSL'))!, 1) : '-',
                    deltaLabel: latestYoY(primarySeries('CPIAUCSL')) != null ? `${latestYoY(primarySeries('CPIAUCSL'))!.toFixed(1)}% YoY` : undefined,
                    deltaColor: latestYoY(primarySeries('CPIAUCSL')) != null && latestYoY(primarySeries('CPIAUCSL'))! >= 0 ? 'up' : 'down',
                    badge: 'SA',
                  },
                  {
                    title: 'Consumer Price Index',
                    value: latestPoint(primarySeries('CPIAUCNS')) != null ? formatNumber(latestPoint(primarySeries('CPIAUCNS'))!, 1) : '-',
                    deltaLabel: latestYoY(primarySeries('CPIAUCNS')) != null ? `${latestYoY(primarySeries('CPIAUCNS'))!.toFixed(1)}% YoY` : undefined,
                    deltaColor: latestYoY(primarySeries('CPIAUCNS')) != null && latestYoY(primarySeries('CPIAUCNS'))! >= 0 ? 'up' : 'down',
                    badge: 'NSA',
                  },
                ]}
                series={macroSeries.filter((serie) => ['CPIAUCSL', 'CPIAUCNS', 'CPILFESL', 'CPILFENS'].includes(serie.series_code))}
              />
              <CombinedTile
                title="Interest Rates"
                narrowChart={true}
                kpis={[
                  {
                    title: 'Fed Funds',
                    value: latestPoint(primarySeries('FEDFUNDS')) != null ? `${latestPoint(primarySeries('FEDFUNDS'))!.toFixed(2)}%` : '-',
                    deltaLabel: latestYoY(primarySeries('FEDFUNDS')) != null ? `${latestYoY(primarySeries('FEDFUNDS'))!.toFixed(2)}%` : undefined,
                    deltaColor: latestYoY(primarySeries('FEDFUNDS')) != null && latestYoY(primarySeries('FEDFUNDS'))! < 0 ? 'down' : undefined,
                  },
                  {
                    title: '30Y Mtg',
                    value: latestPoint(primarySeries('MORTGAGE30US')) != null ? `${latestPoint(primarySeries('MORTGAGE30US'))!.toFixed(2)}%` : '-',
                    deltaLabel: latestYoY(primarySeries('MORTGAGE30US')) != null ? `${latestYoY(primarySeries('MORTGAGE30US'))!.toFixed(2)}%` : undefined,
                    deltaColor: latestYoY(primarySeries('MORTGAGE30US')) != null && latestYoY(primarySeries('MORTGAGE30US'))! < 0 ? 'down' : undefined,
                  },
                  {
                    title: '15Y Mtg',
                    value: latestPoint(primarySeries('MORTGAGE15US')) != null ? `${latestPoint(primarySeries('MORTGAGE15US'))!.toFixed(2)}%` : '-',
                    deltaLabel: latestYoY(primarySeries('MORTGAGE15US')) != null ? `${latestYoY(primarySeries('MORTGAGE15US'))!.toFixed(2)}%` : undefined,
                    deltaColor: latestYoY(primarySeries('MORTGAGE15US')) != null && latestYoY(primarySeries('MORTGAGE15US'))! < 0 ? 'down' : undefined,
                  },
                ]}
                series={macroSeries.filter((serie) => ['FEDFUNDS', 'MORTGAGE30US', 'MORTGAGE15US'].includes(serie.series_code))}
                valueFormatter={(value) => `${value.toFixed(1)}`}
              />
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="labor" className="mt-4 space-y-4">
            <CombinedTile
              title="Employment"
              multiGeoKPIs={getMultiGeoKPIData(['PAYEMS', 'CES_STATE_TOTAL', 'LAUS_PLACE_EMPLOYED'], (value) => formatNumber(value, 0))}
              series={laborSeries.filter((serie) => ['PAYEMS', 'CES_STATE_TOTAL', 'LAUS_PLACE_EMPLOYED'].includes(serie.series_code))}
            />
            <CombinedTile
              title="Unemployment Rate"
              multiGeoKPIs={getMultiGeoKPIData(['LAUS_UNRATE', 'LAUS_STATE_UNRATE', 'LAUS_MSA_UNRATE', 'LAUS_PLACE_UNRATE'], (value) => `${value.toFixed(1)}%`)}
              series={laborSeries.filter((serie) => ['LAUS_UNRATE', 'LAUS_STATE_UNRATE', 'LAUS_MSA_UNRATE', 'LAUS_PLACE_UNRATE'].includes(serie.series_code))}
              valueFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <CombinedTile
              title="Income"
              multiGeoKPIs={getMultiGeoKPIData(['PERSONAL_INCOME_PC_US', 'PERSONAL_INCOME_PC_STATE', 'PERSONAL_INCOME_PC_MSA', 'ACS_MEDIAN_HH_INC'], (value) => `$${formatNumber(value, 0)}`)}
              series={laborSeries.filter((serie) => ['PERSONAL_INCOME_PC_US', 'PERSONAL_INCOME_PC_STATE', 'PERSONAL_INCOME_PC_MSA', 'ACS_MEDIAN_HH_INC'].includes(serie.series_code))}
              valueFormatter={(value) => `$${formatNumber(value, 0)}`}
            />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="housing" className="mt-4 space-y-4">
            <CombinedTile
              title="Building Permits"
              multiGeoKPIs={getMultiGeoKPIData(['PERMIT_TOTAL', 'PERMIT_PLACE_TOTAL'], (value) => formatNumber(value, 0))}
              series={housingSeries.filter((serie) =>
                ['PERMIT_TOTAL', 'PERMIT_1UNIT', 'PERMIT_5PLUS', 'PERMIT_PLACE_TOTAL', 'PERMIT_PLACE_1UNIT', 'PERMIT_PLACE_5PLUS'].includes(serie.series_code)
              )}
            />
            <CombinedTile
              title="Home Prices (HPI)"
              multiGeoKPIs={getMultiGeoKPIData(['FHFA_HPI_US_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_MSA_SA'], (value) => formatNumber(value, 1))}
              series={housingSeries.filter((serie) =>
                ['FHFA_HPI_US_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_MSA_SA', 'SPCSUSHPISA', 'MSPNHSUS'].includes(serie.series_code)
              )}
            />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="city" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPIStat
                title="ACS Population"
                value={population != null ? formatNumber(population, 0) : '-'}
                deltaLabel={populationYoY != null ? `${populationYoY.toFixed(1)}% YoY` : undefined}
                deltaColor={populationYoY != null && populationYoY >= 0 ? 'up' : 'down'}
                data={populationSeries?.data.map((point) => ({
                  date: point.date,
                  value: asNumber(point.value),
                }))}
              />
              <KPIStat
                title="ACS Households"
                value={households != null ? formatNumber(households, 0) : '-'}
                data={householdsSeries?.data.map((point) => ({
                  date: point.date,
                  value: asNumber(point.value),
                }))}
              />
              <KPIStat
                title="ACS Median HH Income"
                value={income != null ? `$${formatNumber(income, 0)}` : '-'}
                data={incomeSeries?.data.map((point) => ({
                  date: point.date,
                  value: asNumber(point.value),
                }))}
              />
            </div>
            <MarketChart
              title="Place-Level Permits"
              series={housingSeries.filter((serie) =>
                ['PERMIT_PLACE_TOTAL', 'PERMIT_PLACE_1UNIT', 'PERMIT_PLACE_5PLUS'].includes(serie.series_code)
              )}
            />
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>

        <div className="flex items-center justify-between border border-gray-800 rounded-lg p-4 bg-gray-900">
          <div>
            <div className="text-sm text-gray-300">Need fresher data?</div>
            <div className="text-xs text-gray-500">
              Queue a new market ingestion bundle and track status in market_fetch_job.
            </div>
          </div>
          <RefreshButton projectId={activeProject.project_id} />
        </div>
      </div>
    </div>
  );
};

const RefreshButton: React.FC<{ projectId: number }> = ({ projectId }) => {
  const [isSubmitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleRefresh = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/market/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          bundle: 'macro_v1',
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const payload = await res.json();
      setStatus(`Queued job #${payload.job_id}`);
    } catch (error) {
      console.error('Refresh request failed', error);
      setStatus('Failed to queue job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleRefresh}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {isSubmitting ? 'Queuing...' : 'Refresh Data'}
      </button>
      {status ? <span className="text-xs text-gray-400">{status}</span> : null}
    </div>
  );
};

export default MarketPage;

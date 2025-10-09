'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useProjectContext } from '@/app/components/ProjectProvider';
import GeoToggleChips, { GeoTarget } from './components/GeoToggleChips';
import MarketChart, { MarketSeries } from './components/MarketChart';
import YoYBar from './components/YoYBar';
import KPIStat from './components/KPIStat';
import CoverageBadge from './components/CoverageBadge';

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
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

const formatNumber = (value: number, fraction = 1) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: fraction }) : 'n/a';

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

const MarketPage: React.FC = () => {
  const { activeProject } = useProjectContext();
  const [targets, setTargets] = useState<GeoTarget[]>([]);
  const [baseGeoId, setBaseGeoId] = useState<string | null>(null);
  const [selectedGeoIds, setSelectedGeoIds] = useState<string[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('macro');

  useEffect(() => {
    const city = activeProject?.jurisdiction_city;
    const state = activeProject?.jurisdiction_state;
    if (!city || !state) {
      setTargets([]);
      setBaseGeoId(null);
      setSelectedGeoIds([]);
      setGeoError('Active project is missing city/state information.');
      return;
    }

    fetcher<GeoResponse>(`/api/market/geos?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then((data) => {
        setGeoError(null);
        setTargets(data.targets);
        setBaseGeoId(data.base.geo_id);
        setSelectedGeoIds([data.base.geo_id]);
      })
      .catch((error) => {
        console.error('Failed to resolve geos', error);
        setGeoError('Could not resolve project geography in geo_xwalk.');
      });
  }, [activeProject?.jurisdiction_city, activeProject?.jurisdiction_state]);

  const geoQuery = selectedGeoIds.length ? selectedGeoIds.join(',') : null;

  const macroKey = geoQuery ? `/api/market/series?category=PRICES_RATES&geo_ids=${geoQuery}` : null;
  const laborKey = geoQuery ? `/api/market/series?category=LABOR&geo_ids=${geoQuery}` : null;
  const housingKey = geoQuery ? `/api/market/series?category=HOUSING&geo_ids=${geoQuery}` : null;
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

  const { data: macroData, isValidating: macroLoading } = useSWR<MarketSeriesResponse>(macroKey, fetcher);
  const { data: laborData, isValidating: laborLoading } = useSWR<MarketSeriesResponse>(laborKey, fetcher);
  const { data: housingData, isValidating: housingLoading } = useSWR<MarketSeriesResponse>(housingKey, fetcher);
  const { data: cityData, isValidating: cityLoading } = useSWR<MarketSeriesResponse>(cityKey, fetcher);

  const isLoading = !selectedGeoIds.length || macroLoading || laborLoading || housingLoading || cityLoading;

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
    collect(cityData);
    return map;
  }, [macroData, laborData, housingData, cityData]);

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
    const primary = entries.find((item) => item.geo_id === baseGeoId) ?? entries[0];
    return primary;
  };

  const employmentSeries = primarySeries('PAYEMS');
  const unemploymentSeries = primarySeries('LAUS_UNRATE') ?? primarySeries('LAUS_PLACE_UNRATE');
  const permitsSeries = primarySeries('PERMIT_PLACE_TOTAL') ?? primarySeries('PERMIT_TOTAL');
  const householdsSeries = primarySeries('ACS_HOUSEHOLDS');
  const incomeSeries = primarySeries('PERSONAL_INCOME_PC_STATE');
  const hpiSeries = primarySeries('FHFA_HPI_STATE_SA') ?? primarySeries('FHFA_HPI_US_SA');
  const mortgageSeries = primarySeries('MORTGAGE30US');
  const populationSeries = primarySeries('ACS_POPULATION');

  const population = latestPoint(populationSeries);
  const employment = latestPoint(employmentSeries);
  const unemployment = latestPoint(unemploymentSeries);
  const income = latestPoint(incomeSeries);
  const permits = latestPoint(permitsSeries);
  const hpi = latestPoint(hpiSeries);
  const households = latestPoint(householdsSeries);
  const mortgage = latestPoint(mortgageSeries);

  const employmentYoY = latestYoY(employmentSeries);
  const unemploymentYoY = latestYoY(unemploymentSeries);
  const permitsYoY = latestYoY(permitsSeries);
  const hpiYoY = latestYoY(hpiSeries);
  const populationYoY = latestYoY(populationSeries);
  const incomeYoY = latestYoY(incomeSeries);

  const handleToggleGeo = (geoId: string) => {
    setSelectedGeoIds((prev) => {
      if (geoId === baseGeoId) return prev;
      if (prev.includes(geoId)) {
        return prev.filter((id) => id !== geoId);
      }
      return [...prev, geoId];
    });
  };

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

  if (isLoading) {
    return (
      <div className="p-8 text-gray-400">
        Loading market data…
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
            <GeoToggleChips targets={targets} selectedGeoIds={selectedGeoIds} onToggle={handleToggleGeo} />
            {geoError ? <span className="text-xs text-amber-300">{geoError}</span> : null}
            <div className="flex flex-wrap gap-1">
              {coverageNotes.map((note) => (
                <CoverageBadge key={note} note={note} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPIStat
            title="Population"
            value={population != null ? formatNumber(population, 0) : 'n/a'}
            deltaLabel={populationYoY != null ? `${populationYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={populationYoY != null && populationYoY >= 0 ? 'up' : 'down'}
            data={populationSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
          />
          <KPIStat
            title="Employment"
            value={employment != null ? formatNumber(employment, 0) : 'n/a'}
            deltaLabel={employmentYoY != null ? `${employmentYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={employmentYoY != null && employmentYoY >= 0 ? 'up' : 'down'}
            data={employmentSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
          />
          <KPIStat
            title="Unemployment Rate"
            value={unemployment != null ? `${unemployment.toFixed(1)}%` : 'n/a'}
            deltaLabel={unemploymentYoY != null ? `${unemploymentYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={unemploymentYoY != null && unemploymentYoY <= 0 ? 'up' : 'down'}
            data={unemploymentSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
          />
          <KPIStat
            title="Median Household Income"
            value={income != null ? `$${formatNumber(income, 0)}` : 'n/a'}
            deltaLabel={incomeYoY != null ? `${incomeYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={incomeYoY != null && incomeYoY >= 0 ? 'up' : 'down'}
            data={incomeSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
          />
          <KPIStat
            title="Building Permits"
            value={permits != null ? formatNumber(permits, 0) : 'n/a'}
            deltaLabel={permitsYoY != null ? `${permitsYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={permitsYoY != null && permitsYoY >= 0 ? 'up' : 'down'}
            data={permitsSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
          />
          <KPIStat
            title="FHFA HPI"
            value={hpi != null ? formatNumber(hpi, 1) : 'n/a'}
            deltaLabel={hpiYoY != null ? `${hpiYoY.toFixed(1)}% YoY` : undefined}
            deltaColor={hpiYoY != null && hpiYoY >= 0 ? 'up' : 'down'}
            data={hpiSeries?.data.map((point) => ({
              date: point.date,
              value: asNumber(point.value),
            }))}
            footnote={mortgage != null ? `30Y Mortgage: ${mortgage.toFixed(2)}%` : undefined}
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
            <MarketChart title="Inflation & Rates" series={macroSeries.filter((serie) => ['CPIAUCSL', 'CPIAUCNS', 'FEDFUNDS'].includes(serie.series_code))} />
            <MarketChart title="Mortgage Rates" series={macroSeries.filter((serie) => ['MORTGAGE30US', 'MORTGAGE15US'].includes(serie.series_code))} valueFormatter={(value) => `${value.toFixed(2)}%`} />
            <YoYBar title="Producer Prices YoY" series={primarySeries('PPIACO')?.data ?? []} />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="labor" className="mt-4 space-y-4">
            <MarketChart title="Total Employment" series={laborSeries.filter((serie) => ['PAYEMS', 'CES_STATE_TOTAL', 'LAUS_PLACE_EMPLOYED'].includes(serie.series_code))} />
            <MarketChart title="Unemployment Rate" series={laborSeries.filter((serie) => ['LAUS_STATE_UNRATE', 'LAUS_PLACE_UNRATE'].includes(serie.series_code))} valueFormatter={(value) => `${value.toFixed(1)}%`} />
            <YoYBar title="Income YoY" series={incomeSeries?.data ?? []} />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="housing" className="mt-4 space-y-4">
            <MarketChart
              title="Building Permits"
              series={housingSeries.filter((serie) =>
                ['PERMIT_TOTAL', 'PERMIT_1UNIT', 'PERMIT_5PLUS', 'PERMIT_PLACE_TOTAL', 'PERMIT_PLACE_1UNIT', 'PERMIT_PLACE_5PLUS'].includes(serie.series_code)
              )}
            />
            <MarketChart
              title="Home Prices"
              series={housingSeries.filter((serie) =>
                ['FHFA_HPI_US_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_MSA_SA', 'SPCSUSHPISA', 'MSPNHSUS'].includes(serie.series_code)
              )}
            />
            <YoYBar title="Permits YoY" series={permitsSeries?.data ?? []} />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="city" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPIStat
                title="ACS Population"
                value={population != null ? formatNumber(population, 0) : 'n/a'}
                deltaLabel={populationYoY != null ? `${populationYoY.toFixed(1)}% YoY` : undefined}
                deltaColor={populationYoY != null && populationYoY >= 0 ? 'up' : 'down'}
                data={populationSeries?.data.map((point) => ({
                  date: point.date,
                  value: asNumber(point.value),
                }))}
              />
              <KPIStat
                title="ACS Households"
                value={households != null ? formatNumber(households, 0) : 'n/a'}
                data={householdsSeries?.data.map((point) => ({
                  date: point.date,
                  value: asNumber(point.value),
                }))}
              />
              <KPIStat
                title="ACS Median HH Income"
                value={income != null ? `$${formatNumber(income, 0)}` : 'n/a'}
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

import React, { useState } from 'react';
import { Trail, UnitSystem } from '../types/telemetry';
import {
  distanceUnit,
  elevationUnit,
  exportTrailAsGpx,
  formatDistance,
  formatElevation,
} from '../utils/exports';

interface ExploreTrailsViewProps {
  trails: Trail[];
  activeTrailId: string;
  cachedTrailIds: string[];
  units: UnitSystem;
  onSelectTrail: (trailId: string) => void;
  onOpen3DForTrail: (trailId: string) => void;
  onToggleCache: (trailId: string) => void;
}

export const ExploreTrailsView: React.FC<ExploreTrailsViewProps> = ({
  trails,
  activeTrailId,
  cachedTrailIds,
  units,
  onSelectTrail,
  onOpen3DForTrail,
  onToggleCache,
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'caution' | 'custom'>('all');
  const [query, setQuery] = useState('');

  const filtered = trails.filter((t) => {
    const matchesQuery =
      !query.trim() ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.region.toLowerCase().includes(query.toLowerCase()) ||
      t.code.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;
    if (filter === 'open') return t.statusLabel.toLowerCase().includes('open');
    if (filter === 'caution') return !t.statusLabel.toLowerCase().includes('open');
    if (filter === 'custom') return Boolean(t.isCustom);
    return true;
  });

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-secondary font-semibold">
            Patagonian Cordillera Catalog
          </span>
          <h1 className="font-display-grotesk text-[28px] font-semibold text-on-surface tracking-tight mt-1">
            Explore Alpine Circuits
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Select any expedition route to stream live GNSS telemetry, inspect 3D terrain meshes, or
            cache topographic contours offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter circuits..."
              className="bg-surface-container pl-9 pr-3 py-1.5 rounded text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-container p-1 rounded">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'open', label: 'Open' },
                { id: 'caution', label: 'Caution' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 rounded font-mono-tabular text-[11px] font-semibold transition-colors ${
                  filter === tab.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low p-8 rounded-xl text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">
            terrain
          </span>
          <p className="text-[14px] text-on-surface-variant">
            No alpine circuits matched your active filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setQuery('');
            }}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono-tabular text-[12px] rounded"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((trail) => {
            const isActive = trail.id === activeTrailId;
            const isCached = cachedTrailIds.includes(trail.id);

            return (
              <div
                key={trail.id}
                className={`bg-surface-container-low p-5 rounded-xl shadow-lg flex flex-col gap-4 transition-colors ${
                  isActive ? 'ring-1 ring-primary-container' : 'hover:bg-surface-container'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[10px] uppercase">
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-on-surface">
                        {trail.code}
                      </span>
                      <span className="text-primary font-semibold">{trail.difficultyLabel}</span>
                      <span className="text-surface-bright">·</span>
                      <span className="text-secondary font-semibold">{trail.statusLabel}</span>
                    </div>
                    <h2 className="font-display-grotesk text-[22px] font-semibold text-on-surface mt-2">
                      {trail.name}
                    </h2>
                    <p className="font-mono-tabular text-[12px] text-on-surface-variant">
                      {trail.region}
                    </p>
                  </div>

                  {isActive && (
                    <span className="px-2.5 py-1 bg-primary-container text-on-primary-container font-mono-tabular text-[10px] font-bold rounded uppercase shrink-0">
                      Active HUD
                    </span>
                  )}
                </div>

                {/* Mini Sparkline Elevation Preview */}
                <div className="h-20 bg-surface-container-lowest rounded-lg p-2 flex items-end">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 70">
                    <polyline
                      fill="none"
                      stroke="#4edea3"
                      strokeWidth="2"
                      points={trail.elevationSamples
                        .map((s) => {
                          const x = (s.km / Math.max(0.1, trail.distanceKm)) * 400;
                          const span = Math.max(100, trail.highestAltitudeM - trail.baseAltitudeM);
                          const y = 62 - ((s.elevationM - trail.baseAltitudeM) / span) * 52;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-4 gap-2 font-mono-tabular text-[11px] bg-surface-container p-3 rounded-lg">
                  <div>
                    <div className="text-[10px] text-on-surface-variant uppercase">Distance</div>
                    <div className="text-on-surface font-bold mt-0.5">
                      {formatDistance(trail.distanceKm, units)} {distanceUnit(units)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-variant uppercase">Gain</div>
                    <div className="text-secondary font-bold mt-0.5">
                      +{formatElevation(trail.elevationGainM, units)}
                      {elevationUnit(units)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-variant uppercase">Peak</div>
                    <div className="text-primary font-bold mt-0.5">
                      {formatElevation(trail.highestAltitudeM, units)}
                      {elevationUnit(units)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-variant uppercase">Trackers</div>
                    <div className="text-tertiary font-bold mt-0.5">
                      {trail.liveTrackersCount} live
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleCache(trail.id)}
                      className={`px-3 py-1.5 rounded font-mono-tabular text-[11px] flex items-center gap-1 transition-colors ${
                        isCached
                          ? 'bg-secondary-container/20 text-secondary'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">offline_pin</span>
                      <span>{isCached ? 'Cached' : 'Cache'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportTrailAsGpx(trail)}
                      className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-mono-tabular text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>GPX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpen3DForTrail(trail.id)}
                      className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-mono-tabular text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">view_in_ar</span>
                      <span>3D Mesh</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTrail(trail.id)}
                    className="px-4 py-2 rounded bg-primary-container hover:brightness-110 text-on-primary-container font-mono-tabular text-[11px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">monitoring</span>
                    <span>Load Telemetry</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

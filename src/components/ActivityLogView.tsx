import React, { useState } from 'react';
import { ActivityEntry, Trail, UnitSystem } from '../types/telemetry';
import {
  distanceUnit,
  elevationUnit,
  exportTrailAsGpx,
  formatDistance,
  formatElevation,
  formatSpeed,
  speedUnit,
} from '../utils/exports';

interface ActivityLogViewProps {
  activities: ActivityEntry[];
  trails: Trail[];
  activeTrail: Trail;
  progressKm: number;
  units: UnitSystem;
  onLogCurrentSession: () => void;
  onDeleteActivity: (id: string) => void;
  onLoadTrail: (trailId: string) => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  activities,
  trails,
  activeTrail,
  progressKm,
  units,
  onLogCurrentSession,
  onDeleteActivity,
  onLoadTrail,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'In Progress'>('All');

  const filtered = activities.filter((a) =>
    statusFilter === 'All' ? true : a.status === statusFilter
  );

  const totalDistanceKm = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  const totalGainM = activities.reduce((acc, a) => acc + a.elevationGainM, 0);
  const totalKcal = activities.reduce((acc, a) => acc + a.calories, 0);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-secondary font-semibold">
            Expedition Blackbox Archive
          </span>
          <h1 className="font-display-grotesk text-[28px] font-semibold text-on-surface tracking-tight mt-1">
            Activity &amp; Ascent Log
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Telemetry snapshots across completed alpine circuits and current live beacon progress.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogCurrentSession}
          className="px-4 py-2.5 bg-primary-container hover:brightness-110 text-on-primary-container font-mono-tabular text-[12px] font-bold rounded flex items-center gap-1.5 shadow-md shadow-primary-container/20 transition-all self-start lg:self-auto"
        >
          <span className="material-symbols-outlined text-base">add_task</span>
          <span>
            Snapshot Active Trek ({formatDistance(progressKm, units)} {distanceUnit(units)})
          </span>
        </button>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-low p-4 rounded-xl shadow">
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Cumulative Distance
          </span>
          <div className="font-display-grotesk text-[32px] font-bold text-on-surface mt-1 tabular-nums">
            {formatDistance(totalDistanceKm, units)}{' '}
            <span className="font-mono-tabular text-sm text-on-surface-variant font-normal">
              {distanceUnit(units)}
            </span>
          </div>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl shadow">
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Total Vertical Climbed
          </span>
          <div className="font-display-grotesk text-[32px] font-bold text-secondary mt-1 tabular-nums">
            +{formatElevation(totalGainM, units)}{' '}
            <span className="font-mono-tabular text-sm text-on-surface-variant font-normal">
              {elevationUnit(units)}
            </span>
          </div>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl shadow">
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Total Energy Expenditure
          </span>
          <div className="font-display-grotesk text-[32px] font-bold text-primary mt-1 tabular-nums">
            {totalKcal.toLocaleString()}{' '}
            <span className="font-mono-tabular text-sm text-on-surface-variant font-normal">
              kcal
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar + Log Table */}
      <div className="bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono-tabular text-[11px] uppercase text-on-surface-variant font-bold">
            Recorded Sessions ({filtered.length})
          </span>
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded">
            {(['All', 'Completed', 'In Progress'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded font-mono-tabular text-[11px] font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-surface-container-highest text-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-highest font-mono-tabular text-[10px] uppercase text-on-surface-variant">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Trail / Sector</th>
                <th className="py-2.5 px-3 text-right">Distance</th>
                <th className="py-2.5 px-3 text-right">Gain</th>
                <th className="py-2.5 px-3 text-right">Peak</th>
                <th className="py-2.5 px-3 text-right">Avg Pace</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/60 text-[13px]">
              {filtered.map((entry) => {
                const matchedTrail =
                  trails.find((t) => t.id === entry.trailId) || activeTrail;
                return (
                  <tr key={entry.id} className="hover:bg-surface-container/70 transition-colors">
                    <td className="py-3 px-3 font-mono-tabular text-[12px] text-on-surface-variant whitespace-nowrap">
                      {entry.dateIso}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-on-surface">{entry.trailName}</div>
                      <div className="text-[11px] text-on-surface-variant font-mono-tabular">
                        {entry.trailCode} · {entry.notes}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-on-surface whitespace-nowrap">
                      {formatDistance(entry.distanceKm, units)} {distanceUnit(units)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-secondary whitespace-nowrap">
                      +{formatElevation(entry.elevationGainM, units)}
                      {elevationUnit(units)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-primary whitespace-nowrap">
                      {formatElevation(entry.maxAltitudeM, units)}
                      {elevationUnit(units)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-on-surface whitespace-nowrap">
                      {formatSpeed(entry.avgPaceKmh, units)} {speedUnit(units)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`font-mono-tabular text-[10px] font-bold uppercase ${
                          entry.status === 'Completed' ? 'text-secondary' : 'text-primary'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onLoadTrail(matchedTrail.id)}
                          title="Open in Live Telemetry"
                          className="p-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">monitoring</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportTrailAsGpx(matchedTrail)}
                          title="Download GPX"
                          className="p-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-tertiary transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteActivity(entry.id)}
                          title="Delete Entry"
                          className="p-1.5 rounded bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-on-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

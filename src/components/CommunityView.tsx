import React, { useState } from 'react';
import { CommunityTracker, UnitSystem } from '../types/telemetry';
import { distanceUnit, elevationUnit, formatDistance, formatElevation } from '../utils/exports';

interface DispatchPost {
  id: string;
  author: string;
  sector: string;
  timeAgo: string;
  message: string;
}

interface CommunityViewProps {
  trackers: CommunityTracker[];
  units: UnitSystem;
}

const INITIAL_DISPATCHES: DispatchPost[] = [
  {
    id: 'disp-1',
    author: 'SAR-CONDOR-2',
    sector: 'Fitz Roy Ridge Step IV',
    timeAgo: '14m ago',
    message:
      'High winds exceeding 45km/h at final 1.2km moraine ascent. Trekking poles and crampons advised beyond waypoint 04.',
  },
  {
    id: 'disp-2',
    author: 'BRAVO-7',
    sector: 'Cerro Torre Valley',
    timeAgo: '42m ago',
    message:
      'Laguna Torre approach trail completely dry and clear up to De Agostini camp. Glacial melt intake flowing clean.',
  },
];

export const CommunityView: React.FC<CommunityViewProps> = ({ trackers, units }) => {
  const [dispatches, setDispatches] = useState<DispatchPost[]>(INITIAL_DISPATCHES);
  const [newMessage, setNewMessage] = useState('');
  const [newSector, setNewSector] = useState('Fitz Roy High Pass Circuit');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setDispatches((prev) => [
      {
        id: `disp-${Date.now()}`,
        author: 'ALPHA-1 (You)',
        sector: newSector,
        timeAgo: 'Just now',
        message: newMessage.trim(),
      },
      ...prev,
    ]);
    setNewMessage('');
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-secondary font-semibold">
            Sector 09 Mesh Network &amp; Rangers
          </span>
          <h1 className="font-display-grotesk text-[28px] font-semibold text-on-surface tracking-tight mt-1">
            Trail Community &amp; Safety Grid
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Live transponders on trail, Search &amp; Rescue patrol beacons, and real-time ranger
            field dispatches.
          </p>
        </div>

        <span className="px-3 py-1.5 bg-secondary-container/20 text-secondary font-mono-tabular text-[11px] font-bold rounded self-start lg:self-auto">
          SAFETY GRID SECURE · 4 MESH RELAYS
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Transponders Table */}
        <div className="lg:col-span-7 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
              Active Beacons on Cordillera Grid ({trackers.length})
            </span>
            <span className="font-mono-tabular text-[10px] text-secondary">Sync: 14 Sats</span>
          </div>

          <div className="flex flex-col gap-2">
            {trackers.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-surface-container rounded-lg flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-[13px] font-bold text-on-surface">
                      {t.callsign}
                    </span>
                    <span
                      className={`font-mono-tabular text-[10px] font-semibold ${
                        t.role === 'Search & Rescue'
                          ? 'text-tertiary'
                          : t.role === 'Expedition Lead'
                            ? 'text-primary'
                            : 'text-secondary'
                      }`}
                    >
                      {t.role}
                    </span>
                  </div>
                  <div className="text-[12px] text-on-surface-variant mt-0.5">{t.trailName}</div>
                </div>

                <div className="flex items-center gap-4 font-mono-tabular text-[11px]">
                  <div className="text-right">
                    <div className="text-on-surface font-semibold">
                      {formatDistance(t.km, units)} {distanceUnit(units)}
                    </div>
                    <div className="text-[10px] text-primary">
                      {formatElevation(t.elevationM, units)}
                      {elevationUnit(units)} ASL
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-secondary">{t.signalStrength}</div>
                    <div className="text-[10px] text-on-surface-variant">
                      Bat {t.batteryPct}% · {t.lastPing}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Dispatches + Post Form */}
        <div className="lg:col-span-5 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-4">
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
            Field Condition Dispatches
          </span>

          <form onSubmit={handlePost} className="bg-surface-container p-3 rounded-lg flex flex-col gap-2">
            <select
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="bg-surface-container-high px-2.5 py-1.5 rounded text-[12px] text-on-surface focus:outline-none"
            >
              <option value="Fitz Roy High Pass Circuit">Fitz Roy High Pass Circuit</option>
              <option value="John Gardner Pass Traverse">John Gardner Pass Traverse</option>
              <option value="Cerro Torre Glacier Traverse">Cerro Torre Glacier Traverse</option>
            </select>
            <textarea
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Broadcast trail condition, wind gust, or water status to mesh..."
              className="bg-surface-container-high px-2.5 py-2 rounded text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary-container resize-none"
            />
            <button
              type="submit"
              className="self-end px-4 py-1.5 bg-primary-container hover:brightness-110 text-on-primary-container font-mono-tabular text-[11px] font-bold rounded transition-all"
            >
              Broadcast Dispatch
            </button>
          </form>

          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
            {dispatches.map((d) => (
              <div key={d.id} className="bg-surface-container p-3 rounded-lg flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono-tabular text-[10px]">
                  <span className="text-primary font-bold">{d.author}</span>
                  <span className="text-on-surface-variant">{d.timeAgo}</span>
                </div>
                <span className="font-mono-tabular text-[10px] text-tertiary">{d.sector}</span>
                <p className="text-[13px] text-on-surface-variant leading-snug mt-0.5">
                  {d.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

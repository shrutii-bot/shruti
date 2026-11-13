import React from 'react';
import { NavTab, Trail, UnitSystem } from '../types/telemetry';
import { distanceUnit, elevationUnit, formatDistance, formatElevation } from '../utils/exports';

interface SidebarProps {
  activeTab: NavTab;
  activeTrail: Trail;
  progressKm: number;
  batteryPct: number;
  units: UnitSystem;
  mobileOpen: boolean;
  onSelectTab: (tab: NavTab) => void;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'live-telemetry', label: 'Live Telemetry', icon: 'monitoring' },
  { id: 'explore-trails', label: 'Explore Trails', icon: 'terrain' },
  { id: 'activity-log', label: 'Activity Log', icon: 'history_toggle_off' },
  { id: 'route-planner', label: 'Route Planner', icon: 'polyline' },
  { id: 'gear', label: 'Gear', icon: 'backpack' },
  { id: 'community', label: 'Community', icon: 'groups' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeTrail,
  progressKm,
  batteryPct,
  units,
  mobileOpen,
  onSelectTab,
  onCloseMobile,
}) => {
  const remainingKm = Math.max(0, activeTrail.distanceKm - progressKm);
  const currentWaypoint =
    activeTrail.waypoints.reduce((closest, wp) =>
      Math.abs(wp.km - progressKm) < Math.abs(closest.km - progressKm) ? wp : closest
    ) || activeTrail.waypoints[0];

  const remainingElev = Math.max(
    0,
    activeTrail.highestAltitudeM - currentWaypoint.elevationM
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/60 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface-container-low z-40 flex flex-col justify-between p-4 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono-tabular text-[10px] tracking-wider uppercase text-on-surface-variant px-2">
              Telemetry HUD
            </span>
            <nav className="flex flex-col gap-1 mt-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded text-left transition-all text-[13px] whitespace-nowrap ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono-tabular text-[10px] tracking-wider uppercase text-on-surface-variant px-2">
              Active Session
            </span>
            <div className="bg-surface-container p-2.5 rounded flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-mono-tabular text-[10px] text-on-surface-variant">
                  WAYPOINT 0{currentWaypoint.id + 1}
                </span>
                <span className="font-mono-tabular text-[10px] text-secondary font-medium">
                  IN RANGE
                </span>
              </div>
              <span className="font-display-grotesk text-[15px] text-on-surface font-semibold truncate">
                {currentWaypoint.shortLabel}
              </span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-mono-tabular text-[12px] text-primary">
                  ▲ {formatElevation(currentWaypoint.elevationM, units)}
                  {elevationUnit(units)}
                </span>
                <span className="font-mono-tabular text-[12px] text-on-surface-variant">
                  +{formatElevation(remainingElev, units)}
                  {elevationUnit(units)} / {formatDistance(remainingKm, units)}
                  {distanceUnit(units)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-2 text-on-surface-variant">
            <span className="font-mono-tabular text-[10px] uppercase">
              Battery · Transponder
            </span>
            <span
              className={`font-mono-tabular text-[10px] font-semibold ${
                batteryPct > 25 ? 'text-secondary' : 'text-error'
              }`}
            >
              {Math.round(batteryPct)}%
            </span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                batteryPct > 25 ? 'bg-secondary' : 'bg-error'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>
      </aside>
    </>
  );
};

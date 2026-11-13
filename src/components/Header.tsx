import React, { useEffect, useRef, useState } from 'react';
import { NotificationItem, Trail, UnitSystem } from '../types/telemetry';
import { formatElevation, formatTemp } from '../utils/exports';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/ALJJyrA5AR08hAbiV2VP6yisfIriAsx0l1LImM-NQ1UEt0g9g8Db1xopiOR4RmWR9iXlOQWbzQPI5j1Mgf0GSn2PSu12O2msJSsr4vLe0zWPr2EMelOmuuNO4653Ib_7stBpggfCDG5AzJ4833NG591keTQ_pH3oZknjoDl7MyMoIi0258mg9MUMru1i4qMVCylhWtvlfJflWC0M5VK15XFNCmnUQZCG573gHCPCZ3v5rE_i1Q';

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9TTV-V1Cd1O1NK9ad8qeLrGRKkqjSJ-dtlfp8R-5YSJI5TyCKJjbXzHYHjkcPuORMmtbQVc8fDX2EsKf802vTARGaNH1yIbzpfHTMIIlOW97NbuKgE9sTL62uUg_pQAJzyZsJL3B6ti_X7vNwbj18EiRQq2Z9OZLVdmmaksZCgdlgap904oryESi1Ok-t-NXWK7vIUrNC9nGZHvutaswYBdgLt9GZa2Rjkn_M7H2G';

interface HeaderProps {
  activeTrail: Trail;
  trails: Trail[];
  isTracking: boolean;
  units: UnitSystem;
  simSpeed: number;
  notifications: NotificationItem[];
  onSelectTrail: (trailId: string) => void;
  onFocusWaypoint: (trailId: string, km: number) => void;
  onToggleUnits: (units: UnitSystem) => void;
  onChangeSimSpeed: (speed: number) => void;
  onMarkAllRead: () => void;
  onResetWorkspace: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTrail,
  trails,
  isTracking,
  units,
  simSpeed,
  notifications,
  onSelectTrail,
  onFocusWaypoint,
  onToggleUnits,
  onChangeSimSpeed,
  onMarkAllRead,
  onResetWorkspace,
  onToggleMobileMenu,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [openPopover, setOpenPopover] = useState<'notifications' | 'settings' | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const queryLower = searchQuery.trim().toLowerCase();
  const matchingTrails = queryLower
    ? trails.filter(
        (t) =>
          t.name.toLowerCase().includes(queryLower) ||
          t.code.toLowerCase().includes(queryLower) ||
          t.region.toLowerCase().includes(queryLower)
      )
    : [];

  const matchingWaypoints = queryLower
    ? trails.flatMap((t) =>
        t.waypoints
          .filter(
            (wp) =>
              wp.name.toLowerCase().includes(queryLower) ||
              wp.coords.toLowerCase().includes(queryLower)
          )
          .map((wp) => ({ trail: t, waypoint: wp }))
      )
    : [];

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
    >
      <div className="h-16 w-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation drawer"
            className="lg:hidden p-2 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          {!logoError ? (
            <img
              alt="PeakTrack Logo"
              className="h-8 w-auto object-contain"
              src={LOGO_URL}
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">landscape</span>
            </div>
          )}

          <span className="font-display-grotesk text-[22px] leading-7 font-semibold tracking-tight uppercase text-on-surface select-none whitespace-nowrap">
            PeakTrack
          </span>

          <div className="hidden xl:flex items-center gap-1.5 ml-2 bg-surface-container-low px-2.5 py-1 rounded">
            <span
              className={`w-2 h-2 rounded-full bg-secondary ${
                isTracking ? 'animate-ping' : 'animate-pulse'
              }`}
            />
            <span className="font-mono-tabular text-[10px] tracking-[0.08em] text-secondary uppercase font-medium whitespace-nowrap">
              {isTracking ? 'GNSS 3D TRACKING' : 'GNSS 3D Lock'}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2 md:mx-4 hidden md:block relative">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-lg pointer-events-none select-none">
              travel_explore
            </span>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              className="w-full bg-surface-container-low pl-10 pr-8 py-1.5 rounded text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="Search trails, summits, coordinates, or GPX tracks..."
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-on-surface-variant hover:text-on-surface"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {searchFocused && queryLower.length > 0 && (
            <div className="absolute left-0 right-0 top-11 bg-surface-container-low border border-surface-container-highest rounded-lg shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {matchingTrails.length === 0 && matchingWaypoints.length === 0 ? (
                <div className="p-4 text-[13px] text-on-surface-variant font-mono-tabular">
                  No trails or coordinates matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-surface-container-highest">
                  {matchingTrails.map((trail) => (
                    <button
                      key={trail.id}
                      type="button"
                      onClick={() => {
                        onSelectTrail(trail.id);
                        setSearchFocused(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-surface-container-high flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-on-surface">
                          {trail.name}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-on-surface-variant">
                          {trail.code} · {trail.region}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-secondary font-semibold">
                        {trail.distanceKm.toFixed(1)} km
                      </span>
                    </button>
                  ))}
                  {matchingWaypoints.map(({ trail, waypoint }) => (
                    <button
                      key={`${trail.id}-${waypoint.id}`}
                      type="button"
                      onClick={() => {
                        onFocusWaypoint(trail.id, waypoint.km);
                        setSearchFocused(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-surface-container-high flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[12px] font-medium text-tertiary">
                          {waypoint.name}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-on-surface-variant">
                          {trail.name} · {waypoint.coords}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-primary">
                        {waypoint.elevationM}m
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Telemetry Controls & User */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0 relative">
          <div className="hidden lg:flex items-center gap-2 bg-surface-container-low px-2.5 py-1 rounded">
            <span className="material-symbols-outlined text-tertiary text-lg">air</span>
            <div className="flex flex-col">
              <span className="font-mono-tabular text-[10px] tracking-[0.08em] text-on-surface-variant uppercase">
                Ridge Base {formatElevation(2840, units)}
                {units === 'imperial' ? 'ft' : 'm'}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface">
                {formatTemp(activeTrail.weather.tempC + 4, units)} · {activeTrail.weather.windDir}{' '}
                {Math.round(activeTrail.weather.windKmh)}kt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setOpenPopover((prev) => (prev === 'notifications' ? null : 'notifications'))
              }
              aria-label="Notifications"
              className={`relative p-2 rounded transition-colors ${
                openPopover === 'notifications'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setOpenPopover((prev) => (prev === 'settings' ? null : 'settings'))}
              aria-label="Telemetry settings"
              className={`p-2 rounded transition-colors ${
                openPopover === 'settings'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">tune</span>
            </button>

            <div className="flex items-center gap-1.5 ml-1 pl-1">
              {!avatarError ? (
                <img
                  alt="ALPHA-1 Operator Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  src={AVATAR_URL}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-container-highest text-primary font-mono-tabular text-xs font-bold flex items-center justify-center">
                  A1
                </div>
              )}
              <span className="hidden sm:inline-block font-mono-tabular text-[12px] tracking-[0.06em] text-on-surface font-semibold">
                ALPHA-1
              </span>
            </div>
          </div>

          {/* Notifications Popover */}
          {openPopover === 'notifications' && (
            <div className="absolute right-0 top-14 w-80 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
                <span className="font-mono-tabular text-[11px] uppercase tracking-wider text-on-surface font-bold">
                  Telemetry &amp; Ranger Alerts
                </span>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="font-mono-tabular text-[10px] text-secondary hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-lg ${
                      n.read ? 'bg-surface-container/60' : 'bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono-tabular text-[11px] font-bold ${
                          n.severity === 'warning'
                            ? 'text-primary'
                            : n.severity === 'success'
                              ? 'text-secondary'
                              : 'text-tertiary'
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="font-mono-tabular text-[10px] text-on-surface-variant shrink-0">
                        {n.timeAgo}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant mt-1 leading-snug">
                      {n.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings / Calibration Popover */}
          {openPopover === 'settings' && (
            <div className="absolute right-0 top-14 w-72 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-2xl p-3.5 z-50 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
                <span className="font-mono-tabular text-[11px] uppercase tracking-wider text-on-surface font-bold">
                  HUD Calibration
                </span>
                <span className="font-mono-tabular text-[10px] text-secondary">ALPHA-1</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
                  Measurement Units
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-surface-container p-1 rounded">
                  <button
                    type="button"
                    onClick={() => onToggleUnits('metric')}
                    className={`py-1.5 rounded font-mono-tabular text-[11px] font-semibold transition-colors ${
                      units === 'metric'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Metric (km / m)
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleUnits('imperial')}
                    className={`py-1.5 rounded font-mono-tabular text-[11px] font-semibold transition-colors ${
                      units === 'imperial'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Imperial (mi / ft)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
                  Live Track Playback Speed
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-surface-container p-1 rounded">
                  {[1, 5, 15].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => onChangeSimSpeed(speed)}
                      className={`py-1 rounded font-mono-tabular text-[11px] font-semibold transition-colors ${
                        simSpeed === speed
                          ? 'bg-surface-container-highest text-secondary'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onResetWorkspace();
                  setOpenPopover(null);
                }}
                className="mt-1 py-2 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono-tabular text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Reset Saved Telemetry</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

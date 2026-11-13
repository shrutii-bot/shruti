import React, { useState } from 'react';
import { Trail, UnitSystem, Waypoint } from '../types/telemetry';
import { distanceUnit, elevationUnit, formatDistance, formatElevation } from '../utils/exports';

interface TopoMapVisualizerProps {
  trail: Trail;
  progressKm: number;
  selectedWaypointId: number | null;
  units: UnitSystem;
  onSelectPositionKm: (km: number, waypointId?: number) => void;
  onOpen3DModal: () => void;
  onOpenCommunity: () => void;
}

export const TopoMapVisualizer: React.FC<TopoMapVisualizerProps> = ({
  trail,
  progressKm,
  selectedWaypointId,
  units,
  onSelectPositionKm,
  onOpen3DModal,
  onOpenCommunity,
}) => {
  const [showTopo, setShowTopo] = useState(true);
  const [showSatellite, setShowSatellite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const waypoints = trail.waypoints;
  const startWp = waypoints[0];
  const endWp = waypoints[waypoints.length - 1];

  // Build SVG path from trail waypoints (mapped to 800x500 viewBox)
  const pts = waypoints.map((wp) => ({
    x: (wp.mapX / 100) * 800,
    y: (wp.mapY / 100) * 500,
    km: wp.km,
  }));

  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2;
      if (i === 1) {
        d += ` Q${prev.x + (curr.x - prev.x) * 0.45},${prev.y + (curr.y - prev.y) * 0.15} ${curr.x},${curr.y}`;
      } else {
        d += ` Q${cx},${prev.y * 0.4 + curr.y * 0.6} ${curr.x},${curr.y}`;
      }
    }
    return d;
  };

  // Compute interpolated hiker XY along the waypoints based on progressKm
  const getHikerPosition = () => {
    const clamped = Math.max(0, Math.min(trail.distanceKm, progressKm));
    for (let i = 1; i < waypoints.length; i++) {
      if (clamped <= waypoints[i].km) {
        const prev = waypoints[i - 1];
        const next = waypoints[i];
        const span = Math.max(0.001, next.km - prev.km);
        const t = (clamped - prev.km) / span;
        return {
          mapX: prev.mapX + (next.mapX - prev.mapX) * t,
          mapY: prev.mapY + (next.mapY - prev.mapY) * t,
          completedIndex: i - 1,
        };
      }
    }
    return {
      mapX: endWp.mapX,
      mapY: endWp.mapY,
      completedIndex: waypoints.length - 1,
    };
  };

  const hikerPos = getHikerPosition();

  // Build completed polyline points up to hiker position
  const completedPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    if (waypoints[i].km <= progressKm) {
      completedPoints.push({
        x: (waypoints[i].mapX / 100) * 800,
        y: (waypoints[i].mapY / 100) * 500,
      });
    }
  }
  completedPoints.push({
    x: (hikerPos.mapX / 100) * 800,
    y: (hikerPos.mapY / 100) * 500,
  });

  const fullPathD = buildSmoothPath(pts);
  const completedPathD = buildSmoothPath(completedPoints);

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-4 z-50 bg-surface-container-low rounded-xl shadow-2xl border border-tertiary/30'
          : 'lg:col-span-8 bg-surface-container-low rounded-xl shadow-xl'
      } p-4 flex flex-col gap-4 relative overflow-hidden`}
    >
      {/* Map Viewport Top HUD Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-1.5 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded">
          <span className="material-symbols-outlined text-sm text-secondary">radar</span>
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface font-semibold tracking-wider">
            Route Map Shape Visualizer
          </span>
          <span className="text-surface-bright">•</span>
          <span className="font-mono-tabular text-[10px] text-primary font-medium">
            Vectors Active
          </span>
        </div>

        <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-md p-1 rounded flex-wrap">
          <button
            type="button"
            onClick={() => setShowTopo((v) => !v)}
            className={`px-2.5 py-1 font-mono-tabular text-[10px] rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
              showTopo
                ? 'bg-surface-container-highest text-secondary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">terrain</span>
            <span>Topo Contours</span>
          </button>

          <button
            type="button"
            onClick={onOpen3DModal}
            title="Open Interactive 3D Elevation Terrain Preview [Key: 3]"
            className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-tertiary border border-tertiary/40 font-mono-tabular text-[10px] rounded flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(123,208,255,0.15)] group whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm text-tertiary group-hover:rotate-12 transition-transform">
              view_in_ar
            </span>
            <span>3D Elev</span>
            <span className="hidden sm:inline-block px-1 py-0.5 bg-tertiary/20 text-tertiary font-mono-tabular text-[9px] rounded ml-0.5 leading-none">
              3
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSatellite((v) => !v)}
            className={`px-2.5 py-1 font-mono-tabular text-[10px] rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
              showSatellite
                ? 'bg-surface-container-highest text-secondary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">satellite</span>
            <span>Satellite Layer</span>
          </button>

          <div className="h-4 w-px bg-surface-container-highest mx-1" />

          <button
            type="button"
            onClick={() => setZoomScale(1)}
            title="Compass Reset"
            className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">explore</span>
          </button>

          <button
            type="button"
            onClick={() => setZoomScale((z) => (z > 1.2 ? 1 : 1.18))}
            title="Zoom Map"
            className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {zoomScale > 1.1 ? 'zoom_out' : 'zoom_in'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Topographic Map Canvas */}
      <div
        className={`relative w-full ${
          isFullscreen ? 'flex-1 min-h-[520px]' : 'h-[460px]'
        } bg-surface-container-lowest rounded-lg overflow-hidden flex items-center justify-center select-none`}
      >
        {/* Optional procedural satellite relief backdrop when Satellite Layer toggled */}
        {showSatellite && (
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(circle at 72% 28%, rgba(255,90,31,0.18) 0%, rgba(35,64,54,0.45) 38%, rgba(8,16,14,0.92) 82%), repeating-linear-gradient(125deg, rgba(78,222,163,0.04) 0px, rgba(78,222,163,0.04) 2px, transparent 2px, transparent 14px)',
            }}
          />
        )}

        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {/* Topographic Contour Lines SVG Layer */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 800 500"
          >
            <defs>
              <pattern
                height="40"
                id="grid-pattern"
                patternUnits="userSpaceOnUse"
                width="40"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#293B36"
                  strokeDasharray="2,2"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>
            <rect fill="url(#grid-pattern)" height="100%" width="100%" opacity="0.55" />

            {showTopo && (
              <g opacity={showSatellite ? 0.5 : 0.35}>
                <path
                  d="M-50,200 C150,180 200,80 400,90 C600,100 650,20 850,50"
                  fill="none"
                  opacity="0.45"
                  stroke="#4edea3"
                  strokeWidth="0.75"
                />
                <path
                  d="M-50,250 C180,220 220,120 420,140 C620,160 670,60 850,90"
                  fill="none"
                  opacity="0.55"
                  stroke="#4edea3"
                  strokeWidth="0.75"
                />
                <path
                  d="M-50,310 C160,280 240,170 460,180 C680,190 700,100 850,140"
                  fill="none"
                  opacity="0.65"
                  stroke="#4edea3"
                  strokeWidth="0.75"
                />
                <path
                  d="M-50,380 C120,340 300,220 500,240 C700,260 740,160 850,200"
                  fill="none"
                  opacity="0.4"
                  stroke="#4edea3"
                  strokeWidth="0.75"
                />
                <path
                  d="M-50,450 C200,420 320,300 520,310 C720,320 780,220 850,260"
                  fill="none"
                  opacity="0.35"
                  stroke="#4edea3"
                  strokeWidth="0.75"
                />
                {/* Summit Peak Ridge Concentric Rings */}
                <ellipse
                  cx="640"
                  cy="130"
                  fill="none"
                  opacity="0.45"
                  rx="90"
                  ry="50"
                  stroke="#ffb59e"
                  strokeWidth="0.8"
                />
                <ellipse
                  cx="640"
                  cy="130"
                  fill="none"
                  opacity="0.65"
                  rx="65"
                  ry="35"
                  stroke="#ffb59e"
                  strokeWidth="0.9"
                />
                <ellipse
                  cx="640"
                  cy="130"
                  fill="none"
                  opacity="0.85"
                  rx="40"
                  ry="20"
                  stroke="#ff5a1f"
                  strokeWidth="1.2"
                />
                <ellipse cx="640" cy="130" fill="#ff5a1f" opacity="0.4" rx="15" ry="8" />
              </g>
            )}

            {/* Glacial Lake Basin */}
            <path
              d="M660,170 C700,160 740,180 735,210 C730,230 680,240 655,225 C640,210 645,185 660,170 Z"
              fill="#009dd3"
              fillOpacity="0.25"
              stroke="#7bd0ff"
              strokeWidth="1.2"
            />
            <text
              fill="#7bd0ff"
              fontFamily="JetBrains Mono"
              fontSize="9"
              letterSpacing="1"
              x="665"
              y="205"
            >
              {trail.lakeLabel}
            </text>

            {/* Route Glow + Remaining Dashed Orange Vector */}
            <path
              d={fullPathD}
              fill="none"
              opacity="0.22"
              stroke="#ff5a1f"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
            <path
              d={fullPathD}
              fill="none"
              stroke="#ff5a1f"
              strokeDasharray="7,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />

            {/* Completed Trail Trace in Emerald */}
            <path
              d={completedPathD}
              fill="none"
              stroke="#4edea3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
          </svg>

          {/* Extra Marker Pins (5km, Water Spring, Mountain Pass Col) */}
          {trail.extraPins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => onSelectPositionKm(pin.km)}
              style={{ left: `${pin.mapX}%`, top: `${pin.mapY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group/node z-10"
            >
              {pin.kind === 'water' ? (
                <div className="w-5 h-5 rounded-full bg-tertiary-container/30 border border-tertiary text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">water_drop</span>
                </div>
              ) : pin.kind === 'hazard' ? (
                <div className="w-5 h-5 rounded-full bg-error-container/30 border border-error text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">priority_high</span>
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-surface-container-high border-2 border-secondary text-secondary flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                </div>
              )}

              <div className="hidden group-hover/node:flex flex-col items-center absolute bottom-7 bg-surface/95 backdrop-blur-md px-2.5 py-1 rounded shadow-lg pointer-events-none min-w-[130px] z-30">
                <span
                  className={`font-mono-tabular text-[10px] font-bold uppercase ${
                    pin.kind === 'hazard'
                      ? 'text-error'
                      : pin.kind === 'water'
                        ? 'text-tertiary'
                        : 'text-secondary'
                  }`}
                >
                  {pin.label}
                </span>
                <span className="font-mono-tabular text-[10px] text-on-surface">
                  {pin.detail}
                </span>
              </div>

              {pin.kind === 'km' && (
                <span className="font-mono-tabular text-[10px] text-on-surface-variant font-medium mt-1">
                  {formatDistance(pin.km, units, 0)} {distanceUnit(units)}
                </span>
              )}
            </button>
          ))}

          {/* Primary Waypoint Nodes */}
          {waypoints.map((wp: Waypoint, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === waypoints.length - 1;
            const isSelected = selectedWaypointId === wp.id;
            const isPassed = wp.km <= progressKm;

            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => onSelectPositionKm(wp.km, wp.id)}
                style={{ left: `${wp.mapX}%`, top: `${wp.mapY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group/node z-10"
              >
                {isStart ? (
                  <div className="w-6 h-6 rounded-full bg-secondary text-surface-container-lowest flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(78,222,163,0.8)]">
                    S
                  </div>
                ) : isEnd ? (
                  <div className="w-7 h-7 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-xs shadow-[0_0_16px_rgba(0,157,211,0.6)]">
                    <span className="material-symbols-outlined text-sm">flag_circle</span>
                  </div>
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full bg-surface-container-high border-2 flex items-center justify-center ${
                      isPassed
                        ? 'border-secondary text-secondary'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPassed ? 'bg-secondary' : 'bg-outline-variant'
                      }`}
                    />
                  </div>
                )}

                <div
                  className={`${
                    isSelected ? 'flex' : 'hidden group-hover/node:flex'
                  } flex-col items-center absolute bottom-8 bg-surface/95 backdrop-blur-md px-2.5 py-1.5 rounded shadow-lg pointer-events-none min-w-[145px] z-30`}
                >
                  <span
                    className="font-mono-tabular text-[10px] font-bold uppercase"
                    style={{ color: wp.color }}
                  >
                    {wp.name}
                  </span>
                  <span className="font-mono-tabular text-[10px] text-on-surface">
                    Elev: {formatElevation(wp.elevationM, units)}
                    {elevationUnit(units)} · {formatDistance(wp.km, units)}{' '}
                    {distanceUnit(units)}
                  </span>
                </div>

                <span
                  className={`font-mono-tabular text-[10px] font-bold mt-1 px-1 rounded ${
                    isStart
                      ? 'text-secondary bg-surface-container-lowest/80'
                      : isEnd
                        ? 'text-tertiary bg-surface-container-lowest/80'
                        : 'text-on-surface-variant'
                  }`}
                >
                  {isStart
                    ? `[Start] ${formatElevation(startWp.elevationM, units)}${elevationUnit(units)}`
                    : isEnd
                      ? `[End] ${formatElevation(endWp.elevationM, units)}${elevationUnit(units)}`
                      : `${formatDistance(wp.km, units, 0)} ${distanceUnit(units)}`}
                </span>
              </button>
            );
          })}

          {/* Live Hiker Beacon Marker (follows progressKm dynamically) */}
          <div
            style={{ left: `${hikerPos.mapX}%`, top: `${hikerPos.mapY}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20 transition-all duration-300"
          >
            <div className="relative">
              <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_0_16px_rgba(255,90,31,0.85)]">
                <span className="material-symbols-outlined text-xs">my_location</span>
              </span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            </div>
            <div className="flex flex-col items-center absolute bottom-8 bg-surface/95 backdrop-blur-md px-2.5 py-1.5 rounded shadow-lg min-w-[148px] border-b-2 border-primary">
              <span className="font-mono-tabular text-[10px] text-primary font-bold uppercase">
                LIVE: ALPHA-1
              </span>
              <span className="font-mono-tabular text-[10px] text-on-surface">
                {formatDistance(progressKm, units)} {distanceUnit(units)} ·{' '}
                {trail.waypoints.find((w) => Math.abs(w.km - progressKm) < 1)?.shortLabel ||
                  trail.name}
              </span>
            </div>
          </div>
        </div>

        {/* Realtime Live Trackers Floating Badge */}
        <button
          type="button"
          onClick={onOpenCommunity}
          className="absolute bottom-4 right-4 bg-surface/90 hover:bg-surface-container backdrop-blur-lg px-4 py-2 rounded-lg shadow-lg flex items-center gap-4 z-20 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            <div className="flex flex-col">
              <span className="font-mono-tabular text-[10px] text-on-surface uppercase font-bold">
                {trail.liveTrackersCount} Live Trackers on Trail
              </span>
              <span className="font-mono-tabular text-[10px] text-on-surface-variant">
                {trail.rangersCount} Search &amp; Rescue Rangers
              </span>
            </div>
          </div>
          <span className="px-2 py-1 bg-surface-container text-secondary font-mono-tabular text-[10px] font-semibold rounded">
            SAFETY GRID SECURE
          </span>
        </button>

        {/* Bottom-Left Map Scale Legend */}
        <div className="absolute bottom-4 left-4 bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded flex items-center gap-2 z-20">
          <span className="font-mono-tabular text-[10px] text-on-surface-variant">
            Scale: 1:25,000
          </span>
          <div className="w-16 h-0.5 bg-on-surface-variant relative flex items-center justify-between">
            <div className="w-0.5 h-2 bg-on-surface-variant -mt-0.5" />
            <div className="w-0.5 h-2 bg-on-surface-variant -mt-0.5" />
          </div>
          <span className="font-mono-tabular text-[10px] text-on-surface">
            {units === 'imperial' ? '1.2 mi' : '2 km'}
          </span>
        </div>
      </div>
    </div>
  );
};

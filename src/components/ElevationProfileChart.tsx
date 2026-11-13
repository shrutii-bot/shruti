import React, { useRef, useState } from 'react';
import { Trail, UnitSystem } from '../types/telemetry';
import {
  distanceUnit,
  elevationUnit,
  formatDistance,
  formatElevation,
  interpolateElevationAtKm,
} from '../utils/exports';

interface ElevationProfileChartProps {
  trail: Trail;
  progressKm: number;
  units: UnitSystem;
  onScrubKm: (km: number) => void;
}

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  trail,
  progressKm,
  units,
  onScrubKm,
}) => {
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const [hoverKm, setHoverKm] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeKm = hoverKm !== null ? hoverKm : progressKm;
  const maxElev = Math.max(trail.highestAltitudeM, 2200);
  const minElev = Math.max(0, trail.baseAltitudeM - 50);
  const elevRange = Math.max(100, maxElev - minElev);

  const kmToX = (km: number) => (km / Math.max(0.1, trail.distanceKm)) * 1000;
  const elevToY = (elev: number) => 185 - ((elev - minElev) / elevRange) * 165;

  // Build SVG points from samples
  const samples = trail.elevationSamples;
  const splitX = kmToX(activeKm);
  const splitInterp = interpolateElevationAtKm(trail, activeKm);
  const splitY = elevToY(splitInterp.elevationM);

  const traversedCoords: string[] = [];
  const remainingCoords: string[] = [];

  for (const s of samples) {
    const x = kmToX(s.km);
    const y = elevToY(s.elevationM);
    if (s.km <= activeKm) {
      traversedCoords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    } else {
      remainingCoords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  const splitPointStr = `${splitX.toFixed(1)},${splitY.toFixed(1)}`;
  const traversedLinePts = [...traversedCoords, splitPointStr];
  const remainingLinePts = [splitPointStr, ...remainingCoords];

  const traversedLineD =
    traversedLinePts.length >= 2 ? `M ${traversedLinePts.join(' L ')}` : '';
  const traversedAreaD =
    traversedLinePts.length >= 2
      ? `M ${traversedLinePts.join(' L ')} L ${splitX.toFixed(1)},195 L 0,195 Z`
      : '';

  const remainingLineD =
    remainingLinePts.length >= 2 ? `M ${remainingLinePts.join(' L ')}` : '';
  const remainingAreaD =
    remainingLinePts.length >= 2
      ? `M ${remainingLinePts.join(' L ')} L 1000,195 L ${splitX.toFixed(1)},195 Z`
      : '';

  // Compute remaining climb & arrival estimate dynamically
  const remainingClimb = Math.max(0, trail.highestAltitudeM - splitInterp.elevationM);
  const remainingKm = Math.max(0, trail.distanceKm - activeKm);
  const hoursRemaining = remainingKm / Math.max(1.2, trail.avgPaceKmh);
  const arrivalHour = 14 + Math.floor(hoursRemaining);
  const arrivalMin = Math.round((hoursRemaining % 1) * 60);
  const formattedArrival = `${String(Math.min(23, arrivalHour)).padStart(2, '0')}:${String(
    arrivalMin % 60
  ).padStart(2, '0')} UTC-3`;

  const computeKmFromPointer = (clientX: number) => {
    if (!svgWrapRef.current) return progressKm;
    const rect = svgWrapRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Number((ratio * trail.distanceKm).toFixed(1));
  };

  // Find steepest sample for highlight zone
  const steepestSample = samples.reduce((best, curr) =>
    curr.gradePct > best.gradePct ? curr : best
  );
  const steepX = Math.max(60, Math.min(860, kmToX(steepestSample.km) - 60));

  return (
    <div className="bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-lg">area_chart</span>
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface font-bold tracking-wider">
            Dynamic Elevation Profile ({formatElevation(trail.baseAltitudeM, units)}
            {elevationUnit(units)} to {formatElevation(trail.highestAltitudeM, units)}
            {elevationUnit(units)} ASL)
          </span>
          <span className="text-surface-bright">•</span>
          <span className="font-mono-tabular text-[10px] text-on-surface-variant">
            Hover or click profile to scrub telemetry
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono-tabular text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <span className="text-on-surface">Traversed Segment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-on-surface">Remaining Incline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-error" />
            <span className="text-error font-semibold">
              Max Incline: {trail.maxGradePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Area Chart */}
      <div
        ref={svgWrapRef}
        onPointerDown={(e) => {
          setIsDragging(true);
          const km = computeKmFromPointer(e.clientX);
          setHoverKm(km);
          onScrubKm(km);
        }}
        onPointerMove={(e) => {
          const km = computeKmFromPointer(e.clientX);
          setHoverKm(km);
          if (isDragging) {
            onScrubKm(km);
          }
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => {
          setIsDragging(false);
          setHoverKm(null);
        }}
        className="relative w-full h-56 bg-surface-container-lowest rounded-lg p-2 overflow-hidden select-none cursor-crosshair"
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
          <defs>
            <linearGradient id="traversed-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="pending-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Elevation Horizontal Guides */}
          {[
            { y: 20, label: `${formatElevation(maxElev, units)}${elevationUnit(units)} (Summit)` },
            {
              y: 75,
              label: `${formatElevation(minElev + elevRange * 0.66, units)}${elevationUnit(units)}`,
            },
            {
              y: 130,
              label: `${formatElevation(minElev + elevRange * 0.33, units)}${elevationUnit(units)}`,
            },
            {
              y: 185,
              label: `${formatElevation(trail.baseAltitudeM, units)}${elevationUnit(units)} (Base)`,
            },
          ].map((g) => (
            <g key={g.y}>
              <line
                stroke="#293B36"
                strokeDasharray="3,3"
                strokeWidth="0.75"
                x1="0"
                x2="1000"
                y1={g.y}
                y2={g.y}
              />
              <text fill="#ab897f" fontFamily="JetBrains Mono" fontSize="9" x="10" y={g.y + 4}>
                {g.label}
              </text>
            </g>
          ))}

          {/* Traversed Segment */}
          {traversedAreaD && <path d={traversedAreaD} fill="url(#traversed-grad)" />}
          {traversedLineD && (
            <path d={traversedLineD} fill="none" stroke="#4edea3" strokeWidth="2.5" />
          )}

          {/* Remaining Segment */}
          {remainingAreaD && <path d={remainingAreaD} fill="url(#pending-grad)" />}
          {remainingLineD && (
            <path
              d={remainingLineD}
              fill="none"
              stroke="#ff5a1f"
              strokeDasharray="4,2"
              strokeWidth="2.5"
            />
          )}

          {/* Highlight: Steepest Grade Zone */}
          <rect
            fill="#93000a"
            fillOpacity="0.14"
            height="170"
            rx="4"
            width="120"
            x={steepX}
            y="25"
          />
          <line
            stroke="#ffb4ab"
            strokeDasharray="2,2"
            strokeWidth="0.75"
            x1={steepX + 60}
            x2={steepX + 60}
            y1="25"
            y2="195"
          />
          <text
            fill="#ffb4ab"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fontWeight="bold"
            x={steepX + 65}
            y="45"
          >
            MAX GRADE {trail.maxGradePct}%
          </text>
          <text fill="#e4beb3" fontFamily="JetBrains Mono" fontSize="8" x={steepX + 65} y="58">
            Steep Push
          </text>

          {/* Waypoint Pins along Elevation Curve */}
          {trail.waypoints.slice(1, -1).map((wp) => {
            const wx = kmToX(wp.km);
            const wy = elevToY(wp.elevationM);
            return (
              <g key={wp.id}>
                <circle cx={wx} cy={wy} fill={wp.color} r="3" />
                <text
                  fill={wp.color}
                  fontFamily="JetBrains Mono"
                  fontSize="8"
                  x={Math.min(860, wx + 6)}
                  y={Math.max(18, wy - 6)}
                >
                  {wp.shortLabel} ({formatElevation(wp.elevationM, units)}
                  {elevationUnit(units)})
                </text>
              </g>
            );
          })}

          {/* Scrubber Hairline */}
          <line stroke="#dce4e1" strokeWidth="1.5" x1={splitX} x2={splitX} y1="15" y2="195" />
          <circle
            cx={splitX}
            cy={splitY}
            fill="#ff5a1f"
            r="5"
            stroke="#0d1513"
            strokeWidth="2"
          />
          <circle
            cx={splitX}
            cy={splitY}
            fill="none"
            opacity="0.6"
            r="8"
            stroke="#ff5a1f"
            strokeWidth="1"
          />
          <text
            fill="#ffb59e"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fontWeight="bold"
            x={splitX > 760 ? splitX - 150 : splitX + 10}
            y={Math.max(18, splitY - 10)}
          >
            {hoverKm !== null ? 'SCRUBBER' : 'YOU ARE HERE'} (
            {formatElevation(splitInterp.elevationM, units)}
            {elevationUnit(units)})
          </text>
        </svg>

        {/* X-Axis Distance Ticks */}
        <div className="absolute bottom-1 left-6 right-6 flex justify-between font-mono-tabular text-[10px] text-on-surface-variant pointer-events-none">
          <span>0.0 {distanceUnit(units)}</span>
          <span>
            {formatDistance(trail.distanceKm * 0.25, units)} {distanceUnit(units)}
          </span>
          <span>
            {formatDistance(trail.distanceKm * 0.5, units)} {distanceUnit(units)}
          </span>
          <span className="text-primary font-bold">
            {formatDistance(activeKm, units)} {distanceUnit(units)}{' '}
            {hoverKm !== null ? '(Scrubbing)' : '(Current)'}
          </span>
          <span>
            {formatDistance(trail.distanceKm * 0.8, units)} {distanceUnit(units)}
          </span>
          <span className="text-tertiary font-bold">
            {formatDistance(trail.distanceKm, units)} {distanceUnit(units)}
          </span>
        </div>
      </div>

      {/* Detailed Elevation Callout Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono-tabular text-[12px]">
        <div className="bg-surface-container p-2.5 rounded flex items-center justify-between">
          <span className="text-on-surface-variant">Ascent Rate:</span>
          <span className="text-secondary font-bold">
            +{formatElevation(340, units)} {elevationUnit(units)}/h
          </span>
        </div>
        <div className="bg-surface-container p-2.5 rounded flex items-center justify-between">
          <span className="text-on-surface-variant">Grade at Scrubber:</span>
          <span className="text-primary font-bold">{splitInterp.gradePct}%</span>
        </div>
        <div className="bg-surface-container p-2.5 rounded flex items-center justify-between">
          <span className="text-on-surface-variant">Remaining Climb:</span>
          <span className="text-on-surface font-bold">
            +{formatElevation(remainingClimb, units)} {elevationUnit(units)}
          </span>
        </div>
        <div className="bg-surface-container p-2.5 rounded flex items-center justify-between">
          <span className="text-on-surface-variant">Est. Summit Arrival:</span>
          <span className="text-tertiary font-bold">{formattedArrival}</span>
        </div>
      </div>
    </div>
  );
};

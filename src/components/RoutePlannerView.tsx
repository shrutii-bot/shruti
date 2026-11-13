import React, { useState } from 'react';
import { Trail, UnitSystem, Waypoint } from '../types/telemetry';
import { distanceUnit, elevationUnit, formatDistance, formatElevation } from '../utils/exports';

interface PlannedNode {
  xPct: number;
  yPct: number;
  label: string;
  elevationM: number;
}

interface RoutePlannerViewProps {
  units: UnitSystem;
  onSaveCustomTrail: (trail: Trail) => void;
}

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  units,
  onSaveCustomTrail,
}) => {
  const [routeName, setRouteName] = useState('Cerro Madsen Ridge Recon');
  const [regionName, setRegionName] = useState('Sector 08 Fitz Roy North');
  const [nodes, setNodes] = useState<PlannedNode[]>([
    { xPct: 12, yPct: 80, label: 'Base Trailhead', elevationM: 460 },
    { xPct: 38, yPct: 58, label: 'Laguna Ridge Camp', elevationM: 1080 },
    { xPct: 68, yPct: 34, label: 'Madsen High Col', elevationM: 1860 },
  ]);

  const computeStats = (pts: PlannedNode[]) => {
    let distKm = 0;
    let gainM = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].xPct - pts[i - 1].xPct;
      const dy = pts[i].yPct - pts[i - 1].yPct;
      distKm += Math.hypot(dx, dy) * 0.28;
      if (pts[i].elevationM > pts[i - 1].elevationM) {
        gainM += pts[i].elevationM - pts[i - 1].elevationM;
      }
    }
    return {
      distKm: Number(Math.max(1.5, distKm).toFixed(1)),
      gainM: Math.round(gainM),
      maxElev: Math.max(...pts.map((p) => p.elevationM), 460),
      minElev: Math.min(...pts.map((p) => p.elevationM), 460),
    };
  };

  const stats = computeStats(nodes);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));

    // Higher on canvas + further right = higher alpine elevation
    const estElev = Math.round(420 + ((100 - yPct) / 100) * 1550 + (xPct / 100) * 320);

    setNodes((prev) => [
      ...prev,
      {
        xPct: Number(xPct.toFixed(1)),
        yPct: Number(yPct.toFixed(1)),
        label: `Waypoint 0${prev.length + 1}`,
        elevationM: estElev,
      },
    ]);
  };

  const handleCreateTrail = () => {
    if (nodes.length < 2) return;
    let cumKm = 0;
    const waypoints: Waypoint[] = nodes.map((n, idx) => {
      if (idx > 0) {
        const dx = n.xPct - nodes[idx - 1].xPct;
        const dy = n.yPct - nodes[idx - 1].yPct;
        cumKm += Math.hypot(dx, dy) * 0.28;
      }
      const isFirst = idx === 0;
      const isLast = idx === nodes.length - 1;
      return {
        id: idx,
        name: n.label,
        shortLabel: n.label,
        km: Number(cumKm.toFixed(1)),
        elevationM: n.elevationM,
        inclinePct:
          idx === 0
            ? 3.0
            : Number(
                (
                  ((n.elevationM - nodes[idx - 1].elevationM) /
                    Math.max(200, Math.hypot(n.xPct - nodes[idx - 1].xPct, n.yPct - nodes[idx - 1].yPct) * 280)) *
                  100
                ).toFixed(1)
              ),
        tempC: Number((12 - (n.elevationM / 2200) * 10).toFixed(1)),
        o2SatPct: Number((97 - (n.elevationM / 2200) * 18).toFixed(1)),
        coords: `49°${15 + idx}'12"S 72°${54 + idx}'30"W`,
        lat: -49.32 + idx * 0.015,
        lon: -72.9 - idx * 0.025,
        status: isFirst
          ? 'TRAVERSED'
          : isLast
            ? 'DESTINATION'
            : idx === 1
              ? 'LIVE BEACON'
              : 'PENDING',
        icon: isFirst ? 'flag' : isLast ? 'terrain' : 'cabin',
        mapX: n.xPct,
        mapY: n.yPct,
        gx: Number(((n.xPct / 100) * 1.4 - 0.7).toFixed(2)),
        gz: Number(((n.yPct / 100) * 1.3 - 0.65).toFixed(2)),
        color: isFirst ? '#4edea3' : isLast ? '#7bd0ff' : idx === 1 ? '#ff5a1f' : '#ab897f',
        isLive: idx === 1,
      };
    });

    const newTrail: Trail = {
      id: `custom-${Date.now()}`,
      code: `PT-CST-${Math.floor(100 + Math.random() * 899)}`,
      name: routeName.trim() || 'Custom Alpine Circuit',
      region: regionName.trim() || 'Custom Cordillera Sector',
      sector: 'Sector 08 Custom Survey',
      difficultyLabel: stats.gainM > 1000 ? 'Hard / Alpine Grade IV' : 'Moderate / Grade II',
      statusLabel: 'Trail Status: Planned Route',
      passWindow: 'Pass Open until 19:00',
      startPoint: nodes[0].label,
      destination: nodes[nodes.length - 1].label,
      technicalClass: 'Custom Survey Track',
      distanceKm: waypoints[waypoints.length - 1].km || stats.distKm,
      initialProgressKm: waypoints[1]?.km || 1.2,
      elevationGainM: stats.gainM,
      maxGradePct: 24,
      slopeGradeLabel: 'Custom Survey',
      durationTotal: `${Math.max(2, Math.round(stats.distKm / 3.1))}h 30m`,
      movingTime: `${Math.max(1, Math.round(stats.distKm / 3.6))}:15`,
      restTime: '00:45',
      avgPaceKmh: 3.1,
      currentPaceKmh: 2.9,
      splitPaceMinKm: '19:20',
      highestAltitudeM: stats.maxElev,
      baseAltitudeM: stats.minElev,
      caloriesTotal: Math.round(stats.distKm * 125),
      caloriesRate: 380,
      avgHeartRate: 138,
      weather: {
        tempC: 7,
        feelsLikeC: 4,
        condition: 'Alpine Clear',
        windKmh: 22,
        windDir: 'NW',
        gustKmh: 34,
        uvIndex: 4,
        uvLabel: 'Moderate',
        humidityPct: 54,
        pressureHpa: 790,
        pressureNote: 'Thin Air',
        ridgeBaseLabel: `Survey Peak ${stats.maxElev}m`,
        ridgeWeatherSummary: '7°C · NW 22kt',
      },
      terrainMix: {
        screePct: 38,
        singletrackPct: 42,
        morainePct: 20,
        screeLabel: 'Granite ridge',
        singletrackLabel: 'Approach path',
        moraineLabel: 'Snowfield',
      },
      rangerNotice: {
        author: 'Custom Route Briefing',
        timeAgo: 'Just created',
        message:
          'User-plotted alpine survey track. Verify pass conditions and pack traction gear before departure.',
      },
      sunsetTime: '19:42 UTC-3',
      daylightRemaining: '02h 14m daylight remaining',
      liveTrackersCount: 1,
      rangersCount: 2,
      lakeLabel: 'ALPINE BASIN',
      waypoints,
      extraPins: [],
      elevationSamples: waypoints.map((wp) => ({
        km: wp.km,
        elevationM: wp.elevationM,
        gradePct: Math.abs(wp.inclinePct),
        label: wp.shortLabel,
      })),
      isCustom: true,
    };

    onSaveCustomTrail(newTrail);
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-tertiary font-semibold">
            Topographic Waypoint Plotter
          </span>
          <h1 className="font-display-grotesk text-[28px] font-semibold text-on-surface tracking-tight mt-1">
            Route Planner
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Click anywhere on the contour grid to drop alpine waypoints, inspect projected gain, and
            launch your custom route directly into Live Telemetry and 3D Mesh view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={nodes.length <= 1}
            onClick={() => setNodes((prev) => prev.slice(0, -1))}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 text-on-surface font-mono-tabular text-[12px] rounded flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">undo</span>
            <span>Undo Node</span>
          </button>
          <button
            type="button"
            onClick={() => setNodes([{ xPct: 12, yPct: 80, label: 'Base Trailhead', elevationM: 460 }])}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-mono-tabular text-[12px] rounded flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            <span>Reset</span>
          </button>
          <button
            type="button"
            disabled={nodes.length < 2}
            onClick={handleCreateTrail}
            className="px-5 py-2 bg-primary-container hover:brightness-110 disabled:opacity-40 text-on-primary-container font-mono-tabular text-[12px] font-bold rounded flex items-center gap-1.5 shadow-md shadow-primary-container/20 transition-all"
          >
            <span className="material-symbols-outlined text-base">rocket_launch</span>
            <span>Launch in Live Telemetry</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive Plotting Canvas */}
        <div className="lg:col-span-8 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between font-mono-tabular text-[10px] text-on-surface-variant">
            <span className="uppercase font-bold text-secondary">
              Click Contour Canvas to Append Waypoints
            </span>
            <span>{nodes.length} Waypoints Plotted</span>
          </div>

          <div
            onClick={handleCanvasClick}
            className="relative w-full h-[430px] bg-surface-container-lowest rounded-lg overflow-hidden cursor-crosshair select-none"
          >
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 500">
              <defs>
                <pattern id="planner-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#293B36"
                    strokeDasharray="2,2"
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#planner-grid)" opacity="0.6" />
              <path
                d="M-50,240 C160,200 220,100 420,120 C620,140 670,40 850,70"
                fill="none"
                stroke="#4edea3"
                strokeWidth="0.8"
                opacity="0.3"
              />
              <path
                d="M-50,350 C140,310 260,190 480,210 C680,230 720,120 850,160"
                fill="none"
                stroke="#4edea3"
                strokeWidth="0.8"
                opacity="0.35"
              />
              <ellipse
                cx="620"
                cy="145"
                rx="110"
                ry="60"
                fill="none"
                stroke="#ffb59e"
                strokeWidth="0.8"
                opacity="0.35"
              />
              <ellipse
                cx="620"
                cy="145"
                rx="55"
                ry="30"
                fill="none"
                stroke="#ff5a1f"
                strokeWidth="1"
                opacity="0.55"
              />

              {nodes.length >= 2 && (
                <polyline
                  fill="none"
                  stroke="#ff5a1f"
                  strokeWidth="3"
                  strokeDasharray="7,3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={nodes.map((n) => `${(n.xPct / 100) * 800},${(n.yPct / 100) * 500}`).join(' ')}
                />
              )}
            </svg>

            {nodes.map((n, idx) => (
              <div
                key={`${n.xPct}-${n.yPct}-${idx}`}
                style={{ left: `${n.xPct}%`, top: `${n.yPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono-tabular text-[11px] font-bold shadow-lg ${
                    idx === 0
                      ? 'bg-secondary text-on-secondary'
                      : idx === nodes.length - 1
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="mt-1 px-1.5 py-0.5 bg-surface/90 rounded font-mono-tabular text-[10px] text-on-surface whitespace-nowrap">
                  {n.label} · {formatElevation(n.elevationM, units)}
                  {elevationUnit(units)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Route Parameters & Node Inspector */}
        <div className="lg:col-span-4 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
              Circuit Title
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="mt-1 w-full bg-surface-container px-3 py-2 rounded text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </label>
            <label className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
              Sector / Region
              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                className="mt-1 w-full bg-surface-container px-3 py-2 rounded text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-surface-container p-3 rounded-lg font-mono-tabular">
            <div>
              <div className="text-[10px] text-on-surface-variant uppercase">Est. Span</div>
              <div className="text-[15px] font-bold text-on-surface mt-0.5">
                {formatDistance(stats.distKm, units)} {distanceUnit(units)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant uppercase">Climb</div>
              <div className="text-[15px] font-bold text-secondary mt-0.5">
                +{formatElevation(stats.gainM, units)}
                {elevationUnit(units)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant uppercase">Peak</div>
              <div className="text-[15px] font-bold text-primary mt-0.5">
                {formatElevation(stats.maxElev, units)}
                {elevationUnit(units)}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-60">
            <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
              Plotted Waypoints
            </span>
            {nodes.map((n, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-surface-container p-2 rounded"
              >
                <span className="font-mono-tabular text-[11px] font-bold text-primary w-5">
                  0{idx + 1}
                </span>
                <input
                  type="text"
                  value={n.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, label: val } : item))
                    );
                  }}
                  className="flex-1 bg-transparent text-[12px] text-on-surface focus:outline-none border-b border-transparent focus:border-primary"
                />
                <span className="font-mono-tabular text-[11px] text-secondary shrink-0">
                  {formatElevation(n.elevationM, units)}
                  {elevationUnit(units)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

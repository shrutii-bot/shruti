import React, { useState } from 'react';
import { GearItem, Trail, UnitSystem } from '../types/telemetry';
import {
  distanceUnit,
  elevationUnit,
  exportTrailAsGpx,
  formatDistance,
  formatElevation,
  formatSpeed,
  formatTemp,
  interpolateElevationAtKm,
  speedUnit,
} from '../utils/exports';
import { ElevationProfileChart } from './ElevationProfileChart';
import { TopoMapVisualizer } from './TopoMapVisualizer';

interface LiveTelemetryViewProps {
  trail: Trail;
  progressKm: number;
  elapsedSeconds: number;
  isTracking: boolean;
  isCachedOffline: boolean;
  gearItems: GearItem[];
  units: UnitSystem;
  onScrubKm: (km: number) => void;
  onToggleTracking: () => void;
  onToggleCacheOffline: (trailId: string) => void;
  onOpen3DModal: () => void;
  onOpenSosModal: () => void;
  onNavigateGear: () => void;
  onNavigateCommunity: () => void;
}

export const LiveTelemetryView: React.FC<LiveTelemetryViewProps> = ({
  trail,
  progressKm,
  elapsedSeconds,
  isTracking,
  isCachedOffline,
  gearItems,
  units,
  onScrubKm,
  onToggleTracking,
  onToggleCacheOffline,
  onOpen3DModal,
  onOpenSosModal,
  onNavigateGear,
  onNavigateCommunity,
}) => {
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [gpxFeedback, setGpxFeedback] = useState(false);

  const essentialGear = gearItems.filter((g) => g.essential).slice(0, 4);
  const verifiedCount = gearItems.filter((g) => g.essential && g.status !== 'Pending').length;
  const totalEssential = gearItems.filter((g) => g.essential).length;

  const progressPct = Math.max(
    4,
    Math.min(100, (progressKm / Math.max(0.1, trail.distanceKm)) * 100)
  );
  const remainingKm = Math.max(0, trail.distanceKm - progressKm);

  const currentInterp = interpolateElevationAtKm(trail, progressKm);
  const liveElevationGain = Math.max(
    0,
    Math.round(
      trail.elevationGainM * (progressKm / Math.max(0.1, trail.distanceKm)) +
        (currentInterp.elevationM - trail.baseAltitudeM) * 0.15
    )
  );

  // Format duration dynamically as tracking advances
  const extraMin = Math.floor(elapsedSeconds / 60);
  const baseHours = 6;
  const baseMins = 45 + extraMin;
  const dispHours = baseHours + Math.floor(baseMins / 60);
  const dispMins = baseMins % 60;
  const durationLabel =
    trail.id === 'fitz-roy' && extraMin === 0
      ? trail.durationTotal
      : trail.id === 'fitz-roy'
        ? `${dispHours}h ${String(dispMins).padStart(2, '0')}m`
        : trail.durationTotal;

  const liveCalories = Math.round(
    trail.caloriesTotal * (0.4 + 0.6 * (progressKm / Math.max(0.1, trail.distanceKm)))
  );

  const handleExportGpx = () => {
    exportTrailAsGpx(trail);
    setGpxFeedback(true);
    setTimeout(() => setGpxFeedback(false), 2000);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Alert & Realtime Satellite Bar */}
      <div className="w-full bg-surface-container-lowest px-4 md:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full bg-secondary ${
              isTracking ? 'animate-ping' : 'animate-pulse'
            }`}
          />
          <span className="font-mono-tabular text-[10px] text-secondary uppercase tracking-widest font-semibold">
            Active Sector: {trail.sector}
          </span>
          <span className="text-surface-bright">•</span>
          <span className="font-mono-tabular text-[10px] text-on-surface-variant">
            Live Mesh Relays: 4 Station Synced
          </span>
        </div>

        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="font-mono-tabular text-[10px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-tertiary">wb_twilight</span>
            Civil Dusk:{' '}
            <strong className="text-on-surface font-semibold">19:42 (-02h 14m)</strong>
          </span>
          <span className="font-mono-tabular text-[10px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-primary">satellite_alt</span>
            QZSS / Galileo:{' '}
            <strong className="text-on-surface font-semibold">14 Sats (0.8m HDOP)</strong>
          </span>
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-6">
        {/* 1. Trek / Trail Header */}
        <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 bg-surface-container-highest text-on-surface font-mono-tabular text-[10px] rounded uppercase tracking-wider">
                Trek Route ID: {trail.code}
              </span>
              <span className="px-2 py-1 bg-primary-container text-on-primary-container font-mono-tabular text-[10px] font-semibold rounded uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                {trail.difficultyLabel}
              </span>
              <span className="px-2 py-1 bg-secondary-container/20 text-secondary font-mono-tabular text-[10px] font-semibold rounded uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                {trail.statusLabel}
              </span>
              <span className="px-2 py-1 bg-surface-container text-tertiary font-mono-tabular text-[10px] rounded uppercase">
                {trail.passWindow}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mt-1">
              <h1 className="font-display-grotesk text-[28px] sm:text-[32px] leading-10 font-semibold text-on-surface tracking-tight">
                {trail.name}
              </h1>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-medium">
                {trail.region}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportGpx}
              className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono-tabular text-[12px] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">
                {gpxFeedback ? 'check' : 'download'}
              </span>
              <span>{gpxFeedback ? 'GPX Exported' : 'Export GPX'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleCacheOffline(trail.id)}
              className={`px-4 py-2.5 font-mono-tabular text-[12px] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                isCachedOffline
                  ? 'bg-secondary-container/20 text-secondary border border-secondary/30'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">offline_pin</span>
              <span>{isCachedOffline ? 'Map Cached Offline' : 'Cache Map Offline'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTracking}
              className={`px-5 py-2.5 font-mono-tabular text-[12px] font-bold rounded flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap ${
                isTracking
                  ? 'bg-secondary text-on-secondary shadow-secondary/20'
                  : 'bg-primary-container hover:brightness-110 text-on-primary-container shadow-primary-container/20'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isTracking ? 'pause' : 'play_arrow'}
              </span>
              <span>{isTracking ? 'Pause Realtime Track' : 'Start Realtime Track'}</span>
            </button>
          </div>
        </div>

        {/* 2. Key Waypoint & Route Summary Banner */}
        <div className="bg-surface-container p-4 rounded-xl shadow-md flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tabular text-[10px] text-on-surface-variant uppercase">
                  Start Point:
                </span>
                <span className="font-mono-tabular text-[12px] text-primary font-semibold">
                  {trail.startPoint}
                </span>
              </div>
              <span className="text-surface-bright">➔</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tabular text-[10px] text-on-surface-variant uppercase">
                  Destination:
                </span>
                <span className="font-mono-tabular text-[12px] text-secondary font-semibold">
                  {trail.destination}
                </span>
              </div>
            </div>
            <div className="font-mono-tabular text-[10px] text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-tertiary">alt_route</span>
              Total Route Span: {trail.waypoints.length - 1} Segmented Milestones • Technical Class:{' '}
              {trail.technicalClass}
            </div>
          </div>

          {/* Interactive Waypoint Ribbon */}
          <div className="relative w-full pt-1 pb-2 overflow-x-auto">
            <div className="min-w-[700px] flex items-center justify-between relative px-4">
              <div className="absolute left-6 right-6 top-5 h-1 bg-surface-container-highest rounded" />
              <div
                className="absolute left-6 top-5 h-1 bg-gradient-to-r from-primary-container to-secondary rounded transition-all duration-300"
                style={{ width: `calc(${progressPct}% - 24px)` }}
              />

              {trail.waypoints.map((wp, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === trail.waypoints.length - 1;
                const isPassed = wp.km < progressKm - 0.3;
                const isCurrent = Math.abs(wp.km - progressKm) <= 0.8 || (wp.isLive && selectedWaypointId === null && Math.abs(wp.km - progressKm) <= 2);

                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => {
                      setSelectedWaypointId(wp.id);
                      onScrubKm(wp.km);
                    }}
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono-tabular text-[12px] font-bold transition-transform group-hover:scale-105 ${
                        isFirst
                          ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/30'
                          : isCurrent
                            ? 'bg-surface-container-high border-2 border-primary text-primary animate-pulse'
                            : isPassed
                              ? 'bg-surface-container-high border-2 border-secondary text-secondary'
                              : isLast
                                ? 'bg-surface-container-high border border-outline-variant text-tertiary'
                                : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{wp.icon}</span>
                    </div>

                    <span
                      className={`font-mono-tabular text-[10px] font-semibold mt-2 ${
                        isCurrent ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {wp.shortLabel}
                    </span>
                    <span
                      className={`font-mono-tabular text-[10px] ${
                        isCurrent
                          ? 'text-primary'
                          : isPassed && !isFirst
                            ? 'text-secondary'
                            : isLast
                              ? 'text-tertiary'
                              : 'text-on-surface-variant'
                      }`}
                    >
                      {formatDistance(wp.km, units)} {distanceUnit(units)} •{' '}
                      {formatElevation(wp.elevationM, units)}
                      {elevationUnit(units)}
                      {isCurrent ? ' (Current)' : isPassed && !isFirst ? ' (Passed)' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Primary Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Total Distance
              </span>
              <span className="material-symbols-outlined text-base text-primary">straighten</span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-on-surface tracking-tight tabular-nums">
                {formatDistance(trail.distanceKm, units)}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-semibold">
                {distanceUnit(units)}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-secondary">
                ▲ {formatDistance(progressKm, units)} {distanceUnit(units)} done
              </span>
              <span className="text-on-surface-variant">
                {formatDistance(remainingKm, units)} {distanceUnit(units)} rem.
              </span>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Elevation Gain
              </span>
              <span className="material-symbols-outlined text-base text-secondary">
                trending_up
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-secondary tracking-tight tabular-nums">
                +{formatElevation(trail.id === 'fitz-roy' && !isTracking ? trail.elevationGainM : liveElevationGain, units)}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-semibold">
                {elevationUnit(units)}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-on-surface-variant">Grade Max: {trail.maxGradePct}%</span>
              <span className="text-primary font-medium">{trail.slopeGradeLabel}</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Trek Duration
              </span>
              <span className="material-symbols-outlined text-base text-tertiary">timer</span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-on-surface tracking-tight tabular-nums">
                {durationLabel}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-on-surface-variant">Moving: {trail.movingTime}</span>
              <span className="text-tertiary">Rest: {trail.restTime}</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Average Pace
              </span>
              <span className="material-symbols-outlined text-base text-primary">speed</span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-on-surface tracking-tight tabular-nums">
                {formatSpeed(trail.avgPaceKmh, units)}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-semibold">
                {speedUnit(units)}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-secondary">
                Current: {formatSpeed(trail.currentPaceKmh, units)} {speedUnit(units)}
              </span>
              <span className="text-on-surface-variant">Split: {trail.splitPaceMinKm}</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Highest Altitude
              </span>
              <span className="material-symbols-outlined text-base text-primary-container">
                mountain_flag
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-primary tracking-tight tabular-nums">
                {formatElevation(trail.highestAltitudeM, units)}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-semibold">
                {elevationUnit(units)} ASL
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-on-surface-variant">
                Base: {formatElevation(trail.baseAltitudeM, units)}
                {elevationUnit(units)}
              </span>
              <span className="text-on-surface font-semibold">
                Δ +{formatElevation(trail.highestAltitudeM - trail.baseAltitudeM, units)}
                {elevationUnit(units)} net
              </span>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl shadow flex flex-col justify-between hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider">
                Calories Burned
              </span>
              <span className="material-symbols-outlined text-base text-primary">
                local_fire_department
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1.5">
              <span className="font-display-grotesk text-[36px] leading-[44px] font-bold text-on-surface tracking-tight tabular-nums">
                {(isTracking ? liveCalories : trail.caloriesTotal).toLocaleString()}
              </span>
              <span className="font-mono-tabular text-[12px] text-on-surface-variant font-semibold">
                kcal
              </span>
            </div>
            <div className="flex items-center justify-between font-mono-tabular text-[10px]">
              <span className="text-secondary">{trail.caloriesRate} kcal/hr</span>
              <span className="text-on-surface-variant">HR avg {trail.avgHeartRate} bpm</span>
            </div>
          </div>
        </div>

        {/* Weather & Atmosphere Micro-Bar */}
        <div className="bg-surface-container-high px-4 py-2 rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-tertiary">
              partly_cloudy_day
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tabular text-[22px] text-on-surface font-bold">
                {formatTemp(trail.weather.tempC, units)}
              </span>
              <span className="font-mono-tabular text-[10px] text-on-surface-variant">
                (Feels like {formatTemp(trail.weather.feelsLikeC, units)})
              </span>
            </div>
            <span className="px-2 py-0.5 bg-surface-container text-on-surface font-mono-tabular text-[10px] rounded">
              {trail.weather.condition}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-on-surface-variant">
            <div className="flex items-center gap-1.5 font-mono-tabular text-[10px]">
              <span className="material-symbols-outlined text-sm text-tertiary">air</span>
              Wind:{' '}
              <span className="text-on-surface font-semibold">
                {formatSpeed(trail.weather.windKmh, units)} {speedUnit(units)}{' '}
                {trail.weather.windDir} (Gusts {Math.round(trail.weather.gustKmh)})
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-tabular text-[10px]">
              <span className="material-symbols-outlined text-sm text-primary">wb_sunny</span>
              UV Index:{' '}
              <span className="text-primary font-semibold">
                {trail.weather.uvIndex} {trail.weather.uvLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-tabular text-[10px]">
              <span className="material-symbols-outlined text-sm text-secondary">water_drop</span>
              Humidity:{' '}
              <span className="text-on-surface font-semibold">
                {trail.weather.humidityPct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-tabular text-[10px]">
              <span className="material-symbols-outlined text-sm text-tertiary">compress</span>
              Atm. Pressure:{' '}
              <span className="text-on-surface font-semibold">
                {trail.weather.pressureHpa} hPa ({trail.weather.pressureNote})
              </span>
            </div>
          </div>
        </div>

        {/* 4. Central Interactive Route Map Shape & Topographic Visualizer + Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <TopoMapVisualizer
            trail={trail}
            progressKm={progressKm}
            selectedWaypointId={selectedWaypointId}
            units={units}
            onSelectPositionKm={(km, wpId) => {
              onScrubKm(km);
              if (wpId !== undefined) setSelectedWaypointId(wpId);
            }}
            onOpen3DModal={onOpen3DModal}
            onOpenCommunity={onNavigateCommunity}
          />

          {/* Right Side Panel (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Terrain Distribution & Notes Card */}
            <div className="bg-surface-container-low p-4 rounded-xl shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold tracking-wider">
                  Surface &amp; Terrain Dynamics
                </span>
                <span className="material-symbols-outlined text-base text-secondary">layers</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-full rounded overflow-hidden flex bg-surface-container-highest">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${trail.terrainMix.screePct}%` }}
                  />
                  <div
                    className="bg-secondary h-full"
                    style={{ width: `${trail.terrainMix.singletrackPct}%` }}
                  />
                  <div
                    className="bg-tertiary h-full"
                    style={{ width: `${trail.terrainMix.morainePct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 text-center pt-1 font-mono-tabular text-[10px]">
                  <div className="flex flex-col items-center">
                    <span className="text-primary font-bold">
                      {trail.terrainMix.screePct}% Scree
                    </span>
                    <span className="text-on-surface-variant">{trail.terrainMix.screeLabel}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-secondary font-bold">
                      {trail.terrainMix.singletrackPct}% Singletrack
                    </span>
                    <span className="text-on-surface-variant">
                      {trail.terrainMix.singletrackLabel}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-tertiary font-bold">
                      {trail.terrainMix.morainePct}% Moraine
                    </span>
                    <span className="text-on-surface-variant">
                      {trail.terrainMix.moraineLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container p-2.5 rounded-lg flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-[10px] text-on-surface font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">campaign</span>
                    {trail.rangerNotice.author}
                  </span>
                  <span className="font-mono-tabular text-[10px] text-on-surface-variant">
                    {trail.rangerNotice.timeAgo}
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant leading-snug">
                  {trail.rangerNotice.message}
                </p>
              </div>

              <div className="flex items-center justify-between px-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg text-primary">
                    wb_twilight
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono-tabular text-[10px] text-on-surface-variant uppercase">
                      Sunset Lock
                    </span>
                    <span className="font-mono-tabular text-[12px] text-on-surface font-bold">
                      {trail.sunsetTime}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-surface-container-highest text-primary font-mono-tabular text-[10px] rounded">
                  {trail.daylightRemaining}
                </span>
              </div>
            </div>

            {/* Alpine Gear Checklist & Readiness Panel */}
            <div className="bg-surface-container-low p-4 rounded-xl shadow-lg flex flex-col gap-2.5 flex-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onNavigateGear}
                  className="font-mono-tabular text-[10px] uppercase text-on-surface-variant hover:text-on-surface font-bold tracking-wider transition-colors"
                >
                  Essential Gear Status ➔
                </button>
                <span className="font-mono-tabular text-[10px] text-secondary font-bold">
                  {verifiedCount}/{totalEssential} VERIFIED
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {essentialGear.map((item) => {
                  const isWarn = item.status === 'Equipped' || item.status === 'Pending';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={onNavigateGear}
                      className="flex items-center justify-between p-2 bg-surface-container hover:bg-surface-container-high rounded transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`material-symbols-outlined text-base ${
                            isWarn ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {isWarn ? 'warning' : 'check_circle'}
                        </span>
                        <span className="text-[13px] text-on-surface truncate">{item.name}</span>
                      </div>
                      <span
                        className={`font-mono-tabular text-[10px] shrink-0 ml-2 ${
                          isWarn ? 'text-primary font-medium' : 'text-secondary'
                        }`}
                      >
                        {item.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-1">
                <button
                  type="button"
                  onClick={onOpenSosModal}
                  className="w-full py-2 bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono-tabular text-[10px] font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">sos</span>
                  <span>Trigger Offline Emergency Protocol</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Dynamic Elevation Profile Chart */}
        <ElevationProfileChart
          trail={trail}
          progressKm={progressKm}
          units={units}
          onScrubKm={(km) => {
            setSelectedWaypointId(null);
            onScrubKm(km);
          }}
        />
      </div>
    </div>
  );
};

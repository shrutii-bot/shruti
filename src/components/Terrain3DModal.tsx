import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trail, UnitSystem, Waypoint } from '../types/telemetry';
import {
  distanceUnit,
  elevationUnit,
  exportTerrainAsObj,
  formatDistance,
  formatElevation,
  formatTemp,
} from '../utils/exports';

interface Terrain3DModalProps {
  isOpen: boolean;
  trail: Trail;
  units: UnitSystem;
  onClose: () => void;
}

interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

const GRID_SIZE = 28;

export const Terrain3DModal: React.FC<Terrain3DModalProps> = ({
  isOpen,
  trail,
  units,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [yaw, setYaw] = useState(-0.75);
  const [pitch, setPitch] = useState(0.55);
  const [zoom, setZoom] = useState(1.05);
  const [autoOrbit, setAutoOrbit] = useState(true);

  const [showWireframe, setShowWireframe] = useState(true);
  const [showShaded, setShowShaded] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showFog, setShowFog] = useState(true);
  const [sunAzimuth, setSunAzimuth] = useState(82); // 0..100
  const [exportStatus, setExportStatus] = useState<'idle' | 'done'>('idle');

  const defaultWp =
    trail.waypoints.find((w) => w.isLive) || trail.waypoints[Math.floor(trail.waypoints.length / 2)];
  const [activeWp, setActiveWp] = useState<Waypoint>(defaultWp);

  useEffect(() => {
    const live =
      trail.waypoints.find((w) => w.isLive) ||
      trail.waypoints[Math.floor(trail.waypoints.length / 2)];
    setActiveWp(live);
  }, [trail]);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraRef = useRef({ yaw, pitch, zoom, autoOrbit });
  cameraRef.current = { yaw, pitch, zoom, autoOrbit };

  const shaderRef = useRef({
    showWireframe,
    showShaded,
    showContours,
    showFog,
    sunAzimuth: sunAzimuth / 100,
    activeWpId: activeWp.id,
  });
  shaderRef.current = {
    showWireframe,
    showShaded,
    showContours,
    showFog,
    sunAzimuth: sunAzimuth / 100,
    activeWpId: activeWp.id,
  };

  // Generate deterministic 3D terrain grid seeded by trail parameters
  const terrainGrid = useMemo<Vertex3D[][]>(() => {
    const grid: Vertex3D[][] = [];
    const peakBoost = trail.highestAltitudeM > 1800 ? 1.35 : 1.05;
    const seedShift = trail.id.length * 0.13;

    for (let r = 0; r <= GRID_SIZE; r++) {
      const row: Vertex3D[] = [];
      const zNorm = (r / GRID_SIZE) * 2 - 1;
      for (let c = 0; c <= GRID_SIZE; c++) {
        const xNorm = (c / GRID_SIZE) * 2 - 1;
        const baseElev = (xNorm - zNorm) * 0.35 + 0.12;
        const distSummit = Math.hypot(xNorm - 0.55, zNorm + 0.58);
        const summitSpire = Math.exp(-distSummit * 4.2) * peakBoost;

        const distRidge = Math.hypot(xNorm - 0.1, zNorm + 0.15);
        const ridge = Math.exp(-distRidge * 3.5) * 0.65;

        const distLake = Math.hypot(xNorm - 0.68, zNorm + 0.38);
        const lakeDip = Math.exp(-distLake * 6.0) * -0.22;

        const noise =
          Math.sin(xNorm * 7.5 + seedShift) * Math.cos(zNorm * 7.5 - seedShift) * 0.08 +
          Math.sin(xNorm * 15.0 + zNorm * 11.0) * 0.035;

        const y = Math.max(0.05, baseElev + summitSpire + ridge + lakeDip + noise);
        row.push({ x: xNorm, y, z: zNorm });
      }
      grid.push(row);
    }
    return grid;
  }, [trail.highestAltitudeM, trail.id]);

  const getTerrainHeightAt = useCallback(
    (xNorm: number, zNorm: number) => {
      const r = Math.min(
        GRID_SIZE - 1,
        Math.max(0, Math.floor(((zNorm + 1) / 2) * GRID_SIZE))
      );
      const c = Math.min(
        GRID_SIZE - 1,
        Math.max(0, Math.floor(((xNorm + 1) / 2) * GRID_SIZE))
      );
      return terrainGrid[r]?.[c]?.y ?? 0.4;
    },
    [terrainGrid]
  );

  const project3D = useCallback(
    (x: number, y: number, z: number, width: number, height: number, cam: typeof cameraRef.current) => {
      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      const scale = (width * 0.42 * cam.zoom) / (z2 + 2.4);
      const px = width / 2 + x1 * scale;
      const py = height / 2 - y2 * scale + height * 0.1;

      return { x: px, y: py, depth: z2 };
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (cameraRef.current.autoOrbit && !isDraggingRef.current) {
        setYaw((prev) => prev + 0.0035);
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
          canvas.width = Math.floor(rect.width);
          canvas.height = Math.floor(rect.height);
        }
      }

      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const cam = cameraRef.current;
      const sh = shaderRef.current;

      ctx.clearRect(0, 0, W, H);

      // Tactical background dot matrix
      const step = 60;
      ctx.fillStyle = 'rgba(78, 222, 163, 0.12)';
      for (let x = 0; x < W; x += step) {
        for (let y = 0; y < H; y += step) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Sun vector
      const sunAngle = (sh.sunAzimuth - 0.5) * Math.PI;
      let lx = Math.cos(sunAngle);
      let ly = Math.sin(cam.pitch) * 0.8 + 0.4;
      let lz = Math.sin(sunAngle);
      const lLen = Math.hypot(lx, ly, lz) || 1;
      lx /= lLen;
      ly /= lLen;
      lz /= lLen;

      const quads: {
        pts: { x: number; y: number }[];
        depth: number;
        height: number;
        light: number;
      }[] = [];

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const v00 = terrainGrid[r][c];
          const v10 = terrainGrid[r + 1][c];
          const v11 = terrainGrid[r + 1][c + 1];
          const v01 = terrainGrid[r][c + 1];

          const p00 = project3D(v00.x, v00.y, v00.z, W, H, cam);
          const p10 = project3D(v10.x, v10.y, v10.z, W, H, cam);
          const p11 = project3D(v11.x, v11.y, v11.z, W, H, cam);
          const p01 = project3D(v01.x, v01.y, v01.z, W, H, cam);

          const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
          const avgHeight = (v00.y + v10.y + v11.y + v01.y) / 4;

          let nx = (v00.y - v01.y) * 2;
          let ny = 0.35;
          let nz = (v00.y - v10.y) * 2;
          const nLen = Math.hypot(nx, ny, nz) || 1;
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;
          const diffuse = Math.max(0.14, nx * lx + ny * ly + nz * lz);

          quads.push({
            pts: [p00, p10, p11, p01],
            depth: avgDepth,
            height: avgHeight,
            light: diffuse,
          });
        }
      }

      quads.sort((a, b) => b.depth - a.depth);

      for (const q of quads) {
        ctx.beginPath();
        ctx.moveTo(q.pts[0].x, q.pts[0].y);
        ctx.lineTo(q.pts[1].x, q.pts[1].y);
        ctx.lineTo(q.pts[2].x, q.pts[2].y);
        ctx.lineTo(q.pts[3].x, q.pts[3].y);
        ctx.closePath();

        if (sh.showShaded) {
          const normH = Math.min(1.25, Math.max(0, q.height));
          let baseR = 10;
          let baseG = 45;
          let baseB = 34;
          if (normH >= 0.4 && normH < 0.8) {
            baseR = 35;
            baseG = 58;
            baseB = 52;
          } else if (normH >= 0.8 && normH < 1.1) {
            baseR = 85;
            baseG = 65;
            baseB = 50;
          } else if (normH >= 1.1) {
            baseR = 210;
            baseG = 85;
            baseB = 40;
          }

          const litR = Math.min(255, Math.floor(baseR * q.light * 1.6));
          const litG = Math.min(255, Math.floor(baseG * q.light * 1.6));
          const litB = Math.min(255, Math.floor(baseB * q.light * 1.6));
          const alpha = sh.showFog
            ? Math.max(0.4, Math.min(0.96, 1.3 - (q.depth + 1.2) * 0.3))
            : 0.95;

          ctx.fillStyle = `rgba(${litR}, ${litG}, ${litB}, ${alpha})`;
          ctx.fill();
        }

        if (sh.showWireframe) {
          if (sh.showContours && Math.abs((q.height * 10) % 1) < 0.25) {
            ctx.strokeStyle = 'rgba(123, 208, 255, 0.45)';
            ctx.lineWidth = 1.0;
          } else {
            ctx.strokeStyle = 'rgba(78, 222, 163, 0.22)';
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        }
      }

      // Draw 3D trail path along terrain
      const wps = trail.waypoints;
      const liveIdx = Math.max(
        1,
        wps.findIndex((w) => w.isLive || w.id === sh.activeWpId)
      );

      // Glow underlay
      ctx.beginPath();
      wps.forEach((wp, idx) => {
        const h = getTerrainHeightAt(wp.gx, wp.gz) + 0.03;
        const pt = project3D(wp.gx, h, wp.gz, W, H, cam);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = 'rgba(255, 90, 31, 0.35)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Completed emerald segment
      ctx.beginPath();
      for (let i = 0; i <= Math.min(liveIdx, wps.length - 1); i++) {
        const wp = wps[i];
        const h = getTerrainHeightAt(wp.gx, wp.gz) + 0.03;
        const pt = project3D(wp.gx, h, wp.gz, W, H, cam);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = '#4edea3';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Remaining dashed orange segment
      if (liveIdx < wps.length - 1) {
        ctx.beginPath();
        for (let i = liveIdx; i < wps.length; i++) {
          const wp = wps[i];
          const h = getTerrainHeightAt(wp.gx, wp.gz) + 0.03;
          const pt = project3D(wp.gx, h, wp.gz, W, H, cam);
          if (i === liveIdx) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = '#ff5a1f';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw 3D Waypoint vertical stems & pins
      const now = Date.now() * 0.003;
      for (const wp of wps) {
        const th = getTerrainHeightAt(wp.gx, wp.gz);
        const groundPt = project3D(wp.gx, th, wp.gz, W, H, cam);
        const floatPt = project3D(wp.gx, th + 0.22, wp.gz, W, H, cam);

        ctx.beginPath();
        ctx.moveTo(groundPt.x, groundPt.y);
        ctx.lineTo(floatPt.x, floatPt.y);
        ctx.strokeStyle = wp.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(groundPt.x, groundPt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = wp.color;
        ctx.fill();

        const isSelected = sh.activeWpId === wp.id;
        const pulse = wp.isLive ? Math.sin(now * 3) * 2.5 : 0;
        const r = isSelected ? 8 + pulse : 6;

        ctx.beginPath();
        ctx.arc(floatPt.x, floatPt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = wp.color;
        ctx.shadowColor = wp.color;
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#08100e';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(wp.shortLabel, floatPt.x, floatPt.y - 12);
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, trail.waypoints, terrainGrid, getTerrainHeightAt, project3D]);

  if (!isOpen) return null;

  const pitchDeg = Math.round((pitch * 180) / Math.PI);
  const yawDeg = Math.round((yaw * 180) / Math.PI) % 360;

  const sunLabelText =
    sunAzimuth < 30
      ? `Dawn Horizon (0${Math.round(6 + sunAzimuth * 0.1)}:00)`
      : sunAzimuth < 70
        ? `Noon Overhead (${Math.round(11 + sunAzimuth * 0.04)}:00)`
        : 'Civil Dusk (19:42)';

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let closest: Waypoint | null = null;
    let bestDist = 26;

    for (const wp of trail.waypoints) {
      const th = getTerrainHeightAt(wp.gx, wp.gz);
      const pt = project3D(wp.gx, th + 0.22, wp.gz, canvas.width, canvas.height, cameraRef.current);
      const d = Math.hypot(clickX - pt.x, clickY - pt.y);
      if (d < bestDist) {
        bestDist = d;
        closest = wp;
      }
    }

    if (closest) {
      setActiveWp(closest);
    }
  };

  const handleExportObj = () => {
    exportTerrainAsObj(trail, terrainGrid);
    setExportStatus('done');
    setTimeout(() => setExportStatus('idle'), 2000);
  };

  return (
    <div
      aria-labelledby="modal-title"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-surface-container-lowest border border-tertiary/30 rounded-2xl shadow-[0_0_60px_rgba(0,157,211,0.25)] flex flex-col overflow-hidden text-on-surface">
        {/* Top Modal HUD Header Bar */}
        <div className="bg-surface-container-low px-4 py-2.5 border-b border-surface-container-highest flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_#7bd0ff] shrink-0" />
              <span
                id="modal-title"
                className="font-display-grotesk text-[15px] font-bold tracking-tight uppercase text-on-surface truncate"
              >
                3D Terrain Mesh // {trail.sector}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant font-mono-tabular text-[10px] bg-surface-container px-2 py-0.5 rounded shrink-0">
              <span className="text-secondary font-semibold">HDOP 0.8m</span>
              <span>• QZSS/Galileo Active</span>
            </div>
            <span className="hidden xl:inline-block px-2 py-0.5 bg-tertiary-container/30 text-tertiary border border-tertiary/30 font-mono-tabular text-[10px] rounded uppercase shrink-0">
              Engine: Tactical Isometric 3D
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-on-surface-variant font-mono-tabular text-[10px] mr-1">
              [ESC to close]
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface rounded font-mono-tabular text-[10px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>Close Telemetry</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* 3D Canvas Viewport (8 Cols) */}
          <div className="lg:col-span-8 bg-[#070e0c] relative flex flex-col min-h-[440px] lg:min-h-[580px] select-none overflow-hidden">
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/5 shadow-md">
              <span className="material-symbols-outlined text-sm text-secondary">3d_rotation</span>
              <span className="font-mono-tabular text-[10px] font-bold uppercase text-on-surface">
                Interactive Topo Mesh
              </span>
              <span className="text-surface-bright">•</span>
              <span className="font-mono-tabular text-[10px] text-secondary font-medium">
                Pitch: {pitchDeg}° | Yaw: {yawDeg}° | Zoom: {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-surface/90 backdrop-blur-md p-1 rounded-md border border-white/5 shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.4, z + 0.15))}
                title="Zoom In"
                className="px-2 py-1 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded flex items-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                title="Zoom Out"
                className="px-2 py-1 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded flex items-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">zoom_out</span>
              </button>
              <div className="h-3 w-px bg-surface-container-highest mx-0.5" />
              <button
                type="button"
                onClick={() => setAutoOrbit((o) => !o)}
                title="Toggle Auto-Rotation"
                className={`px-2 py-1 rounded font-mono-tabular text-[10px] flex items-center gap-1 transition-colors ${
                  autoOrbit
                    ? 'bg-surface-container-highest text-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-sm ${
                    autoOrbit ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '4s' }}
                >
                  sync
                </span>
                <span className="hidden sm:inline">Auto-Orbit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setYaw(-0.75);
                  setPitch(0.55);
                  setZoom(1.05);
                }}
                title="Reset Camera Viewpoint"
                className="px-2 py-1 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded flex items-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">recenter</span>
              </button>
            </div>

            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={(e) => {
                isDraggingRef.current = true;
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
                setAutoOrbit(false);
              }}
              onMouseMove={(e) => {
                if (!isDraggingRef.current) return;
                const dx = e.clientX - lastMouseRef.current.x;
                const dy = e.clientY - lastMouseRef.current.y;
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
                setYaw((y) => y + dx * 0.008);
                setPitch((p) => Math.max(0.15, Math.min(1.2, p + dy * 0.008)));
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
              }}
              onMouseLeave={() => {
                isDraggingRef.current = false;
              }}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.max(0.5, Math.min(2.4, z - e.deltaY * 0.0015)));
              }}
              className="w-full h-full cursor-grab active:cursor-grabbing block flex-1"
            />

            {/* Floating Active Waypoint HUD Card */}
            <div className="absolute bottom-4 left-4 z-20 bg-surface/90 backdrop-blur-md border border-tertiary/30 rounded-lg p-3 shadow-xl max-w-xs pointer-events-none">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-surface-container-highest">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono-tabular text-[10px] font-bold text-primary uppercase">
                    {activeWp.name}
                  </span>
                </div>
                <span
                  className="font-mono-tabular text-[10px] font-semibold"
                  style={{ color: activeWp.color }}
                >
                  {activeWp.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 font-mono-tabular text-[10px]">
                <div>
                  <span className="text-on-surface-variant">Altitude:</span>
                  <span className="text-on-surface font-bold ml-1">
                    {formatElevation(activeWp.elevationM, units)}
                    {elevationUnit(units)} ASL
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant">Incline:</span>
                  <span className="text-primary font-bold ml-1">{activeWp.inclinePct}%</span>
                </div>
                <div>
                  <span className="text-on-surface-variant">Air Temp:</span>
                  <span className="text-tertiary font-bold ml-1">
                    {formatTemp(activeWp.tempC, units)}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant">O2 Sat:</span>
                  <span className="text-secondary font-bold ml-1">{activeWp.o2SatPct}%</span>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-surface-container-highest/60 font-mono-tabular text-[10px] text-on-surface-variant flex items-center justify-between gap-2">
                <span>{activeWp.coords}</span>
                <span className="text-tertiary">
                  Dist: {formatDistance(activeWp.km, units)} {distanceUnit(units)}
                </span>
              </div>
            </div>

            {/* Bottom-Right Orbit Tip & Gradient Bar */}
            <div className="absolute bottom-4 right-4 z-20 hidden sm:flex flex-col items-end gap-1.5 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded text-on-surface-variant font-mono-tabular text-[10px] border border-white/5">
                <span className="material-symbols-outlined text-xs text-tertiary">pan_tool</span>
                <span>Click &amp; drag to orbit / scroll to zoom</span>
              </div>
              <div className="flex items-center gap-2 bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded text-on-surface-variant font-mono-tabular text-[10px] border border-white/5">
                <span>Elevation Gradient:</span>
                <span className="w-16 h-2 rounded bg-gradient-to-r from-[#005236] via-[#00a572] to-[#ff5a1f]" />
                <span className="text-on-surface font-bold">
                  {formatElevation(trail.baseAltitudeM, units)}
                  {elevationUnit(units)} ➔ {formatElevation(trail.highestAltitudeM, units)}
                  {elevationUnit(units)}
                </span>
              </div>
            </div>
          </div>

          {/* Right HUD Telemetry Sidebar (4 Cols) */}
          <div className="lg:col-span-4 bg-surface-container-low border-t lg:border-t-0 lg:border-l border-surface-container-highest p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
                  3D Waypoint Nodes
                </span>
                <span className="font-mono-tabular text-[10px] text-secondary">
                  {trail.waypoints.length} Marked
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {trail.waypoints.map((wp, idx) => {
                  const isActive = activeWp.id === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => setActiveWp(wp)}
                      className={`w-full p-2 rounded flex items-center justify-between text-left transition-colors ${
                        isActive
                          ? 'bg-surface-container-high border border-primary/50'
                          : 'bg-surface-container hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            wp.isLive ? 'animate-pulse' : ''
                          }`}
                          style={{ backgroundColor: wp.color }}
                        />
                        <span className="font-mono-tabular text-[10px] font-semibold text-on-surface truncate">
                          0{idx + 1}. {wp.shortLabel}
                        </span>
                      </div>
                      <span
                        className="font-mono-tabular text-[10px] font-semibold shrink-0 ml-2"
                        style={{ color: wp.color }}
                      >
                        {formatElevation(wp.elevationM, units)}
                        {elevationUnit(units)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terrain Dynamics Inspector */}
            <div className="bg-surface-container p-3 rounded-xl flex flex-col gap-3">
              <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-tertiary">tune</span>
                Terrain Dynamics Inspector
              </span>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono-tabular text-[10px]">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">wb_sunny</span>
                    Sun Azimuth &amp; Shadow
                  </span>
                  <span className="text-primary font-semibold">{sunLabelText}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sunAzimuth}
                  onChange={(e) => setSunAzimuth(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between font-mono-tabular text-[10px] text-on-surface-variant">
                  <span>Dawn (06:00)</span>
                  <span>Noon (12:00)</span>
                  <span>Dusk (19:42)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono-tabular text-[11px]">
                <label className="flex items-center gap-2 p-2 bg-surface-container-high rounded cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <input
                    type="checkbox"
                    checked={showWireframe}
                    onChange={(e) => setShowWireframe(e.target.checked)}
                    className="accent-secondary rounded"
                  />
                  <span>Wireframe Grid</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-surface-container-high rounded cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <input
                    type="checkbox"
                    checked={showShaded}
                    onChange={(e) => setShowShaded(e.target.checked)}
                    className="accent-secondary rounded"
                  />
                  <span>Terrain Shading</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-surface-container-high rounded cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <input
                    type="checkbox"
                    checked={showContours}
                    onChange={(e) => setShowContours(e.target.checked)}
                    className="accent-secondary rounded"
                  />
                  <span>Contour Bands</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-surface-container-high rounded cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <input
                    type="checkbox"
                    checked={showFog}
                    onChange={(e) => setShowFog(e.target.checked)}
                    className="accent-secondary rounded"
                  />
                  <span>Atmospheric Fog</span>
                </label>
              </div>
            </div>

            {/* 3D Path Incline Vector */}
            <div className="bg-surface-container p-3 rounded-xl flex flex-col gap-1.5 font-mono-tabular text-[10px]">
              <div className="flex items-center justify-between text-on-surface-variant font-bold uppercase">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    show_chart
                  </span>
                  3D Path Incline Vector
                </span>
                <span className="text-secondary font-bold">ALPINE GRADIENT IV</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded overflow-hidden flex">
                <div className="bg-secondary h-full w-[45%]" />
                <div className="bg-primary h-full w-[35%]" />
                <div className="bg-error h-full w-[20%]" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 text-on-surface-variant">
                <span>
                  Peak Slope: <strong className="text-error">{trail.maxGradePct}%</strong>
                </span>
                <span>
                  Summit Gain:{' '}
                  <strong className="text-on-surface">
                    +{formatElevation(trail.highestAltitudeM - trail.baseAltitudeM, units)}
                    {elevationUnit(units)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-auto pt-1 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWp(defaultWp);
                    setYaw(-0.75);
                    setPitch(0.52);
                    setZoom(1.25);
                  }}
                  className="py-2 px-2.5 bg-surface-container-high hover:bg-surface-container-highest text-secondary rounded font-mono-tabular text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">my_location</span>
                  <span>Snap to Hiker</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportObj}
                  className="py-2 px-2.5 bg-surface-container-high hover:bg-surface-container-highest text-tertiary rounded font-mono-tabular text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    {exportStatus === 'done' ? 'check' : 'download'}
                  </span>
                  <span>
                    {exportStatus === 'done' ? 'Mesh Downloaded' : 'Export Mesh (.OBJ)'}
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-primary-container hover:brightness-110 text-on-primary-container rounded font-mono-tabular text-[12px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 transition-all"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>Return to Live 2D Telemetry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

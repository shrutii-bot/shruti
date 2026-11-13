import { Trail, UnitSystem } from '../types/telemetry';

export function formatDistance(km: number, units: UnitSystem, decimals = 1): string {
  if (units === 'imperial') {
    return `${(km * 0.621371).toFixed(decimals)}`;
  }
  return `${km.toFixed(decimals)}`;
}

export function distanceUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function formatElevation(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(meters * 3.28084).toLocaleString()}`;
  }
  return `${Math.round(meters).toLocaleString()}`;
}

export function elevationUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'ft' : 'm';
}

export function formatSpeed(kmh: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${(kmh * 0.621371).toFixed(1)}`;
  }
  return `${kmh.toFixed(1)}`;
}

export function speedUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mph' : 'km/h';
}

export function formatTemp(celsius: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportTrailAsGpx(trail: Trail): void {
  const trkpts = trail.waypoints
    .map(
      (wp) => `      <trkpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
        <ele>${wp.elevationM}</ele>
        <name>${escapeXml(wp.name)}</name>
      </trkpt>`
    )
    .join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PeakTrack Telemetry HUD" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(trail.name)}</name>
    <desc>${escapeXml(trail.region)} - ${escapeXml(trail.code)}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(trail.name)}</name>
    <type>${escapeXml(trail.technicalClass)}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  downloadTextFile(`${trail.code.toLowerCase()}-track.gpx`, gpx, 'application/gpx+xml');
}

export function exportTerrainAsObj(
  trail: Trail,
  grid: { x: number; y: number; z: number }[][]
): void {
  const lines: string[] = [
    `# PeakTrack 3D Terrain Mesh Export`,
    `# Trail: ${trail.name} (${trail.code})`,
    `o ${trail.code}_terrain`,
  ];

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      lines.push(`v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i00 = r * cols + c + 1;
      const i10 = (r + 1) * cols + c + 1;
      const i11 = (r + 1) * cols + (c + 1) + 1;
      const i01 = r * cols + (c + 1) + 1;
      lines.push(`f ${i00} ${i10} ${i11}`);
      lines.push(`f ${i00} ${i11} ${i01}`);
    }
  }

  downloadTextFile(`${trail.code.toLowerCase()}-terrain.obj`, lines.join('\n'), 'text/plain');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function interpolateElevationAtKm(
  trail: Trail,
  km: number
): { elevationM: number; gradePct: number } {
  const samples = trail.elevationSamples;
  if (!samples.length) {
    return { elevationM: trail.baseAltitudeM, gradePct: 0 };
  }
  const clampedKm = Math.max(0, Math.min(trail.distanceKm, km));
  if (clampedKm <= samples[0].km) {
    return { elevationM: samples[0].elevationM, gradePct: samples[0].gradePct };
  }
  for (let i = 1; i < samples.length; i++) {
    if (clampedKm <= samples[i].km) {
      const prev = samples[i - 1];
      const next = samples[i];
      const span = Math.max(0.001, next.km - prev.km);
      const t = (clampedKm - prev.km) / span;
      return {
        elevationM: Math.round(prev.elevationM + (next.elevationM - prev.elevationM) * t),
        gradePct: Number((prev.gradePct + (next.gradePct - prev.gradePct) * t).toFixed(1)),
      };
    }
  }
  const last = samples[samples.length - 1];
  return { elevationM: last.elevationM, gradePct: last.gradePct };
}

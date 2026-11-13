export type NavTab =
  | 'live-telemetry'
  | 'explore-trails'
  | 'activity-log'
  | 'route-planner'
  | 'gear'
  | 'community';

export type UnitSystem = 'metric' | 'imperial';

export type GearStatus = 'Packed' | 'In Hand' | 'Armed' | 'Equipped' | 'Pending';

export interface Waypoint {
  id: number;
  name: string;
  shortLabel: string;
  km: number;
  elevationM: number;
  inclinePct: number;
  tempC: number;
  o2SatPct: number;
  coords: string;
  lat: number;
  lon: number;
  status: 'TRAVERSED' | 'PASSED' | 'LIVE BEACON' | 'PENDING' | 'DESTINATION';
  icon: string;
  mapX: number; // percentage 0-100 on 2D topo SVG
  mapY: number; // percentage 0-100 on 2D topo SVG
  gx: number; // -1..1 in 3D grid space
  gz: number; // -1..1 in 3D grid space
  color: string;
  isLive?: boolean;
}

export interface ElevationSample {
  km: number;
  elevationM: number;
  gradePct: number;
  label?: string;
}

export interface MapMarkerPin {
  id: string;
  label: string;
  detail: string;
  km: number;
  elevationM: number;
  mapX: number;
  mapY: number;
  kind: 'km' | 'water' | 'hazard';
}

export interface Trail {
  id: string;
  code: string;
  name: string;
  region: string;
  sector: string;
  difficultyLabel: string;
  statusLabel: string;
  passWindow: string;
  startPoint: string;
  destination: string;
  technicalClass: string;
  distanceKm: number;
  initialProgressKm: number;
  elevationGainM: number;
  maxGradePct: number;
  slopeGradeLabel: string;
  durationTotal: string;
  movingTime: string;
  restTime: string;
  avgPaceKmh: number;
  currentPaceKmh: number;
  splitPaceMinKm: string;
  highestAltitudeM: number;
  baseAltitudeM: number;
  caloriesTotal: number;
  caloriesRate: number;
  avgHeartRate: number;
  weather: {
    tempC: number;
    feelsLikeC: number;
    condition: string;
    windKmh: number;
    windDir: string;
    gustKmh: number;
    uvIndex: number;
    uvLabel: string;
    humidityPct: number;
    pressureHpa: number;
    pressureNote: string;
    ridgeBaseLabel: string;
    ridgeWeatherSummary: string;
  };
  terrainMix: {
    screePct: number;
    singletrackPct: number;
    morainePct: number;
    screeLabel: string;
    singletrackLabel: string;
    moraineLabel: string;
  };
  rangerNotice: {
    author: string;
    timeAgo: string;
    message: string;
  };
  sunsetTime: string;
  daylightRemaining: string;
  liveTrackersCount: number;
  rangersCount: number;
  lakeLabel: string;
  waypoints: Waypoint[];
  extraPins: MapMarkerPin[];
  elevationSamples: ElevationSample[];
  isCustom?: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  category: 'Traction' | 'Navigation' | 'Apparel' | 'Shelter' | 'Hydration';
  weightGrams: number;
  status: GearStatus;
  essential: boolean;
}

export interface ActivityEntry {
  id: string;
  trailId: string;
  trailCode: string;
  trailName: string;
  region: string;
  dateIso: string;
  distanceKm: number;
  elevationGainM: number;
  durationFormatted: string;
  avgPaceKmh: number;
  maxAltitudeM: number;
  calories: number;
  status: 'Completed' | 'In Progress' | 'Aborted';
  notes: string;
}

export interface CommunityTracker {
  id: string;
  callsign: string;
  role: 'Expedition Lead' | 'Search & Rescue' | 'Alpine Climber';
  trailName: string;
  km: number;
  elevationM: number;
  heartRate: number;
  batteryPct: number;
  signalStrength: 'Strong' | 'Mesh Relay' | 'Intermittent';
  lastPing: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  severity: 'info' | 'warning' | 'success';
  read: boolean;
}

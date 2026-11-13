import { useEffect, useState } from 'react';
import { ActivityLogView } from './components/ActivityLogView';
import { CommunityView } from './components/CommunityView';
import { EmergencySosModal } from './components/EmergencySosModal';
import { ExploreTrailsView } from './components/ExploreTrailsView';
import { GearView } from './components/GearView';
import { Header } from './components/Header';
import { LiveTelemetryView } from './components/LiveTelemetryView';
import { RoutePlannerView } from './components/RoutePlannerView';
import { Sidebar } from './components/Sidebar';
import { Terrain3DModal } from './components/Terrain3DModal';
import {
  COMMUNITY_TRACKERS,
  INITIAL_ACTIVITIES,
  INITIAL_GEAR_ITEMS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TRAILS,
} from './data/trails';
import {
  ActivityEntry,
  GearItem,
  GearStatus,
  NavTab,
  NotificationItem,
  Trail,
  UnitSystem,
} from './types/telemetry';
import { interpolateElevationAtKm } from './utils/exports';

const STORAGE_KEYS = {
  trails: 'peaktrack_custom_trails_v1',
  gear: 'peaktrack_gear_v1',
  activities: 'peaktrack_activities_v1',
  cached: 'peaktrack_cached_v1',
  units: 'peaktrack_units_v1',
};

const GEAR_CYCLE: GearStatus[] = ['Packed', 'In Hand', 'Armed', 'Equipped', 'Pending'];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live-telemetry');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [customTrails, setCustomTrails] = useState<Trail[]>(() =>
    readStorage<Trail[]>(STORAGE_KEYS.trails, [])
  );
  const trails = [...INITIAL_TRAILS, ...customTrails];

  const [activeTrailId, setActiveTrailId] = useState<string>(INITIAL_TRAILS[0].id);
  const activeTrail = trails.find((t) => t.id === activeTrailId) || INITIAL_TRAILS[0];

  const [progressKm, setProgressKm] = useState<number>(activeTrail.initialProgressKm);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(5);
  const [batteryPct, setBatteryPct] = useState<number>(92);

  const [units, setUnits] = useState<UnitSystem>(() =>
    readStorage<UnitSystem>(STORAGE_KEYS.units, 'metric')
  );
  const [cachedTrailIds, setCachedTrailIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.cached, [])
  );
  const [gearItems, setGearItems] = useState<GearItem[]>(() =>
    readStorage<GearItem[]>(STORAGE_KEYS.gear, INITIAL_GEAR_ITEMS)
  );
  const [activities, setActivities] = useState<ActivityEntry[]>(() =>
    readStorage<ActivityEntry[]>(STORAGE_KEYS.activities, INITIAL_ACTIVITIES)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [is3DModalOpen, setIs3DModalOpen] = useState<boolean>(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);

  // Persist user data
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.trails, JSON.stringify(customTrails));
      localStorage.setItem(STORAGE_KEYS.gear, JSON.stringify(gearItems));
      localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities));
      localStorage.setItem(STORAGE_KEYS.cached, JSON.stringify(cachedTrailIds));
      localStorage.setItem(STORAGE_KEYS.units, JSON.stringify(units));
    } catch {
      // Ignore storage quota errors
    }
  }, [customTrails, gearItems, activities, cachedTrailIds, units]);

  // Global keyboard shortcut '3' to launch 3D Terrain Mesh modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (isInput) return;

      if (e.key === '3' && !is3DModalOpen) {
        setIs3DModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [is3DModalOpen]);

  // Live GNSS Tracking simulation loop
  useEffect(() => {
    if (!isTracking) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + simSpeed);
      setProgressKm((prev) => {
        const stepKm = 0.02 * simSpeed;
        const next = prev + stepKm;
        if (next >= activeTrail.distanceKm) {
          setIsTracking(false);
          return activeTrail.distanceKm;
        }
        return Number(next.toFixed(2));
      });
      setBatteryPct((prev) => Math.max(12, prev - 0.015 * simSpeed));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTracking, simSpeed, activeTrail.distanceKm]);

  const handleSelectTrail = (trailId: string, jumpToKm?: number) => {
    const nextTrail = trails.find((t) => t.id === trailId) || INITIAL_TRAILS[0];
    setActiveTrailId(nextTrail.id);
    setProgressKm(jumpToKm !== undefined ? jumpToKm : nextTrail.initialProgressKm);
    setElapsedSeconds(0);
    setIsTracking(false);
    setActiveTab('live-telemetry');
  };

  const handleToggleCacheOffline = (trailId: string) => {
    setCachedTrailIds((prev) =>
      prev.includes(trailId) ? prev.filter((id) => id !== trailId) : [...prev, trailId]
    );
  };

  const handleCycleGearStatus = (id: string) => {
    setGearItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const idx = GEAR_CYCLE.indexOf(item.status);
        const nextStatus = GEAR_CYCLE[(idx + 1) % GEAR_CYCLE.length];
        return { ...item, status: nextStatus };
      })
    );
  };

  const handleAddGearItem = (item: Omit<GearItem, 'id'>) => {
    setGearItems((prev) => [{ ...item, id: `gear-${Date.now()}` }, ...prev]);
  };

  const handleRemoveGearItem = (id: string) => {
    setGearItems((prev) => prev.filter((g) => g.id !== id));
  };

  const handleLogCurrentSession = () => {
    const interp = interpolateElevationAtKm(activeTrail, progressKm);
    const entry: ActivityEntry = {
      id: `act-${Date.now()}`,
      trailId: activeTrail.id,
      trailCode: activeTrail.code,
      trailName: activeTrail.name,
      region: activeTrail.region,
      dateIso: new Date().toISOString().slice(0, 10),
      distanceKm: Number(progressKm.toFixed(1)),
      elevationGainM: Math.max(0, interp.elevationM - activeTrail.baseAltitudeM),
      durationFormatted: activeTrail.durationTotal,
      avgPaceKmh: activeTrail.avgPaceKmh,
      maxAltitudeM: interp.elevationM,
      calories: Math.round(
        activeTrail.caloriesTotal * (progressKm / Math.max(0.1, activeTrail.distanceKm))
      ),
      status: progressKm >= activeTrail.distanceKm - 0.1 ? 'Completed' : 'In Progress',
      notes: 'Live telemetry snapshot archived from PeakTrack HUD.',
    };
    setActivities((prev) => [entry, ...prev]);
  };

  const handleSaveCustomTrail = (trail: Trail) => {
    setCustomTrails((prev) => [...prev, trail]);
    setActiveTrailId(trail.id);
    setProgressKm(trail.initialProgressKm);
    setIsTracking(false);
    setActiveTab('live-telemetry');
  };

  const handleResetWorkspace = () => {
    setCustomTrails([]);
    setGearItems(INITIAL_GEAR_ITEMS);
    setActivities(INITIAL_ACTIVITIES);
    setCachedTrailIds([]);
    setUnits('metric');
    setActiveTrailId(INITIAL_TRAILS[0].id);
    setProgressKm(INITIAL_TRAILS[0].initialProgressKm);
    setElapsedSeconds(0);
    setBatteryPct(92);
    setIsTracking(false);
    localStorage.clear();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header
        activeTrail={activeTrail}
        trails={trails}
        isTracking={isTracking}
        units={units}
        simSpeed={simSpeed}
        notifications={notifications}
        onSelectTrail={(id) => handleSelectTrail(id)}
        onFocusWaypoint={(id, km) => handleSelectTrail(id, km)}
        onToggleUnits={setUnits}
        onChangeSimSpeed={setSimSpeed}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onResetWorkspace={handleResetWorkspace}
        onToggleMobileMenu={() => setMobileMenuOpen((o) => !o)}
      />

      <Sidebar
        activeTab={activeTab}
        activeTrail={activeTrail}
        progressKm={progressKm}
        batteryPct={batteryPct}
        units={units}
        mobileOpen={mobileMenuOpen}
        onSelectTab={setActiveTab}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-64">
        <main className="relative pt-16 w-full min-h-screen bg-background">
          {activeTab === 'live-telemetry' && (
            <LiveTelemetryView
              trail={activeTrail}
              progressKm={progressKm}
              elapsedSeconds={elapsedSeconds}
              isTracking={isTracking}
              isCachedOffline={cachedTrailIds.includes(activeTrail.id)}
              gearItems={gearItems}
              units={units}
              onScrubKm={setProgressKm}
              onToggleTracking={() => setIsTracking((t) => !t)}
              onToggleCacheOffline={handleToggleCacheOffline}
              onOpen3DModal={() => setIs3DModalOpen(true)}
              onOpenSosModal={() => setIsSosModalOpen(true)}
              onNavigateGear={() => setActiveTab('gear')}
              onNavigateCommunity={() => setActiveTab('community')}
            />
          )}

          {activeTab === 'explore-trails' && (
            <ExploreTrailsView
              trails={trails}
              activeTrailId={activeTrail.id}
              cachedTrailIds={cachedTrailIds}
              units={units}
              onSelectTrail={(id) => handleSelectTrail(id)}
              onOpen3DForTrail={(id) => {
                setActiveTrailId(id);
                setIs3DModalOpen(true);
              }}
              onToggleCache={handleToggleCacheOffline}
            />
          )}

          {activeTab === 'activity-log' && (
            <ActivityLogView
              activities={activities}
              trails={trails}
              activeTrail={activeTrail}
              progressKm={progressKm}
              units={units}
              onLogCurrentSession={handleLogCurrentSession}
              onDeleteActivity={(id) =>
                setActivities((prev) => prev.filter((a) => a.id !== id))
              }
              onLoadTrail={(id) => handleSelectTrail(id)}
            />
          )}

          {activeTab === 'route-planner' && (
            <RoutePlannerView units={units} onSaveCustomTrail={handleSaveCustomTrail} />
          )}

          {activeTab === 'gear' && (
            <GearView
              gearItems={gearItems}
              onCycleStatus={handleCycleGearStatus}
              onAddItem={handleAddGearItem}
              onRemoveItem={handleRemoveGearItem}
            />
          )}

          {activeTab === 'community' && (
            <CommunityView trackers={COMMUNITY_TRACKERS} units={units} />
          )}
        </main>
      </div>

      <Terrain3DModal
        isOpen={is3DModalOpen}
        trail={activeTrail}
        units={units}
        onClose={() => setIs3DModalOpen(false)}
      />

      <EmergencySosModal
        isOpen={isSosModalOpen}
        trail={activeTrail}
        progressKm={progressKm}
        batteryPct={batteryPct}
        units={units}
        onClose={() => setIsSosModalOpen(false)}
        onDispatchBeacon={() => {
          setNotifications((prev) => [
            {
              id: `notif-sos-${Date.now()}`,
              title: 'SOS Beacon Dispatched',
              detail: `Distress coordinates broadcast for ${activeTrail.code} via Sector 09 Mesh.`,
              timeAgo: 'Just now',
              severity: 'warning',
              read: false,
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}

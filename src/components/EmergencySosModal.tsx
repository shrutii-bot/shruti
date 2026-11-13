import React, { useState } from 'react';
import { Trail, UnitSystem } from '../types/telemetry';
import { formatElevation, elevationUnit, interpolateElevationAtKm } from '../utils/exports';

interface EmergencySosModalProps {
  isOpen: boolean;
  trail: Trail;
  progressKm: number;
  batteryPct: number;
  units: UnitSystem;
  onClose: () => void;
  onDispatchBeacon: () => void;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  trail,
  progressKm,
  batteryPct,
  units,
  onClose,
  onDispatchBeacon,
}) => {
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const interp = interpolateElevationAtKm(trail, progressKm);
  const nearestWp = trail.waypoints.reduce((best, wp) =>
    Math.abs(wp.km - progressKm) < Math.abs(best.km - progressKm) ? wp : best
  );

  const handleConfirm = () => {
    setDispatched(true);
    onDispatchBeacon();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setDispatched(false);
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-md bg-surface-container-low border border-error/40 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-error">
            <span className="material-symbols-outlined text-2xl">sos</span>
            <h2 className="font-display-grotesk text-lg font-bold uppercase tracking-tight">
              Offline Emergency Protocol
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setDispatched(false);
              onClose();
            }}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-[13px] text-on-surface-variant leading-relaxed">
          {dispatched
            ? 'Emergency GNSS distress packet queued across 4 active mesh relays and dispatched to Sector 09 Search & Rescue Rangers.'
            : 'Broadcasting an SOS distress signal transmits your last locked GNSS coordinates, elevation, and transponder telemetry over the local mountain mesh network.'}
        </p>

        <div className="bg-surface-container p-3.5 rounded-xl font-mono-tabular text-[11px] flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Callsign / Trail:</span>
            <span className="text-on-surface font-semibold">
              ALPHA-1 · {trail.code}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">GNSS Coordinates:</span>
            <span className="text-primary font-semibold">{nearestWp.coords}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Current Altitude:</span>
            <span className="text-secondary font-semibold">
              {formatElevation(interp.elevationM, units)}
              {elevationUnit(units)} ASL
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Transponder Battery:</span>
            <span className="text-on-surface font-semibold">{Math.round(batteryPct)}%</span>
          </div>
        </div>

        {dispatched ? (
          <div className="p-3 rounded-lg bg-secondary-container/20 text-secondary font-mono-tabular text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>Beacon Packet #PT-SOS-409 Active · SAR-CONDOR-2 Notified</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setDispatched(false);
              onClose();
            }}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono-tabular text-[12px] rounded transition-colors"
          >
            {dispatched ? 'Close' : 'Cancel'}
          </button>
          {!dispatched && (
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-error-container hover:brightness-110 text-on-error-container font-mono-tabular text-[12px] font-bold rounded flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">cell_tower</span>
              <span>Transmit SOS Beacon</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { GearItem, GearStatus } from '../types/telemetry';

interface GearViewProps {
  gearItems: GearItem[];
  onCycleStatus: (id: string) => void;
  onAddItem: (item: Omit<GearItem, 'id'>) => void;
  onRemoveItem: (id: string) => void;
}

const STATUS_BADGE: Record<GearStatus, string> = {
  Packed: 'text-secondary bg-secondary-container/20',
  'In Hand': 'text-secondary bg-secondary-container/20',
  Armed: 'text-tertiary bg-tertiary-container/20',
  Equipped: 'text-primary bg-primary-container/20',
  Pending: 'text-error bg-error-container/30',
};

export const GearView: React.FC<GearViewProps> = ({
  gearItems,
  onCycleStatus,
  onAddItem,
  onRemoveItem,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | GearItem['category']>('All');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<GearItem['category']>('Traction');
  const [newWeight, setNewWeight] = useState('320');

  const filtered = gearItems.filter((g) =>
    categoryFilter === 'All' ? true : g.category === categoryFilter
  );

  const totalWeightKg = (
    gearItems.reduce((acc, g) => acc + g.weightGrams, 0) / 1000
  ).toFixed(2);
  const verifiedEssential = gearItems.filter(
    (g) => g.essential && g.status !== 'Pending'
  ).length;
  const totalEssential = gearItems.filter((g) => g.essential).length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddItem({
      name: newName.trim(),
      category: newCategory,
      weightGrams: Math.max(20, Number(newWeight) || 250),
      status: 'Packed',
      essential: true,
    });
    setNewName('');
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-surface-container-low p-5 md:p-6 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-secondary font-semibold">
            Alpine Pack &amp; Loadout Readiness
          </span>
          <h1 className="font-display-grotesk text-[28px] font-semibold text-on-surface tracking-tight mt-1">
            Expedition Gear Manifest
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Click any item status pill to cycle readiness state. Essential items sync directly with
            the Live Telemetry HUD.
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono-tabular">
          <div className="bg-surface-container px-4 py-2.5 rounded-lg">
            <div className="text-[10px] text-on-surface-variant uppercase">Pack Weight</div>
            <div className="text-[20px] font-bold text-on-surface">{totalWeightKg} kg</div>
          </div>
          <div className="bg-surface-container px-4 py-2.5 rounded-lg">
            <div className="text-[10px] text-on-surface-variant uppercase">Essential Lock</div>
            <div className="text-[20px] font-bold text-secondary">
              {verifiedEssential}/{totalEssential}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
              Loadout Inventory ({filtered.length})
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-surface-container p-1 rounded">
              {(['All', 'Traction', 'Navigation', 'Apparel', 'Shelter', 'Hydration'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded font-mono-tabular text-[10px] font-semibold transition-colors ${
                      categoryFilter === cat
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      item.status === 'Pending'
                        ? 'text-error'
                        : item.status === 'Equipped'
                          ? 'text-primary'
                          : 'text-secondary'
                    }`}
                  >
                    {item.status === 'Pending'
                      ? 'radio_button_unchecked'
                      : item.status === 'Equipped'
                        ? 'warning'
                        : 'check_circle'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-on-surface truncate">
                      {item.name}
                    </div>
                    <div className="font-mono-tabular text-[10px] text-on-surface-variant">
                      {item.category} · {item.weightGrams}g{' '}
                      {item.essential ? '· Essential' : '· Optional'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCycleStatus(item.id)}
                    title="Click to cycle status"
                    className={`px-3 py-1 rounded font-mono-tabular text-[11px] font-semibold transition-transform active:scale-95 ${
                      STATUS_BADGE[item.status]
                    }`}
                  >
                    {item.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="p-1.5 rounded text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Gear Card */}
        <form
          onSubmit={handleAdd}
          className="lg:col-span-4 bg-surface-container-low p-4 rounded-xl shadow-xl flex flex-col gap-3 self-start"
        >
          <span className="font-mono-tabular text-[10px] uppercase text-on-surface-variant font-bold">
            Add Expedition Item
          </span>

          <label className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Equipment Name
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Titanium Ice Axe"
              className="mt-1 w-full bg-surface-container px-3 py-2 rounded text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </label>

          <label className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Category
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as GearItem['category'])}
              className="mt-1 w-full bg-surface-container px-3 py-2 rounded text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
            >
              <option value="Traction">Traction</option>
              <option value="Navigation">Navigation</option>
              <option value="Apparel">Apparel</option>
              <option value="Shelter">Shelter</option>
              <option value="Hydration">Hydration</option>
            </select>
          </label>

          <label className="font-mono-tabular text-[10px] uppercase text-on-surface-variant">
            Weight (grams)
            <input
              type="number"
              min={10}
              max={10000}
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="mt-1 w-full bg-surface-container px-3 py-2 rounded text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </label>

          <button
            type="submit"
            className="mt-2 w-full py-2.5 bg-primary-container hover:brightness-110 text-on-primary-container font-mono-tabular text-[12px] font-bold rounded flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Add to Manifest</span>
          </button>
        </form>
      </div>
    </div>
  );
};

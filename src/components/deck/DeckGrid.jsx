import { useMemo } from 'react';
import { X, Droplets } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { calculateWellVolumes } from '@/lib/protocolUtils';
import LabwareThumbnail from './LabwareThumbnail';
import BayWellPicker from './BayWellPicker';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getStepSlotRoles(step) {
  if (!step) return {};
  const roles = {};
  const p = step.params;
  if (p.sourceSlot) roles[p.sourceSlot] = 'source';
  if (p.destSlot)   roles[p.destSlot]   = 'dest';
  if (p.wasteSlot)  roles[p.wasteSlot]  = 'waste';
  if (p.mixSlot)    roles[p.mixSlot]    = 'mix';
  return roles;
}

const ROLE_STYLES = {
  source: { bg: 'bg-blue-500',   text: 'ORIGEN'   },
  dest:   { bg: 'bg-emerald-500',text: 'DESTINO'  },
  waste:  { bg: 'bg-red-400',    text: 'DESECHO'  },
  mix:    { bg: 'bg-violet-500', text: 'MIX'      },
};



// ─── Empty bay cell ─────────────────────────────────────────────────────────────
function EmptyBayCell({ slotId, role, onClick, onKeyDown }) {
  const roleStyle = role ? ROLE_STYLES[role] : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="
        group relative flex flex-col items-center justify-center h-full
        rounded-xl border border-dashed border-surface-200
        bg-surface-50 hover:bg-surface-100 hover:border-surface-300
        cursor-pointer transition-all duration-150
      "
    >
      <span className="text-2xl font-semibold text-surface-200 group-hover:text-surface-300 transition-colors">
        {slotId}
      </span>
      <span className="text-[11px] font-medium tracking-widest uppercase text-surface-300 group-hover:text-surface-400 mt-0.5 transition-colors">
        vacía
      </span>
      {roleStyle && (
        <span
          className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${roleStyle.bg}`}
          title={role}
        />
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function DeckGrid() {
  const deck                    = useLabflowStore((s) => s.deck);
  const viewingSlotId           = useLabflowStore((s) => s.viewingSlotId);
  const activeStepId            = useLabflowStore((s) => s.activeStepId);
  const protocolSequence        = useLabflowStore((s) => s.protocolSequence);
  const activeWellSelectionTarget = useLabflowStore((s) => s.activeWellSelectionTarget);
  const tempSelectedSourceWells = useLabflowStore((s) => s.tempSelectedSourceWells);
  const tempSelectedDestWells   = useLabflowStore((s) => s.tempSelectedDestWells);
  const toggleSourceWell        = useLabflowStore((s) => s.toggleSourceWell);
  const toggleDestWell          = useLabflowStore((s) => s.toggleDestWell);
  const openModal               = useLabflowStore((s) => s.openModal);
  const removeLabware           = useLabflowStore((s) => s.removeLabware);
  const setViewingSlotId        = useLabflowStore((s) => s.setViewingSlotId);

  const activeStep = useMemo(
    () => protocolSequence.find((s) => s.id === activeStepId),
    [protocolSequence, activeStepId]
  );
  const slotRoles = useMemo(() => getStepSlotRoles(activeStep), [activeStep]);

  const selectingSlotId = useMemo(() => {
    if (!activeStep || !activeWellSelectionTarget) return null;
    if (activeWellSelectionTarget === 'destWells')   return activeStep.params.destSlot   || null;
    if (activeWellSelectionTarget === 'sourceWells') return activeStep.params.sourceSlot || null;
    if (activeWellSelectionTarget === 'mixWells')    return activeStep.params.mixSlot    || null;
    return null;
  }, [activeStep, activeWellSelectionTarget]);

  const selectionMode = useMemo(() => {
    if (!activeWellSelectionTarget) return null;
    return activeWellSelectionTarget === 'destWells' ? 'dest' : 'source';
  }, [activeWellSelectionTarget]);

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 grid-rows-2 gap-2.5 h-full p-1">
        {Object.entries(deck).map(([slotId, labware]) => {
          const isSelected        = viewingSlotId === slotId;
          const role              = slotRoles[slotId];
          const roleStyle         = role ? ROLE_STYLES[role] : null;
          const isReservoir       = labware?.metadata?.displayCategory === 'reservoir';
          const hasConfig         = labware?.deckConfig?.initialVolume != null;
          const wellVolumes       = hasConfig
            ? calculateWellVolumes(slotId, protocolSequence, labware.deckConfig)
            : null;
          const remainingVolumeUl = wellVolumes
            ? Array.from(wellVolumes.values())[0] ?? labware.deckConfig.initialVolume
            : null;
          const maxVolume         = labware?.wellProperties?.maxVolume || 1;
          const fillPercent       = (hasConfig && maxVolume > 0)
            ? Math.max(0, Math.min(1, remainingVolumeUl / maxVolume))
            : 0;

          const isSelectingThisSlot = selectingSlotId === slotId && selectionMode != null;

          if (!labware) {
            return (
              <EmptyBayCell
                key={slotId}
                slotId={slotId}
                role={role}
                onClick={() => openModal('labware', { modalSlotId: slotId })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    openModal('labware', { modalSlotId: slotId });
                }}
              />
            );
          }

          // ── Card ring logic ────────────────────────────────────────────────
          const ringClass = isSelectingThisSlot
            ? 'ring-2 ring-blue-400 shadow-sm'
            : isSelected
            ? 'ring-2 ring-blue-300'
            : role
            ? 'ring-1 ring-blue-200'
            : '';

          // ── Card background ────────────────────────────────────────────────
          const bgClass = hasConfig
            ? 'bg-white'
            : 'bg-surface-50';

          return (
            <div
              key={slotId}
              className={`
                group relative rounded-xl flex flex-col overflow-hidden
                border border-surface-200 hover:border-blue-400
                transition-all duration-150 cursor-pointer
                ${bgClass} ${ringClass}
              `}
              onClick={() => setViewingSlotId(slotId)}
            >
              {/* ── Top bar ── */}
              <div className="flex items-center justify-between px-2.5 pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-widest uppercase text-surface-400">
                    B{slotId}
                  </span>
                  {roleStyle && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-white tracking-wider ${roleStyle.bg}`}
                    >
                      {roleStyle.text}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); removeLabware(slotId); }}
                  className="
                    w-5 h-5 flex items-center justify-center rounded-full
                    text-surface-300 hover:text-red-400
                    transition-colors duration-150
                    opacity-0 group-hover:opacity-100
                  "
                  aria-label="Eliminar labware"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ── Thumbnail area ── */}
              <div className="flex-1 min-h-0 px-2 py-1 flex items-center justify-center overflow-hidden">
                {isSelectingThisSlot && !isReservoir ? (
                  <BayWellPicker labware={labware} mode={selectionMode} />
                ) : (
                  <LabwareThumbnail
                    labware={labware}
                    remainingVolumeUl={remainingVolumeUl}
                    maxVolume={maxVolume}
                    isSelectable={isSelectingThisSlot && isReservoir}
                    isSelected={
                      isSelectingThisSlot &&
                      isReservoir &&
                      (selectionMode === 'source'
                        ? tempSelectedSourceWells.has('A1')
                        : tempSelectedDestWells.has('A1'))
                    }
                    onSelect={() => {
                      if (selectionMode === 'source') toggleSourceWell('A1');
                      else toggleDestWell('A1');
                    }}
                  />
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-2.5 pb-2 pt-0.5 shrink-0 space-y-1.5">
                {/* Labware name */}
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-normal text-surface-400 truncate leading-tight">
                    {labware.metadata.displayName}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

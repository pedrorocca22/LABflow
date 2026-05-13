import { useMemo } from 'react';
import { X, Droplets } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { calculateWellVolumes } from '@/lib/protocolUtils';
import LabwareThumbnail from './LabwareThumbnail';
import BayWellPicker from './BayWellPicker';

function getStepSlotRoles(step) {
  if (!step) return {};
  const roles = {};
  const p = step.params;
  if (p.sourceSlot) roles[p.sourceSlot] = 'source';
  if (p.destSlot) roles[p.destSlot] = 'dest';
  if (p.wasteSlot) roles[p.wasteSlot] = 'waste';
  if (p.mixSlot) roles[p.mixSlot] = 'mix';
  return roles;
}

const roleDot = {
  source: 'bg-primary-500',
  dest: 'bg-success-500',
  waste: 'bg-danger-500',
  mix: 'bg-purple-500',
};

const roleLabel = {
  source: 'ORIGEN',
  dest: 'DESTINO',
  waste: 'DESECHO',
  mix: 'MIX',
};

export default function DeckGrid() {
  const deck = useLabflowStore((s) => s.deck);
  const viewingSlotId = useLabflowStore((s) => s.viewingSlotId);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const protocolSequence = useLabflowStore((s) => s.protocolSequence);
  const activeWellSelectionTarget = useLabflowStore((s) => s.activeWellSelectionTarget);
  const tempSelectedSourceWells = useLabflowStore((s) => s.tempSelectedSourceWells);
  const tempSelectedDestWells = useLabflowStore((s) => s.tempSelectedDestWells);
  const toggleSourceWell = useLabflowStore((s) => s.toggleSourceWell);
  const toggleDestWell = useLabflowStore((s) => s.toggleDestWell);
  const openModal = useLabflowStore((s) => s.openModal);
  const removeLabware = useLabflowStore((s) => s.removeLabware);

  const activeStep = useMemo(
    () => protocolSequence.find((s) => s.id === activeStepId),
    [protocolSequence, activeStepId]
  );
  const slotRoles = useMemo(() => getStepSlotRoles(activeStep), [activeStep]);

  const selectingSlotId = useMemo(() => {
    if (!activeStep || !activeWellSelectionTarget) return null;
    if (activeWellSelectionTarget === 'destWells') return activeStep.params.destSlot || null;
    if (activeWellSelectionTarget === 'sourceWells') return activeStep.params.sourceSlot || null;
    if (activeWellSelectionTarget === 'mixWells') return activeStep.params.mixSlot || null;
    return null;
  }, [activeStep, activeWellSelectionTarget]);

  const selectionMode = useMemo(() => {
    if (!activeWellSelectionTarget) return null;
    if (activeWellSelectionTarget === 'destWells') return 'dest';
    return 'source';
  }, [activeWellSelectionTarget]);

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full p-1">
        {Object.entries(deck).map(([slotId, labware]) => {
          const isSelected = viewingSlotId === slotId;
          const role = slotRoles[slotId];
          const hasConfig = labware?.deckConfig?.initialVolume != null;
          const isReservoir = labware?.metadata?.displayCategory === 'reservoir';
          const wellVolumes = hasConfig
            ? calculateWellVolumes(slotId, protocolSequence, labware.deckConfig)
            : null;
          const remainingVolumeUl = wellVolumes
            ? Array.from(wellVolumes.values())[0] ?? labware.deckConfig.initialVolume
            : null;
          const remainingVolumeMl = remainingVolumeUl != null ? remainingVolumeUl / 1000 : null;

          const maxVolume = labware?.wellProperties?.maxVolume || 1;
          const configuredVolumeUl = labware?.deckConfig?.initialVolume || 0;
          const configuredVolumeMl = configuredVolumeUl / 1000;

          const isSelectingThisSlot = selectingSlotId === slotId && selectionMode != null;

          return (
            <div
              key={slotId}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!labware) {
                  openModal('labware', { modalSlotId: slotId });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (!labware) openModal('labware', { modalSlotId: slotId });
                }
              }}
              className={`
                group relative rounded-xl transition-all duration-150 flex flex-col overflow-hidden
                ${!labware
                  ? 'bg-surface-100 text-surface-400 hover:bg-surface-200 cursor-pointer'
                  : hasConfig
                    ? 'bg-primary-50 text-surface-800 cursor-default'
                    : 'bg-surface-100 text-surface-700 cursor-default'
                }
                ${isSelected && labware ? 'ring-2 ring-primary-400' : ''}
                ${role && !isSelected ? 'ring-1 ring-primary-300' : ''}
                ${isSelectingThisSlot ? 'ring-2 ring-primary-500 shadow-md' : ''}
              `}
            >
              {labware ? (
                <>
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                        B{slotId}
                      </span>
                      {role && (
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded text-white ${roleDot[role]}`}>
                          {roleLabel[role]}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabware(slotId);
                      }}
                      className="w-4 h-4 bg-surface-200 hover:bg-danger-500 hover:text-white rounded-full flex items-center justify-center shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>

                  {/* Content area: thumbnail or well picker */}
                  <div className="flex-1 min-h-0 px-2 py-0.5 flex items-center justify-center overflow-hidden">
                    {isSelectingThisSlot && labware.metadata.displayCategory !== 'reservoir' ? (
                      <BayWellPicker labware={labware} mode={selectionMode} />
                    ) : (
                      <LabwareThumbnail
                        labware={labware}
                        remainingVolumeUl={remainingVolumeUl}
                        maxVolume={maxVolume}
                        isSelectable={isSelectingThisSlot && labware.metadata.displayCategory === 'reservoir'}
                        isSelected={
                          isSelectingThisSlot &&
                          labware.metadata.displayCategory === 'reservoir' &&
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

                  {/* Info footer */}
                  <div className="px-2 pb-1.5 pt-0.5 shrink-0">
                    <p className="text-[10px] font-semibold text-center leading-tight truncate">
                      {labware.metadata.displayName}
                    </p>
                    {isReservoir && hasConfig ? (
                      <div className="mt-1">
                        <div className="w-full h-1 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{
                              width: `${maxVolume > 0 && remainingVolumeUl != null ? Math.max(4, Math.min(100, (remainingVolumeUl / maxVolume) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="flex items-center gap-0.5 text-[8px] font-bold text-primary-700">
                            <Droplets className="w-2 h-2" />
                            {remainingVolumeMl != null ? remainingVolumeMl.toFixed(1) : configuredVolumeMl.toFixed(1)}mL
                          </span>
                          {role && (
                            <span className={`w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px] text-surface-400">
                          {labware.metadata.displayCategory === 'wellPlate'
                            ? `${labware.grid.rows}×${labware.grid.columns}`
                            : labware.metadata.displayCategory === 'tipRack'
                              ? 'Puntas'
                              : 'Reservorio'}
                        </span>
                        {role && (
                          <span className={`w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-2xl font-bold text-surface-300">{slotId}</span>
                  <span className="text-[10px] text-surface-400 mt-0.5 font-medium uppercase tracking-wide">Vacía</span>
                  {role && (
                    <span className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

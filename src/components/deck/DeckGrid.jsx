import { useMemo } from 'react';
import { X, Droplets, Beaker } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { calculateWellVolumes } from '@/lib/protocolUtils';

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
  source: 'Origen',
  dest: 'Destino',
  waste: 'Desecho',
  mix: 'Mezcla',
};

export default function DeckGrid() {
  const deck = useLabflowStore((s) => s.deck);
  const viewingSlotId = useLabflowStore((s) => s.viewingSlotId);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const protocolSequence = useLabflowStore((s) => s.protocolSequence);
  const openModal = useLabflowStore((s) => s.openModal);
  const removeLabware = useLabflowStore((s) => s.removeLabware);

  const activeStep = useMemo(
    () => protocolSequence.find((s) => s.id === activeStepId),
    [protocolSequence, activeStepId]
  );
  const slotRoles = useMemo(() => getStepSlotRoles(activeStep), [activeStep]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
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
                group relative rounded-lg transition-all duration-150 flex flex-col items-center justify-center p-1.5
                aspect-[3/1]
                ${!labware
                  ? 'bg-surface-100 text-surface-400 hover:bg-surface-200 cursor-pointer'
                  : hasConfig
                    ? 'bg-primary-50 text-surface-800 cursor-default'
                    : 'bg-surface-100 text-surface-700 cursor-default'
                }
                ${isSelected && labware ? 'bg-primary-100 ring-1 ring-primary-400' : ''}
                ${role && !isSelected ? 'ring-1 ring-primary-300' : ''}
              `}
            >
              {labware ? (
                <>
                  <div className="absolute top-0.5 left-1.5 right-1.5 flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-surface-400">
                      B{slotId}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabware(slotId);
                      }}
                      className="w-3.5 h-3.5 bg-surface-200 hover:bg-danger-500 hover:text-white rounded-full flex items-center justify-center shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center mt-1.5">
                    <Beaker className={`w-3 h-3 mb-0.5 ${hasConfig ? 'text-primary-500' : 'text-surface-400'}`} />
                    <span className="text-[9px] font-semibold leading-tight text-center px-1">
                      {labware.metadata.displayName}
                    </span>
                  </div>

                  <div className="absolute bottom-0.5 left-1.5 right-1.5">
                    {isReservoir && hasConfig ? (
                      <div className="space-y-0.5">
                        <div className="w-full h-1 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{
                              width: `${maxVolume > 0 && remainingVolumeUl != null ? Math.max(4, Math.min(100, (remainingVolumeUl / maxVolume) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
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
                      <div className="flex items-center justify-between">
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
                <>
                  <span className="text-base font-bold text-surface-300">{slotId}</span>
                  <span className="text-[8px] text-surface-400 mt-0.5 font-medium uppercase tracking-wide">Vacía</span>
                  {role && (
                    <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { LayoutGrid, Trash2, X, Droplets, Beaker } from 'lucide-react';
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

const roleStyles = {
  source: 'ring-2 ring-primary-400 bg-primary-50/80',
  dest: 'ring-2 ring-success-400 bg-success-50/80',
  waste: 'ring-2 ring-danger-400 bg-danger-50/80',
  mix: 'ring-2 ring-purple-400 bg-purple-50/80',
};

const roleDot = {
  source: 'bg-primary-500',
  dest: 'bg-success-500',
  waste: 'bg-danger-500',
  mix: 'bg-purple-500',
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
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-surface-800">
        <LayoutGrid className="w-5 h-5 text-primary-500" />
        Mesa de Trabajo
      </h2>

      <div className="space-y-3">
        {/* Waste tray */}
        <div className="border-2 border-dashed border-surface-300 rounded-xl bg-surface-100 flex items-center justify-center py-3 text-surface-400 text-sm font-semibold">
          <Trash2 className="w-5 h-5 mr-2" />
          Tray Waste
        </div>

        {/* Slots grid 3×2 */}
        <div className="grid grid-cols-3 gap-2.5">
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
                  group relative rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2
                  aspect-[3/2]
                  ${!labware
                    ? 'border-dashed border-surface-300 bg-surface-50 text-surface-400 hover:bg-surface-100 hover:border-surface-400 cursor-pointer'
                    : hasConfig
                      ? 'border-solid border-primary-300 bg-primary-50 text-surface-800 cursor-default'
                      : 'border-solid border-surface-300 bg-surface-100 text-surface-700 cursor-default'
                  }
                  ${isSelected && labware ? 'ring-2 ring-primary-500 shadow-md' : ''}
                  ${role && !isSelected ? roleStyles[role] : ''}
                `}
              >
                {labware ? (
                  <>
                    {/* Top bar: slot number + remove */}
                    <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400">
                        B{slotId}
                      </span>
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

                    {/* Center: icon + name */}
                    <div className="flex flex-col items-center justify-center text-center mt-2">
                      <Beaker className={`w-5 h-5 mb-0.5 ${hasConfig ? 'text-primary-500' : 'text-surface-400'}`} />
                      <span className="text-[11px] font-semibold leading-tight text-center px-1">
                        {labware.metadata.displayName}
                      </span>
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-1.5 left-2 right-2">
                      {isReservoir && hasConfig ? (
                        <div className="space-y-1">
                          {/* Volume bar: remaining vs configured (always meaningful scale) */}
                          <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{
                                width: `${maxVolume > 0 && remainingVolumeUl != null ? Math.max(4, Math.min(100, (remainingVolumeUl / maxVolume) * 100)) : 0}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary-700">
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
                          {remainingVolume != null ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary-700 bg-primary-100 px-1 py-0.5 rounded">
                              <Droplets className="w-2 h-2" />
                              {remainingVolume.toFixed(0)}µL
                            </span>
                          ) : (
                            <span className="text-[9px] text-surface-400">
                              {labware.metadata.displayCategory === 'wellPlate'
                                ? `${labware.grid.rows}×${labware.grid.columns}`
                                : labware.metadata.displayCategory === 'tipRack'
                                  ? 'Puntas'
                                  : 'Reservorio'}
                            </span>
                          )}
                          {role && (
                            <span className={`w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold text-surface-300">{slotId}</span>
                    <span className="text-[9px] text-surface-400 mt-0.5 font-medium uppercase tracking-wide">Vacía</span>
                    {role && (
                      <span className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${roleDot[role]}`} title={role} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

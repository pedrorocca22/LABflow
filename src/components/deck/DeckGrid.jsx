import { useMemo } from 'react';
import { LayoutGrid, Trash2, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

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
  source: 'border-l-primary-500 bg-primary-50/60',
  dest: 'border-l-success-500 bg-success-50/60',
  waste: 'border-l-danger-500 bg-danger-50/60',
  mix: 'border-l-purple-500 bg-purple-50/60',
};

const roleLabels = {
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
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-surface-800">
        <LayoutGrid className="w-5 h-5 text-primary-500" />
        Mesa de Trabajo
      </h2>
      <div className="max-w-sm mx-auto">
        <div className="grid grid-cols-2 gap-2">
          {/* Waste tray */}
          <div className="col-span-2 border-2 border-dashed border-surface-300 rounded-lg bg-surface-100 flex items-center justify-center py-3 text-surface-400 text-sm font-semibold">
            <Trash2 className="w-4 h-4 mr-2" />
            Tray Waste
          </div>

          {/* Slots */}
          {Object.entries(deck).map(([slotId, labware]) => {
            const isSelected = viewingSlotId === slotId;
            const role = slotRoles[slotId];
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
                  group relative rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-sm font-semibold
                  aspect-[4/1]
                  ${labware
                    ? 'border-surface-400 bg-surface-100 text-surface-700 cursor-default border-solid'
                    : 'border-dashed border-surface-300 bg-surface-50 text-surface-400 hover:bg-surface-100 hover:border-surface-400 cursor-pointer'
                  }
                  ${isSelected && labware ? 'ring-2 ring-primary-400 bg-primary-50 border-primary-400' : ''}
                  ${role && !isSelected ? `border-l-4 ${roleStyles[role]}` : ''}
                `}
              >
                {labware ? (
                  <>
                    <span className="px-2 text-xs leading-tight">{labware.metadata.displayName}</span>
                    {role && (
                      <span className={`
                        absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md shadow-sm
                        ${role === 'source' ? 'bg-primary-500 text-white' : ''}
                        ${role === 'dest' ? 'bg-success-500 text-white' : ''}
                        ${role === 'waste' ? 'bg-danger-500 text-white' : ''}
                        ${role === 'mix' ? 'bg-purple-500 text-white' : ''}
                      `}>
                        {roleLabels[role]}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabware(slotId);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-surface-200 hover:bg-danger-500 hover:text-white rounded-full flex items-center justify-center shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span>Bahía {slotId}</span>
                    {role && (
                      <span className={`
                        absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md shadow-sm
                        ${role === 'source' ? 'bg-primary-500 text-white' : ''}
                        ${role === 'dest' ? 'bg-success-500 text-white' : ''}
                        ${role === 'waste' ? 'bg-danger-500 text-white' : ''}
                        ${role === 'mix' ? 'bg-purple-500 text-white' : ''}
                      `}>
                        {roleLabels[role]}
                      </span>
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

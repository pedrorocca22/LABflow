import { LayoutGrid, Trash2, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function DeckGrid() {
  const deck = useLabflowStore((s) => s.deck);
  const viewingSlotId = useLabflowStore((s) => s.viewingSlotId);
  const openModal = useLabflowStore((s) => s.openModal);
  const removeLabware = useLabflowStore((s) => s.removeLabware);

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
                `}
              >
                {labware ? (
                  <>
                    <span className="px-2 text-xs leading-tight">{labware.metadata.displayName}</span>
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
                  `Bahía ${slotId}`
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

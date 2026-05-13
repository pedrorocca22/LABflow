import { Beaker, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function LabwareModal() {
  const library = useLabflowStore((s) => s.labwareLibrary);
  const modalSlotId = useLabflowStore((s) => s.modalSlotId);
  const placeLabware = useLabflowStore((s) => s.placeLabware);
  const openModal = useLabflowStore((s) => s.openModal);
  const closeModal = useLabflowStore((s) => s.closeModal);

  const handleSelect = (labwareId) => {
    const lw = library[labwareId];
    const needsConfig = lw && (lw.metadata.displayCategory === 'reservoir' || lw.metadata.displayCategory === 'tipRack' || lw.metadata.isSource);
    if (needsConfig) {
      openModal('deckLabwareConfig', { pendingLabwareConfig: { slotId: modalSlotId, labwareId } });
    } else {
      placeLabware(modalSlotId, labwareId);
      closeModal();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800">Seleccionar Labware</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {Object.entries(library).map(([id, lw]) => {
          const isConfigurable = lw.metadata.displayCategory === 'reservoir' || lw.metadata.displayCategory === 'tipRack' || lw.metadata.isSource;
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
            >
              <Beaker className="w-5 h-5 text-primary-500 shrink-0" />
              <div>
                <p className="font-medium text-surface-800">{lw.metadata.displayName}</p>
                <p className="text-xs text-surface-500">{lw.metadata.brand || 'Sin marca'} · {lw.grid.rows}×{lw.grid.columns}</p>
              </div>
              {isConfigurable && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-primary-100 text-primary-700 px-2 py-0.5 rounded-md">
                  Configurable
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-right">
        <button onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Beaker, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function DeckLabwareConfigModal() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const placeLabware = useLabflowStore((s) => s.placeLabware);
  const pendingLabwareConfig = useLabflowStore((s) => s.pendingLabwareConfig);
  const library = useLabflowStore((s) => s.labwareLibrary);

  const { slotId, labwareId } = pendingLabwareConfig || {};
  const labware = labwareId ? library[labwareId] : null;

  const [hasLiquid, setHasLiquid] = useState(true);
  const [volume, setVolume] = useState('');

  const handleConfirm = () => {
    if (!slotId || !labwareId) return;
    const config = hasLiquid && volume ? { initialVolume: parseFloat(volume) * 1000 } : null;
    placeLabware(slotId, labwareId, config);
    closeModal();
  };

  const handleCancel = () => {
    if (slotId && labwareId) {
      placeLabware(slotId, labwareId, null);
    }
    closeModal();
  };

  if (!labware) return null;

  return (
    <div className="p-6 max-w-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-primary-500" />
          Configurar {labware.metadata.displayName}
        </h3>
        <button onClick={handleCancel} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200">
          <input
            id="hasLiquid"
            type="checkbox"
            checked={hasLiquid}
            onChange={(e) => setHasLiquid(e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="hasLiquid" className="text-sm font-medium text-surface-700">
            Este contenedor tiene líquido
          </label>
        </div>

        {hasLiquid && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Volumen inicial (mL)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="Ej: 15"
              className="w-full p-2.5 text-sm border border-surface-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              autoFocus
            />
            <p className="text-xs text-surface-400 mt-1">
              El sistema irá descontando este volumen a medida que se use en la secuencia.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-2">
        <button onClick={handleCancel} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
          Saltar
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

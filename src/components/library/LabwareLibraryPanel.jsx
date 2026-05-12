import { useState } from 'react';
import { Library, Plus, Pipette, TestTube2, Square } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function LabwareLibraryPanel() {
  const library = useLabflowStore((s) => s.labwareLibrary);
  const openModal = useLabflowStore((s) => s.openModal);
  const deleteLabwareFromLibrary = useLabflowStore((s) => s.deleteLabwareFromLibrary);
  const setLabwareIdToEdit = useLabflowStore((s) => s.labwareIdToEdit);
  const deck = useLabflowStore((s) => s.deck);

  const [filter, setFilter] = useState('all');

  const items = Object.entries(library).filter(([, lw]) => {
    if (filter === 'all') return true;
    return lw.metadata.displayCategory === filter;
  });

  const isInDeck = (labwareId) => {
    return Object.values(deck).some((lw) => lw && lw.metadata.displayName === library[labwareId].metadata.displayName);
  };

  return (
    <div className="flex-grow p-4 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-800">
            <Library className="w-5 h-5 text-primary-500" />
            Librería de Labware
          </h2>
          <button
            onClick={() => {
              setLabwareIdToEdit(null);
              openModal('labwareEditor');
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir Labware
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {[{ id: 'all', label: 'Todos' }, { id: 'wellPlate', label: 'Placas' }, { id: 'tipRack', label: 'Puntas' }, { id: 'reservoir', label: 'Reservorios' }].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(([id, lw]) => {
            const isCalibrated = lw.calibration && Object.keys(lw.calibration.wells || {}).length > 0;
            const inUse = isInDeck(id);
            const Icon = lw.metadata.displayCategory === 'tipRack' ? Pipette : lw.metadata.displayCategory === 'reservoir' ? TestTube2 : Square;

            return (
              <div key={id} className="bg-surface-0 border border-surface-200 rounded-xl p-4 hover:shadow-md hover:border-primary-200 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary-500" />
                    <h3 className="font-semibold text-surface-800">{lw.metadata.displayName}</h3>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCalibrated ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'}`}>
                    {isCalibrated ? 'Calibrado' : 'Sin Calibrar'}
                  </span>
                </div>

                <p className="text-xs text-surface-500 mb-1">{lw.metadata.brand || 'Sin marca'} · {lw.metadata.displayCategory}</p>
                <p className="text-xs text-surface-500 mb-3">{lw.dimensions.xDimension}mm × {lw.dimensions.yDimension}mm</p>

                <div className="bg-surface-50 rounded-lg p-2.5 text-xs text-surface-600 space-y-1 mb-3">
                  <p><span className="font-medium">Rejilla:</span> {lw.grid.rows}×{lw.grid.columns}</p>
                  <p><span className="font-medium">Diámetro:</span> {lw.wellProperties.diameter}mm</p>
                  <p><span className="font-medium">Volumen máx:</span> {lw.wellProperties.maxVolume}µL</p>
                  <p><span className="font-medium">Profundidad Z:</span> {lw.wellProperties.bottomZ}mm</p>
                  {lw.wellProperties.wellBottomShape && (
                    <p><span className="font-medium">Fondo:</span> {lw.wellProperties.wellBottomShape}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
                  <button
                    onClick={() => {
                      setLabwareIdToEdit(id);
                      openModal('labwareEditor');
                    }}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Editar
                  </button>
                  {!inUse && (
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar este labware?')) deleteLabwareFromLibrary(id);
                      }}
                      className="text-sm font-medium text-danger-600 hover:text-danger-800 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <p className="text-surface-400 text-center py-10">No hay labware en esta categoría.</p>
        )}
      </div>
    </div>
  );
}

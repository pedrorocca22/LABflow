import { useState, useEffect, useRef } from 'react';
import { Beaker, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function DeckLabwareConfigModal() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const placeLabware = useLabflowStore((s) => s.placeLabware);
  const pendingLabwareConfig = useLabflowStore((s) => s.pendingLabwareConfig);
  const library = useLabflowStore((s) => s.labwareLibrary);

  const { slotId, labwareId } = pendingLabwareConfig || {};
  const labware = labwareId ? library[labwareId] : null;

  const isReservoir = labware?.metadata.displayCategory === 'reservoir';
  const isTipRack = labware?.metadata.displayCategory === 'tipRack';

  // Config Reservorio
  const [hasLiquid, setHasLiquid] = useState(true);
  const [volume, setVolume] = useState('');

  // Config TipRack
  const [selectedTips, setSelectedTips] = useState(new Set());
  const [dragSelection, setDragSelection] = useState({ isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  const [dragMode, setDragMode] = useState(null); // 'select' or 'deselect'
  const svgRef = useRef(null);

  useEffect(() => {
    if (isTipRack && labware.grid) {
      const allTips = new Set();
      for (let r = 0; r < labware.grid.rows; r++) {
        for (let c = 0; c < labware.grid.columns; c++) {
          allTips.add(`${String.fromCharCode(65 + r)}${c + 1}`);
        }
      }
      setSelectedTips(allTips);
    }
  }, [isTipRack, labware]);

  const getMousePos = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    return {
      x: (e.clientX - ctm.e) / ctm.a,
      y: (e.clientY - ctm.f) / ctm.d,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const well = e.target.closest('[data-well-id]');
    let mode = 'select';
    if (well) {
      mode = selectedTips.has(well.dataset.wellId) ? 'deselect' : 'select';
    }
    setDragMode(mode);
    setDragSelection({ isActive: true, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!dragSelection.isActive) return;
    const pos = getMousePos(e);
    setDragSelection(prev => ({ ...prev, endX: pos.x, endY: pos.y }));
  };

  const handleMouseUp = (e) => {
    if (!dragSelection.isActive) return;
    
    const dx = Math.abs(dragSelection.endX - dragSelection.startX);
    const dy = Math.abs(dragSelection.endY - dragSelection.startY);

    setSelectedTips(prev => {
      const next = new Set(prev);
      
      if (dx < 5 && dy < 5) {
        // Single click
        const well = e.target.closest('[data-well-id]');
        if (well) {
          const wellId = well.dataset.wellId;
          if (dragMode === 'select') next.add(wellId);
          else next.delete(wellId);
        }
      } else {
        // Lasso selection
        const rect = {
          x: Math.min(dragSelection.startX, dragSelection.endX),
          y: Math.min(dragSelection.startY, dragSelection.endY),
          width: dx,
          height: dy,
        };
        const svg = svgRef.current;
        if (svg) {
          const wells = svg.querySelectorAll('[data-well-id]');
          wells.forEach((well) => {
            const x = parseFloat(well.getAttribute('x'));
            const y = parseFloat(well.getAttribute('y'));
            const cx = x + 4; // center of 8x8 rect
            const cy = y + 4;
            if (cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height) {
              const wellId = well.dataset.wellId;
              if (dragMode === 'select') next.add(wellId);
              else next.delete(wellId);
            }
          });
        }
      }
      return next;
    });

    setDragSelection({ isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    setDragMode(null);
  };

  const selectAllTips = () => {
    if (!labware?.grid) return;
    const allTips = new Set();
    for (let r = 0; r < labware.grid.rows; r++) {
      for (let c = 0; c < labware.grid.columns; c++) {
        allTips.add(`${String.fromCharCode(65 + r)}${c + 1}`);
      }
    }
    setSelectedTips(allTips);
  };

  const deselectAllTips = () => {
    setSelectedTips(new Set());
  };

  const handleConfirm = () => {
    if (!slotId || !labwareId) return;
    let config = null;
    
    if (isReservoir) {
      config = hasLiquid && volume ? { initialVolume: parseFloat(volume) * 1000 } : null;
    } else if (isTipRack) {
      config = { availableTips: Array.from(selectedTips) };
    }

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
    <div className="p-6 max-w-xl w-full">
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
        {isReservoir && (
          <>
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
          </>
        )}

        {isTipRack && labware.grid && (
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-surface-700 mb-2 w-full">Selecciona puntas disponibles:</p>
            <div className="flex gap-2 w-full mb-3">
              <button onClick={selectAllTips} className="flex-1 text-xs bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold py-1.5 px-2 rounded-lg transition-colors">
                Todas
              </button>
              <button onClick={deselectAllTips} className="flex-1 text-xs bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold py-1.5 px-2 rounded-lg transition-colors">
                Ninguna
              </button>
            </div>
            
            <div className="w-full flex justify-center bg-surface-50 p-4 rounded-xl border border-surface-200">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${labware.grid.columns * 10 + 8} ${labware.grid.rows * 10 + 8}`}
                className="w-full max-w-md"
                preserveAspectRatio="xMidYMid meet"
                style={{ cursor: 'crosshair' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {Array.from({ length: labware.grid.rows }, (_, r) =>
                  Array.from({ length: labware.grid.columns }, (_, c) => {
                    const wellId = `${String.fromCharCode(65 + r)}${c + 1}`;
                    const isSelected = selectedTips.has(wellId);
                    const cx = 4 + c * 10;
                    const cy = 4 + r * 10;

                    return (
                      <g key={wellId}>
                        <rect
                          x={cx + 1}
                          y={cy + 1}
                          width={8}
                          height={8}
                          rx={1}
                          data-well-id={wellId}
                          className={`transition-colors ${isSelected ? 'fill-primary-100 stroke-primary-400' : 'fill-white stroke-surface-300'}`}
                          strokeWidth={isSelected ? 1 : 0.5}
                        />
                        {isSelected && (
                          <circle
                            cx={cx + 5}
                            cy={cy + 5}
                            r={2.5}
                            className="fill-orange-500 pointer-events-none"
                          />
                        )}
                      </g>
                    );
                  })
                )}

                {/* Selection lasso rect */}
                {dragSelection.isActive && (
                  <rect
                    x={Math.min(dragSelection.startX, dragSelection.endX)}
                    y={Math.min(dragSelection.startY, dragSelection.endY)}
                    width={Math.abs(dragSelection.endX - dragSelection.startX)}
                    height={Math.abs(dragSelection.endY - dragSelection.startY)}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="rgba(59, 130, 246, 0.6)"
                    strokeWidth={0.5}
                    className="pointer-events-none"
                  />
                )}
              </svg>
            </div>
            <p className="text-xs text-surface-400 mt-2 text-center">Haz clic o dibuja un recuadro para seleccionar o deseleccionar las puntas.</p>
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

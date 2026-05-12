import { useRef } from 'react';
import { Pipette } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { calculateWellVolumes } from '@/lib/protocolUtils';
import { ROW_LABELS } from '@/lib/constants';
import { useWellSelection } from '@/hooks/useWellSelection';

export default function LabwareDetail() {
  const svgRef = useRef(null);
  const viewingSlotId = useLabflowStore((s) => s.viewingSlotId);
  const deck = useLabflowStore((s) => s.deck);
  const protocolSequence = useLabflowStore((s) => s.protocolSequence);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const tempSelectedSourceWells = useLabflowStore((s) => s.tempSelectedSourceWells);
  const tempSelectedDestWells = useLabflowStore((s) => s.tempSelectedDestWells);
  const activeWellSelectionTarget = useLabflowStore((s) => s.activeWellSelectionTarget);
  const dragSelection = useLabflowStore((s) => s.dragSelection);
  const selectAllWells = useLabflowStore((s) => s.selectAllWells);
  const deselectAllWells = useLabflowStore((s) => s.deselectAllWells);
  const setViewingSlotId = useLabflowStore((s) => s.setViewingSlotId);

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useWellSelection(svgRef);

  const labware = viewingSlotId ? deck[viewingSlotId] : null;

  if (!labware) {
    return (
      <div className="h-full flex flex-col">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-surface-800">
          <Pipette className="w-5 h-5 text-primary-500" />
          Detalle del Labware
        </h2>
        <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
          Selecciona una acción y una bahía para visualizar.
        </div>
      </div>
    );
  }

  const activeStepIndex = protocolSequence.findIndex((s) => s.id === activeStepId);
  const sequenceToConsider =
    activeStepIndex === -1 ? protocolSequence : protocolSequence.slice(0, activeStepIndex + 1);
  const wellVolumes = calculateWellVolumes(viewingSlotId, sequenceToConsider);

  const wellsToHighlight =
    activeWellSelectionTarget === 'sourceWells' || activeWellSelectionTarget === 'mixWells'
      ? tempSelectedSourceWells
      : tempSelectedDestWells;

  const isReservoir = labware.metadata.displayCategory === 'reservoir';
  const hasGrid = labware.grid && labware.wellProperties;

  const { dimensions } = labware;

  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-surface-800">
        <Pipette className="w-5 h-5 text-primary-500" />
        Detalle del Labware
      </h2>

      {hasGrid && !isReservoir && (
        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={() => selectAllWells(labware.grid.rows, labware.grid.columns)}
            className="text-xs bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold py-1 px-3 rounded-lg transition-colors"
          >
            Seleccionar Todos
          </button>
          <button
            onClick={deselectAllWells}
            className="text-xs bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold py-1 px-3 rounded-lg transition-colors"
          >
            Deseleccionar Todos
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center">
        {isReservoir ? (
          <svg
            viewBox={`0 0 ${dimensions.xDimension} ${dimensions.yDimension}`}
            className="w-full max-w-md"
            style={{ aspectRatio: `${dimensions.xDimension} / ${dimensions.yDimension}` }}
          >
            <rect
              x={5}
              y={5}
              width={dimensions.xDimension - 10}
              height={dimensions.yDimension - 10}
              rx={5}
              className="fill-surface-100 stroke-surface-300"
              strokeWidth={0.5}
            />
            <text
              x={dimensions.xDimension / 2}
              y={dimensions.yDimension / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-surface-600"
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {Math.round(wellVolumes.get('A1') || 0)} µL
            </text>
          </svg>
        ) : hasGrid ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${dimensions.xDimension} ${dimensions.yDimension}`}
            className="w-full max-w-lg"
            style={{ aspectRatio: `${dimensions.xDimension} / ${dimensions.yDimension}`, cursor: activeWellSelectionTarget ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {Array.from({ length: labware.grid.rows }, (_, r) =>
              Array.from({ length: labware.grid.columns }, (_, c) => {
                const wellId = `${ROW_LABELS[r]}${c + 1}`;
                const cx = labware.wellProperties.offset.x + c * labware.wellProperties.spacing;
                const cy = labware.wellProperties.offset.y + r * labware.wellProperties.spacing;
                const rVal = labware.wellProperties.diameter / 2;
                const isSelected = wellsToHighlight.has(wellId);
                const hasVolume = wellVolumes.has(wellId) && wellVolumes.get(wellId) > 0;

                return (
                  <g key={wellId}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={rVal}
                      data-well-id={wellId}
                      className={`transition-all duration-100 ${
                        isSelected
                          ? 'fill-primary-300 stroke-primary-700'
                          : hasVolume
                          ? 'fill-surface-200 stroke-surface-400'
                          : 'fill-white stroke-surface-300'
                      }`}
                      strokeWidth={isSelected ? 1 : 0.5}
                    />
                    {hasVolume && (
                      <text
                        x={cx}
                        y={cy + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-surface-700 pointer-events-none select-none"
                        style={{ fontSize: '3px', fontWeight: 'bold' }}
                      >
                        {Math.round(wellVolumes.get(wellId))}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Selection rect */}
            {dragSelection.isActive && (
              <rect
                x={Math.min(dragSelection.startX, dragSelection.endX)}
                y={Math.min(dragSelection.startY, dragSelection.endY)}
                width={Math.abs(dragSelection.endX - dragSelection.startX)}
                height={Math.abs(dragSelection.endY - dragSelection.startY)}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth={0.5}
              />
            )}
          </svg>
        ) : (
          <div className="text-center text-surface-500">
            <p className="font-medium">{labware.metadata.displayName}</p>
            <p className="text-sm">Este labware no tiene una rejilla visualizable.</p>
          </div>
        )}
      </div>
    </div>
  );
}

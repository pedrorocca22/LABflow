import { useRef } from 'react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { calculateWellVolumes } from '@/lib/protocolUtils';
import { ROW_LABELS } from '@/lib/constants';
import { useWellSelection } from '@/hooks/useWellSelection';

export default function BayWellPicker({ labware, mode }) {
  const svgRef = useRef(null);
  const protocolSequence = useLabflowStore((s) => s.protocolSequence);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const tempSelectedSourceWells = useLabflowStore((s) => s.tempSelectedSourceWells);
  const tempSelectedDestWells = useLabflowStore((s) => s.tempSelectedDestWells);
  const dragSelection = useLabflowStore((s) => s.dragSelection);

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useWellSelection(svgRef);

  const activeStepIndex = protocolSequence.findIndex((s) => s.id === activeStepId);
  const sequenceToConsider =
    activeStepIndex === -1 ? protocolSequence : protocolSequence.slice(0, activeStepIndex + 1);

  // Find slotId from the active step to calculate volumes for this labware
  const activeStep = protocolSequence.find((s) => s.id === activeStepId);
  let slotId = null;
  if (activeStep) {
    if (mode === 'source' && activeStep.params.sourceSlot) slotId = activeStep.params.sourceSlot;
    else if (mode === 'source' && activeStep.params.mixSlot) slotId = activeStep.params.mixSlot;
    else if (mode === 'dest' && activeStep.params.destSlot) slotId = activeStep.params.destSlot;
  }

  const wellVolumes = slotId
    ? calculateWellVolumes(slotId, sequenceToConsider, labware.deckConfig)
    : new Map();

  const wellsToHighlight = mode === 'source' ? tempSelectedSourceWells : tempSelectedDestWells;

  const isReservoir = labware.metadata.displayCategory === 'reservoir';
  const hasGrid = labware.grid && labware.wellProperties;

  if (isReservoir) {
    const { dimensions } = labware;
    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.xDimension} ${dimensions.yDimension}`}
        className="w-full h-full"
        style={{
          aspectRatio: `${dimensions.xDimension} / ${dimensions.yDimension}`,
          cursor: 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
        <rect
          x={10}
          y={dimensions.yDimension - 20}
          width={dimensions.xDimension - 20}
          height={8}
          rx={4}
          className="fill-surface-200"
        />
        {labware.deckConfig?.initialVolume != null && (
          <rect
            x={10}
            y={dimensions.yDimension - 20}
            width={Math.min(
              dimensions.xDimension - 20,
              Math.max(4, ((dimensions.xDimension - 20) * (wellVolumes.get('A1') || 0)) / labware.wellProperties.maxVolume)
            )}
            height={8}
            rx={4}
            className="fill-primary-400"
          />
        )}
        <text
          x={dimensions.xDimension / 2}
          y={dimensions.yDimension / 2 - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-surface-700"
          style={{ fontSize: '10px', fontWeight: 700 }}
        >
          {(wellVolumes.get('A1') || 0) >= 1000
            ? `${((wellVolumes.get('A1') || 0) / 1000).toFixed(1)} mL`
            : `${Math.round(wellVolumes.get('A1') || 0)} µL`}
        </text>
        <rect
          x={5}
          y={5}
          width={dimensions.xDimension - 10}
          height={dimensions.yDimension - 10}
          rx={5}
          data-well-id="A1"
          cx={dimensions.xDimension / 2}
          cy={dimensions.yDimension / 2}
          fill="transparent"
          className={`transition-all duration-100 ${
            wellsToHighlight.has('A1') ? 'stroke-primary-500' : 'stroke-transparent'
          }`}
          strokeWidth={wellsToHighlight.has('A1') ? 2 : 0}
        />
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
    );
  }

  if (hasGrid) {
    const rows = labware.grid.rows;
    const cols = labware.grid.columns;
    const cellSize = 18;
    const margin = 4;
    const radius = 7;
    const viewW = cols * cellSize + margin * 2;
    const viewH = rows * cellSize + margin * 2;

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full"
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const wellId = `${ROW_LABELS[r]}${c + 1}`;
            const cx = margin + c * cellSize + cellSize / 2;
            const cy = margin + r * cellSize + cellSize / 2;
            const isSelected = wellsToHighlight.has(wellId);
            const hasVolume = wellVolumes.has(wellId) && wellVolumes.get(wellId) > 0;

            return (
              <g key={wellId}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  data-well-id={wellId}
                  className={`transition-all duration-100 ${
                    isSelected
                      ? 'fill-primary-400 stroke-primary-500'
                      : hasVolume
                      ? 'fill-surface-200 stroke-surface-400'
                      : 'fill-white stroke-surface-300'
                  }`}
                  strokeWidth={0.5}
                />
                {hasVolume && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-surface-700 pointer-events-none select-none"
                    style={{ fontSize: '5px', fontWeight: 'bold' }}
                  >
                    {Math.round(wellVolumes.get(wellId))}
                  </text>
                )}
              </g>
            );
          })
        )}
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
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-surface-400 text-xs">
      Sin rejilla
    </div>
  );
}

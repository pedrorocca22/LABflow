import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';

const typeLabels = {
  transfer: 'Transferir',
  distribute: 'Distribuir',
  consolidate: 'Consolidar',
  aspirate: 'Aspirar',
  wash: 'Lavar',
  mix: 'Mezclar',
  pause: 'Pausa',
  comment: 'Nota',
};

const typeColors = {
  transfer: 'bg-primary-500',
  distribute: 'bg-success-500',
  consolidate: 'bg-warning-500',
  aspirate: 'bg-danger-500',
  wash: 'bg-primary-400',
  mix: 'bg-primary-300',
  pause: 'bg-warning-400',
  comment: 'bg-surface-400',
};

const StepNode = memo(({ data }) => {
  const { step, isActive, hasWarning, onClick } = data;
  const label = step.params.label || typeLabels[step.type] || step.type;
  const volume = step.params.volume;
  const sourceSlot = step.params.sourceSlot || step.params.mixSlot;
  const destSlot = step.params.destSlot;

  return (
    <div
      onClick={onClick}
      className={`
        relative w-[140px] rounded-lg border shadow-sm cursor-pointer transition-all
        ${isActive ? 'ring-2 ring-primary-500 border-primary-400 scale-105' : 'border-surface-200 hover:border-primary-300'}
        ${hasWarning ? 'border-l-4 border-l-warning-500' : 'border-l-4'}
        ${typeColors[step.type] ? typeColors[step.type].replace('bg-', 'border-l-') : 'border-l-surface-400'}
        bg-white
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-surface-400" />

      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-surface-800 truncate flex-1">{label}</p>
          {hasWarning && (
            <AlertTriangle className="w-3 h-3 text-warning-500 shrink-0" title="Advertencia" />
          )}
        </div>
        {volume != null && (
          <p className="text-[10px] text-surface-500 mt-0.5">{volume} µL</p>
        )}
        {(sourceSlot || destSlot) && (
          <p className="text-[9px] text-surface-400 mt-0.5 truncate">
            {sourceSlot ? `B${sourceSlot}` : ''}
            {sourceSlot && destSlot ? ' → ' : ''}
            {destSlot ? `B${destSlot}` : ''}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-surface-400" />
    </div>
  );
});

StepNode.displayName = 'StepNode';

export default StepNode;

import { useState, useCallback } from 'react';
import { ListChecks, Plus, Trash2, Copy, ArrowUp, ArrowDown, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLabflowStore } from '@/stores/useLabflowStore';

const typeConfig = {
  transfer: { icon: 'arrow-right-left', color: 'border-l-primary-500' },
  distribute: { icon: 'arrow-up-to-line', color: 'border-l-success-500' },
  consolidate: { icon: 'arrow-down-to-line', color: 'border-l-warning-500' },
  aspirate: { icon: 'chevrons-down', color: 'border-l-danger-500' },
  wash: { icon: 'droplets', color: 'border-l-primary-400' },
  mix: { icon: 'rotate-cw', color: 'border-l-primary-300' },
  pause: { icon: 'pause-circle', color: 'border-l-warning-400' },
  comment: { icon: 'message-square', color: 'border-l-surface-400' },
};

export default function RoutineList() {
  const sequence = useLabflowStore((s) => s.protocolSequence);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const selectStep = useLabflowStore((s) => s.selectStep);
  const deleteStep = useLabflowStore((s) => s.deleteStep);
  const cloneStep = useLabflowStore((s) => s.cloneStep);
  const moveStep = useLabflowStore((s) => s.moveStep);
  const moveStepUp = useLabflowStore((s) => s.moveStepUp);
  const moveStepDown = useLabflowStore((s) => s.moveStepDown);
  const openModal = useLabflowStore((s) => s.openModal);
  const clearProtocol = useLabflowStore((s) => s.clearProtocol);
  const protocolWarnings = useLabflowStore((s) => s.protocolWarnings);
  const deck = useLabflowStore((s) => s.deck);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = useCallback((e, stepId) => {
    setDraggedId(stepId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e, targetId) => {
      e.preventDefault();
      setDragOverId(null);
      if (draggedId && draggedId !== targetId) {
        moveStep(draggedId, targetId);
      }
    },
    [draggedId, moveStep]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-surface-100 flex items-center justify-between">
        <h2 className="text-xs font-semibold flex items-center gap-1.5 text-surface-800">
          <ListChecks className="w-5 h-5 text-primary-500" />
          Secuencia
        </h2>
        <button
          onClick={() => {
            if (sequence.length === 0) return;
            toast('¿Eliminar todos los pasos?', {
              action: { label: 'Confirmar', onClick: () => { clearProtocol(); toast.success('Protocolo limpiado'); } },
              cancel: { label: 'Cancelar', onClick: () => {} },
            });
          }}
          disabled={sequence.length === 0}
          className="flex items-center gap-1 text-xs font-semibold text-danger-600 bg-danger-50 hover:bg-danger-100 disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpiar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sequence.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-surface-400">
            <ListPlus className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-xs font-medium">La secuencia está vacía</p>
            <p className="text-xs mt-1">Añade una acción para empezar a construir tu protocolo.</p>
          </div>
        ) : (
          sequence.map((step) => {
            const isActive = step.id === activeStepId;
            const warning = protocolWarnings.find((w) => w.stepId === step.id);
            const config = typeConfig[step.type] || typeConfig.comment;
            const sourceName = deck[step.params.sourceSlot]?.metadata.displayName;
            const destName = deck[step.params.destSlot]?.metadata.displayName;

            return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, step.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, step.id)}
                onClick={() => selectStep(step.id)}
                onDragEnter={() => setDragOverId(step.id)}
                className={`
                  group relative bg-surface-50 border border-surface-200 rounded-lg p-3 cursor-grab active:cursor-grabbing
                  hover:border-primary-300 transition-all
                  border-l-4 ${config.color}
                  ${isActive ? 'ring-2 ring-primary-400 bg-primary-50 border-primary-300' : ''}
                  ${warning ? 'border-l-warning-500' : ''}
                  ${dragOverId === step.id && dragOverId !== draggedId ? 'bg-primary-100/50 border-primary-400 border-dashed' : ''}
                `}
              >
                {warning && (
                  <div className="absolute -top-1.5 -right-1.5 text-warning-500" title={warning.message}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5zM11 10v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-800 text-xs truncate">
                      {step.params.label || step.type}
                    </p>
                    <div className="text-xs text-surface-500 mt-1 space-y-0.5">
                      {step.type === 'transfer' && (
                        <p>De {sourceName ? `B${step.params.sourceSlot}` : '?'} a {destName ? `B${step.params.destSlot}` : '?'} | {step.params.volume || '?'} µL</p>
                      )}
                      {step.type === 'distribute' && (
                        <p>De {sourceName ? `B${step.params.sourceSlot}` : '?'} a {destName ? `B${step.params.destSlot}` : '?'} ({(step.params.destWells || []).length} pocillos)</p>
                      )}
                      {step.type === 'consolidate' && (
                        <p>De {sourceName ? `B${step.params.sourceSlot}` : '?'} ({(step.params.sourceWells || []).length} pocillos) a {destName ? `B${step.params.destSlot}` : '?'}</p>
                      )}
                      {step.type === 'aspirate' && (
                        <p>Vaciar {sourceName ? `B${step.params.sourceSlot}` : '?'} → Desecho {destName ? `B${step.params.destSlot}` : '?'}</p>
                      )}
                      {step.type === 'wash' && (
                        <p>Lavar {destName ? `B${step.params.destSlot}` : '?'} | {step.params.cycles} ciclos</p>
                      )}
                      {step.type === 'mix' && (
                        <p>Mezclar en {deck[step.params.mixSlot]?.metadata.displayName ? `B${step.params.mixSlot}` : '?'}</p>
                      )}
                      {step.type === 'pause' && (
                        <p>{step.params.timed ? `Esperar ${step.params.minutes}m ${step.params.seconds}s` : 'Pausa manual'}</p>
                      )}
                      {step.type === 'comment' && (
                        <p className="italic text-surface-400 truncate">{step.params.comment || 'Comentario...'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); cloneStep(step.id); }}
                      className="p-1 rounded-md hover:bg-surface-200 text-surface-400 hover:text-primary-600 transition-colors"
                      title="Clonar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                      className="p-1 rounded-md hover:bg-danger-50 text-surface-400 hover:text-danger-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveStepUp(step.id); }}
                      className="p-0.5 rounded hover:bg-surface-200 text-surface-400 hover:text-surface-600 disabled:opacity-30 transition-colors"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveStepDown(step.id); }}
                      className="p-0.5 rounded hover:bg-surface-200 text-surface-400 hover:text-surface-600 disabled:opacity-30 transition-colors"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-surface-100 shrink-0">
        <button
          onClick={() => openModal('action')}
          className="w-full flex items-center justify-center gap-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold py-2 px-3 rounded-md transition-colors text-xs"
        >
          <Plus className="w-4 h-4" />
          Añadir Acción
        </button>
      </div>
    </div>
  );
}

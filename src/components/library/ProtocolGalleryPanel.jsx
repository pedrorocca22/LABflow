import { useState } from 'react';
import { Archive, Upload, Trash2, ListTree, ChevronUp, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { generateProtocolDescription } from '@/lib/protocolUtils';

export default function ProtocolGalleryPanel() {
  const savedProtocols = useLabflowStore((s) => s.savedProtocols);
  const loadProtocol = useLabflowStore((s) => s.loadProtocol);
  const deleteProtocol = useLabflowStore((s) => s.deleteProtocol);
  const [expandedLog, setExpandedLog] = useState(null);

  return (
    <div className="flex-grow p-4 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-800 mb-6">
          <Archive className="w-5 h-5 text-primary-500" />
          Galería de Protocolos
        </h2>

        {Object.keys(savedProtocols).length === 0 ? (
          <div className="bg-surface-0 border border-surface-200 rounded-xl p-8 text-center flex flex-col items-center">
            <FolderOpen className="w-10 h-10 mb-3 text-surface-300" />
            <p className="text-surface-500 font-medium">No hay protocolos guardados</p>
            <p className="text-surface-400 text-sm mt-1">Guarda tu primer protocolo desde la pestaña Workflow.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(savedProtocols).map(([name, protocol]) => {
              const details = protocol.details || generateProtocolDescription(protocol.sequence, protocol.deck);
              const isExpanded = expandedLog === name;

              return (
                <div key={name} className="bg-surface-0 border border-surface-200 rounded-xl p-4 hover:shadow-md hover:border-primary-200 transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-surface-800 truncate">{protocol.title || name}</h3>
                    <span className="text-xs text-surface-400 whitespace-nowrap">{protocol.date || ''}</span>
                  </div>

                  <p className="text-sm text-surface-500 mb-1">
                    por <span className="font-medium text-surface-700">{protocol.author || 'Desconocido'}</span>
                  </p>

                  <p className="text-xs text-surface-600 bg-surface-50 rounded-lg p-2 mb-4">
                    {details.summary || 'Sin descripción.'}
                  </p>

                  <div className="space-y-3 mb-4">
                    {details.mainActions?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Acciones</h4>
                        <div className="flex flex-wrap gap-1">
                          {details.mainActions.map((action) => (
                            <span key={action} className="bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {details.labwareUsed?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Labware</h4>
                        <ul className="text-xs text-surface-700 list-disc list-inside space-y-0.5">
                          {details.labwareUsed.map((lw) => (
                            <li key={lw}>{lw}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {isExpanded && details.movementLog?.length > 0 && (
                    <div className="mb-3 pt-3 border-t border-surface-100">
                      <h5 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Movimientos</h5>
                      <ol className="text-xs text-surface-700 list-decimal list-inside space-y-1 max-h-40 overflow-y-auto">
                        {details.movementLog.map((log, i) => (
                          <li key={i}>{log}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-surface-100 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : name)}
                      className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ListTree className="w-4 h-4" />}
                      {isExpanded ? 'Ocultar' : 'Movimientos'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          toast(`¿Cargar "${name}"? Se sobrescribirá el workflow actual.`, {
                            action: { label: 'Cargar', onClick: () => { loadProtocol(name); toast.success(`"${name}" cargado`); } },
                            cancel: { label: 'Cancelar', onClick: () => {} },
                          });
                        }}
                        className="flex items-center gap-1 bg-primary-50 text-primary-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Cargar
                      </button>
                      <button
                        onClick={() => {
                          toast(`¿Eliminar "${name}"?`, {
                            action: { label: 'Eliminar', onClick: () => { deleteProtocol(name); toast.success('Protocolo eliminado'); } },
                            cancel: { label: 'Cancelar', onClick: () => {} },
                          });
                        }}
                        className="flex items-center gap-1 bg-danger-50 text-danger-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-danger-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

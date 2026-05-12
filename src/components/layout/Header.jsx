import { Blocks, Undo2, Redo2, Save, Play, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { generateGcodeForSequence } from '@/lib/protocolUtils';
import { useKlipper } from '@/hooks/useKlipper';

export default function Header() {
  const {
    klipper,
    setKlipperIp,
    openModal,
    canUndo,
    canRedo,
    undo,
    redo,
    protocolSequence,
  } = useLabflowStore();

  const { disconnect } = useKlipper();
  const status = klipper.status;

  const statusConfig = {
    connected: { icon: Wifi, color: 'text-success-500', label: 'Conectado' },
    disconnected: { icon: WifiOff, color: 'text-danger-500', label: 'Conectar al Robot' },
    connecting: { icon: Loader2, color: 'text-warning-500', label: 'Conectando...' },
    error: { icon: WifiOff, color: 'text-danger-500', label: 'Error de conexión' },
  };

  const { icon: StatusIcon, color, label } = statusConfig[status] || statusConfig.disconnected;

  return (
    <header className="bg-surface-900 text-white shadow-lg px-5 py-3 flex items-center justify-between animate-slide-in">
      <div className="flex items-center gap-3">
        <Blocks className="w-6 h-6 text-primary-400" />
        <h1 className="text-lg font-bold tracking-tight">LABFLOW</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (status === 'connected') disconnect();
            else openModal('connection');
          }}
          className="flex items-center gap-2 bg-surface-700 hover:bg-surface-600 transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${color.replace('text-', 'bg-')}`} />
          <StatusIcon className={`w-4 h-4 ${color} ${status === 'connecting' ? 'animate-spin' : ''}`} />
          <span>{label}</span>
        </button>

        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Deshacer</span>
        </button>

        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Rehacer</span>
        </button>

        <button
          onClick={() => openModal('saveProtocol')}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Guardar</span>
        </button>

        <button
          onClick={() => {
            if (status !== 'connected') {
              alert('Error: Debes estar conectado a un robot para ejecutar un protocolo.');
              return;
            }
            if (protocolSequence.length === 0) {
              alert('Error: No hay pasos en la secuencia para ejecutar.');
              return;
            }
            const { addToKlipperQueue, deck } = useLabflowStore.getState();
            const gcode = generateGcodeForSequence(protocolSequence, deck);
            addToKlipperQueue(gcode);
            alert(`Protocolo enviado a la cola de ejecución con ${gcode.length} comandos.`);
          }}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 transition-colors px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm"
        >
          <Play className="w-4 h-4" />
          <span>Ejecutar</span>
        </button>
      </div>
    </header>
  );
}

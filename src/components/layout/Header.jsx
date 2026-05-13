import { useState } from 'react';
import { Blocks, Undo2, Redo2, Save, Play, Wifi, WifiOff, Loader2, Download, Upload, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
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
    deck,
    importProtocol,
  } = useLabflowStore();

  const { disconnect } = useKlipper();
  const status = klipper.status;

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('labflow-dark', '1');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('labflow-dark', '0');
    }
  };

  const statusConfig = {
    connected: { icon: Wifi, color: 'text-success-500', label: 'Conectado' },
    disconnected: { icon: WifiOff, color: 'text-danger-500', label: 'Conectar al Robot' },
    connecting: { icon: Loader2, color: 'text-warning-500', label: 'Conectando...' },
    error: { icon: WifiOff, color: 'text-danger-500', label: 'Error de conexión' },
  };

  const { icon: StatusIcon, color, label } = statusConfig[status] || statusConfig.disconnected;

  return (
    <header className="bg-surface-900 text-white shadow-lg px-3 py-3 flex items-center justify-end animate-slide-in">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDark}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 transition-colors px-2 py-1 rounded-md text-xs font-medium"
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            if (status === 'connected') disconnect();
            else openModal('connection');
          }}
          className="flex items-center gap-2 bg-surface-700 hover:bg-surface-600 transition-colors px-2 py-1 rounded-md text-xs font-medium"
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
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 transition-colors px-2 py-1 rounded-md text-xs font-medium"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Guardar</span>
        </button>

        <button
          onClick={() => {
            if (protocolSequence.length === 0) {
              toast.error('No hay pasos para exportar.');
              return;
            }
            const data = {
              name: 'protocolo-labflow',
              createdAt: new Date().toISOString(),
              deck,
              sequence: protocolSequence,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `labflow-protocol-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Protocolo exportado como JSON');
          }}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 transition-colors px-2 py-1 rounded-md text-xs font-medium"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <input
          id="import-protocol-input"
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target.result);
                importProtocol(data);
                toast.success(`Protocolo "${data.name || file.name}" importado correctamente`);
              } catch {
                toast.error('El archivo no es un protocolo válido');
              }
            };
            reader.readAsText(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => document.getElementById('import-protocol-input').click()}
          className="flex items-center gap-1.5 bg-surface-700 hover:bg-surface-600 transition-colors px-2 py-1 rounded-md text-xs font-medium"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        <button
          onClick={() => {
            if (status !== 'connected') {
              toast.error('Debes estar conectado a un robot para ejecutar un protocolo.');
              return;
            }
            if (protocolSequence.length === 0) {
              toast.error('No hay pasos en la secuencia para ejecutar.');
              return;
            }
            const { addToKlipperQueue } = useLabflowStore.getState();
            const gcode = generateGcodeForSequence(protocolSequence, deck);
            addToKlipperQueue(gcode);
            toast.success(`Protocolo enviado a la cola de ejecución con ${gcode.length} comandos.`);
          }}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 transition-colors px-3 py-1 rounded-md text-xs font-semibold shadow-sm"
        >
          <Play className="w-4 h-4" />
          <span>Ejecutar</span>
        </button>
      </div>
    </header>
  );
}

import { Gamepad2, Monitor, Pause, Play, StopCircle } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { useState, useRef, useEffect } from 'react';

export default function ControlPanel() {
  const klipper = useLabflowStore((s) => s.klipper);
  const addToKlipperQueue = useLabflowStore((s) => s.addToKlipperQueue);
  const [jogStep, setJogStep] = useState(1);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [klipper.logs]);

  const sendJog = (axis, dir) => {
    const step = parseFloat(jogStep);
    let command = '';
    if (axis === 'home') {
      command = `G28 ${dir.toUpperCase()}`;
    } else {
      command = `G91\nG0 ${axis.toUpperCase()}${dir * step}\nG90`;
    }
    addToKlipperQueue(command);
  };

  return (
    <div className="flex-grow p-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto h-full">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Jog control */}
          <div className="bg-surface-0 border border-surface-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-800 mb-4">
              <Gamepad2 className="w-5 h-5 text-primary-500" />
              Control Manual (Jog)
            </h2>

            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2 max-w-[200px]">
                  <div />
                  <button onClick={() => sendJog('y', 1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                    Y+
                  </button>
                  <div />
                  <button onClick={() => sendJog('x', -1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                    X-
                  </button>
                  <button onClick={() => sendJog('home', 'xy')} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                    XY
                  </button>
                  <button onClick={() => sendJog('x', 1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                    X+
                  </button>
                  <div />
                  <button onClick={() => sendJog('y', -1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                    Y-
                  </button>
                  <div />
                </div>
              </div>

              <div className="w-28 space-y-2">
                <button onClick={() => sendJog('z', 1)} className="w-full py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                  Z+
                </button>
                <button onClick={() => sendJog('home', 'z')} className="w-full py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                  Z
                </button>
                <button onClick={() => sendJog('z', -1)} className="w-full py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                  Z-
                </button>

                <div className="pt-2">
                  <label className="text-xs font-medium text-surface-600 block mb-1">Paso (mm)</label>
                  <select
                    value={jogStep}
                    onChange={(e) => setJogStep(e.target.value)}
                    className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none"
                  >
                    <option value="0.1">0.1</option>
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Machine params placeholder */}
          <div className="bg-surface-0 border border-surface-200 rounded-xl p-5 shadow-sm flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-800 mb-4">
              <Gamepad2 className="w-5 h-5 text-primary-500" />
              Parámetros de la Máquina
            </h2>
            <p className="text-sm text-surface-400">Próximamente: Configuración de velocidades, aceleraciones y flowrate.</p>
          </div>
        </div>

        {/* Right column */}
        <div className="bg-surface-0 border border-surface-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-800 mb-4">
            <Monitor className="w-5 h-5 text-primary-500" />
            Monitor de Comunicación
          </h2>

          <div className="flex-1 bg-surface-900 rounded-lg p-4 overflow-y-auto min-h-[200px] font-mono text-xs">
            {klipper.logs.length === 0 ? (
              <p className="text-surface-500">Esperando conexión...</p>
            ) : (
              klipper.logs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-surface-500 mr-2">[{log.time}]</span>
                  <span
                    className={
                      log.type === 'sent'
                        ? 'text-primary-400'
                        : log.type === 'received'
                        ? 'text-success-500'
                        : log.type === 'error'
                        ? 'text-danger-500'
                        : 'text-warning-400'
                    }
                  >
                    {log.type === 'sent' ? '>> ' : log.type === 'received' ? '<< ' : log.type === 'error' ? '!! ' : ''}
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>

          <div className="mt-4 pt-4 border-t border-surface-100">
            <h3 className="text-md font-semibold mb-3">Control del Protocolo</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addToKlipperQueue('PAUSE')}
                className="flex items-center justify-center gap-2 bg-warning-500 hover:bg-warning-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pausar
              </button>
              <button
                onClick={() => addToKlipperQueue('RESUME')}
                className="flex items-center justify-center gap-2 bg-success-500 hover:bg-success-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Reanudar
              </button>
              <button
                onClick={() => addToKlipperQueue('CANCEL_PRINT')}
                className="flex items-center justify-center gap-2 bg-danger-500 hover:bg-danger-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

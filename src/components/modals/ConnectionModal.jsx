import { useState } from 'react';
import { Wifi, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { useKlipper } from '@/hooks/useKlipper';

export default function ConnectionModal() {
  const ip = useLabflowStore((s) => s.klipper.ip);
  const setKlipperIp = useLabflowStore((s) => s.setKlipperIp);
  const closeModal = useLabflowStore((s) => s.closeModal);
  const [inputIp, setInputIp] = useState(ip);

  const { connect } = useKlipper();

  const handleConnect = () => {
    setKlipperIp(inputIp);
    closeModal();
    setTimeout(() => connect(), 100);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800">Conectar al Robot</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Dirección IP de Klipper</label>
          <div className="relative">
            <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
          Cancelar
        </button>
        <button onClick={handleConnect} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
          Conectar
        </button>
      </div>
    </div>
  );
}

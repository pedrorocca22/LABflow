import { useState, useMemo } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function SerialDilutionWizard() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const addWizardSteps = useLabflowStore((s) => s.addWizardSteps);
  const deck = useLabflowStore((s) => s.deck);

  const occupied = useMemo(() => Object.entries(deck).filter(([, lw]) => lw !== null), [deck]);
  const wellPlates = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'wellPlate');
  const reservoirs = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'reservoir');
  const all = occupied;

  const [form, setForm] = useState({
    plateSlot: '', diluentSlot: '', stockSlot: '', stockWell: '',
    finalVolume: 200, dilutionFactor: 10, dilutionCount: 8, tipStrategy: 'same_tip',
  });

  const stockLabware = form.stockSlot ? deck[form.stockSlot] : null;
  const stockWells = useMemo(() => {
    if (!stockLabware || !stockLabware.grid) return [];
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const wells = [];
    for (let r = 0; r < stockLabware.grid.rows; r++) {
      for (let c = 0; c < stockLabware.grid.columns; c++) wells.push(`${rows[r]}${c + 1}`);
    }
    return wells;
  }, [stockLabware]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { plateSlot, diluentSlot, stockSlot, stockWell, finalVolume, dilutionFactor, dilutionCount, tipStrategy } = form;
    if (!plateSlot || !diluentSlot || !stockSlot || !stockWell) { toast.error('Completa todos los campos'); return; }

    const transferVolume = finalVolume / dilutionFactor;
    const diluentVolume = finalVolume - transferVolume;
    const plate = deck[plateSlot];
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const allWells = [];
    for (let r = 0; r < plate.grid.rows; r++) {
      for (let c = 0; c < plate.grid.columns; c++) allWells.push(`${rows[r]}${c + 1}`);
    }

    const stockWellIndex = allWells.indexOf(stockWell);
    const seriesStart = stockSlot === plateSlot ? stockWellIndex : 0;
    if (seriesStart + parseInt(dilutionCount) >= allWells.length) {
      toast.error('No hay suficientes pocillos consecutivos'); return;
    }

    const firstWell = allWells[seriesStart];
    const subsequent = allWells.slice(seriesStart + 1, seriesStart + 1 + parseInt(dilutionCount));
    const steps = [];

    if (subsequent.length > 0) {
      steps.push({
        id: `step_${Date.now()}_add_diluent_subsequent`, type: 'distribute',
        params: { label: 'Dilución: Preparar Diluyente', color: '#a7f3d0', volume: diluentVolume, sourceSlot: diluentSlot, sourceWells: ['A1'], destSlot: plateSlot, destWells: subsequent, pipetteStrategy: 'same_tip', advanced: { enabled: false, mix: {}, airgap: {}, blowout: {}, touchtip: false } },
      });
    }

    steps.push({
      id: `step_${Date.now()}_transfer_stock`, type: 'transfer',
      params: { label: `Dilución: Añadir Sol. Madre a ${firstWell}`, color: '#fecaca', volume: transferVolume, sourceSlot: stockSlot, sourceWells: [stockWell], destSlot: plateSlot, destWells: [firstWell], pipetteStrategy: tipStrategy, advanced: { enabled: false, mix: {}, airgap: {}, blowout: {}, touchtip: false } },
    });

    steps.push({
      id: `step_${Date.now()}_add_diluent_first`, type: 'transfer',
      params: { label: `Dilución: Añadir Diluyente a ${firstWell}`, color: '#a7f3d0', volume: diluentVolume, sourceSlot: diluentSlot, sourceWells: ['A1'], destSlot: plateSlot, destWells: [firstWell], pipetteStrategy: 'same_tip', advanced: { enabled: true, mix: { enabled: true, repetitions: 5, volume: finalVolume * 0.75, flowrate: 150 }, airgap: {}, blowout: {}, touchtip: false } },
    });

    for (let i = 0; i < subsequent.length; i++) {
      const sourceWell = i === 0 ? firstWell : subsequent[i - 1];
      steps.push({
        id: `step_${Date.now()}_transfer_series_${i}`, type: 'transfer',
        params: { label: `Dilución ${i + 1}: ${sourceWell} -> ${subsequent[i]}`, color: '#bfdbfe', volume: transferVolume, sourceSlot: plateSlot, sourceWells: [sourceWell], destSlot: plateSlot, destWells: [subsequent[i]], pipetteStrategy: tipStrategy, advanced: { enabled: true, mix: { enabled: true, repetitions: 5, volume: finalVolume * 0.75, flowrate: 150 }, airgap: { enabled: false, volume: 5 }, blowout: { enabled: false, volume: 10 }, touchtip: false } },
      });
    }

    addWizardSteps(steps);
    closeModal();
  };

  const Select = ({ label, name, options }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-surface-700 mb-1">{label}</label>
      <select name={name} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none">
        <option value="">Seleccionar...</option>
        {options.map(([sid, lw]) => (
          <option key={sid} value={sid}>{lw.metadata.displayName} (B{sid})</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary-500" />
          Asistente de Dilución en Serie
        </h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="md:col-span-2 font-medium text-surface-700 text-sm">Ubicaciones</h4>
          <Select label="Placa de Destino" name="plateSlot" options={wellPlates} />
          <Select label="Fuente del Diluyente" name="diluentSlot" options={reservoirs} />
          <Select label="Fuente de Solución Madre" name="stockSlot" options={all} />
          <div className="mb-3">
            <label className="block text-sm font-medium text-surface-700 mb-1">Pocillo de Solución Madre</label>
            <select name="stockWell" value={form.stockWell} onChange={(e) => setForm((f) => ({ ...f, stockWell: e.target.value }))} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none">
              <option value="">Seleccionar...</option>
              {stockWells.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="col-span-full font-medium text-surface-700 text-sm">Parámetros de Dilución</h4>
          <div className="mb-3">
            <label className="block text-sm font-medium text-surface-700 mb-1">Volumen Final (µL)</label>
            <input type="number" value={form.finalVolume} onChange={(e) => setForm((f) => ({ ...f, finalVolume: parseFloat(e.target.value) }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-surface-700 mb-1">Factor de Dilución</label>
            <input type="number" value={form.dilutionFactor} onChange={(e) => setForm((f) => ({ ...f, dilutionFactor: parseFloat(e.target.value) }))} min={1.1} step={0.1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-surface-700 mb-1">Nº de Diluciones</label>
            <input type="number" value={form.dilutionCount} onChange={(e) => setForm((f) => ({ ...f, dilutionCount: parseInt(e.target.value) }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-surface-700 mb-1">Estrategia de Puntas</label>
            <select value={form.tipStrategy} onChange={(e) => setForm((f) => ({ ...f, tipStrategy: e.target.value }))} className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white">
              <option value="same_tip">Misma punta</option>
              <option value="new_tip">Punta nueva</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm">Generar Pasos</button>
        </div>
      </form>
    </div>
  );
}

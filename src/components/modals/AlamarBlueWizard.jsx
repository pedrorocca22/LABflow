import { useState, useMemo } from 'react';
import { X, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function AlamarBlueWizard() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const addWizardSteps = useLabflowStore((s) => s.addWizardSteps);
  const deck = useLabflowStore((s) => s.deck);
  const wizardAssayWells = useLabflowStore((s) => s.wizardAssayWells);
  const wizardControlWells = useLabflowStore((s) => s.wizardControlWells);
  const setActiveStepId = useLabflowStore((s) => s.setActiveStepId);
  const setActiveWellSelectionTarget = useLabflowStore((s) => s.setActiveWellSelectionTarget);
  const setViewingSlotId = useLabflowStore((s) => s.setViewingSlotId);
  const openModal = useLabflowStore((s) => s.openModal);

  const occupied = useMemo(() => Object.entries(deck).filter(([, lw]) => lw !== null), [deck]);
  const wellPlates48 = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'wellPlate' && lw.grid.rows === 6);
  const wellPlates96 = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'wellPlate' && lw.grid.rows === 8);
  const reservoirs = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'reservoir');

  const [form, setForm] = useState({
    culturePlateSlot: '', readPlateSlot: '', wasteSlot: '', pbsSlot: '', reagentSlot: '',
    washCount: 3, washVolume: 1000, reagentVolume: 500, incubationHours: 4, transferVolume: 150,
  });

  const handleWellSelection = (type) => {
    if (!form.culturePlateSlot) { toast.error('Selecciona primero una Placa de Cultivo'); return; }
    setActiveStepId('wizardSelection');
    setViewingSlotId(form.culturePlateSlot);
    setActiveWellSelectionTarget(type === 'assay' ? 'sourceWells' : 'destWells');
    closeModal();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const assayWells = Array.from(wizardAssayWells);
    const controlWells = Array.from(wizardControlWells);
    if (assayWells.length === 0) { toast.error('Selecciona los pocillos de ensayo'); return; }

    const { culturePlateSlot, readPlateSlot, wasteSlot, pbsSlot, reagentSlot, washCount, washVolume, reagentVolume, incubationHours, transferVolume } = form;
    const allWells = [...new Set([...assayWells, ...controlWells])];

    const steps = [
      { type: 'aspirate', params: { label: 'AlamarBlue: Aspirar Medio', color: '#ef4444', volume: 500, sourceSlot: culturePlateSlot, destSlot: wasteSlot, sourceWells: allWells, pipetteStrategy: 'new_tip' } },
      { type: 'wash', params: { label: 'AlamarBlue: Lavado PBS', color: '#3b82f6', volume: parseFloat(washVolume), cycles: parseInt(washCount), sourceSlot: pbsSlot, destSlot: culturePlateSlot, wasteSlot, destWells: allWells, pipetteStrategy: 'new_tip' } },
      { type: 'distribute', params: { label: 'AlamarBlue: Añadir Reactivo', color: '#8b5cf6', volume: parseFloat(reagentVolume), sourceSlot: reagentSlot, sourceWells: ['A1'], destSlot: culturePlateSlot, destWells: allWells, pipetteStrategy: 'same_tip' } },
      { type: 'pause', params: { label: 'AlamarBlue: Incubación', color: '#f59e0b', timed: false, message: `PAUSA: Cubrir la placa, incubar ${incubationHours}h (37°C, 5% CO2). Luego reanudar.` } },
      { type: 'transfer', params: { label: 'AlamarBlue: Transferir Lectura', color: '#10b981', volume: parseFloat(transferVolume), sourceSlot: culturePlateSlot, sourceWells: allWells, destSlot: readPlateSlot, destWells: allWells, pipetteStrategy: 'new_tip' } },
      { type: 'comment', params: { label: 'Final del Ensayo', comment: 'Ensayo AlamarBlue finalizado. Proceder a lectura en espectrofotómetro.' } },
    ];

    addWizardSteps(steps);
    closeModal();
  };

  const Select = ({ label, name, options }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-surface-700 mb-1">{label}</label>
      <select name={name} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none">
        <option value="">Seleccionar...</option>
        {options.map(([sid, lw]) => <option key={sid} value={sid}>{lw.metadata.displayName} (B{sid})</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-500" />
          Asistente para Ensayo AlamarBlue
        </h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="col-span-full font-medium text-surface-700 text-sm">Ubicaciones del Labware</h4>
          <Select label="Placa de Cultivo (48)" name="culturePlateSlot" options={wellPlates48} />
          <Select label="Placa de Lectura (96)" name="readPlateSlot" options={wellPlates96} />
          <Select label="Bahía de Desechos" name="wasteSlot" options={occupied} />
          <Select label="Reservorio PBS" name="pbsSlot" options={reservoirs} />
          <Select label="Reservorio AlamarBlue" name="reagentSlot" options={reservoirs} />
        </div>

        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="font-medium text-surface-700 text-sm mb-2">Selección de Pocillos</h4>
          <div className="flex gap-3">
            <button type="button" onClick={() => handleWellSelection('assay')} className="flex-1 py-2 px-4 rounded-lg bg-pink-50 text-pink-700 font-semibold hover:bg-pink-100 transition-colors">
              Seleccionar Pocillos de Ensayo ({wizardAssayWells.size})
            </button>
            <button type="button" onClick={() => handleWellSelection('control')} className="flex-1 py-2 px-4 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors">
              Seleccionar Pocillos de Control ({wizardControlWells.size})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="col-span-full font-medium text-surface-700 text-sm">Parámetros del Protocolo</h4>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Nº Lavados</label><input type="number" value={form.washCount} onChange={(e) => setForm((f) => ({ ...f, washCount: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Volumen Lavado (µL)</label><input type="number" value={form.washVolume} onChange={(e) => setForm((f) => ({ ...f, washVolume: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Volumen AlamarBlue (µL)</label><input type="number" value={form.reagentVolume} onChange={(e) => setForm((f) => ({ ...f, reagentVolume: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Incubación (h)</label><input type="number" value={form.incubationHours} onChange={(e) => setForm((f) => ({ ...f, incubationHours: e.target.value }))} min={0} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Volumen Transferencia (µL)</label><input type="number" value={form.transferVolume} onChange={(e) => setForm((f) => ({ ...f, transferVolume: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm">Generar Pasos</button>
        </div>
      </form>
    </div>
  );
}

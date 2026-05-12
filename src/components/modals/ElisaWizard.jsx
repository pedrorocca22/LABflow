import { useState, useMemo } from 'react';
import { X, TestTube2 } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

const ELISA_REAGENTS = [
  { id: 'antigen', name: 'Antígeno', label: 'Coating (Antígeno)', vol: 100, time: 60 },
  { id: 'blocking', name: 'Bloqueo', label: 'Bloqueo', vol: 200, time: 30 },
  { id: 'primary', name: 'Primario', label: 'Muestra (Primario)', vol: 100, time: 60 },
  { id: 'secondary', name: 'Secundario', label: 'Detector (Secundario)', vol: 100, time: 45 },
  { id: 'substrate', name: 'Sustrato', label: 'Sustrato', vol: 100, time: 15 },
  { id: 'stop', name: 'Parada', label: 'Solución de Parada', vol: 100, time: 0 },
];

export default function ElisaWizard() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const addWizardSteps = useLabflowStore((s) => s.addWizardSteps);
  const deck = useLabflowStore((s) => s.deck);

  const occupied = useMemo(() => Object.entries(deck).filter(([, lw]) => lw !== null), [deck]);
  const wellPlates = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'wellPlate');
  const reservoirs = occupied.filter(([, lw]) => lw.metadata.displayCategory === 'reservoir');
  const all = occupied;

  const [form, setForm] = useState({
    plateSlot: '', washBufferSlot: '', wasteSlot: '',
    washVolume: 300, washRepetitions: 3,
  });
  const [assignments, setAssignments] = useState({});
  const [volumes, setVolumes] = useState(() => Object.fromEntries(ELISA_REAGENTS.map((r) => [r.id, r.vol])));
  const [incubations, setIncubations] = useState(() => Object.fromEntries(ELISA_REAGENTS.map((r) => [r.id, r.time])));

  const fixedSlots = useMemo(() => {
    const s = new Set([form.plateSlot, form.washBufferSlot, form.wasteSlot].filter(Boolean));
    occupied.filter(([, lw]) => lw.metadata.displayCategory === 'tipRack').forEach(([id]) => s.add(id));
    return s;
  }, [form, occupied]);

  const availableSlots = useMemo(() => all.filter(([id]) => !fixedSlots.has(id)), [all, fixedSlots]);

  const plan = useMemo(() => {
    const slotAssignments = {};
    const replacements = {};
    let slotIdx = 0;
    ELISA_REAGENTS.forEach((r) => {
      if (slotIdx < availableSlots.length) {
        slotAssignments[r.id] = availableSlots[slotIdx][0];
        slotIdx++;
      } else {
        const oldIdx = Object.keys(replacements).length % availableSlots.length;
        replacements[r.id] = ELISA_REAGENTS[oldIdx].id;
      }
    });
    return { slotAssignments, replacements };
  }, [availableSlots]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { plateSlot, washBufferSlot, wasteSlot, washVolume, washRepetitions } = form;
    if (!plateSlot || !washBufferSlot || !wasteSlot) { alert('Completa todos los campos'); return; }

    const plate = deck[plateSlot];
    const allWells = Array.from({ length: plate.grid.rows * plate.grid.columns }, (_, i) => {
      const row = String.fromCharCode(65 + Math.floor(i / plate.grid.columns));
      const col = (i % plate.grid.columns) + 1;
      return `${row}${col}`;
    });

    const finalSlots = {};
    ELISA_REAGENTS.forEach((r) => {
      if (plan.replacements[r.id]) {
        finalSlots[r.id] = finalSlots[plan.replacements[r.id]];
      } else {
        finalSlots[r.id] = plan.slotAssignments[r.id];
      }
    });

    const steps = [];
    let pauseInserted = false;

    ELISA_REAGENTS.forEach((reagent) => {
      const slot = finalSlots[reagent.id];
      if (!slot) return;
      const volume = volumes[reagent.id];
      const incubation = incubations[reagent.id];

      if (plan.replacements[reagent.id] && !pauseInserted) {
        const oldId = plan.replacements[reagent.id];
        steps.push({ id: `step_${Date.now()}_manual_change`, type: 'pause', params: { label: 'Pausa para Cambio de Reactivo', color: '#f59e0b', timed: false, message: `PAUSA: Reemplace '${ELISA_REAGENTS.find((r) => r.id === oldId).name}' con '${reagent.name}'. Luego presione Reanudar.` } });
        pauseInserted = true;
      }

      steps.push({ id: `step_${Date.now()}_${reagent.id}_distribute`, type: 'distribute', params: { label: reagent.label, color: '#bfdbfe', volume, sourceSlot: slot, sourceWells: ['A1'], destSlot: plateSlot, destWells: allWells, pipetteStrategy: 'same_tip' } });

      if (incubation > 0) {
        steps.push({ id: `step_${Date.now()}_${reagent.id}_pause`, type: 'pause', params: { label: `ELISA: Incubación ${reagent.name}`, color: '#e5e7eb', timed: true, minutes: incubation, seconds: 0 } });
      }

      if (reagent.id !== 'stop') {
        steps.push({ id: `step_${Date.now()}_${reagent.id}_aspirate`, type: 'aspirate', params: { label: `ELISA: Aspirar ${reagent.name}`, color: '#fca5a5', volume, sourceSlot: plateSlot, destSlot: wasteSlot, sourceWells: allWells, pipetteStrategy: 'same_tip' } });
        steps.push({ id: `step_${Date.now()}_${reagent.id}_wash`, type: 'wash', params: { label: 'ELISA: Ciclo de Lavado', color: '#ccfbf1', volume: parseFloat(washVolume), sourceSlot: washBufferSlot, destSlot: plateSlot, destWells: allWells, wasteSlot, cycles: parseInt(washRepetitions), pipetteStrategy: 'same_tip' } });
      }
    });

    steps.push({ id: `step_${Date.now()}_elisa_end`, type: 'comment', params: { label: 'Final del Protocolo ELISA', color: '#6b7280', comment: 'Ensayo ELISA finalizado. Proceder a la lectura.' } });

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
    <div className="p-6 max-w-4xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800 flex items-center gap-2">
          <TestTube2 className="w-5 h-5 text-primary-500" />
          Asistente para Ensayo ELISA
        </h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <h4 className="col-span-full font-medium text-surface-700 text-sm">Configuración General y de Lavado</h4>
          <Select label="Placa de Ensayo" name="plateSlot" options={wellPlates} />
          <Select label="Buffer de Lavado" name="washBufferSlot" options={reservoirs} />
          <Select label="Bahía de Desechos" name="wasteSlot" options={all} />
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Volumen de Lavado (µL)</label><input type="number" value={form.washVolume} onChange={(e) => setForm((f) => ({ ...f, washVolume: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
          <div className="mb-3"><label className="block text-sm font-medium text-surface-700 mb-1">Repeticiones por Ciclo</label><input type="number" value={form.washRepetitions} onChange={(e) => setForm((f) => ({ ...f, washRepetitions: e.target.value }))} min={1} required className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" /></div>
        </div>

        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
          <h4 className="font-medium text-surface-700 text-sm">Asignación de Reactivos</h4>
          {Object.keys(plan.replacements).length > 0 && (
            <div className="p-2 bg-warning-50 border-l-4 border-warning-400 text-warning-700 text-sm rounded-r-lg">
              Se necesita cambio manual de reactivos en algunos pasos.
            </div>
          )}
          <div className="space-y-2">
            {ELISA_REAGENTS.map((r, i) => (
              <div key={r.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg text-sm ${i % 2 === 0 ? 'bg-surface-0' : 'bg-surface-50'}`}>
                <div className="col-span-3 font-medium text-surface-800">{r.label}</div>
                <div className="col-span-3 text-xs">
                  {plan.slotAssignments[r.id] ? (
                    <span className="bg-surface-100 px-2 py-1 rounded-md">{deck[plan.slotAssignments[r.id]]?.metadata.displayName} (B{plan.slotAssignments[r.id]})</span>
                  ) : plan.replacements[r.id] ? (
                    <span className="bg-warning-100 text-warning-800 px-2 py-1 rounded-md">Reemplaza: {ELISA_REAGENTS.find((x) => x.id === plan.replacements[r.id])?.name}</span>
                  ) : (
                    <span className="text-surface-400">No disponible</span>
                  )}
                </div>
                <div className="col-span-3">
                  <input type="number" value={volumes[r.id]} onChange={(e) => setVolumes((v) => ({ ...v, [r.id]: e.target.value }))} className="w-full p-1 text-xs border border-surface-300 rounded-md" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={incubations[r.id]} onChange={(e) => setIncubations((v) => ({ ...v, [r.id]: e.target.value }))} className="w-full p-1 text-xs border border-surface-300 rounded-md" />
                </div>
              </div>
            ))}
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

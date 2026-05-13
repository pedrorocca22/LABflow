import { useMemo, useCallback } from 'react';
import { SlidersHorizontal, AlertTriangle, MousePointerClick } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { CheckSquare, Square } from 'lucide-react';

export default function ConfigPanel() {
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const protocolSequence = useLabflowStore((s) => s.protocolSequence);
  const deck = useLabflowStore((s) => s.deck);
  const protocolWarnings = useLabflowStore((s) => s.protocolWarnings);
  const updateStepParams = useLabflowStore((s) => s.updateStepParams);
  const saveStepConfig = useLabflowStore((s) => s.saveStepConfig);
  const setViewingSlotId = useLabflowStore((s) => s.setViewingSlotId);
  const setActiveWellSelectionTarget = useLabflowStore((s) => s.setActiveWellSelectionTarget);
  const activeWellSelectionTarget = useLabflowStore((s) => s.activeWellSelectionTarget);
  const tempSelectedSourceWells = useLabflowStore((s) => s.tempSelectedSourceWells);
  const tempSelectedDestWells = useLabflowStore((s) => s.tempSelectedDestWells);
  const selectAllWells = useLabflowStore((s) => s.selectAllWells);
  const deselectAllWells = useLabflowStore((s) => s.deselectAllWells);

  const activeStep = useMemo(
    () => protocolSequence.find((s) => s.id === activeStepId),
    [protocolSequence, activeStepId]
  );

  const warning = useMemo(
    () => protocolWarnings.find((w) => w.stepId === activeStepId),
    [protocolWarnings, activeStepId]
  );

  const occupiedSlots = useMemo(
    () => Object.entries(deck).filter(([, lw]) => lw !== null).map(([id]) => id),
    [deck]
  );

  const handleChange = useCallback(
    (field, value) => {
      if (!activeStep) return;
      updateStepParams(activeStep.id, (params) => {
        params[field] = value;
      });
    },
    [activeStep, updateStepParams]
  );

  const handleAdvancedChange = useCallback(
    (path, value) => {
      if (!activeStep) return;
      updateStepParams(activeStep.id, (params) => {
        const keys = path.split('.');
        let target = params.advanced;
        for (let i = 0; i < keys.length - 1; i++) {
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
      });
    },
    [activeStep, updateStepParams]
  );

  const openWellSelector = useCallback(
    (type, slotField) => {
      if (!activeStep) return;
      const slotValue = activeStep.params[slotField];
      setViewingSlotId(slotValue || occupiedSlots[0]);
      setActiveWellSelectionTarget(type);
    },
    [activeStep, occupiedSlots, setViewingSlotId, setActiveWellSelectionTarget]
  );

  if (!activeStep) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-surface-100">
          <h2 className="text-xs font-semibold flex items-center gap-2 text-surface-800">
            <SlidersHorizontal className="w-5 h-5 text-primary-500" />
            Configuración de Acción
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-surface-400 p-3">
          <MousePointerClick className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-xs font-medium">Ninguna acción seleccionada</p>
          <p className="text-xs mt-1">Selecciona o añade un paso en la secuencia para configurarlo.</p>
        </div>
      </div>
    );
  }

  const p = activeStep.params;

  const WellSelector = ({ type, label, slotField, wellsValue }) => {
    const slotValue = p[slotField];
    const isActive = activeWellSelectionTarget === type;
    let count = (wellsValue || []).length;
    if (isActive) {
      count = type === 'sourceWells' || type === 'mixWells'
        ? tempSelectedSourceWells.size
        : tempSelectedDestWells.size;
    }
    const labwareForSelection = slotValue ? deck[slotValue] : null;

    return (
      <div className={`p-3 rounded-lg border transition-colors mb-3 ${isActive ? 'border-primary-400 bg-primary-50' : 'border-surface-200'}`}>
        <label className="block text-xs font-medium text-surface-700 mb-1.5">{label}</label>
        <select
          value={slotValue || ''}
          onChange={(e) => handleChange(slotField, e.target.value)}
          className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none mb-1.5"
        >
          <option value="">Seleccionar bahía...</option>
          {occupiedSlots.map((sid) => (
            <option key={sid} value={sid}>
              {deck[sid]?.metadata.displayName} (B{sid})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => openWellSelector(type, slotField)}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
            isActive
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-surface-100 text-surface-800 hover:bg-surface-200'
          }`}
        >
          Seleccionar Pocillos ({count})
        </button>
        {isActive && labwareForSelection?.grid && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => selectAllWells(labwareForSelection.grid.rows, labwareForSelection.grid.columns)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-semibold bg-surface-100 hover:bg-surface-200 text-surface-700 transition-colors"
            >
              <CheckSquare className="w-3 h-3" />
              Todos
            </button>
            <button
              type="button"
              onClick={deselectAllWells}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-semibold bg-surface-100 hover:bg-surface-200 text-surface-700 transition-colors"
            >
              <Square className="w-3 h-3" />
              Ninguno
            </button>
          </div>
        )}
      </div>
    );
  };

  const Input = ({ label, type = 'text', field, value, ...props }) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-surface-700 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => handleChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
        {...props}
      />
    </div>
  );

  const Select = ({ label, field, value, options }) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-surface-700 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-surface-100 shrink-0">
        <h2 className="text-xs font-semibold flex items-center gap-2 text-surface-800 capitalize">
          <SlidersHorizontal className="w-5 h-5 text-primary-500" />
          Configuración: {activeStep.type}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {warning && (
          <div className="mb-3 p-2 bg-warning-50 border-l-4 border-warning-500 text-warning-600 text-sm rounded-r-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Advertencia</p>
                <p>{warning.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-surface-700 mb-1">Etiqueta</label>
          <input
            type="text"
            value={p.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
          />
        </div>

        {activeStep.type === 'comment' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-surface-700 mb-1">Texto del Comentario</label>
            <textarea
              value={p.comment || ''}
              onChange={(e) => handleChange('comment', e.target.value)}
              rows={5}
              className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none resize-none"
            />
          </div>
        )}

        {activeStep.type === 'pause' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
              <span className="text-xs font-medium text-surface-700">Pausa Temporizada</span>
              <button
                type="button"
                onClick={() => handleChange('timed', !p.timed)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.timed ? 'bg-primary-600' : 'bg-surface-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.timed ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {p.timed ? (
              <div className="flex gap-3">
                <Input label="Minutos" type="number" field="minutes" value={p.minutes} min={0} />
                <Input label="Segundos" type="number" field="seconds" value={p.seconds} min={0} max={59} />
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-xs font-medium text-surface-700 mb-1">Mensaje de Pausa Manual</label>
                <input
                  type="text"
                  value={p.message || ''}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                />
              </div>
            )}
          </div>
        )}

        {activeStep.type === 'mix' && (
          <>
            <WellSelector type="mixWells" label="Ubicación" slotField="mixSlot" wellsValue={p.mixWells} />
            <Input label="Repeticiones" type="number" field="repetitions" value={p.repetitions} min={1} step={1} />
            <Input label="Volumen de Mezcla (µL)" type="number" field="volume" value={p.volume} min={1} step={0.1} />
            <Input label="Flow Rate (µL/s)" type="number" field="flowrate" value={p.flowrate} placeholder="150" />
          </>
        )}

        {activeStep.type === 'aspirate' && (
          <>
            <Input label="Volumen a Aspirar (µL)" type="number" field="volume" value={p.volume} min={0.1} step={0.1} />
            <WellSelector type="sourceWells" label="Origen" slotField="sourceSlot" wellsValue={p.sourceWells} />
            <div className="mb-3">
              <label className="block text-xs font-medium text-surface-700 mb-1">Bahía de Desecho</label>
              <select
                value={p.destSlot || ''}
                onChange={(e) => handleChange('destSlot', e.target.value)}
                className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              >
                <option value="">Seleccionar bahía...</option>
                {occupiedSlots.map((sid) => (
                  <option key={sid} value={sid}>{deck[sid]?.metadata.displayName} (B{sid})</option>
                ))}
              </select>
            </div>
            <Select
              label="Estrategia de Pipeteo"
              field="pipetteStrategy"
              value={p.pipetteStrategy}
              options={[{ label: 'Misma punta', value: 'same_tip' }, { label: 'Punta nueva por pocillo', value: 'new_tip' }]}
            />
          </>
        )}

        {['transfer', 'distribute', 'consolidate', 'wash'].includes(activeStep.type) && (
          <>
            <Input label="Volumen (µL)" type="number" field="volume" value={p.volume} min={0.1} step={0.1} />
            <Input label="Flow Rate (µL/s)" type="number" field="flowrate" value={p.flowrate || 100} placeholder="Min: 25, Max: 300" />
            <WellSelector type="sourceWells" label="Origen" slotField="sourceSlot" wellsValue={p.sourceWells} />
            <WellSelector type="destWells" label="Destino" slotField="destSlot" wellsValue={p.destWells} />
            <Select
              label="Estrategia de Pipeteo"
              field="pipetteStrategy"
              value={p.pipetteStrategy}
              options={[{ label: 'Misma punta', value: 'same_tip' }, { label: 'Punta nueva por pocillo', value: 'new_tip' }]}
            />

            {activeStep.type === 'wash' && (
              <>
                <Input label="Ciclos" type="number" field="cycles" value={p.cycles} min={1} step={1} />
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-700 mb-1">Bahía de Desecho</label>
                  <select
                    value={p.wasteSlot || ''}
                    onChange={(e) => handleChange('wasteSlot', e.target.value)}
                    className="w-full py-1 px-2 text-xs border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                  >
                    <option value="">Seleccionar bahía...</option>
                    {occupiedSlots.map((sid) => (
                      <option key={sid} value={sid}>{deck[sid]?.metadata.displayName} (B{sid})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Advanced options */}
            <div className="mt-4 pt-4 border-t border-surface-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-surface-700">Opciones Avanzadas</span>
                <button
                  type="button"
                  onClick={() => handleAdvancedChange('enabled', !p.advanced?.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.advanced?.enabled ? 'bg-primary-600' : 'bg-surface-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.advanced?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {p.advanced?.enabled && (
                <div className="space-y-3 p-3 bg-surface-50 rounded-lg">
                  {['mix', 'airgap', 'blowout'].map((opt) => (
                    <div key={opt}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{opt === 'airgap' ? 'Air Gap' : opt}</span>
                        <input
                          type="checkbox"
                          checked={p.advanced[opt]?.enabled || false}
                          onChange={(e) => handleAdvancedChange(`${opt}.enabled`, e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        />
                      </div>
                      {p.advanced[opt]?.enabled && (
                        <div className="pl-4 space-y-2">
                          {opt === 'mix' && (
                            <div className="grid grid-cols-3 gap-2">
                              <Input label="Reps" type="number" field="advanced.mix.repetitions" value={p.advanced.mix.repetitions} />
                              <Input label="Vol (µL)" type="number" field="advanced.mix.volume" value={p.advanced.mix.volume} />
                              <Input label="Rate" type="number" field="advanced.mix.flowrate" value={p.advanced.mix.flowrate} />
                            </div>
                          )}
                          {opt === 'airgap' && (
                            <Input label="Volumen (µL)" type="number" field="advanced.airgap.volume" value={p.advanced.airgap.volume} />
                          )}
                          {opt === 'blowout' && (
                            <Input label="Volumen (µL)" type="number" field="advanced.blowout.volume" value={p.advanced.blowout.volume} />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Touch Tip</span>
                    <input
                      type="checkbox"
                      checked={p.advanced?.touchtip || false}
                      onChange={(e) => handleAdvancedChange('touchtip', e.target.checked)}
                      className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-surface-200">
          <button
            onClick={() => saveStepConfig(activeStep.id)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Home, X, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { BAY_COORDINATES, ROW_LABELS } from '@/lib/constants';

export default function CalibrationModal() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const calibrationState = useLabflowStore((s) => s.calibrationState);
  const moveCalibrationJog = useLabflowStore((s) => s.moveCalibrationJog);
  const recordCalibrationPoint = useLabflowStore((s) => s.recordCalibrationPoint);
  const finishCalibration = useLabflowStore((s) => s.finishCalibration);
  const library = useLabflowStore((s) => s.labwareLibrary);
  const [stepSize, setStepSize] = useState(1);

  const labware = library[calibrationState.labwareId];
  if (!labware) return null;

  const { currentStep, pointsToCalibrate, recordedPoints, currentMachinePos, wizardType } = calibrationState;
  const isFinished = currentStep >= pointsToCalibrate.length;

  const handleJog = (axis, dir) => {
    let step = parseFloat(stepSize);
    if (wizardType === 'tipRack' && axis === 'z' && dir === -1 && pointsToCalibrate[currentStep]?.includes('MODO LENTO')) {
      step = 1;
    }
    moveCalibrationJog(axis, step * dir);
  };

  const handleSave = () => {
    if (isFinished) {
      const spacing = parseFloat(document.getElementById('cal-spacing')?.value || labware.wellProperties.spacing || 9);
      const bayCenter = BAY_COORDINATES[calibrationState.bayId];

      let calibrationData;
      if (wizardType === 'wellPlate') {
        const posA1_XY = recordedPoints['Posición XY del pocillo A1'];
        const posA1_Z = recordedPoints['Profundidad Z del pocillo A1'];
        const pos_safeZ = recordedPoints['Altura Z de seguridad'];
        if (!posA1_XY || !posA1_Z || !pos_safeZ) { toast.error('Faltan puntos por calibrar. Completa todos los pasos.'); return; }

        const offsetX_A1 = posA1_XY.x - bayCenter.x;
        const offsetY_A1 = posA1_XY.y - bayCenter.y;
        calibrationData = { z_safe: pos_safeZ.z, z_bottom: posA1_Z.z, wells: {} };
        for (let r = 0; r < labware.grid.rows; r++) {
          for (let c = 0; c < labware.grid.columns; c++) {
            const wellId = `${ROW_LABELS[r]}${c + 1}`;
            calibrationData.wells[wellId] = { dx: offsetX_A1 + (c * spacing), dy: offsetY_A1 + (r * spacing) };
          }
        }
      } else if (wizardType === 'tipRack') {
        const posA1_XY = recordedPoints['Posición XY de la punta A1'];
        const pos_approachZ = recordedPoints['Altura Z de aproximación'];
        const pos_pickupZ = recordedPoints['Profundidad Z de recogida (MODO LENTO)'];
        if (!posA1_XY || !pos_approachZ || !pos_pickupZ) { toast.error('Faltan puntos por calibrar. Completa todos los pasos.'); return; }

        const tipVolume = parseFloat(document.getElementById('cal-tip-vol')?.value || labware.wellProperties.maxVolume || 200);
        const offsetX_A1 = posA1_XY.x - bayCenter.x;
        const offsetY_A1 = posA1_XY.y - bayCenter.y;
        calibrationData = { z_approach: pos_approachZ.z, z_pickup: pos_pickupZ.z, wells: {} };
        for (let r = 0; r < labware.grid.rows; r++) {
          for (let c = 0; c < labware.grid.columns; c++) {
            const wellId = `${ROW_LABELS[r]}${c + 1}`;
            calibrationData.wells[wellId] = { dx: offsetX_A1 + (c * spacing), dy: offsetY_A1 + (r * spacing) };
          }
        }
        labware.wellProperties.maxVolume = tipVolume;
      }

      finishCalibration(calibrationData);
      toast.success(`¡Calibración para "${labware.metadata.displayName}" guardada con éxito!`);
      closeModal();
    } else {
      recordCalibrationPoint();
    }
  };

  return (
    <div className="p-6 max-w-xl w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold text-surface-800">Calibrando: {labware.metadata.displayName}</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100 text-sm text-surface-700">
        {isFinished ? (
          <span><b>Paso final:</b> Confirma los datos y pulsa "Finalizar Calibración".</span>
        ) : (
          <span>
            <b>Paso {currentStep + 1}/{pointsToCalibrate.length}:</b>{' '}
            Mueve el cabezal a <b>{pointsToCalibrate[currentStep]}</b> y pulsa "Guardar Punto".
          </span>
        )}
      </div>

      {isFinished && (
        <div className="mb-4 p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Espaciado entre pocillos (mm)</label>
            <input id="cal-spacing" type="number" defaultValue={labware.wellProperties.spacing || 9} className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" />
          </div>
          {wizardType === 'tipRack' && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Volumen Punta (µL)</label>
              <input id="cal-tip-vol" type="number" defaultValue={labware.wellProperties.maxVolume || 200} className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
            <div />
            <button onClick={() => handleJog('y', 1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
            <div />
            <button onClick={() => handleJog('x', -1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
            <div className="py-2 flex items-center justify-center text-xs font-mono text-surface-600">
              X:{currentMachinePos.x.toFixed(1)}<br/>Y:{currentMachinePos.y.toFixed(1)}<br/>Z:{currentMachinePos.z.toFixed(1)}
            </div>
            <button onClick={() => handleJog('x', 1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ArrowRight className="w-4 h-4" /></button>
            <div />
            <button onClick={() => handleJog('y', -1)} className="py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
            <div />
          </div>
        </div>

        <div className="w-28 space-y-2">
          <button onClick={() => handleJog('z', 1)} className="w-full py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => handleJog('z', -1)} className="w-full py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg shadow-sm transition-colors flex items-center justify-center"><ChevronDown className="w-4 h-4" /></button>
          <div className="pt-1">
            <label className="text-xs font-medium text-surface-600 block mb-1">Paso (mm)</label>
            <select value={stepSize} onChange={(e) => setStepSize(e.target.value)} className="w-full p-1.5 text-sm border border-surface-300 rounded-md bg-white">
              <option value="0.1">0.1</option>
              <option value="1">1</option>
              <option value="10">10</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className={`px-4 py-2 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
            isFinished ? 'bg-primary-600 hover:bg-primary-700' : 'bg-success-600 hover:bg-success-700'
          }`}
        >
          {isFinished ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isFinished ? 'Finalizar Calibración' : 'Guardar Punto'}
        </button>
      </div>
    </div>
  );
}

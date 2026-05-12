import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { BAY_COORDINATES, DEFAULT_LABWARE_LIBRARY, COLOR_PALETTE } from '@/lib/constants';
import { generateProtocolDescription } from '@/lib/protocolUtils';

enableMapSet();

const loadLibrary = () => {
  try {
    const raw = localStorage.getItem('labflow_labwareLibrary');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_LABWARE_LIBRARY));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_LABWARE_LIBRARY));
  }
};

const loadProtocols = () => {
  try {
    const raw = localStorage.getItem('labflow_savedProtocols');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const initialState = {
  deck: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  protocolSequence: [],
  activeStepId: null,
  activeTab: 'workflow',
  modal: null,
  modalSlotId: null,
  viewingSlotId: null,
  tempSelectedSourceWells: new Set(),
  tempSelectedDestWells: new Set(),
  activeWellSelectionTarget: null,
  dragSelection: { isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 },
  history: [],
  historyIndex: -1,
  protocolWarnings: [],
  wizardAssayWells: new Set(),
  wizardControlWells: new Set(),
  calibrationState: {
    active: false,
    wizardType: null,
    labwareId: null,
    bayId: null,
    currentStep: 0,
    pointsToCalibrate: [],
    recordedPoints: {},
    currentMachinePos: { x: 50, y: 50, z: 100 },
  },
  labwareLibrary: loadLibrary(),
  savedProtocols: loadProtocols(),
  labwareIdToDelete: null,
  labwareIdToEdit: null,
  protocolNameToDelete: null,
  klipper: {
    status: 'disconnected',
    ip: localStorage.getItem('klipperIp') || '',
    logs: [],
    queue: [],
    isProcessingQueue: false,
    error: null,
  },
};

function getInitialHistory() {
  return [
    {
      deck: JSON.parse(JSON.stringify(initialState.deck)),
      protocolSequence: JSON.parse(JSON.stringify(initialState.protocolSequence)),
    },
  ];
}

function saveLibrary(library) {
  localStorage.setItem('labflow_labwareLibrary', JSON.stringify(library));
}

function saveProtocolsStore(protocols) {
  localStorage.setItem('labflow_savedProtocols', JSON.stringify(protocols));
}

function validateVolume(state) {
  const warnings = [];
  const allWellVolumes = new Map();

  state.protocolSequence.forEach((step) => {
    const { type, params } = step;
    const volumeToTransfer = parseFloat(params.volume) || 0;

    if (['transfer', 'distribute', 'consolidate', 'wash', 'mix', 'aspirate'].includes(type)) {
      const sourceSlot = params.sourceSlot || params.mixSlot;
      const sourceWells = params.sourceWells || params.mixWells || [];

      if (sourceSlot && sourceWells.length > 0) {
        const sourceLabware = state.deck[sourceSlot];
        if (sourceLabware && !sourceLabware.metadata.isSource) {
          sourceWells.forEach((wellId) => {
            const wellKey = `${sourceSlot}-${wellId}`;
            let currentVolume = allWellVolumes.get(wellKey) || 0;
            if (type !== 'aspirate' && currentVolume < volumeToTransfer) {
              warnings.push({
                stepId: step.id,
                message: `Se intentan aspirar ${volumeToTransfer}µL del pocillo ${wellId} (Bahía ${sourceSlot}), pero solo contiene ${currentVolume.toFixed(1)}µL.`,
              });
            }
            allWellVolumes.set(wellKey, Math.max(0, currentVolume - volumeToTransfer));
          });
        }
      }
    }

    if (['transfer', 'distribute', 'consolidate', 'wash'].includes(type)) {
      const destSlot = params.destSlot;
      const destWells = params.destWells || [];
      const labwareInDest = state.deck[destSlot];

      if (destSlot && destWells.length > 0 && labwareInDest) {
        const maxVolume = labwareInDest.wellProperties.maxVolume;

        if (type === 'wash') {
          destWells.forEach((wellId) => {
            const wellKey = `${destSlot}-${wellId}`;
            allWellVolumes.set(wellKey, 0);
          });
        }

        destWells.forEach((wellId) => {
          const wellKey = `${destSlot}-${wellId}`;
          let currentVolume = allWellVolumes.get(wellKey) || 0;
          if (currentVolume + volumeToTransfer > maxVolume) {
            warnings.push({
              stepId: step.id,
              message: `Se superará el volumen máximo en el pocillo ${wellId} (Bahía ${destSlot}). Capacidad: ${maxVolume}µL, se intentan añadir ${volumeToTransfer}µL a los ${currentVolume.toFixed(1)}µL existentes.`,
            });
          }
          allWellVolumes.set(wellKey, currentVolume + volumeToTransfer);
        });

        if (type === 'wash') {
          destWells.forEach((wellId) => {
            const wellKey = `${destSlot}-${wellId}`;
            allWellVolumes.set(wellKey, 0);
          });
        }
      }
    }
  });

  return warnings;
}

export const useLabflowStore = create(
  immer((set, get) => ({
    ...initialState,
    history: getInitialHistory(),
    historyIndex: 0,

    // ---------- UI ----------
    setActiveTab: (tab) => set({ activeTab: tab }),
    openModal: (modal, extra = {}) =>
      set((state) => {
        state.modal = modal;
        Object.assign(state, extra);
      }),
    closeModal: () =>
      set((state) => {
        if (state.calibrationState.active) {
          state.calibrationState = {
            active: false,
            wizardType: null,
            labwareId: null,
            bayId: null,
            currentStep: 0,
            pointsToCalibrate: [],
            recordedPoints: {},
            currentMachinePos: { x: 50, y: 50, z: 100 },
          };
        }
        if (state.activeStepId === 'wizardSelection') {
          state.activeStepId = null;
          state.activeWellSelectionTarget = null;
          state.tempSelectedSourceWells.clear();
          state.tempSelectedDestWells.clear();
        }
        state.modal = null;
      }),
    setViewingSlotId: (id) => set({ viewingSlotId: id }),
    setActiveWellSelectionTarget: (target) => set({ activeWellSelectionTarget: target }),
    toggleSourceWell: (wellId) =>
      set((state) => {
        const set = state.tempSelectedSourceWells;
        if (set.has(wellId)) set.delete(wellId);
        else set.add(wellId);
      }),
    toggleDestWell: (wellId) =>
      set((state) => {
        const set = state.tempSelectedDestWells;
        if (set.has(wellId)) set.delete(wellId);
        else set.add(wellId);
      }),
    selectAllWells: (rows, cols) =>
      set((state) => {
        const target = state.activeWellSelectionTarget;
        if (!target) return;
        const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wellId = `${rowLabels[r]}${c + 1}`;
            if (target === 'sourceWells' || target === 'mixWells') state.tempSelectedSourceWells.add(wellId);
            else state.tempSelectedDestWells.add(wellId);
          }
        }
      }),
    deselectAllWells: () =>
      set((state) => {
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
      }),
    setDragSelection: (payload) =>
      set((state) => {
        Object.assign(state.dragSelection, payload);
      }),

    // ---------- Deck ----------
    placeLabware: (slotId, labwareId) =>
      set((state) => {
        const labware = state.labwareLibrary[labwareId];
        if (labware) {
          state.deck[slotId] = JSON.parse(JSON.stringify(labware));
          get().pushHistory();
        }
      }),
    removeLabware: (slotId) =>
      set((state) => {
        state.deck[slotId] = null;
        if (state.viewingSlotId === slotId) state.viewingSlotId = null;
        get().pushHistory();
      }),

    // ---------- Protocol Sequence ----------
    addStep: (type) =>
      set((state) => {
        const color = COLOR_PALETTE[state.protocolSequence.length % COLOR_PALETTE.length];
        const newStep = { id: `step_${Date.now()}`, type, params: {} };
        let baseParams = { label: `${type.charAt(0).toUpperCase() + type.slice(1)}`, color };

        if (type === 'comment') {
          baseParams.comment = '';
        } else if (type === 'pause') {
          baseParams.timed = false;
          baseParams.minutes = 0;
          baseParams.seconds = 30;
          baseParams.message = 'Pausa. Presione Reanudar para continuar.';
        } else if (type === 'mix') {
          baseParams.mixSlot = null;
          baseParams.mixWells = [];
          baseParams.repetitions = 10;
          baseParams.volume = 50;
          baseParams.flowrate = 150;
        } else if (type === 'aspirate') {
          baseParams.label = 'Aspirar (Vaciar)';
          baseParams.color = '#f87171';
          baseParams.volume = 100;
          baseParams.sourceSlot = null;
          baseParams.destSlot = null;
          baseParams.sourceWells = [];
          baseParams.pipetteStrategy = 'same_tip';
        } else {
          baseParams.volume = 50;
          baseParams.sourceSlot = null;
          baseParams.destSlot = null;
          baseParams.sourceWells = [];
          baseParams.destWells = [];
          baseParams.pipetteStrategy = 'same_tip';

          if (['transfer', 'distribute', 'consolidate', 'wash'].includes(type)) {
            baseParams.flowrate = 100;
            baseParams.advanced = {
              enabled: false,
              mix: { enabled: false, repetitions: 3, volume: 50, flowrate: 150 },
              airgap: { enabled: false, volume: 5 },
              blowout: { enabled: false, volume: 10 },
              touchtip: false,
            };
          }
          if (type === 'wash') {
            baseParams.wasteSlot = null;
            baseParams.cycles = 3;
          }
        }

        newStep.params = baseParams;
        state.protocolSequence.push(newStep);
        get().selectStep(newStep.id);
        get().pushHistory();
      }),
    deleteStep: (stepId) =>
      set((state) => {
        state.protocolSequence = state.protocolSequence.filter((s) => s.id !== stepId);
        if (state.activeStepId === stepId) {
          state.activeStepId = null;
          state.viewingSlotId = null;
          state.tempSelectedSourceWells.clear();
          state.tempSelectedDestWells.clear();
          state.activeWellSelectionTarget = null;
        }
        get().pushHistory();
      }),
    cloneStep: (stepId) =>
      set((state) => {
        const idx = state.protocolSequence.findIndex((s) => s.id === stepId);
        if (idx === -1) return;
        const cloned = JSON.parse(JSON.stringify(state.protocolSequence[idx]));
        cloned.id = `step_${Date.now()}`;
        cloned.params.label = `${cloned.params.label} (Copia)`;
        state.protocolSequence.splice(idx + 1, 0, cloned);
        get().pushHistory();
      }),
    moveStep: (draggedId, targetId) =>
      set((state) => {
        const draggedIdx = state.protocolSequence.findIndex((s) => s.id === draggedId);
        const targetIdx = state.protocolSequence.findIndex((s) => s.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;
        const [item] = state.protocolSequence.splice(draggedIdx, 1);
        state.protocolSequence.splice(targetIdx, 0, item);
        get().pushHistory();
      }),
    selectStep: (stepId) =>
      set((state) => {
        const isSame = state.activeStepId === stepId;
        state.activeStepId = isSame ? null : stepId;
        const activeStep = state.protocolSequence.find((s) => s.id === state.activeStepId);
        if (activeStep) {
          state.tempSelectedSourceWells = new Set(
            activeStep.params.sourceWells || activeStep.params.mixWells || []
          );
          state.tempSelectedDestWells = new Set(activeStep.params.destWells || []);
          state.activeWellSelectionTarget = activeStep.params.mixWells ? 'mixWells' : 'sourceWells';
          state.viewingSlotId = activeStep.params.sourceSlot || activeStep.params.mixSlot || null;
        } else {
          state.viewingSlotId = null;
          state.tempSelectedSourceWells.clear();
          state.tempSelectedDestWells.clear();
          state.activeWellSelectionTarget = null;
        }
      }),
    updateStepParams: (stepId, updater) =>
      set((state) => {
        const step = state.protocolSequence.find((s) => s.id === stepId);
        if (!step) return;
        updater(step.params);
        state.protocolWarnings = validateVolume(state);
      }),
    saveStepConfig: (stepId) =>
      set((state) => {
        const step = state.protocolSequence.find((s) => s.id === stepId);
        if (!step) return;
        if (step.type === 'mix') {
          step.params.mixWells = Array.from(state.tempSelectedSourceWells);
        } else if (step.type !== 'comment' && step.type !== 'pause') {
          step.params.sourceWells = Array.from(state.tempSelectedSourceWells);
          step.params.destWells = Array.from(state.tempSelectedDestWells);
        }
        get().pushHistory();
      }),
    clearProtocol: () =>
      set((state) => {
        state.protocolSequence = [];
        state.activeStepId = null;
        state.viewingSlotId = null;
        get().pushHistory();
      }),
    addWizardSteps: (steps) =>
      set((state) => {
        steps.forEach((s) => {
          if (!s.id) s.id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        });
        state.protocolSequence.push(...steps);
        state.wizardAssayWells.clear();
        state.wizardControlWells.clear();
        get().pushHistory();
      }),

    // ---------- History ----------
    pushHistory: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        const snapshot = {
          deck: JSON.parse(JSON.stringify(state.deck)),
          protocolSequence: JSON.parse(JSON.stringify(state.protocolSequence)),
        };
        const last = state.history[state.history.length - 1];
        if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;
        state.history.push(snapshot);
        state.historyIndex = state.history.length - 1;
        state.protocolWarnings = validateVolume(state);
      }),
    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          const prev = state.history[state.historyIndex];
          state.deck = JSON.parse(JSON.stringify(prev.deck));
          state.protocolSequence = JSON.parse(JSON.stringify(prev.protocolSequence));
          state.protocolWarnings = validateVolume(state);
        }
      }),
    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          const next = state.history[state.historyIndex];
          state.deck = JSON.parse(JSON.stringify(next.deck));
          state.protocolSequence = JSON.parse(JSON.stringify(next.protocolSequence));
          state.protocolWarnings = validateVolume(state);
        }
      }),
    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // ---------- Library ----------
    addLabware: (labwareData, editId = null) =>
      set((state) => {
        if (editId && state.labwareLibrary[editId]) {
          const existing = state.labwareLibrary[editId];
          if (existing.calibration) labwareData.calibration = existing.calibration;
          state.labwareLibrary[editId] = labwareData;
        } else {
          const id = `${labwareData.metadata.brand || 'custom'}_${labwareData.metadata.displayName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`.replace(/[^a-z0-9_]/g, '');
          state.labwareLibrary[id] = labwareData;
        }
        saveLibrary(state.labwareLibrary);
      }),
    deleteLabwareFromLibrary: (labwareId) =>
      set((state) => {
        delete state.labwareLibrary[labwareId];
        saveLibrary(state.labwareLibrary);
      }),
    saveProtocol: (name, author) =>
      set((state) => {
        state.savedProtocols[name] = {
          title: name,
          author,
          date: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          details: generateProtocolDescription(state.protocolSequence, state.deck),
          deck: JSON.parse(JSON.stringify(state.deck)),
          sequence: JSON.parse(JSON.stringify(state.protocolSequence)),
        };
        saveProtocolsStore(state.savedProtocols);
      }),
    loadProtocol: (name) =>
      set((state) => {
        const protocol = state.savedProtocols[name];
        if (!protocol) return;
        state.deck = JSON.parse(JSON.stringify(protocol.deck));
        state.protocolSequence = JSON.parse(JSON.stringify(protocol.sequence));
        state.activeStepId = null;
        state.viewingSlotId = null;
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
        state.activeWellSelectionTarget = null;
        state.activeTab = 'workflow';
        get().pushHistory();
      }),
    deleteProtocol: (name) =>
      set((state) => {
        delete state.savedProtocols[name];
        saveProtocolsStore(state.savedProtocols);
      }),

    // ---------- Calibration ----------
    startCalibration: (labwareId, bayId, wizardType, pointsToCalibrate) =>
      set((state) => {
        state.calibrationState = {
          active: true,
          wizardType,
          labwareId,
          bayId,
          currentStep: 0,
          pointsToCalibrate,
          recordedPoints: {},
          currentMachinePos: { x: 50, y: 50, z: 100 },
        };
      }),
    recordCalibrationPoint: () =>
      set((state) => {
        const cs = state.calibrationState;
        const pointName = cs.pointsToCalibrate[cs.currentStep];
        if (pointName) {
          cs.recordedPoints[pointName] = { ...cs.currentMachinePos };
          cs.currentStep++;
        }
      }),
    moveCalibrationJog: (axis, delta) =>
      set((state) => {
        state.calibrationState.currentMachinePos[axis] += delta;
      }),
    finishCalibration: (calibrationData) =>
      set((state) => {
        const { labwareId } = state.calibrationState;
        if (labwareId && state.labwareLibrary[labwareId]) {
          state.labwareLibrary[labwareId].calibration = calibrationData;
          saveLibrary(state.labwareLibrary);
        }
        state.calibrationState.active = false;
      }),

    // ---------- Klipper ----------
    setKlipperStatus: (status, error = null) =>
      set((state) => {
        state.klipper.status = status;
        if (error) state.klipper.error = error;
      }),
    setKlipperIp: (ip) =>
      set((state) => {
        state.klipper.ip = ip;
        localStorage.setItem('klipperIp', ip);
      }),
    addKlipperLog: (message, type = 'info') =>
      set((state) => {
        state.klipper.logs.push({ message, type, time: new Date().toLocaleTimeString() });
        if (state.klipper.logs.length > 200) state.klipper.logs.shift();
      }),
    clearKlipperLogs: () =>
      set((state) => {
        state.klipper.logs = [];
      }),
    addToKlipperQueue: (commands) =>
      set((state) => {
        const arr = Array.isArray(commands) ? commands : [commands];
        state.klipper.queue.push(...arr.filter((c) => c && c.trim()));
      }),
    shiftKlipperQueue: () =>
      set((state) => {
        return state.klipper.queue.shift();
      }),
    setProcessingQueue: (val) =>
      set((state) => {
        state.klipper.isProcessingQueue = val;
      }),
  }))
);

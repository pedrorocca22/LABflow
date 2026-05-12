import { state, dom, activeLabwareLibrary, savedProtocols, DEFAULT_LABWARE_LIBRARY, COLOR_PALETTE, setActiveLabwareLibrary, setSavedProtocols } from './state.js';
import { renderAll, renderModals, renderLabwareLibrary, renderProtocolGallery, renderTabs, renderLabwareSelectionModal, updateUndoRedoButtons, populateWizardSelectors, populateElisaWizard, populateAlamarBlueWizard } from './ui.js';
import { startCalibration } from './calibration.js';

// --- Funciones de Historial (Undo/Redo) ---

export function saveStateToHistory() {
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }
    const currentState = {
        deck: JSON.parse(JSON.stringify(state.deck)),
        protocolSequence: JSON.parse(JSON.stringify(state.protocolSequence))
    };
    if (state.historyIndex > -1 && JSON.stringify(currentState) === JSON.stringify(state.history[state.historyIndex])) {
        return;
    }
    state.history.push(currentState);
    state.historyIndex = state.history.length - 1;
    validateProtocol();
    updateUndoRedoButtons();
}

export function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const previousState = state.history[state.historyIndex];
        state.deck = JSON.parse(JSON.stringify(previousState.deck));
        state.protocolSequence = JSON.parse(JSON.stringify(previousState.protocolSequence));
        validateProtocol();
        renderAll();
    }
}

export function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const nextState = state.history[state.historyIndex];
        state.deck = JSON.parse(JSON.stringify(nextState.deck));
        state.protocolSequence = JSON.parse(JSON.stringify(nextState.protocolSequence));
        validateProtocol();
        renderAll();
    }
}

// --- Sistema de Advertencias ---
function validateProtocol() {
    state.protocolWarnings = []; 
    validateVolume();
}

function validateVolume() {
    const allWellVolumes = new Map();

    state.protocolSequence.forEach(step => {
        const { type, params } = step;
        const volumeToTransfer = parseFloat(params.volume) || 0;

        if (['transfer', 'distribute', 'consolidate', 'wash', 'mix', 'aspirate'].includes(type)) {
            const sourceSlot = params.sourceSlot || params.mixSlot;
            const sourceWells = params.sourceWells || params.mixWells || [];

            if (sourceSlot && sourceWells.length > 0) {
                const sourceLabware = state.deck[sourceSlot];
                if (sourceLabware && sourceLabware.metadata.isSource) {
                    // No validar
                } else {
                    sourceWells.forEach(wellId => {
                        const wellKey = `${sourceSlot}-${wellId}`;
                        let currentVolume = allWellVolumes.get(wellKey) || 0;
                        
                        if (type !== 'aspirate' && currentVolume < volumeToTransfer) {
                            state.protocolWarnings.push({
                                stepId: step.id,
                                message: `Se intentan aspirar ${volumeToTransfer}µL del pocillo ${wellId} (Bahía ${sourceSlot}), pero solo contiene ${currentVolume.toFixed(1)}µL.`
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
                    destWells.forEach(wellId => {
                        const wellKey = `${destSlot}-${wellId}`;
                        allWellVolumes.set(wellKey, 0); 
                    });
                }

                destWells.forEach(wellId => {
                    const wellKey = `${destSlot}-${wellId}`;
                    let currentVolume = allWellVolumes.get(wellKey) || 0;
                    
                    if (currentVolume + volumeToTransfer > maxVolume) {
                        state.protocolWarnings.push({
                            stepId: step.id,
                            message: `Se superará el volumen máximo en el pocillo ${wellId} (Bahía ${destSlot}). Capacidad: ${maxVolume}µL, se intentan añadir ${volumeToTransfer}µL a los ${currentVolume.toFixed(1)}µL existentes.`
                        });
                    }
                    allWellVolumes.set(wellKey, currentVolume + volumeToTransfer);
                });

                if (type === 'wash') {
                    destWells.forEach(wellId => {
                        const wellKey = `${destSlot}-${wellId}`;
                        allWellVolumes.set(wellKey, 0);
                    });
                }
            }
        }
    });
}


// --- Funciones de Persistencia (localStorage) ---
export function saveLabwareLibrary() { localStorage.setItem('labflow_labwareLibrary', JSON.stringify(activeLabwareLibrary)); }
export function loadLabwareLibrary() {
    const saved = localStorage.getItem('labflow_labwareLibrary');
    setActiveLabwareLibrary(saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_LABWARE_LIBRARY)));
}
export function saveProtocols() { localStorage.setItem('labflow_savedProtocols', JSON.stringify(savedProtocols)); }
export function loadProtocols() {
    const saved = localStorage.getItem('labflow_savedProtocols');
    setSavedProtocols(saved ? JSON.parse(saved) : {});
}

// --- Event Handlers ---
export function handleClearProtocol() {
    if (state.protocolSequence.length > 0) {
        if (confirm("¿Estás seguro de que quieres eliminar todos los pasos del protocolo actual?")) {
            state.protocolSequence = [];
            state.activeStepId = null;
            state.viewingSlotId = null;
            saveStateToHistory();
            renderAll();
        }
    }
}

export function handleTabClick(event) {
    event.preventDefault();
    const tabId = event.currentTarget.id;
    if (tabId === 'tab-workflow') state.activeTab = 'workflow';
    else if (tabId === 'tab-labware') state.activeTab = 'labware';
    else if (tabId === 'tab-gallery') state.activeTab = 'gallery';
    else if (tabId === 'tab-control') state.activeTab = 'control';
    renderTabs();
}

export function handleDeckEvent(event) {
    const deleteBtn = event.target.closest('.delete-labware-btn');
    const clickedSlot = event.target.closest('.deck-slot');
    if (deleteBtn) {
        handleDeleteLabware(deleteBtn.dataset.slotId);
    } else if (clickedSlot) {
        state.modalSlotId = clickedSlot.dataset.slotId;
        renderLabwareSelectionModal(); 
        state.modal = 'labware';
        renderModals();
    }
}

function performWellClick(wellElement) {
    if (!wellElement) return;
    const isWizardSelection = state.activeStepId === 'wizardSelection';
    const activeStep = !isWizardSelection ? state.protocolSequence.find(s => s.id === state.activeStepId) : true;
    
    if (!activeStep || !state.activeWellSelectionTarget) return;

    const wellId = wellElement.dataset.wellId;
    const targetSet = state.activeWellSelectionTarget === 'sourceWells' || state.activeWellSelectionTarget === 'mixWells'
        ? state.tempSelectedSourceWells 
        : state.tempSelectedDestWells;
    
    if (!targetSet.has(wellId)) {
        if (!isWizardSelection && activeStep.type === 'distribute' && state.activeWellSelectionTarget === 'sourceWells' && targetSet.size > 0) return;
        if (!isWizardSelection && activeStep.type === 'consolidate' && state.activeWellSelectionTarget === 'destWells' && targetSet.size > 0) return;
        targetSet.add(wellId);
    } else {
        targetSet.delete(wellId);
    }
    renderAll();
}

function getMousePosition(svg, event) {
    const ctm = svg.getScreenCTM();
    return {
        x: (event.clientX - ctm.e) / ctm.a,
        y: (event.clientY - ctm.f) / ctm.d
    };
}

export function handleMouseDown(event) {
    const svg = event.currentTarget;
    const pos = getMousePosition(svg, event);
    
    state.dragSelection.startX = pos.x;
    state.dragSelection.startY = pos.y;
    state.dragSelection.endX = pos.x;
    state.dragSelection.endY = pos.y;
    state.dragSelection.isActive = true;

    const selectionRect = svg.querySelector('#selection-rect');
    selectionRect.setAttribute('x', pos.x);
    selectionRect.setAttribute('y', pos.y);
    selectionRect.setAttribute('width', 0);
    selectionRect.setAttribute('height', 0);
    selectionRect.setAttribute('visibility', 'visible');
    
    event.preventDefault();
}

export function handleMouseMove(event) {
    if (!state.dragSelection.isActive) return;

    const svg = event.currentTarget;
    const pos = getMousePosition(svg, event);
    state.dragSelection.endX = pos.x;
    state.dragSelection.endY = pos.y;

    const selectionRect = svg.querySelector('#selection-rect');
    
    const x = Math.min(state.dragSelection.startX, state.dragSelection.endX);
    const y = Math.min(state.dragSelection.startY, state.dragSelection.endY);
    const width = Math.abs(state.dragSelection.startX - state.dragSelection.endX);
    const height = Math.abs(state.dragSelection.startY - state.dragSelection.endY);

    selectionRect.setAttribute('x', x);
    selectionRect.setAttribute('y', y);
    selectionRect.setAttribute('width', width);
    selectionRect.setAttribute('height', height);
}

export function handleMouseUp(event) {
    if (!state.dragSelection.isActive) return;

    const svg = dom.labwareDetailView.querySelector('.labware-svg');
    if (!svg) {
        state.dragSelection.isActive = false;
        return;
    }

    const selectionRectElem = svg.querySelector('#selection-rect');
    selectionRectElem.setAttribute('visibility', 'hidden');

    const dx = Math.abs(state.dragSelection.endX - state.dragSelection.startX);
    const dy = Math.abs(state.dragSelection.endY - state.dragSelection.startY);

    if (dx < 5 && dy < 5) {
        const well = event.target.closest('.well');
        performWellClick(well);
    } else {
        const isWizardSelection = state.activeStepId === 'wizardSelection';
        const activeStep = !isWizardSelection ? state.protocolSequence.find(s => s.id === state.activeStepId) : true;

        if (activeStep && state.activeWellSelectionTarget) {
            const targetSet = state.activeWellSelectionTarget === 'sourceWells' || state.activeWellSelectionTarget === 'mixWells'
                ? state.tempSelectedSourceWells 
                : state.tempSelectedDestWells;
            const rect = {
                x: parseFloat(selectionRectElem.getAttribute('x')),
                y: parseFloat(selectionRectElem.getAttribute('y')),
                width: parseFloat(selectionRectElem.getAttribute('width')),
                height: parseFloat(selectionRectElem.getAttribute('height'))
            };
            const wells = svg.querySelectorAll('.well');
            wells.forEach(well => {
                const cx = parseFloat(well.getAttribute('cx'));
                const cy = parseFloat(well.getAttribute('cy'));
                if (cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height) {
                    targetSet.add(well.dataset.wellId);
                }
            });
            renderAll();
        }
    }

    state.dragSelection.isActive = false;
}

document.addEventListener('mouseup', handleMouseUp);

export function handleSelectAllWells() {
    const labware = state.deck[state.viewingSlotId];
    if (!labware) return;

    const isWizardSelection = state.activeStepId === 'wizardSelection';
    const activeStep = !isWizardSelection ? state.protocolSequence.find(s => s.id === state.activeStepId) : true;
    if (!activeStep || !state.activeWellSelectionTarget) return;

    const targetSet = state.activeWellSelectionTarget === 'sourceWells' || state.activeWellSelectionTarget === 'mixWells'
        ? state.tempSelectedSourceWells 
        : state.tempSelectedDestWells;
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    for (let r = 0; r < labware.grid.rows; r++) {
        for (let c = 0; c < labware.grid.columns; c++) {
            const wellId = `${rowLabels[r]}${c + 1}`;
            targetSet.add(wellId);
        }
    }
    renderAll();
}

export function handleDeselectAllWells() {
    const isWizardSelection = state.activeStepId === 'wizardSelection';
    const activeStep = !isWizardSelection ? state.protocolSequence.find(s => s.id === state.activeStepId) : true;
    if (!activeStep || !state.activeWellSelectionTarget) return;

    const targetSet = state.activeWellSelectionTarget === 'sourceWells' || state.activeWellSelectionTarget === 'mixWells'
        ? state.tempSelectedSourceWells 
        : state.tempSelectedDestWells;
    targetSet.clear();
    renderAll();
}

export function handleRoutineEvent(event) {
    const card = event.target.closest('.step-card');
    const deleteBtn = event.target.closest('.delete-step-btn');
    const cloneBtn = event.target.closest('.clone-step-btn');

    if (deleteBtn) {
        event.stopPropagation();
        handleDeleteStep(deleteBtn.dataset.stepId);
    } else if (cloneBtn) {
        event.stopPropagation();
        handleCloneStep(cloneBtn.dataset.stepId);
    } else if (card) {
        handleSelectStep(card.dataset.stepId);
    }
}

function handleCloneStep(stepIdToClone) {
    const stepIndex = state.protocolSequence.findIndex(step => step.id === stepIdToClone);
    if (stepIndex === -1) return;

    const originalStep = state.protocolSequence[stepIndex];
    const clonedStep = JSON.parse(JSON.stringify(originalStep));

    clonedStep.id = `step_${Date.now()}`;
    clonedStep.params.label = `${originalStep.params.label} (Copia)`;
    
    state.protocolSequence.splice(stepIndex + 1, 0, clonedStep);

    saveStateToHistory();
    renderAll();
}

export function handleLabwareLibraryClick(event) {
    const deleteBtn = event.target.closest('.delete-labware-lib-btn');
    const editBtn = event.target.closest('.edit-labware-btn');
    const calibrateBtn = event.target.closest('.calibrate-labware-btn');

    if (calibrateBtn) {
        startCalibration(calibrateBtn.dataset.labwareId);
    }
    else if (deleteBtn) {
        const labwareId = deleteBtn.dataset.labwareId;
        const isLabwareInUse = Object.values(state.deck).some(labware => labware && JSON.stringify(labware) === JSON.stringify(activeLabwareLibrary[labwareId]));
        if(isLabwareInUse) {
            alert('No se puede eliminar este elemento porque está actualmente en uso en la Mesa de Trabajo. Por favor, retírelo de la mesa antes de eliminarlo.');
            return;
        }
        state.labwareIdToDelete = labwareId;
        dom.deleteModalTitle.textContent = 'Eliminar Labware';
        dom.deleteModalText.textContent = '¿Estás seguro de que quieres eliminar este elemento? Esta acción es definitiva.';
        state.modal = 'deleteConfirm';
        renderModals();
    }
    else if(editBtn) {
        openAddEditModal(editBtn.dataset.labwareId);
    }
}

export function handleProtocolGalleryClick(event) {
    const loadBtn = event.target.closest('.load-protocol-btn');
    const deleteBtn = event.target.closest('.delete-protocol-btn');
    const toggleBtn = event.target.closest('.toggle-log-btn');

    if (loadBtn) {
        const protocolName = loadBtn.dataset.protocolName;
        if (confirm(`¿Seguro que quieres cargar "${protocolName}"? Se sobrescribirá el workflow actual.`)) {
            loadProtocol(protocolName);
        }
    }
    if (deleteBtn) {
        state.protocolNameToDelete = deleteBtn.dataset.protocolName;
        dom.deleteModalTitle.textContent = 'Eliminar Protocolo';
        dom.deleteModalText.textContent = `¿Estás seguro de que quieres eliminar "${state.protocolNameToDelete}"? Esta acción es definitiva.`;
        state.modal = 'deleteConfirm';
        renderModals();
    }
    if (toggleBtn) {
        const protocolName = toggleBtn.dataset.protocolName;
        const logContainer = document.getElementById(`log-container-${protocolName}`);
        if (logContainer) {
            logContainer.classList.toggle('hidden');
            const icon = toggleBtn.querySelector('i');
            const text = toggleBtn.querySelector('span > span');
            if (logContainer.classList.contains('hidden')) {
                text.textContent = 'Movimientos';
                icon.setAttribute('data-lucide', 'list-tree');
            } else {
                text.textContent = 'Ocultar';
                icon.setAttribute('data-lucide', 'chevron-up');
            }
            lucide.createIcons();
        }
    }
}

export function handleSelectStep(stepId) {
    state.activeStepId = (state.activeStepId === stepId) ? null : stepId;
    const activeStep = state.protocolSequence.find(s => s.id === state.activeStepId);
    if (activeStep) {
        state.tempSelectedSourceWells = new Set(activeStep.params.sourceWells || activeStep.params.mixWells || []);
        state.tempSelectedDestWells = new Set(activeStep.params.destWells || []);
        state.activeWellSelectionTarget = activeStep.params.mixWells ? 'mixWells' : 'sourceWells';
        state.viewingSlotId = activeStep.params.sourceSlot || activeStep.params.mixSlot || null;
    } else {
        state.viewingSlotId = null;
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
        state.activeWellSelectionTarget = null;
    }
    renderAll();
}

function handleDeleteStep(stepIdToDelete) {
    state.protocolSequence = state.protocolSequence.filter(step => step.id !== stepIdToDelete);
    if (state.activeStepId === stepIdToDelete) {
        state.activeStepId = null;
        state.viewingSlotId = null;
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
        state.activeWellSelectionTarget = null;
    }
    saveStateToHistory();
    renderAll();
}

export function handleAddLabwareSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dom.addLabwareForm);
    const data = Object.fromEntries(formData.entries());
    
    const isSource = data.displayCategory === 'reservoir' ? true : formData.get('isSource') === 'on';

    const labwareData = {
        metadata: { displayName: data.displayName, displayCategory: data.displayCategory, brand: data.brand, isSource: isSource },
        dimensions: { xDimension: parseFloat(data.xDimension), yDimension: parseFloat(data.yDimension) },
        grid: { rows: parseInt(data.rows, 10), columns: parseInt(data.columns, 10) },
        wellProperties: { diameter: parseFloat(data.diameter), spacing: parseFloat(data.spacing), offset: { x: parseFloat(data.offsetX), y: parseFloat(data.offsetY) }, bottomZ: parseFloat(data.bottomZ), maxVolume: parseFloat(data.maxVolume) }
    };
    if (data.displayCategory === 'wellPlate') labwareData.wellProperties.wellBottomShape = data.wellBottomShape;
    
    if (state.labwareIdToEdit) {
        const existingLabware = activeLabwareLibrary[state.labwareIdToEdit];
        if (existingLabware.calibration) {
            labwareData.calibration = existingLabware.calibration;
        }
        activeLabwareLibrary[state.labwareIdToEdit] = labwareData;
    } else {
        const labwareId = `${data.brand || 'custom'}_${data.displayName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`.replace(/[^a-z0-9_]/g, '');
        activeLabwareLibrary[labwareId] = labwareData;
    }
    saveLabwareLibrary();
    closeModal();
    renderLabwareLibrary();
}

export function handleSaveProtocolSubmit(event) {
    event.preventDefault();
    const protocolName = dom.saveProtocolForm.elements.protocolName.value;
    const authorName = dom.saveProtocolForm.elements.protocolAuthor.value;
    
    if (protocolName && authorName && !savedProtocols[protocolName]) {
        savedProtocols[protocolName] = {
            title: protocolName,
            author: authorName,
            date: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            details: generateProtocolDescription(state.protocolSequence, state.deck),
            deck: JSON.parse(JSON.stringify(state.deck)),
            sequence: JSON.parse(JSON.stringify(state.protocolSequence))
        };
        saveProtocols();
        closeModal();
        renderProtocolGallery();
    } else {
        alert('Por favor, introduce un nombre de protocolo y autor válidos. El nombre del protocolo no debe existir.');
    }
}

export function updateStepStateFromForm(stepId) {
    const step = state.protocolSequence.find(s => s.id === stepId);
    if (!step) return;
    const form = document.getElementById(`form-${step.id}`);
    if (!form) return;
    
    step.params.label = form.elements.label.value;

    if (step.type === 'comment') {
        step.params.comment = form.elements.comment.value;
    } else if (step.type === 'pause') {
        step.params.timed = form.elements.timed.checked;
        if (step.params.timed) {
            step.params.minutes = parseInt(form.elements.minutes.value, 10) || 0;
            step.params.seconds = parseInt(form.elements.seconds.value, 10) || 0;
        } else {
            step.params.message = form.elements.message.value;
        }
    } else if (step.type === 'mix') {
        step.params.mixSlot = form.elements.mixWellsSlot.value;
        step.params.repetitions = parseInt(form.elements.repetitions.value, 10);
        step.params.volume = parseFloat(form.elements.volume.value);
        step.params.flowrate = parseFloat(form.elements.flowrate.value);
    } else {
        step.params.volume = parseFloat(form.elements.volume?.value);
        step.params.pipetteStrategy = form.elements.pipetteStrategy?.value;
        step.params.sourceSlot = form.elements.sourceWellsSlot?.value;
        if (step.type === 'aspirate') {
            step.params.destSlot = form.elements.destSlot?.value;
        } else {
            step.params.destSlot = form.elements.destWellsSlot?.value;
        }
    
        if (['transfer', 'distribute', 'consolidate', 'wash'].includes(step.type)) {
            step.params.flowrate = parseFloat(form.elements.flowrate.value);
            const advToggle = form.querySelector('#advanced-options-toggle');
            step.params.advanced.enabled = advToggle.checked;
            if (advToggle.checked) {
                step.params.advanced.mix.enabled = form.querySelector('#mix-enabled').checked;
                step.params.advanced.mix.repetitions = parseInt(form.elements['mix-repetitions'].value, 10);
                step.params.advanced.mix.volume = parseFloat(form.elements['mix-volume'].value);
                step.params.advanced.mix.flowrate = parseFloat(form.elements['mix-flowrate'].value);
                
                step.params.advanced.airgap.enabled = form.querySelector('#airgap-enabled').checked;
                step.params.advanced.airgap.volume = parseFloat(form.elements['airgap-volume'].value);
                
                step.params.advanced.blowout.enabled = form.querySelector('#blowout-enabled').checked;
                step.params.advanced.blowout.volume = parseFloat(form.elements['blowout-volume'].value);

                step.params.advanced.touchtip = form.querySelector('#touchtip-enabled').checked;
            }
        }
    }
}

export function handleSaveStepConfig(stepId) {
    updateStepStateFromForm(stepId);
    const step = state.protocolSequence.find(s => s.id === stepId);
    if (!step) return;

    if (step.type === 'mix') {
        step.params.mixWells = Array.from(state.tempSelectedSourceWells);
    } else if (step.type !== 'comment' && step.type !== 'pause') {
        step.params.sourceWells = Array.from(state.tempSelectedSourceWells);
        step.params.destWells = Array.from(state.tempSelectedDestWells);
    }
    
    saveStateToHistory();
    renderAll();
    
    const saveBtn = document.getElementById('save-step-btn');
    if (saveBtn) {
        saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        saveBtn.classList.add('bg-green-500');
        saveBtn.textContent = '¡Guardado!';
        
        setTimeout(() => {
            const currentSaveBtn = document.getElementById('save-step-btn');
            if (currentSaveBtn) {
                currentSaveBtn.classList.remove('bg-green-500');
                currentSaveBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                currentSaveBtn.textContent = 'GUARDAR';
            }
        }, 1500);
    }
}

// --- State Modification & Logic Functions ---

export function selectLabware(labwareId) {
    if (state.modalSlotId) {
        state.deck[state.modalSlotId] = JSON.parse(JSON.stringify(activeLabwareLibrary[labwareId]));
    }
    closeModal();
    saveStateToHistory();
    renderAll();
}

export function addStep(type) {
    const color = COLOR_PALETTE[state.protocolSequence.length % COLOR_PALETTE.length];
    const newStep = { id: `step_${Date.now()}`, type: type, params: {} };
    
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
                touchtip: false
            };
        }
        if (type === 'wash') {
            baseParams.wasteSlot = null;
            baseParams.cycles = 3;
        }
    }
    
    newStep.params = baseParams;
    state.protocolSequence.push(newStep);
    closeModal();
    handleSelectStep(newStep.id);
    saveStateToHistory();
}

export function openSerialDilutionWizard() {
    closeModal();
    populateWizardSelectors();
    state.modal = 'serialDilutionWizard';
    renderModals();
}

export function openElisaWizard() {
    closeModal();
    populateElisaWizard();
    state.modal = 'elisaWizard';
    renderModals();
}

// ======================= INICIO DEL CAMBIO =======================
export function openAlamarBlueWizard() {
    if (state.activeStepId === 'wizardSelection') {
        if (state.activeWellSelectionTarget === 'sourceWells') {
            state.wizardAssayWells = new Set(state.tempSelectedSourceWells);
        } else if (state.activeWellSelectionTarget === 'destWells') {
            state.wizardControlWells = new Set(state.tempSelectedDestWells);
        }
    }

    closeModal();
    populateAlamarBlueWizard();
    state.modal = 'alamarBlueWizard';
    renderModals();
}


export function handleAlamarBlueWellSelectionRequest(type) {
    const culturePlateSlot = dom.alamarBlueForm.elements.culturePlateSlot.value;
    if (!culturePlateSlot) {
        alert("Por favor, selecciona primero una Placa de Cultivo en el asistente.");
        return;
    }

    state.activeStepId = 'wizardSelection';
    state.viewingSlotId = culturePlateSlot;

    if (type === 'assay') {
        state.activeWellSelectionTarget = 'sourceWells';
        state.tempSelectedSourceWells = new Set(state.wizardAssayWells);
        alert("MODO SELECCIÓN: Pocillos de Ensayo.\n\nEl asistente se cerrará. Selecciona los pocillos en la placa de cultivo y luego vuelve a abrir el asistente para continuar.");
    } else {
        state.activeWellSelectionTarget = 'destWells';
        state.tempSelectedDestWells = new Set(state.wizardControlWells);
        alert("MODO SELECCIÓN: Pocillos de Control.\n\nEl asistente se cerrará. Selecciona los pocillos en la placa de cultivo y luego vuelve a abrir el asistente para continuar.");
    }

    // Manually hide the wizard modal without resetting selection state
    state.modal = null;
    renderModals();
    renderAll();
}
// ======================== FIN DEL CAMBIO =========================

export function loadProtocol(protocolName) {
    const protocol = savedProtocols[protocolName];
    if (protocol) {
        state.deck = JSON.parse(JSON.stringify(protocol.deck));
        state.protocolSequence = JSON.parse(JSON.stringify(protocol.sequence));
        state.activeStepId = null;
        state.viewingSlotId = null;
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
        state.activeWellSelectionTarget = null;
        state.activeTab = 'workflow';
        saveStateToHistory();
        renderAll();
    }
}

export function closeModal() {
    if (state.calibrationState.active) {
        state.calibrationState = { active: false, wizardType: null, labwareId: null, bayId: null, currentStep: 0, pointsToCalibrate: [], recordedPoints: {}, currentMachinePos: { x: 50, y: 50, z: 100 } };
    }
    if (state.activeStepId === 'wizardSelection') {
        state.activeStepId = null;
        state.activeWellSelectionTarget = null;
        state.tempSelectedSourceWells.clear();
        state.tempSelectedDestWells.clear();
    }
    state.modal = null;
    renderModals();
}

function handleDeleteLabware(slotId) {
    state.deck[slotId] = null;
    if (state.viewingSlotId === slotId) state.viewingSlotId = null;
    saveStateToHistory();
    renderAll();
}

export function confirmDelete() {
    if (state.labwareIdToDelete) {
        delete activeLabwareLibrary[state.labwareIdToDelete];
        saveLabwareLibrary();
        state.labwareIdToDelete = null;
        renderLabwareLibrary();
    }
    if (state.protocolNameToDelete) {
        delete savedProtocols[state.protocolNameToDelete];
        saveProtocols();
        state.protocolNameToDelete = null;
        renderProtocolGallery();
    }
    closeModal();
}

export function openAddEditModal(labwareId = null) {
    dom.addLabwareForm.reset();
    dom.calibrationDataDisplay.classList.add('hidden');

    if (labwareId && activeLabwareLibrary[labwareId]) {
        state.labwareIdToEdit = labwareId;
        dom.labwareModalTitle.textContent = 'Editar Labware';
        const data = activeLabwareLibrary[labwareId];
        const formElements = dom.addLabwareForm.elements;

        if (data.calibration) {
            dom.calibrationDataDisplay.classList.remove('hidden');
            const wellCount = Object.keys(data.calibration.wells || {}).length;
            dom.calibrationSummaryText.textContent = `Calibración completada para ${wellCount} posiciones.`
            
            if (data.metadata.displayCategory === 'tipRack') {
                dom.calibZSafeLabel.textContent = "Altura Z de Aproximación (mm)";
                dom.calibZBottomLabel.textContent = "Profundidad Z de Recogida (mm)";
                dom.calibZSafeInput.value = data.calibration.z_approach.toFixed(2);
                dom.calibZBottomInput.value = data.calibration.z_pickup.toFixed(2);
            } else {
                dom.calibZSafeLabel.textContent = "Altura Z Segura (mm)";
                dom.calibZBottomLabel.textContent = "Profundidad Z Fondo (mm)";
                dom.calibZSafeInput.value = data.calibration.z_safe.toFixed(2);
                dom.calibZBottomInput.value = data.calibration.z_bottom.toFixed(2);
            }
        }
        
        formElements.displayName.value = data.metadata.displayName;
        formElements.displayCategory.value = data.metadata.displayCategory;
        formElements.brand.value = data.metadata.brand;
        dom.isSourceContainer.classList.toggle('hidden', data.metadata.displayCategory === 'reservoir');
        formElements.isSource.checked = data.metadata.isSource || false;
        formElements.xDimension.value = data.dimensions.xDimension;
        formElements.yDimension.value = data.dimensions.yDimension;
        formElements.rows.value = data.grid.rows;
        formElements.columns.value = data.grid.columns;
        formElements.diameter.value = data.wellProperties.diameter;
        formElements.spacing.value = data.wellProperties.spacing;
        formElements.offsetX.value = data.wellProperties.offset.x;
        formElements.offsetY.value = data.wellProperties.offset.y;
        formElements.bottomZ.value = data.wellProperties.bottomZ;
        formElements.maxVolume.value = data.wellProperties.maxVolume;
        dom.wellBottomShapeGroup.classList.toggle('hidden', data.metadata.displayCategory !== 'wellPlate');
        if (data.metadata.displayCategory === 'wellPlate') {
            formElements.wellBottomShape.value = data.wellProperties.wellBottomShape;
        }
    } else {
        state.labwareIdToEdit = null;
        dom.labwareModalTitle.textContent = 'Añadir Nuevo Labware';
        dom.wellBottomShapeGroup.classList.toggle('hidden', dom.labwareDisplayCategory.value !== 'wellPlate');
        dom.isSourceContainer.classList.toggle('hidden', dom.labwareDisplayCategory.value === 'reservoir');
    }
    state.modal = 'addLabware';
    renderModals();
}

export function calculateWellVolumes(targetSlotId, sequence) {
    const wellVolumes = new Map();
    if (!targetSlotId) return wellVolumes;

    sequence.forEach(step => {
        const volumePerWell = step.params.volume || 0;

        if (step.params.sourceSlot === targetSlotId) {
            (step.params.sourceWells || []).forEach(wellId => {
                const currentVolume = wellVolumes.get(wellId) || 0;
                wellVolumes.set(wellId, Math.max(0, currentVolume - volumePerWell));
            });
        }
        
        if (step.params.destSlot === targetSlotId) {
            if (step.type === 'consolidate') {
                const totalVolume = volumePerWell * (step.params.sourceWells || []).length;
                const destWellId = (step.params.destWells || [])[0];
                if (destWellId) {
                    const currentVolume = wellVolumes.get(destWellId) || 0;
                    wellVolumes.set(destWellId, currentVolume + totalVolume);
                }
            } else if (step.type !== 'wash') { 
                (step.params.destWells || []).forEach(wellId => {
                    const currentVolume = wellVolumes.get(wellId) || 0;
                    wellVolumes.set(wellId, currentVolume + volumePerWell);
                });
            }
        }
    });
    return wellVolumes;
}

export function generateProtocolDescription(sequence, deck) {
    if (!sequence || sequence.length === 0) {
        return {
            summary: "Protocolo vacío, sin acciones definidas.",
            stepCount: 0,
            labwareCount: 0,
            mainActions: [],
            labwareUsed: [],
            movementLog: []
        };
    }
    
    const stepCount = sequence.length;
    const labwareInUse = Object.values(deck).filter(Boolean);
    const labwareCount = labwareInUse.length;
    const mainActions = [...new Set(sequence.map(step => step.type))];
    const labwareUsed = [...new Set(labwareInUse.map(lw => lw.metadata.displayName))];

    let summary = `Protocolo de ${stepCount} paso${stepCount > 1 ? 's' : ''}. `;
    summary += `Utiliza ${labwareCount} elemento${labwareCount > 1 ? 's' : ''} de labware.`;
    
    const movementLog = sequence.map(step => {
        const { type, params } = step;
        const sourceName = deck[params.sourceSlot]?.metadata.displayName || `Bahía ${params.sourceSlot}`;
        const destName = deck[params.destSlot]?.metadata.displayName || `Bahía ${params.destSlot}`;
        
        switch (type) {
            case 'transfer':
                return `Transferir ${params.volume}µL de ${sourceName} (${(params.sourceWells || []).length} pocillos) a ${destName} (${(params.destWells || []).length} pocillos).`;
            case 'distribute':
                return `Distribuir ${params.volume}µL/pocillo desde ${sourceName} a ${destName} (${(params.destWells || []).length} pocillos).`;
            case 'consolidate':
                return `Consolidar ${params.volume}µL/pocillo desde ${sourceName} (${(params.sourceWells || []).length} pocillos) a ${destName}.`;
            case 'aspirate':
                return `Aspirar ${params.volume}µL de ${sourceName} (${(params.sourceWells || []).length} pocillos) y desechar en ${destName}.`;
            case 'wash':
                const wasteName = deck[params.wasteSlot]?.metadata.displayName || `Bahía ${params.wasteSlot}`;
                return `Lavar ${destName} (${(params.destWells || []).length} pocillos) usando ${sourceName}. Desecho en ${wasteName}. (${params.cycles} ciclos de ${params.volume}µL).`;
            case 'pause':
                return params.timed ? `Pausa por ${params.minutes}m ${params.seconds}s.` : `Pausa manual: ${params.message}`;
            case 'comment':
                return `Comentario: ${params.comment}`;
            case 'mix':
                const mixLocation = deck[params.mixSlot]?.metadata.displayName || `Bahía ${params.mixSlot}`;
                return `Mezclar en ${mixLocation} (${(params.mixWells || []).length} pocillos), ${params.repetitions} veces con ${params.volume}µL.`;
        }
    });

    return { summary, stepCount, labwareCount, mainActions, labwareUsed, movementLog };
}

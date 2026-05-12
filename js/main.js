import * as Klipper from './klipper-connector.js';
import { state, dom } from './state.js';
import { renderAll, renderActionSelectionModal, renderTabs, renderModals, renderRoutine } from './ui.js';
import { handleSerialDilutionSubmit, handleElisaSubmit, handleAlamarBlueSubmit } from './wizards.js'; // Importar
import { 
    handleDeckEvent,
    handleRoutineEvent,
    handleTabClick,
    handleLabwareLibraryClick,
    handleProtocolGalleryClick,
    handleSaveProtocolSubmit,
    handleAddLabwareSubmit,
    confirmDelete,
    closeModal,
    loadLabwareLibrary,
    loadProtocols,
    openAddEditModal,
    saveStateToHistory,
    undo,
    redo,
    handleClearProtocol,
    // ======================= INICIO DEL CAMBIO =======================
    handleAlamarBlueWellSelectionRequest
    // ======================== FIN DEL CAMBIO =========================
} from './events.js';
import { handleJog, handleSavePoint, handleFinishCalibration } from './calibration.js';

// --- Lógica de Conexión y Ejecución ---
        
function handleConnectionStatus(event) {
    const { status, message } = event.detail;
    const indicator = dom.connectionStatusIndicator;
    
    indicator.classList.remove('bg-red-500', 'bg-green-500', 'bg-yellow-500');
    dom.connectionErrorMsg.classList.add('hidden');

    switch (status) {
        case 'connected':
            indicator.classList.add('bg-green-500');
            dom.connectBtnText.textContent = 'Conectado';
            localStorage.setItem('klipperIp', dom.klipperIpInput.value);
            closeModal();
            break;
        case 'disconnected':
            indicator.classList.add('bg-red-500');
            dom.connectBtnText.textContent = 'Conectar al Robot';
            break;
        case 'connecting':
            indicator.classList.add('bg-yellow-500');
            break;
        case 'error':
            indicator.classList.add('bg-red-500');
            dom.connectionErrorMsg.textContent = message;
            dom.connectionErrorMsg.classList.remove('hidden');
            break;
    }
}

function generateGcodeForSequence(sequence, deck) {
    const gcode = [];
    gcode.push('G90 ; Usar coordenadas absolutas');
    
    sequence.forEach(step => {
        gcode.push(`; ----- ${step.params.label || step.type} -----`);
        // Lógica detallada para convertir cada paso a G-code (placeholders)
        if (step.params.sourceSlot && step.params.destSlot) {
            const sourceLabware = deck[step.params.sourceSlot];
            const destLabware = deck[step.params.destSlot];
            if (sourceLabware && destLabware) {
                 gcode.push(`; Mover de ${sourceLabware.metadata.displayName} a ${destLabware.metadata.displayName}`);
                 gcode.push(`; Aspirar ${step.params.volume} uL`);
                 gcode.push(`; Dispensar ${step.params.volume} uL`);
            }
        } else if (step.type === 'pause') {
            gcode.push(`; PAUSA: ${step.params.message}`);
        }
    });
    return gcode;
}

function logToControlConsole(message, type = 'info') {
    const entry = document.createElement('p');
    const sanitizedMessage = message.replace(/</g, "<").replace(/>/g, ">");

    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="text-gray-500 mr-2">[${timestamp}]</span>`;

    switch (type) {
        case 'sent':
            entry.classList.add('log-entry-sent');
            entry.innerHTML += `<span class="text-blue-400">${sanitizedMessage}</span>`;
            break;
        case 'received':
            entry.classList.add('log-entry-received');
            entry.innerHTML += `<span class="text-green-400">${sanitizedMessage}</span>`;
            break;
        case 'error':
            entry.classList.add('log-entry-error');
            entry.innerHTML += `<span class="text-red-400">${sanitizedMessage}</span>`;
            break;
        default:
            entry.innerHTML += `<span class="text-yellow-400">${sanitizedMessage}</span>`;
    }
    dom.controlLogConsole.appendChild(entry);
    dom.controlLogConsole.scrollTop = dom.controlLogConsole.scrollHeight;
}

// --- Drag and Drop Logic ---
let draggedItemId = null;
function handleDragStart(e) { draggedItemId = e.target.dataset.stepId; e.target.classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.step-card');
    document.querySelector('.dragging')?.classList.remove('dragging');
    if (!dropTarget || dropTarget.dataset.stepId === draggedItemId) {
        draggedItemId = null;
        return;
    }
    const draggedIndex = state.protocolSequence.findIndex(s => s.id === draggedItemId);
    const targetIndex = state.protocolSequence.findIndex(s => s.id === dropTarget.dataset.stepId);
    const [draggedItem] = state.protocolSequence.splice(draggedIndex, 1);
    state.protocolSequence.splice(targetIndex, 0, draggedItem);
    draggedItemId = null;
    saveStateToHistory(); // Guardar el nuevo orden
    renderRoutine(); 
}

// --- Initialization ---
function initialize() {
    loadLabwareLibrary();
    loadProtocols();
    
    // Guardar el estado inicial en el historial
    saveStateToHistory();

    renderAll();

    const savedIp = localStorage.getItem('klipperIp');
    if (savedIp) {
        dom.klipperIpInput.value = savedIp;
    }

    // --- Event Listeners ---
    dom.labDeck.addEventListener('click', handleDeckEvent);
    dom.cancelLabwareBtn.addEventListener('click', closeModal);
    dom.addStepBtn.addEventListener('click', () => { 
        renderActionSelectionModal();
        state.modal = 'action';
        renderModals(); 
    });
    dom.cancelActionBtn.addEventListener('click', closeModal);
    dom.routineSteps.addEventListener('click', handleRoutineEvent);
    dom.routineSteps.addEventListener('dragstart', handleDragStart);
    dom.routineSteps.addEventListener('dragover', handleDragOver);
    dom.routineSteps.addEventListener('drop', handleDrop);
    dom.tabWorkflow.addEventListener('click', handleTabClick);
    dom.tabLabware.addEventListener('click', handleTabClick);
    dom.tabGallery.addEventListener('click', handleTabClick);
    dom.tabControl.addEventListener('click', handleTabClick);
    dom.addLabwareBtn.addEventListener('click', () => openAddEditModal());
    dom.cancelAddLabwareBtn.addEventListener('click', closeModal);
    dom.addLabwareForm.addEventListener('submit', handleAddLabwareSubmit);
    dom.clearProtocolBtn.addEventListener('click', handleClearProtocol);

    dom.labwareDisplayCategory.addEventListener('change', (e) => { 
        dom.wellBottomShapeGroup.classList.toggle('hidden', e.target.value !== 'wellPlate'); 
        dom.isSourceContainer.classList.toggle('hidden', e.target.value === 'reservoir');
    });
    
    dom.labwareLibraryContent.addEventListener('click', handleLabwareLibraryClick);
    dom.protocolGalleryContent.addEventListener('click', handleProtocolGalleryClick);
    dom.cancelDeleteBtn.addEventListener('click', closeModal);
    dom.confirmDeleteBtn.addEventListener('click', confirmDelete);
    dom.saveProtocolBtn.addEventListener('click', () => { state.modal = 'saveProtocol'; renderModals(); });
    dom.cancelSaveProtocolBtn.addEventListener('click', closeModal);
    dom.saveProtocolForm.addEventListener('submit', handleSaveProtocolSubmit);
    
    // Listeners para los Asistentes
    dom.serialDilutionForm.addEventListener('submit', handleSerialDilutionSubmit);
    dom.cancelSerialDilutionBtn.addEventListener('click', closeModal);
    dom.elisaForm.addEventListener('submit', handleElisaSubmit);
    dom.cancelElisaBtn.addEventListener('click', closeModal);
    // ======================= INICIO DEL CAMBIO =======================
    dom.alamarBlueForm.addEventListener('submit', handleAlamarBlueSubmit);
    dom.cancelAlamarBlueBtn.addEventListener('click', closeModal);
    dom.abSelectAssayWellsBtn.addEventListener('click', () => {
        handleAlamarBlueWellSelectionRequest('assay');
    });
    dom.abSelectControlWellsBtn.addEventListener('click', () => {
        handleAlamarBlueWellSelectionRequest('control');
    });
    // ======================== FIN DEL CAMBIO =========================
    
    // Listeners para Undo/Redo
    dom.undoBtn.addEventListener('click', undo);
    dom.redoBtn.addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    });
    
    dom.jogControlModal.addEventListener('click', (e) => {
        const jogBtn = e.target.closest('.jog-btn');
        if (jogBtn) {
            handleJog(jogBtn.dataset.axis, parseInt(jogBtn.dataset.dir));
        }
    });
    dom.cancelJogBtn.addEventListener('click', closeModal);
    dom.savePointBtn.addEventListener('click', handleSavePoint);
    dom.finishCalibrationBtn.addEventListener('click', handleFinishCalibration);

    // Listeners de Conexión
    dom.connectRobotBtn.addEventListener('click', () => {
        if (Klipper.isConnected()) {
            Klipper.disconnect();
        } else {
            state.modal = 'connection';
            renderModals();
        }
    });
    dom.cancelConnectionBtn.addEventListener('click', closeModal);
    dom.submitConnectionBtn.addEventListener('click', () => Klipper.connect(dom.klipperIpInput.value));
    document.addEventListener('klipperStatusChange', handleConnectionStatus);

    // Listener de Ejecución
    dom.runProtocolBtn.addEventListener('click', () => {
        if (!Klipper.isConnected()) {
            alert('Error: Debes estar conectado a un robot para ejecutar un protocolo.');
            return;
        }
        if (state.protocolSequence.length === 0) {
            alert('Error: No hay pasos en la secuencia para ejecutar.');
            return;
        }
        const gcodeCommands = generateGcodeForSequence(state.protocolSequence, state.deck);
        Klipper.addToQueue(gcodeCommands);
        alert(`Protocolo enviado a la cola de ejecución con ${gcodeCommands.length} comandos.`);
        state.activeTab = 'control';
        renderTabs();
    });

    document.addEventListener('klipperLog', (event) => {
        const { message, type } = event.detail;
        logToControlConsole(message, type);
    });

    dom.panelControl.addEventListener('click', (e) => {
        const jogBtn = e.target.closest('.control-jog-btn');
        if (jogBtn) {
            const { axis, dir } = jogBtn.dataset;
            const step = parseFloat(document.getElementById('control-jog-step').value);
            let command = '';
            if (axis === 'home') {
                command = `G28 ${dir.toUpperCase()}`;
            } else {
                command = `G91\nG0 ${axis.toUpperCase()}${parseInt(dir) * step}\nG90`;
            }
            Klipper.addToQueue(command);
        }
    });

    dom.pauseProtocolBtn.addEventListener('click', () => Klipper.addToQueue('PAUSE'));
    dom.resumeProtocolBtn.addEventListener('click', () => Klipper.addToQueue('RESUME'));
    dom.cancelProtocolBtn.addEventListener('click', () => Klipper.addToQueue('CANCEL_PRINT'));
}

document.addEventListener('DOMContentLoaded', initialize);

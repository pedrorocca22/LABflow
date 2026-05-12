import { state, dom, activeLabwareLibrary, savedProtocols } from './state.js';
import { openSerialDilutionWizard, openElisaWizard, openAlamarBlueWizard } from './events.js'; // Importar el nuevo handler
import { handleMouseDown, handleMouseMove, handleSelectAllWells, handleDeselectAllWells, addStep, calculateWellVolumes, generateProtocolDescription, handleSaveStepConfig, selectLabware, updateStepStateFromForm } from './events.js';

// --- Funciones de Renderizado ---

// ======================= INICIO DEL CAMBIO =======================
function safeCreateIcons() {
    if (window.lucide) {
        lucide.createIcons();
    } else {
        console.warn("Lucide library not available yet.");
    }
}
// ======================== FIN DEL CAMBIO =========================

export function renderAll() {
    renderTabs();
    renderDeck();
    renderDeckDetail();
    renderRoutine();
    renderConfigPanel();
    renderLabwareLibrary();
    renderProtocolGallery();
    updateUndoRedoButtons();
    safeCreateIcons();
}

export function updateUndoRedoButtons() {
    dom.undoBtn.disabled = state.historyIndex <= 0;
    dom.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

export function renderTabs() {
    dom.panelWorkflow.classList.toggle('hidden', state.activeTab !== 'workflow');
    dom.panelLabware.classList.toggle('hidden', state.activeTab !== 'labware');
    dom.panelGallery.classList.toggle('hidden', state.activeTab !== 'gallery');
    dom.panelControl.classList.toggle('hidden', state.activeTab !== 'control');
    
    ['workflow', 'labware', 'gallery', 'control'].forEach(tabName => {
        const tabEl = dom[`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`];
        if (tabEl) {
            tabEl.classList.toggle('border-blue-500', state.activeTab === tabName);
            tabEl.classList.toggle('text-blue-600', state.activeTab === tabName);
            tabEl.classList.toggle('border-transparent', state.activeTab !== tabName);
            tabEl.classList.toggle('text-gray-500', state.activeTab !== tabName);
        }
    });
}

export function renderLabwareLibrary() {
    dom.labwareLibraryContent.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    for (const labwareId in activeLabwareLibrary) {
        const labware = activeLabwareLibrary[labwareId];
        const card = document.createElement('div');
        card.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-between transition hover:shadow-md hover:border-blue-300';
        let icon = 'square';
        if (labware.metadata.displayCategory === 'tipRack') icon = 'pipette';
        if (labware.metadata.displayCategory === 'reservoir') icon = 'test-tube-2';
        const wellBottomShapeInfo = labware.wellProperties.wellBottomShape ? `<p><b>Fondo:</b> ${labware.wellProperties.wellBottomShape}</p>` : '';
        
        const isCalibrated = labware.calibration && labware.calibration.wells && Object.keys(labware.calibration.wells).length > 0;
        const calibrationStatus = isCalibrated 
            ? `<span class="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Calibrado</span>` 
            : `<span class="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Sin Calibrar</span>`;

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between gap-3 mb-2">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2"><i data-lucide="${icon}" class="text-blue-500"></i>${labware.metadata.displayName}</h3>
                    ${calibrationStatus}
                </div>
                <p class="text-sm text-gray-500 mb-1">Categoría: ${labware.metadata.displayCategory}</p>
                <p class="text-sm text-gray-500 mb-3">Dimensiones: ${labware.dimensions.xDimension}mm x ${labware.dimensions.yDimension}mm</p>
                <div class="text-xs text-gray-600 bg-gray-100 rounded p-2 space-y-1">
                    <p><b>Rejilla:</b> ${labware.grid.rows}x${labware.grid.columns}</p><p><b>Diámetro pocillo:</b> ${labware.wellProperties.diameter}mm</p>
                    <p><b>Volumen Máx:</b> ${labware.wellProperties.maxVolume}µL</p><p><b>Profundidad Z:</b> ${labware.wellProperties.bottomZ}mm</p>${wellBottomShapeInfo}
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-200 text-right space-x-4">
                <button class="calibrate-labware-btn text-sm font-medium text-green-600 hover:text-green-800" data-labware-id="${labwareId}">Calibrar</button>
                <button class="edit-labware-btn text-sm font-medium text-blue-600 hover:text-blue-800" data-labware-id="${labwareId}">Editar</button>
                <button class="delete-labware-lib-btn text-sm font-medium text-red-600 hover:text-red-800" data-labware-id="${labwareId}">Eliminar</button>
            </div>`;
        grid.appendChild(card);
    }
    dom.labwareLibraryContent.appendChild(grid);
}

export function renderProtocolGallery() {
    dom.protocolGalleryContent.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    if (Object.keys(savedProtocols).length === 0) {
        dom.protocolGalleryContent.innerHTML = '<p class="text-gray-500 text-center py-10">No hay protocolos guardados. ¡Guarda uno desde la pestaña Workflow!</p>';
        return;
    }

    for (const protocolName in savedProtocols) {
        const protocol = savedProtocols[protocolName];
        
        if (!protocol || typeof protocol !== 'object') {
            console.warn(`Skipping invalid protocol data for key: ${protocolName}`);
            continue; 
        }
        
        let details = protocol.details;
        if (!details || typeof details !== 'object') {
            details = (protocol.sequence && protocol.deck) ? generateProtocolDescription(protocol.sequence, protocol.deck) : null;
        }

        if (!details) {
            console.warn(`Could not generate details for protocol: ${protocolName}. Using defaults.`);
            details = {
                summary: 'Datos de protocolo inválidos o incompletos.',
                mainActions: [],
                labwareUsed: [],
                movementLog: []
            };
        }

        const mainActions = details.mainActions || [];
        const labwareUsed = details.labwareUsed || [];
        const movementLog = details.movementLog || [];

        const card = document.createElement('div');
        card.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-between transition hover:shadow-md hover:border-blue-300';
        
        const actionsListHTML = mainActions.length > 0
            ? mainActions.map(action => `<span class="bg-blue-100 text-blue-800 text-xs font-medium mr-2 mb-1 px-2.5 py-0.5 rounded-full inline-block">${action.charAt(0).toUpperCase() + action.slice(1)}</span>`).join('')
            : '<span class="text-gray-400 text-xs">N/A</span>';

        const labwareListHTML = labwareUsed.length > 0
            ? labwareUsed.map(name => `<li class="truncate text-gray-700">${name}</li>`).join('')
            : '<li class="text-gray-400">Ninguno</li>';

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-3 mb-2">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2"><i data-lucide="file-text" class="text-blue-500"></i>${protocol.title || 'Protocolo sin título'}</h3>
                    <span class="text-xs text-gray-400 whitespace-nowrap">${protocol.date || ''}</span>
                </div>
                <p class="text-sm text-gray-500 mb-3">por <b>${protocol.author || 'Desconocido'}</b></p>
                <p class="text-xs text-gray-600 bg-gray-100 rounded p-2 mb-4">${details.summary || 'Sin descripción.'}</p>
                
                <div class="space-y-3">
                    <div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Acciones Principales</h4>
                        <div class="flex flex-wrap">
                            ${actionsListHTML}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Labware Utilizado</h4>
                        <ul class="text-xs list-disc list-inside space-y-1">
                            ${labwareListHTML}
                        </ul>
                    </div>
                </div>
            </div>

            <div id="log-container-${protocolName.replace(/\s+/g, '-')}" class="hidden mt-3 pt-3 border-t border-gray-200">
                <h5 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Registro de Movimientos</h5>
                <ol class="text-xs text-gray-700 list-decimal list-inside space-y-1.5 max-h-40 overflow-y-auto pr-2">
                    ${movementLog.map(logEntry => `<li>${logEntry}</li>`).join('')}
                </ol>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                 <button class="toggle-log-btn text-sm font-medium text-blue-600 hover:text-blue-800" data-protocol-name="${protocolName.replace(/\s+/g, '-')}">
                    <span class="flex items-center gap-1"><i data-lucide="list-tree" class="w-4 h-4"></i><span>Movimientos</span></span>
                </button>
                <div class="flex gap-2">
                    <button class="load-protocol-btn bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 flex items-center gap-2" data-protocol-name="${protocolName}"><i data-lucide="upload"></i>Cargar</button>
                    <button class="delete-protocol-btn bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg hover:bg-red-200 flex items-center gap-2" data-protocol-name="${protocolName}"><i data-lucide="trash-2"></i>Eliminar</button>
                </div>
            </div>`;
        grid.appendChild(card);
    }
    dom.protocolGalleryContent.appendChild(grid);
}

export function renderDeck() {
    dom.labDeck.innerHTML = '';
    const trashBinDiv = document.createElement('div');
    trashBinDiv.classList.add('trash-bin', 'col-span-2');
    trashBinDiv.textContent = 'Tray Waste';
    dom.labDeck.appendChild(trashBinDiv);

    for (const slotId in state.deck) {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('deck-slot');
        slotDiv.dataset.slotId = slotId;
        const labware = state.deck[slotId];
        if (labware) {
            slotDiv.textContent = labware.metadata.displayName;
            slotDiv.classList.add('occupied');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-labware-btn';
            deleteBtn.dataset.slotId = slotId;
            deleteBtn.innerHTML = `<i data-lucide="x"></i>`;
            slotDiv.appendChild(deleteBtn);
        } else { 
            slotDiv.textContent = `Bahía ${slotId}`; 
        }
        if (slotId === state.viewingSlotId) { slotDiv.classList.add('selected'); }
        dom.labDeck.appendChild(slotDiv);
    }
}

export function renderDeckDetail() {
    dom.labwareDetailView.innerHTML = '';
    const labware = state.deck[state.viewingSlotId];
    
    if (!labware) {
        dom.labwareDetailView.innerHTML = '<p class="text-gray-500">Selecciona una acción y una bahía para visualizar.</p>';
        dom.labwareDetailView.classList.add('items-center', 'justify-center');
        return;
    }
    dom.labwareDetailView.classList.remove('items-center', 'justify-center');

    const wrapper = document.createElement('div');
    wrapper.className = 'w-full h-full flex flex-col flex-grow';

    const { dimensions } = labware;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('viewBox', `0 0 ${dimensions.xDimension} ${dimensions.yDimension}`);
    svg.classList.add('labware-svg');

    const activeStepIndex = state.protocolSequence.findIndex(s => s.id === state.activeStepId);
    const sequenceToConsider = activeStepIndex === -1 
        ? state.protocolSequence 
        : state.protocolSequence.slice(0, activeStepIndex + 1);
    const wellVolumes = calculateWellVolumes(state.viewingSlotId, sequenceToConsider);
    
    if (labware.metadata.displayCategory === 'reservoir') {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        const margin = 5;
        rect.setAttribute('x', margin);
        rect.setAttribute('y', margin);
        rect.setAttribute('width', dimensions.xDimension - margin * 2);
        rect.setAttribute('height', dimensions.yDimension - margin * 2);
        rect.setAttribute('rx', 5);
        rect.classList.add('well', 'previously-used');
        svg.appendChild(rect);

        const currentVolume = wellVolumes.get('A1') || 0;
        if (currentVolume > 0) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
            text.setAttribute('x', dimensions.xDimension / 2);
            text.setAttribute('y', dimensions.yDimension / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.classList.add('well-text');
            text.style.fontSize = '10px';
            text.textContent = `${Math.round(currentVolume)} µL`;
            svg.appendChild(text);
        }

    } else if (labware.grid && labware.wellProperties) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-center gap-2 mb-2';
        buttonContainer.innerHTML = `
            <button id="select-all-wells-btn" class="text-xs bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-lg hover:bg-gray-300">Seleccionar Todos</button>
            <button id="deselect-all-wells-btn" class="text-xs bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-lg hover:bg-gray-300">Deseleccionar Todos</button>
        `;
        wrapper.appendChild(buttonContainer);

        const { grid, wellProperties } = labware;
        const { offset, spacing, diameter } = wellProperties;
        const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
        
        const washedWells = new Set();
        sequenceToConsider.forEach(step => {
            if (step.type === 'wash' && step.params.destSlot === state.viewingSlotId) {
                (step.params.destWells || []).forEach(well => washedWells.add(well));
            }
        });
        
        const wellsToHighlight = state.activeWellSelectionTarget === 'sourceWells' || state.activeWellSelectionTarget === 'mixWells'
            ? state.tempSelectedSourceWells 
            : state.tempSelectedDestWells;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.columns; c++) {
                const wellId = `${rowLabels[r]}${c + 1}`;
                const cx = offset.x + c * spacing;
                const cy = offset.y + r * spacing;
                const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                circle.setAttribute('cx', cx);
                circle.setAttribute('cy', cy);
                circle.setAttribute('r', diameter / 2);
                circle.classList.add('well');
                circle.dataset.wellId = wellId;
                
                if (wellVolumes.has(wellId) && wellVolumes.get(wellId) > 0) {
                    circle.classList.add('previously-used');
                }
                if (state.activeStepId && wellsToHighlight.has(wellId)) {
                    circle.classList.add('selected');
                }
                
                svg.appendChild(circle);

                const currentVolume = wellVolumes.get(wellId) || 0;
                if (currentVolume > 0) {
                    const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
                    text.setAttribute('x', cx);
                    text.setAttribute('y', cy + 0.5);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.classList.add('well-text');
                    text.textContent = Math.round(currentVolume);
                    svg.appendChild(text);
                } else if (washedWells.has(wellId)) {
                    const dropletPath = document.createElementNS("http://www.w3.org/2000/svg", 'path');
                    dropletPath.setAttribute('d', 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z');
                    const iconSize = diameter * 0.6;
                    const scale = iconSize / 24;
                    const translateX = cx - (12 * scale);
                    const translateY = cy - (12 * scale);
                    dropletPath.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`);
                    dropletPath.setAttribute('fill', '#9ca3af');
                    dropletPath.style.pointerEvents = 'none';
                    svg.appendChild(dropletPath);
                }
            }
        }

        const selectionRect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        selectionRect.setAttribute('id', 'selection-rect');
        selectionRect.setAttribute('fill', 'rgba(59, 130, 246, 0.3)');
        selectionRect.setAttribute('stroke', 'rgba(59, 130, 246, 0.8)');
        selectionRect.setAttribute('stroke-width', '0.5');
        selectionRect.setAttribute('visibility', 'hidden');
        svg.appendChild(selectionRect);

        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        
        wrapper.querySelector('#select-all-wells-btn').addEventListener('click', handleSelectAllWells);
        wrapper.querySelector('#deselect-all-wells-btn').addEventListener('click', handleDeselectAllWells);
    } else {
        wrapper.innerHTML = `<div class="text-center"><p class="text-gray-600 font-medium">${labware.metadata.displayName}</p><p class="text-sm text-gray-500">Este labware no tiene una rejilla visualizable.</p></div>`;
        dom.labwareDetailView.appendChild(wrapper);
        return;
    }

    const svgContainer = document.createElement('div');
    svgContainer.className = 'labware-svg-container flex-grow';
    svgContainer.appendChild(svg);
    wrapper.appendChild(svgContainer);
    dom.labwareDetailView.appendChild(wrapper);
}

export function renderLabwareSelectionModal() {
    dom.labwareOptions.innerHTML = '';
    for (const labwareId in activeLabwareLibrary) {
        const labware = activeLabwareLibrary[labwareId];
        const button = document.createElement('button');
        button.className = 'action-button';
        button.dataset.labwareId = labwareId;
        button.innerHTML = `<i data-lucide="beaker"></i><span>${labware.metadata.displayName}</span>`;
        button.addEventListener('click', () => selectLabware(labwareId));
        dom.labwareOptions.appendChild(button);
    }
    safeCreateIcons();
}

export function renderActionSelectionModal() {
    dom.actionOptions.innerHTML = '';
    const wizards = [
        { id: 'serial-dilution', name: 'Asistente: Dilución en Serie', icon: 'wand-2', handler: openSerialDilutionWizard },
        { id: 'elisa', name: 'Asistente: Ensayo ELISA', icon: 'test-tube-2', handler: openElisaWizard },
        { id: 'alamar-blue', name: 'Asistente: Ensayo AlamarBlue', icon: 'activity', handler: openAlamarBlueWizard },
    ];
    
    wizards.forEach(wizard => {
        const button = document.createElement('button');
        button.className = 'action-button bg-blue-50 col-span-1 md:col-span-2';
        button.innerHTML = `<i data-lucide="${wizard.icon}"></i><span>${wizard.name}</span>`;
        button.addEventListener('click', wizard.handler);
        dom.actionOptions.appendChild(button);
    });
    
    const actions = [
        { id: 'transfer', name: 'Transferir', icon: 'arrow-right-left' },
        { id: 'distribute', name: 'Distribuir', icon: 'arrow-up-to-line' },
        { id: 'consolidate', name: 'Consolidar', icon: 'arrow-down-to-line' },
        { id: 'aspirate', name: 'Aspirar', icon: 'chevrons-down' },
        { id: 'wash', name: 'Lavar', icon: 'droplets' },
        { id: 'mix', name: 'Mezclar', icon: 'rotate-cw' },
        { id: 'pause', name: 'Pausa', icon: 'pause-circle' },
        { id: 'comment', name: 'Comentario', icon: 'message-square' },
    ];
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'action-button';
        button.dataset.actionType = action.id;
        button.innerHTML = `<i data-lucide="${action.icon}"></i><span>${action.name}</span>`;
        button.addEventListener('click', () => addStep(action.id));
        dom.actionOptions.appendChild(button);
    });
    safeCreateIcons();
}

export function renderModals() {
    dom.labwareModal.classList.toggle('visible', state.modal === 'labware');
    dom.addActionModal.classList.toggle('visible', state.modal === 'action');
    dom.addLabwareModal.classList.toggle('visible', state.modal === 'addLabware');
    dom.deleteConfirmModal.classList.toggle('visible', state.modal === 'deleteConfirm');
    dom.saveProtocolModal.classList.toggle('visible', state.modal === 'saveProtocol');
    dom.jogControlModal.classList.toggle('visible', state.modal === 'jogControl');
    dom.connectionModal.classList.toggle('visible', state.modal === 'connection');
    dom.serialDilutionModal.classList.toggle('visible', state.modal === 'serialDilutionWizard');
    dom.elisaModal.classList.toggle('visible', state.modal === 'elisaWizard');
    dom.alamarBlueModal.classList.toggle('visible', state.modal === 'alamarBlueWizard');
}

export function renderRoutine() {
    dom.routineSteps.innerHTML = '';
    if (state.protocolSequence.length === 0) {
        dom.routineSteps.innerHTML = '<p class="text-gray-500 text-center py-10">Añade una acción para empezar.</p>';
        return;
    }

    state.protocolSequence.forEach(step => {
        const card = document.createElement('div');
        card.className = 'step-card relative';
        card.dataset.stepId = step.id;
        card.draggable = true;
        if (step.id === state.activeStepId) card.classList.add('selected');

        if (step.params.color) card.style.borderLeftColor = step.params.color;

        const content = document.createElement('div');
        content.className = 'flex-grow';

        const title = document.createElement('p');
        title.className = 'font-semibold text-gray-800 text-sm';
        title.textContent = step.params.label || step.type;
        content.appendChild(title);

        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'text-xs text-gray-500 mt-1.5 space-y-1';

        const strategyIcon = step.params.pipetteStrategy === 'new_tip' ? 'droplets' : 'droplet';
        const strategyText = step.params.pipetteStrategy === 'new_tip' ? 'Punta nueva' : 'Misma punta';

        const sourceName = state.deck[step.params.sourceSlot]?.metadata.displayName ? `<b>B${step.params.sourceSlot}</b>` : '?';
        const destName = state.deck[step.params.destSlot]?.metadata.displayName ? `<b>B${step.params.destSlot}</b>` : '?';
        
        let advancedDetails = '';
        if (['transfer', 'distribute', 'consolidate', 'wash'].includes(step.type) && step.params.advanced?.enabled) {
            const adv = step.params.advanced;
            if (adv.mix?.enabled) advancedDetails += `<span class="inline-flex items-center gap-1 mr-2"><i data-lucide="rotate-cw" class="w-3 h-3"></i> Mix ${adv.mix.repetitions}x</span>`;
            if (adv.airgap?.enabled) advancedDetails += `<span class="inline-flex items-center gap-1 mr-2"><i data-lucide="air-vent" class="w-3 h-3"></i> AirGap</span>`;
            if (adv.blowout?.enabled) advancedDetails += `<span class="inline-flex items-center gap-1 mr-2"><i data-lucide="wind" class="w-3 h-3"></i> Blowout</span>`;
            if (adv.touchtip) advancedDetails += `<span class="inline-flex items-center gap-1 mr-2"><i data-lucide="touchpad" class="w-3 h-3"></i> TouchTip</span>`;
        }

        switch (step.type) {
            case 'transfer':
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="arrow-right" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>De ${sourceName} (${(step.params.sourceWells || []).length}) a ${destName} (${(step.params.destWells || []).length})</span></div>
                    <div class="flex items-center"><i data-lucide="test-tube-2" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.volume || '?'} µL</span><span class="mx-2 text-gray-300">|</span><i data-lucide="${strategyIcon}" class="w-3 h-3 mr-1 text-gray-400"></i><span>${strategyText}</span></div>
                    ${advancedDetails ? `<div class="pt-1">${advancedDetails}</div>` : ''}`;
                break;
            case 'distribute':
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="arrow-right" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>De ${sourceName} a ${destName} (${(step.params.destWells || []).length} pocillos)</span></div>
                    <div class="flex items-center"><i data-lucide="test-tube-2" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.volume || '?'} µL (por pocillo)</span></div>
                    ${advancedDetails ? `<div class="pt-1">${advancedDetails}</div>` : ''}`;
                break;
            case 'consolidate':
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="arrow-right" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>De ${sourceName} (${(step.params.sourceWells || []).length} pocillos) a ${destName}</span></div>
                    <div class="flex items-center"><i data-lucide="test-tube-2" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.volume || '?'} µL (de cada pocillo)</span></div>
                    ${advancedDetails ? `<div class="pt-1">${advancedDetails}</div>` : ''}`;
                break;
            case 'aspirate':
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="arrow-right" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>De ${sourceName} (${(step.params.sourceWells || []).length}) a Desecho en ${destName}</span></div>
                    <div class="flex items-center"><i data-lucide="test-tube-2" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.volume || '?'} µL</span></div>`;
                break;
            case 'wash':
                const wasteName = state.deck[step.params.wasteSlot]?.metadata.displayName ? `<b>B${step.params.wasteSlot}</b>` : '?';
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="arrow-right" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${sourceName} a ${destName} (${(step.params.destWells || []).length}) | Desecho: ${wasteName}</span></div>
                    <div class="flex items-center"><i data-lucide="repeat" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.cycles || '?'} ciclos</span><span class="mx-2 text-gray-300">|</span><i data-lucide="test-tube-2" class="w-3 h-3 mr-1 text-gray-400"></i><span>${step.params.volume || '?'} µL</span></div>
                    <div class="flex items-center"><i data-lucide="wind" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.flowrate || '?'} µL/s</span><span class="mx-2 text-gray-300">|</span><i data-lucide="${strategyIcon}" class="w-3 h-3 mr-1 text-gray-400"></i><span>${strategyText}</span></div>
                    ${advancedDetails ? `<div class="pt-1">${advancedDetails}</div>` : ''}`;
                break;
            case 'mix':
                const mixLocation = state.deck[step.params.mixSlot]?.metadata.displayName ? `<b>B${step.params.mixSlot}</b>` : '?';
                detailsContainer.innerHTML += `
                    <div class="flex items-center"><i data-lucide="map-pin" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>En ${mixLocation} (${(step.params.mixWells || []).length} pocillos)</span></div>
                    <div class="flex items-center"><i data-lucide="repeat" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.repetitions || '?'} ciclos</span><span class="mx-2 text-gray-300">|</span><i data-lucide="test-tube-2" class="w-3 h-3 mr-1 text-gray-400"></i><span>${step.params.volume || '?'} µL</span></div>`;
                break;
            case 'pause':
                const pauseText = step.params.timed ? `Esperar ${step.params.minutes}m ${step.params.seconds}s` : step.params.message || 'Esperando al usuario';
                detailsContainer.innerHTML += `<div class="flex items-center"><i data-lucide="timer" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${pauseText}</span></div>`;
                break;
            case 'comment':
                card.style.borderLeftColor = '#a0aec0';
                detailsContainer.innerHTML += `<div class="flex items-center italic text-gray-600"><i data-lucide="message-square" class="w-3 h-3 mr-1.5 text-gray-400"></i><span>${step.params.comment || 'Escribe un comentario...'}</span></div>`;
                break;
        }
        content.appendChild(detailsContainer);

        const controls = document.createElement('div');
        controls.className = 'flex flex-col items-end justify-center pl-2 space-y-1';

        const warning = state.protocolWarnings.find(w => w.stepId === step.id);
        if (warning) {
            card.style.borderColor = '#f59e0b';
            card.style.borderWidth = '1px';
            card.style.borderLeftWidth = '4px';
            card.style.borderLeftColor = '#f59e0b';
            card.title = warning.message;
            const warningIcon = document.createElement('div');
            warningIcon.className = 'text-yellow-500';
            warningIcon.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4"></i>';
            controls.appendChild(warningIcon);
        }
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex items-center';

        const cloneBtn = document.createElement('button');
        cloneBtn.className = 'clone-step-btn p-1 rounded-full hover:bg-gray-200';
        cloneBtn.dataset.stepId = step.id;
        cloneBtn.title = "Clonar paso";
        cloneBtn.innerHTML = `<i data-lucide="copy" class="w-4 h-4 text-gray-500 hover:text-blue-600"></i>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-step-btn p-1 rounded-full hover:bg-red-100';
        deleteBtn.dataset.stepId = step.id;
        deleteBtn.title = "Eliminar paso";
        deleteBtn.innerHTML = `<i data-lucide="x" class="w-4 h-4 text-red-500"></i>`;

        buttonGroup.appendChild(cloneBtn);
        buttonGroup.appendChild(deleteBtn);
        controls.appendChild(buttonGroup);

        card.appendChild(content);
        card.appendChild(controls);
        dom.routineSteps.appendChild(card);
    });
    safeCreateIcons();
}

export function renderConfigPanel() {
    dom.configPanelContent.innerHTML = '';
    const activeStep = state.protocolSequence.find(s => s.id === state.activeStepId);
    if (!activeStep) {
        dom.configPanelContent.innerHTML = '<p class="text-gray-500 text-center py-10">Selecciona o añade una acción para configurarla.</p>';
        return;
    }

    const warning = state.protocolWarnings.find(w => w.stepId === activeStep.id);
    if (warning) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'p-3 mb-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm';
        warningDiv.innerHTML = `<p class="font-bold">Advertencia</p><p>${warning.message}</p>`;
        dom.configPanelContent.appendChild(warningDiv);
    }

    dom.configPanelTitle.innerHTML = `<i data-lucide="sliders-horizontal"></i><span class="capitalize">Configuración: ${activeStep.type}</span>`;
    const form = createStepForm(activeStep);
    dom.configPanelContent.appendChild(form);

    if (['transfer', 'distribute', 'consolidate', 'wash'].includes(activeStep.type)) {
        const advancedToggle = form.querySelector('#advanced-options-toggle');
        const advancedContainer = form.querySelector('#advanced-options-container');
        if(advancedToggle && advancedContainer) {
            advancedToggle.addEventListener('change', () => {
                advancedContainer.style.display = advancedToggle.checked ? 'block' : 'none';
            });
        }
        ['mix', 'airgap', 'blowout'].forEach(opt => {
            const checkbox = form.querySelector(`#${opt}-enabled`);
            const detailsDiv = form.querySelector(`#${opt}-details`);
            if(checkbox && detailsDiv) {
                checkbox.addEventListener('change', () => {
                    detailsDiv.style.display = checkbox.checked ? 'block' : 'none';
                });
            }
        });
    }

    if (activeStep.type === 'pause') {
        const timedPauseToggle = form.querySelector('#timed-pause-toggle');
        const timeInputs = form.querySelector('#time-inputs');
        const messageInput = form.querySelector('#pause-message-group');
        if (timedPauseToggle && timeInputs && messageInput) {
            timedPauseToggle.addEventListener('change', () => {
                timeInputs.style.display = timedPauseToggle.checked ? 'flex' : 'none';
                messageInput.style.display = timedPauseToggle.checked ? 'none' : 'block';
            });
        }
    }
    safeCreateIcons();
}

export function createStepForm(step) {
    const form = document.createElement('form');
    form.id = `form-${step.id}`;
    const occupiedSlots = Object.entries(state.deck).filter(([, labware]) => labware !== null).map(([slotId]) => slotId);
    
    const createWellSelectorGroup = (type, label, slotValue, wellsValue) => {
        const group = document.createElement('div');
        group.className = 'well-selector-group';
        group.dataset.type = type;
        if (state.activeWellSelectionTarget === type) group.classList.add('active');

        const selectId = `${type}-slot-select`;
        const groupLabel = document.createElement('label');
        groupLabel.htmlFor = selectId;
        groupLabel.className = 'block font-medium text-gray-700 mb-2';
        groupLabel.textContent = label;
        group.appendChild(groupLabel);

        const select = document.createElement('select');
        select.id = selectId;
        select.name = `${type}Slot`;
        select.className = 'w-full p-2 border rounded-md mb-2';
        if (occupiedSlots.length === 0) {
            select.add(new Option('No hay bahías ocupadas', '', true, true));
            select.disabled = true;
        } else {
             select.add(new Option('Seleccionar bahía...', ''));
             occupiedSlots.forEach(opt => {
                const labware = state.deck[opt];
                select.add(new Option(`${labware.metadata.displayName} (B${opt})`, opt));
            });
        }
        select.value = slotValue || '';
        group.appendChild(select);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300';
        
        let wellCount = (wellsValue || []).length;
        if (step.id === state.activeStepId) {
            if (type === 'sourceWells' || type === 'mixWells') {
                wellCount = state.tempSelectedSourceWells.size;
            } else if (type === 'destWells') {
                wellCount = state.tempSelectedDestWells.size;
            }
        }
        button.textContent = `Seleccionar Pocillos (${wellCount})`;

        button.addEventListener('click', () => {
            updateStepStateFromForm(step.id);
            state.activeWellSelectionTarget = type;
            state.viewingSlotId = select.value;
            renderAll();
        });
        group.appendChild(button);
        return group;
    };
    
    const createSimpleSlotSelector = (id, label, value, options) => {
        const group = document.createElement('div');
        group.className = 'config-form-group';
        group.innerHTML = `<label for="${id}">${label}</label>`;
        const select = document.createElement('select');
        select.id = id;
        select.name = id;
        if (options.length === 0) {
            select.add(new Option('No hay bahías ocupadas', '', true, true));
            select.disabled = true;
        } else {
             select.add(new Option('Seleccionar bahía...', ''));
             options.forEach(opt => {
                const labware = state.deck[opt];
                select.add(new Option(`${labware.metadata.displayName} (B${opt})`, opt));
            });
        }
        select.value = value || '';
        group.appendChild(select);
        return group;
    };

    const createInput = (id, label, type, value, props = {}) => {
        const group = document.createElement('div');
        group.className = 'config-form-group';
        group.innerHTML = `<label for="${id}">${label}</label>`;
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        input.value = value;
        Object.assign(input, props);
        group.appendChild(input);
        return group;
    };
    const createGenericSelector = (id, label, value, options) => {
        const group = document.createElement('div');
        group.className = 'config-form-group';
        group.innerHTML = `<label for="${id}">${label}</label>`;
        const select = document.createElement('select');
        select.id = id;
        select.name = id;
        options.forEach(opt => { select.add(new Option(opt.label, opt.value)); });
        select.value = value || '';
        group.appendChild(select);
        return group;
    };
    
    const mainConfig = document.createElement('div');
    const footer = document.createElement('div');
    footer.className = 'config-footer';
    footer.innerHTML = `
        <div class="label-group"><label for="label" class="text-sm font-medium text-gray-700">Etiqueta</label><input type="text" id="label" name="label" value="${step.params.label || ''}" class="w-full p-2 border rounded-md"></div>
        <div class="save-group"><button type="button" id="save-step-btn" class="bg-blue-600 hover:bg-blue-700 transition-colors duration-300">GUARDAR</button></div>`;
    
    if (step.type === 'comment') {
        mainConfig.innerHTML = `
            <div class="config-form-group">
                <label for="comment-text">Texto del Comentario</label>
                <textarea id="comment-text" name="comment" class="w-full p-2 border rounded-md" rows="5">${step.params.comment || ''}</textarea>
            </div>
        `;
    } else if (step.type === 'pause') {
        mainConfig.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <label for="timed-pause-toggle" class="font-medium text-gray-700">Pausa Temporizada</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="timed-pause-toggle" name="timed" ${step.params.timed ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div id="time-inputs" class="flex gap-4 mb-4" style="display: ${step.params.timed ? 'flex' : 'none'}">
                <div class="config-form-group flex-1">
                    <label for="pause-minutes">Minutos</label>
                    <input type="number" id="pause-minutes" name="minutes" value="${step.params.minutes || 0}" min="0" class="w-full">
                </div>
                <div class="config-form-group flex-1">
                    <label for="pause-seconds">Segundos</label>
                    <input type="number" id="pause-seconds" name="seconds" value="${step.params.seconds || 30}" min="0" max="59" class="w-full">
                </div>
            </div>
            <div id="pause-message-group" class="config-form-group" style="display: ${step.params.timed ? 'none' : 'block'}">
                <label for="pause-message">Mensaje de Pausa Manual</label>
                <input type="text" id="pause-message" name="message" value="${step.params.message || 'Pausa. Presione Reanudar para continuar.'}" class="w-full">
            </div>
        `;
    } else if (step.type === 'mix') {
        mainConfig.appendChild(createWellSelectorGroup('mixWells', 'Ubicación', step.params.mixSlot, step.params.mixWells || []));
        mainConfig.appendChild(createInput('repetitions', 'Repeticiones', 'number', step.params.repetitions, {min: 1, step: 1}));
        mainConfig.appendChild(createInput('volume', 'Volumen de Mezcla (µL)', 'number', step.params.volume, {min: 1, step: 0.1}));
        mainConfig.appendChild(createInput('flowrate', 'Flow Rate (µL/s)', 'number', step.params.flowrate, {placeholder: '150'}));
    } else if (step.type === 'aspirate') {
        mainConfig.appendChild(createInput('volume', 'Volumen a Aspirar (µL)', 'number', step.params.volume, {min: 0.1, step: 0.1}));
        mainConfig.appendChild(createWellSelectorGroup('sourceWells', 'Origen', step.params.sourceSlot, step.params.sourceWells || []));
        mainConfig.appendChild(createSimpleSlotSelector('destSlot', 'Bahía de Desecho', step.params.destSlot, occupiedSlots));
        mainConfig.appendChild(createGenericSelector('pipetteStrategy', 'Estrategia de Pipeteo', step.params.pipetteStrategy, [{ label: 'Misma punta', value: 'same_tip' }, { label: 'Punta nueva por pocillo', value: 'new_tip' }]));
    } else if (['transfer', 'distribute', 'consolidate', 'wash'].includes(step.type)) {
        mainConfig.appendChild(createInput('volume', 'Volumen (µL)', 'number', step.params.volume, {min: 0.1, step: 0.1}));
        mainConfig.appendChild(createInput('flowrate', 'Flow Rate (µL/s)', 'number', step.params.flowrate || 100, {placeholder: 'Min: 25, Max: 300'}));
        mainConfig.appendChild(createWellSelectorGroup('sourceWells', 'Origen', step.params.sourceSlot, step.params.sourceWells || []));
        mainConfig.appendChild(createWellSelectorGroup('destWells', 'Destino', step.params.destSlot, step.params.destWells || []));
        mainConfig.appendChild(createGenericSelector('pipetteStrategy', 'Estrategia de Pipeteo', step.params.pipetteStrategy, [{ label: 'Misma punta', value: 'same_tip' }, { label: 'Punta nueva por pocillo', value: 'new_tip' }]));
        
        if (step.type === 'wash') {
            mainConfig.appendChild(createInput('cycles', 'Ciclos', 'number', step.params.cycles, {min: 1, step: 1}));
            mainConfig.appendChild(createSimpleSlotSelector('wasteSlot', 'Bahía de Desecho', step.params.wasteSlot, occupiedSlots));
        }

        const adv = step.params.advanced || {};
        const advancedSection = document.createElement('div');
        advancedSection.className = 'mt-4 pt-4 border-t';
        advancedSection.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <label class="font-medium text-gray-700">Opciones Avanzadas</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="advanced-options-toggle" ${adv.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div id="advanced-options-container" class="space-y-4 p-3 bg-gray-50 rounded-md" style="display: ${adv.enabled ? 'block' : 'none'}">
                <div class="flex items-center justify-between"><label for="mix-enabled" class="text-sm font-medium">Mix</label><input type="checkbox" id="mix-enabled" ${adv.mix?.enabled ? 'checked' : ''}></div>
                <div id="mix-details" class="pl-4 space-y-2" style="display: ${adv.mix?.enabled ? 'block' : 'none'}">
                    <div class="grid grid-cols-3 gap-2 text-xs text-gray-500"><label>Repeticiones</label><label>Volumen (µL)</label><label>Flow Rate (µL/s)</label></div>
                    <div class="grid grid-cols-3 gap-2">
                        <input type="number" name="mix-repetitions" value="${adv.mix?.repetitions || 3}" class="text-sm p-1 w-full border rounded">
                        <input type="number" name="mix-volume" value="${adv.mix?.volume || step.params.volume}" class="text-sm p-1 w-full border rounded">
                        <input type="number" name="mix-flowrate" value="${adv.mix?.flowrate || 150}" class="text-sm p-1 w-full border rounded">
                    </div>
                </div>
                <div class="flex items-center justify-between"><label for="airgap-enabled" class="text-sm font-medium">Air Gap</label><input type="checkbox" id="airgap-enabled" ${adv.airgap?.enabled ? 'checked' : ''}></div>
                <div id="airgap-details" class="pl-4 space-y-1" style="display: ${adv.airgap?.enabled ? 'block' : 'none'}">
                    <label class="text-xs text-gray-500">Volumen (µL)</label>
                    <input type="number" name="airgap-volume" value="${adv.airgap?.volume || 5}" class="text-sm p-1 w-full border rounded">
                </div>
                <div class="flex items-center justify-between"><label for="blowout-enabled" class="text-sm font-medium">Blow Out</label><input type="checkbox" id="blowout-enabled" ${adv.blowout?.enabled ? 'checked' : ''}></div>
                <div id="blowout-details" class="pl-4 space-y-1" style="display: ${adv.blowout?.enabled ? 'block' : 'none'}">
                    <label class="text-xs text-gray-500">Volumen (µL)</label>
                    <input type="number" name="blowout-volume" value="${adv.blowout?.volume || 10}" class="text-sm p-1 w-full border rounded">
                </div>
                <div class="flex items-center justify-between"><label for="touchtip-enabled" class="text-sm font-medium">Touch Tip</label><input type="checkbox" id="touchtip-enabled" ${adv.touchtip ? 'checked' : ''}></div>
            </div>`;
        mainConfig.appendChild(advancedSection);
    }
    
    form.appendChild(mainConfig);
    form.appendChild(footer);
    form.querySelector('#save-step-btn').addEventListener('click', () => handleSaveStepConfig(step.id));
    return form;
}

export function populateWizardSelectors() {
    dom.sdPlateSlot.innerHTML = '';
    dom.sdDiluentSlot.innerHTML = '';
    dom.sdStockSlot.innerHTML = '';
    dom.sdStockWell.innerHTML = '';

    const wellPlates = [];
    const reservoirs = [];
    const allOccupied = [];

    for (const slotId in state.deck) {
        const labware = state.deck[slotId];
        if (labware) {
            const option = {
                text: `${labware.metadata.displayName} (Bahía ${slotId})`,
                value: slotId
            };
            allOccupied.push(option);
            if (labware.metadata.displayCategory === 'wellPlate') {
                wellPlates.push(option);
            }
            if (labware.metadata.displayCategory === 'reservoir') {
                reservoirs.push(option);
            }
        }
    }

    wellPlates.forEach(opt => dom.sdPlateSlot.add(new Option(opt.text, opt.value)));
    reservoirs.forEach(opt => dom.sdDiluentSlot.add(new Option(opt.text, opt.value)));
    allOccupied.forEach(opt => dom.sdStockSlot.add(new Option(opt.text, opt.value)));

    const populateWells = () => {
        dom.sdStockWell.innerHTML = '';
        const selectedSlotId = dom.sdStockSlot.value;
        const labware = state.deck[selectedSlotId];
        if (labware && labware.grid) {
            const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
            for (let r = 0; r < labware.grid.rows; r++) {
                for (let c = 0; c < labware.grid.columns; c++) {
                    const wellId = `${rowLabels[r]}${c + 1}`;
                    dom.sdStockWell.add(new Option(wellId, wellId));
                }
            }
        }
    };

    dom.sdStockSlot.addEventListener('change', populateWells);
    populateWells();
}

export function populateElisaWizard() {
    const form = dom.elisaForm;
    const assignmentContainer = dom.elisaReagentAssignmentContainer;
    const warningMessage = dom.elisaManualStepWarning;

    // Limpiar y preparar
    ['plateSlot', 'washBufferSlot', 'wasteSlot'].forEach(id => form.elements[id].innerHTML = '');
    assignmentContainer.innerHTML = '';
    
    // Clasificar labware de la mesa de trabajo
    const wellPlates = [], reservoirs = [], tipRacks = [], allOccupied = [];
    for (const slotId in state.deck) {
        const labware = state.deck[slotId];
        if (labware) {
            const option = { text: `${labware.metadata.displayName} (B${slotId})`, value: slotId };
            allOccupied.push(option);
            if (labware.metadata.displayCategory === 'wellPlate') wellPlates.push(option);
            if (labware.metadata.displayCategory === 'reservoir') reservoirs.push(option);
            if (labware.metadata.displayCategory === 'tipRack') tipRacks.push(option);
        }
    }
    
    // Poblar selectores generales
    wellPlates.forEach(opt => form.elements.plateSlot.add(new Option(opt.text, opt.value)));
    reservoirs.forEach(opt => form.elements.washBufferSlot.add(new Option(opt.text, opt.value)));
    allOccupied.forEach(opt => form.elements.wasteSlot.add(new Option(opt.text, opt.value)));

    function updateReagentAssignments() {
        // Calcular bahías disponibles para reactivos
        const fixedSlots = new Set([
            form.elements.plateSlot.value,
            form.elements.washBufferSlot.value,
            form.elements.wasteSlot.value,
            ...tipRacks.map(tr => tr.value)
        ]);
        const availableReagentSlots = allOccupied.filter(opt => !fixedSlots.has(opt.value));
        
        assignmentContainer.innerHTML = ''; // Limpiar asignaciones previas

        const elisaReagents = [
            { id: 'antigen', name: 'Antígeno', label: 'Coating (Antígeno)', vol: 100, time: 60 },
            { id: 'blocking', name: 'Bloqueo', label: 'Bloqueo', vol: 200, time: 30 },
            { id: 'primary', name: 'Primario', label: 'Muestra (Primario)', vol: 100, time: 60 },
            { id: 'secondary', name: 'Secundario', label: 'Detector (Secundario)', vol: 100, time: 45 },
            { id: 'substrate', name: 'Sustrato', label: 'Sustrato', vol: 100, time: 15 },
            { id: 'stop', name: 'Parada', label: 'Solución de Parada', vol: 100, time: 0 },
        ];

        const slotAssignments = {}; // { 'reagent_id': 'slot_id' }
        const replacementPlan = {}; // { 'reagent_id_new': 'reagent_id_old' }

        let slotIndex = 0;
        elisaReagents.forEach(reagent => {
            if (slotIndex < availableReagentSlots.length) {
                // Asignar a una bahía libre
                const slot = availableReagentSlots[slotIndex].value;
                slotAssignments[reagent.id] = slot;
                slotIndex++;
            } else {
                // Planificar un reemplazo
                const oldReagentIndex = Object.keys(replacementPlan).length % availableReagentSlots.length;
                const oldReagentId = elisaReagents[oldReagentIndex].id;
                replacementPlan[reagent.id] = oldReagentId;
            }
        });

        warningMessage.classList.toggle('hidden', Object.keys(replacementPlan).length === 0);

        // Renderizar la UI para cada reactivo
        elisaReagents.forEach((reagent, index) => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg';
            row.style.backgroundColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';

            let assignmentHTML = '';
            if (slotAssignments[reagent.id]) {
                const slotId = slotAssignments[reagent.id];
                const labwareName = state.deck[slotId]?.metadata.displayName || 'Bahía Desconocida';
                assignmentHTML = `<div class="col-span-4 text-sm font-medium text-gray-700 bg-gray-100 p-2 rounded-md">Usará: <b>${labwareName} (B${slotId})</b></div>
                                  <input type="hidden" name="${reagent.id}_slot" value="${slotId}">`;
            } else if (replacementPlan[reagent.id]) {
                const oldReagentId = replacementPlan[reagent.id];
                const slotToReplace = slotAssignments[oldReagentId];
                const oldReagentName = elisaReagents.find(r => r.id === oldReagentId).name;
                assignmentHTML = `<div class="col-span-4 text-sm font-medium text-yellow-800 bg-yellow-100 p-2 rounded-md">Pausa y Reemplaza a <b>${oldReagentName}</b></div>
                                  <input type="hidden" name="${reagent.id}_slot" value="manual_change">
                                  <input type="hidden" name="${reagent.id}_replaces" value="${oldReagentId}">`;
            } else {
                 assignmentHTML = `<div class="col-span-4 text-sm text-gray-400">No hay bahías disponibles</div>
                                   <input type="hidden" name="${reagent.id}_slot" value="">`;
            }
            
            row.innerHTML = `
                <div class="col-span-4 font-medium text-gray-800">${reagent.label}</div>
                ${assignmentHTML}
                <div class="col-span-2"><input type="number" name="${reagent.id}_volume" value="${reagent.vol}" class="w-full p-1 border rounded-md text-xs"></div>
                <div class="col-span-2"><input type="number" name="${reagent.id}_incubation" value="${reagent.time}" class="w-full p-1 border rounded-md text-xs"></div>
            `;
            assignmentContainer.appendChild(row);
        });
    }
    
    ['plateSlot', 'washBufferSlot', 'wasteSlot'].forEach(id => {
        form.elements[id].addEventListener('change', updateReagentAssignments);
    });

    updateReagentAssignments();
}

// ======================= INICIO DEL CAMBIO =======================
export function populateAlamarBlueWizard() {
    const form = dom.alamarBlueForm;
    const wellPlates48 = [];
    const wellPlates96 = [];
    const reservoirs = [];
    const allOccupied = [];

    for (const slotId in state.deck) {
        const labware = state.deck[slotId];
        if (labware) {
            const option = { text: `${labware.metadata.displayName} (B${slotId})`, value: slotId };
            allOccupied.push(option);
            if (labware.metadata.displayCategory === 'wellPlate' && labware.grid.rows === 6) {
                wellPlates48.push(option);
            }
            if (labware.metadata.displayCategory === 'wellPlate' && labware.grid.rows === 8) {
                wellPlates96.push(option);
            }
            if (labware.metadata.displayCategory === 'reservoir') {
                reservoirs.push(option);
            }
        }
    }

    // Limpiar selectores
    ['culturePlateSlot', 'readPlateSlot', 'wasteSlot', 'pbsSlot', 'reagentSlot'].forEach(id => {
        if (form.elements[id]) form.elements[id].innerHTML = '';
    });

    // Poblar
    wellPlates48.forEach(opt => form.elements.culturePlateSlot.add(new Option(opt.text, opt.value)));
    wellPlates96.forEach(opt => form.elements.readPlateSlot.add(new Option(opt.text, opt.value)));
    allOccupied.forEach(opt => form.elements.wasteSlot.add(new Option(opt.text, opt.value)));
    reservoirs.forEach(opt => form.elements.pbsSlot.add(new Option(opt.text, opt.value)));
    reservoirs.forEach(opt => form.elements.reagentSlot.add(new Option(opt.text, opt.value)));

    // Actualizar el texto de los botones con el número de pocillos seleccionados
    if (dom.abSelectAssayWellsBtn) {
        dom.abSelectAssayWellsBtn.textContent = `Seleccionar Pocillos de Ensayo (${state.wizardAssayWells.size})`;
    }
    if (dom.abSelectControlWellsBtn) {
        dom.abSelectControlWellsBtn.textContent = `Seleccionar Pocillos de Control (${state.wizardControlWells.size})`;
    }
}
// ======================== FIN DEL CAMBIO =========================

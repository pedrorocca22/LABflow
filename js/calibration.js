import { state, dom, activeLabwareLibrary, BAY_COORDINATES } from './state.js';
import { saveLabwareLibrary, closeModal } from './events.js';
import { renderModals, renderLabwareLibrary } from './ui.js';

export function startCalibration(labwareId) {
    const labware = activeLabwareLibrary[labwareId];
    if (!labware) return;

    const bayId = prompt("Por favor, introduce el número de la bahía (1-6) donde has colocado el labware para calibrar:");
    if (!bayId || !BAY_COORDINATES[bayId]) {
        alert("Número de bahía inválido.");
        return;
    }
    
    if (labware.metadata.displayCategory === 'wellPlate') {
        initializeWellPlateWizard(labwareId, bayId);
    } else if (labware.metadata.displayCategory === 'tipRack') {
        initializeTipRackWizard(labwareId, bayId);
    } else {
        alert('La calibración para esta categoría de labware aún no está implementada.');
        return;
    }

    dom.jogModalTitle.textContent = `Calibrando: ${labware.metadata.displayName}`;
    updateJogInstructions();
    state.modal = 'jogControl';
    renderModals();
}

function initializeWellPlateWizard(labwareId, bayId) {
    const labware = activeLabwareLibrary[labwareId];
    state.calibrationState = {
        active: true,
        wizardType: 'wellPlate',
        labwareId: labwareId,
        bayId: bayId,
        currentStep: 0,
        pointsToCalibrate: ['Posición XY del pocillo A1', 'Profundidad Z del pocillo A1', 'Altura Z de seguridad'],
        recordedPoints: {},
        currentMachinePos: { x: 50, y: 50, z: 100 }
    };
    
    dom.wizardInputs.innerHTML = `
        <div class="p-3 border rounded-lg bg-gray-50 text-sm required-field-group">
            <div>
                <label for="spacing-input" class="block font-medium text-gray-700">Espaciado entre pocillos (mm)</label>
                <input type="number" id="spacing-input" value="${labware.wellProperties.spacing || 9}" class="mt-1 w-full p-2 border rounded-md">
            </div>
        </div>`;
    dom.savePointBtn.classList.remove('hidden');
    dom.finishCalibrationBtn.classList.add('hidden');
}

function initializeTipRackWizard(labwareId, bayId) {
    const labware = activeLabwareLibrary[labwareId];
    state.calibrationState = {
        active: true,
        wizardType: 'tipRack',
        labwareId: labwareId,
        bayId: bayId,
        currentStep: 0,
        pointsToCalibrate: ['Posición XY de la punta A1', 'Altura Z de aproximación', 'Profundidad Z de recogida (MODO LENTO)'],
        recordedPoints: {},
        currentMachinePos: { x: 50, y: 50, z: 100 }
    };
    
    dom.wizardInputs.innerHTML = `
        <div class="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-gray-50 text-sm">
            <div class="required-field-group">
                <label for="spacing-input" class="block font-medium text-gray-700">Espaciado (mm)</label>
                <input type="number" id="spacing-input" value="${labware.wellProperties.spacing || 9}" class="mt-1 w-full p-2 border rounded-md">
            </div>
             <div class="required-field-group">
                <label for="tip-volume-input" class="block font-medium text-gray-700">Volumen Punta (µL)</label>
                <input type="number" id="tip-volume-input" value="${labware.wellProperties.maxVolume || 200}" class="mt-1 w-full p-2 border rounded-md">
            </div>
        </div>`;
    dom.savePointBtn.classList.remove('hidden');
    dom.finishCalibrationBtn.classList.add('hidden');
}

export function updateJogInstructions() {
    const { currentStep, pointsToCalibrate } = state.calibrationState;
    dom.wizardInputs.style.display = 'none';
    
    if (currentStep < pointsToCalibrate.length) {
        const pointName = pointsToCalibrate[currentStep];
        let instructionHTML = `<b>Paso ${currentStep + 1}/${pointsToCalibrate.length + 1}:</b> Mueva el cabezal a la <b>${pointName}</b> y pulse "Guardar Punto".`;
        
        if (pointName.includes("MODO LENTO")) {
            instructionHTML += `<br><span class="text-red-600 font-semibold text-xs">
                ¡MÁXIMA PRECAUCIÓN! El recorrido total desde la altura de aproximación es de solo 4-6 mm. Baje el cabezal en pasos de 1 mm hasta que la punta se ajuste firmemente. NO FUERCE EL MOVIMIENTO.
            </span>`;
        }
        dom.jogInstructions.innerHTML = instructionHTML;
        dom.savePointBtn.textContent = 'Guardar Punto';
    } else {
        dom.jogInstructions.innerHTML = `<b>Paso ${pointsToCalibrate.length + 1}/${pointsToCalibrate.length + 1}:</b> Confirma los datos y pulsa "Finalizar Calibración".`;
        dom.wizardInputs.style.display = 'block';
        dom.savePointBtn.classList.add('hidden');
        dom.finishCalibrationBtn.classList.remove('hidden');
    }
}

export function handleJog(axis, direction) {
    const { wizardType, currentStep, pointsToCalibrate } = state.calibrationState;
    let step = parseFloat(document.getElementById('jog-step').value);

    if (wizardType === 'tipRack' && axis === 'z' && direction === -1 && pointsToCalibrate[currentStep]?.includes('MODO LENTO')) {
        step = 1;
    }

    console.log('JOG:', { axis, direction, step });
    
    state.calibrationState.currentMachinePos[axis] += step * direction;
    dom.currentCoords.textContent = `X:${state.calibrationState.currentMachinePos.x.toFixed(1)} Y:${state.calibrationState.currentMachinePos.y.toFixed(1)} Z:${state.calibrationState.currentMachinePos.z.toFixed(1)}`;
}

export function handleSavePoint() {
    const { currentStep, pointsToCalibrate, currentMachinePos } = state.calibrationState;
    const pointName = pointsToCalibrate[currentStep];
    
    state.calibrationState.recordedPoints[pointName] = { ...currentMachinePos };
    console.log(`Punto guardado "${pointName}":`, state.calibrationState.recordedPoints[pointName]);
    
    state.calibrationState.currentStep++;
    updateJogInstructions();
}

export function handleFinishCalibration() {
    const { wizardType } = state.calibrationState;
    if (wizardType === 'wellPlate') finishWellPlateCalibration();
    else if (wizardType === 'tipRack') finishTipRackCalibration();
}

function finishWellPlateCalibration() {
    const { labwareId, bayId, recordedPoints } = state.calibrationState;
    const labware = activeLabwareLibrary[labwareId];
    const bayCenter = BAY_COORDINATES[bayId];

    const spacing = parseFloat(document.getElementById('spacing-input').value);
    if (isNaN(spacing)) {
        alert("Por favor, introduce un valor numérico válido para el espaciado.");
        return;
    }
    
    const posA1_XY = recordedPoints['Posición XY del pocillo A1'];
    const posA1_Z = recordedPoints['Profundidad Z del pocillo A1'];
    const pos_safeZ = recordedPoints['Altura Z de seguridad'];

    if (!posA1_XY || !posA1_Z || !pos_safeZ) {
        alert("Faltan puntos por calibrar. Por favor, completa todos los pasos.");
        return;
    }

    const offsetX_A1 = posA1_XY.x - bayCenter.x;
    const offsetY_A1 = posA1_XY.y - bayCenter.y;
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    const finalCalibration = {
        z_safe: pos_safeZ.z,
        z_bottom: posA1_Z.z,
        wells: {}
    };

    for (let r = 0; r < labware.grid.rows; r++) {
        for (let c = 0; c < labware.grid.columns; c++) {
            const wellId = `${rowLabels[r]}${c + 1}`;
            finalCalibration.wells[wellId] = {
                dx: offsetX_A1 + (c * spacing),
                dy: offsetY_A1 + (r * spacing)
            };
        }
    }

    labware.calibration = finalCalibration;
    saveLabwareLibrary();
    alert(`¡Calibración para "${labware.metadata.displayName}" guardada con éxito!`);
    closeModal();
    renderLabwareLibrary();
}

function finishTipRackCalibration() {
    const { labwareId, bayId, recordedPoints } = state.calibrationState;
    const labware = activeLabwareLibrary[labwareId];
    const bayCenter = BAY_COORDINATES[bayId];

    const spacing = parseFloat(document.getElementById('spacing-input').value);
    const tipVolume = parseFloat(document.getElementById('tip-volume-input').value);
    if (isNaN(spacing) || isNaN(tipVolume)) {
        alert("Por favor, introduce valores numéricos válidos.");
        return;
    }

    const posA1_XY = recordedPoints['Posición XY de la punta A1'];
    const pos_approachZ = recordedPoints['Altura Z de aproximación'];
    const pos_pickupZ = recordedPoints['Profundidad Z de recogida (MODO LENTO)'];
    
    if (!posA1_XY || !pos_approachZ || !pos_pickupZ) {
        alert("Faltan puntos por calibrar. Por favor, completa todos los pasos.");
        return;
    }

    const offsetX_A1 = posA1_XY.x - bayCenter.x;
    const offsetY_A1 = posA1_XY.y - bayCenter.y;
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    const finalCalibration = {
        z_approach: pos_approachZ.z,
        z_pickup: pos_pickupZ.z,
        wells: {}
    };

    for (let r = 0; r < labware.grid.rows; r++) {
        for (let c = 0; c < labware.grid.columns; c++) {
            const wellId = `${rowLabels[r]}${c + 1}`;
            finalCalibration.wells[wellId] = {
                dx: offsetX_A1 + (c * spacing),
                dy: offsetY_A1 + (r * spacing)
            };
        }
    }

    labware.calibration = finalCalibration;
    labware.wellProperties.maxVolume = tipVolume;
    saveLabwareLibrary();
    alert(`¡Calibración para "${labware.metadata.displayName}" guardada con éxito!`);
    closeModal();
    renderLabwareLibrary();
}

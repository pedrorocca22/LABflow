import { state, dom } from './state.js';
import { renderAll } from './ui.js';
import { closeModal, saveStateToHistory, addStep } from './events.js';

/**
 * wizards.js
 * Este módulo contiene la lógica para los asistentes (wizards) que generan
 * secuencias complejas de protocolo a partir de una entrada de usuario simplificada.
 */

export function handleSerialDilutionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dom.serialDilutionForm);
    const data = Object.fromEntries(formData.entries());

    const requiredFields = ['plateSlot', 'diluentSlot', 'stockSlot', 'stockWell', 'finalVolume', 'dilutionFactor', 'dilutionCount'];
    for (const field of requiredFields) {
        if (!data[field]) {
            alert(`Error: El campo "${field}" es obligatorio.`);
            return;
        }
    }

    const { plateSlot, diluentSlot, stockSlot, stockWell, tipStrategy } = data;
    const finalVolume = parseFloat(data.finalVolume);
    const dilutionFactor = parseFloat(data.dilutionFactor);
    const dilutionCount = parseInt(data.dilutionCount, 10);

    const transferVolume = finalVolume / dilutionFactor;
    const diluentVolume = finalVolume - transferVolume;

    const plate = state.deck[plateSlot];
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    const allWells = [];
    for (let r = 0; r < plate.grid.rows; r++) {
        for (let c = 0; c < plate.grid.columns; c++) {
            allWells.push(`${rowLabels[r]}${c + 1}`);
        }
    }

    const stockWellIsOnPlate = stockSlot === plateSlot;
    const stockWellIndex = allWells.indexOf(stockWell);
    
    let seriesStartWellIndex = 0;
    if (stockWellIsOnPlate) {
        seriesStartWellIndex = stockWellIndex;
    }

    if (seriesStartWellIndex + dilutionCount >= allWells.length) {
        alert("Error: No hay suficientes pocillos consecutivos en la placa para realizar todas las diluciones desde la posición de inicio.");
        return;
    }

    const firstWellOfSeries = allWells[seriesStartWellIndex];
    const subsequentWells = allWells.slice(seriesStartWellIndex + 1, seriesStartWellIndex + 1 + dilutionCount);
    
    const newSteps = [];

    if (subsequentWells.length > 0) {
        newSteps.push({
            id: `step_${Date.now()}_add_diluent_subsequent`,
            type: 'distribute',
            params: {
                label: `Dilución: Preparar Diluyente`,
                color: '#a7f3d0',
                volume: diluentVolume,
                sourceSlot: diluentSlot,
                sourceWells: ['A1'], 
                destSlot: plateSlot,
                destWells: subsequentWells,
                pipetteStrategy: 'same_tip',
                advanced: { enabled: false, mix: {}, airgap: {}, blowout: {}, touchtip: false }
            }
        });
    }

    newSteps.push({
        id: `step_${Date.now()}_transfer_stock`,
        type: 'transfer',
        params: {
            label: `Dilución: Añadir Sol. Madre a ${firstWellOfSeries}`,
            color: '#fecaca',
            volume: transferVolume,
            sourceSlot: stockSlot,
            sourceWells: [stockWell],
            destSlot: plateSlot,
            destWells: [firstWellOfSeries],
            pipetteStrategy: tipStrategy, 
            advanced: { enabled: false, mix: {}, airgap: {}, blowout: {}, touchtip: false }
        }
    });
    
    newSteps.push({
        id: `step_${Date.now()}_add_diluent_first`,
        type: 'transfer',
        params: {
            label: `Dilución: Añadir Diluyente a ${firstWellOfSeries}`,
            color: '#a7f3d0',
            volume: diluentVolume,
            sourceSlot: diluentSlot,
            sourceWells: ['A1'],
            destSlot: plateSlot,
            destWells: [firstWellOfSeries],
            pipetteStrategy: 'same_tip',
            advanced: { enabled: true, mix: { enabled: true, repetitions: 5, volume: finalVolume * 0.75, flowrate: 150 }, airgap: {}, blowout: {}, touchtip: false }
        }
    });

    for (let i = 0; i < subsequentWells.length; i++) {
        const sourceWell = i === 0 ? firstWellOfSeries : subsequentWells[i-1];
        const destWell = subsequentWells[i];
        
        newSteps.push({
            id: `step_${Date.now()}_transfer_series_${i}`,
            type: 'transfer',
            params: {
                label: `Dilución ${i+1}: ${sourceWell} -> ${destWell}`,
                color: '#bfdbfe',
                volume: transferVolume,
                sourceSlot: plateSlot,
                sourceWells: [sourceWell],
                destSlot: plateSlot,
                destWells: [destWell],
                pipetteStrategy: tipStrategy,
                advanced: {
                    enabled: true,
                    mix: { enabled: true, repetitions: 5, volume: finalVolume * 0.75, flowrate: 150 },
                    airgap: { enabled: false, volume: 5 },
                    blowout: { enabled: false, volume: 10 },
                    touchtip: false
                }
            }
        });
    }

    state.protocolSequence.push(...newSteps);
    closeModal();
    saveStateToHistory();
    renderAll();
}

export function handleElisaSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dom.elisaForm);
    const newSteps = [];

    const { plateSlot, washBufferSlot, wasteSlot, washVolume, washRepetitions } = Object.fromEntries(formData.entries());

    const plate = state.deck[plateSlot];
    if (!plate) {
        alert("Error: La placa de ensayo seleccionada no es válida.");
        return;
    }
    const allWells = Array.from({ length: plate.grid.rows * plate.grid.columns }, (_, i) => {
        const row = String.fromCharCode(65 + Math.floor(i / plate.grid.columns));
        const col = (i % plate.grid.columns) + 1;
        return `${row}${col}`;
    });

    const elisaReagents = [
        { id: 'antigen', name: 'Antígeno', label: 'ELISA: Coating (Antígeno)', color: '#fecaca' },
        { id: 'blocking', name: 'Bloqueo', label: 'ELISA: Bloqueo', color: '#fde68a' },
        { id: 'primary', name: 'Primario', label: 'ELISA: Muestra (Primario)', color: '#bfdbfe' },
        { id: 'secondary', name: 'Secundario', label: 'ELISA: Detector (Secundario)', color: '#e9d5ff' },
        { id: 'substrate', name: 'Sustrato', label: 'ELISA: Sustrato', color: '#a7f3d0' },
        { id: 'stop', name: 'Parada', label: 'ELISA: Solución de Parada', color: '#facc15' },
    ];

    let pauseInserted = false;
    const finalSlotAssignments = {}; 

    elisaReagents.forEach(reagent => {
        const slot = formData.get(`${reagent.id}_slot`);
        if (slot === 'manual_change') {
            const replacedReagentId = formData.get(`${reagent.id}_replaces`);
            finalSlotAssignments[reagent.id] = finalSlotAssignments[replacedReagentId];
        } else {
            finalSlotAssignments[reagent.id] = slot;
        }
    });

    elisaReagents.forEach(reagent => {
        const slot = formData.get(`${reagent.id}_slot`);
        if (!slot) return; 

        const volume = parseFloat(formData.get(`${reagent.id}_volume`));
        const incubation = parseInt(formData.get(`${reagent.id}_incubation`), 10);
        const sourceSlot = finalSlotAssignments[reagent.id];

        if (slot === 'manual_change' && !pauseInserted) {
            const replacedReagentId = formData.get(`${reagent.id}_replaces`);
            const oldReagent = elisaReagents.find(r => r.id === replacedReagentId);
            const slotToReplace = finalSlotAssignments[replacedReagentId];
            newSteps.push({
                id: `step_${Date.now()}_manual_change`,
                type: 'pause',
                params: {
                    label: `Pausa para Cambio de Reactivo`,
                    color: '#f59e0b',
                    timed: false,
                    message: `PAUSA: Reemplace '${oldReagent.name}' en la Bahía ${slotToReplace} con '${reagent.name}'. Luego presione Reanudar.`
                }
            });
            pauseInserted = true;
        }
        
        newSteps.push({
            id: `step_${Date.now()}_${reagent.id}_distribute`,
            type: 'distribute',
            params: { label: reagent.label, color: reagent.color, volume, sourceSlot, sourceWells: ['A1'], destSlot: plateSlot, destWells: allWells, pipetteStrategy: 'same_tip' }
        });

        if (incubation > 0) {
            newSteps.push({
                id: `step_${Date.now()}_${reagent.id}_pause`,
                type: 'pause',
                params: { label: `ELISA: Incubación ${reagent.name}`, color: '#e5e7eb', timed: true, minutes: incubation, seconds: 0 }
            });
        }

        if (reagent.id !== 'stop') {
            newSteps.push({
                id: `step_${Date.now()}_${reagent.id}_aspirate`,
                type: 'aspirate',
                params: { label: `ELISA: Aspirar ${reagent.name}`, color: '#fca5a5', volume, sourceSlot: plateSlot, destSlot: wasteSlot, sourceWells: allWells, pipetteStrategy: 'same_tip' }
            });
            newSteps.push({
                id: `step_${Date.now()}_${reagent.id}_wash`,
                type: 'wash',
                params: { label: `ELISA: Ciclo de Lavado`, color: '#ccfbf1', volume: parseFloat(washVolume), sourceSlot: washBufferSlot, destSlot: plateSlot, destWells: allWells, wasteSlot, cycles: parseInt(washRepetitions, 10), pipetteStrategy: 'same_tip' }
            });
        }
    });
    
    newSteps.push({
        id: `step_${Date.now()}_elisa_end`,
        type: 'comment',
        params: { label: 'Final del Protocolo ELISA', color: '#6b7280', comment: 'Ensayo ELISA finalizado. Proceder a la lectura.' }
    });

    state.protocolSequence.push(...newSteps);
    closeModal();
    saveStateToHistory();
    renderAll();
}

// ======================= INICIO DEL CAMBIO =======================
export function handleAlamarBlueSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dom.alamarBlueForm);
    const data = Object.fromEntries(formData.entries());

    // Leer los pocillos desde el estado persistente del asistente
    const assayWells = Array.from(state.wizardAssayWells);
    const controlWells = Array.from(state.wizardControlWells);

    // Validar que se hayan seleccionado pocillos de ensayo
    if (assayWells.length === 0) {
        alert("Error: Debes seleccionar los pocillos de ensayo.");
        return;
    }

    const {
        culturePlateSlot, readPlateSlot, wasteSlot, pbsSlot, reagentSlot,
        washCount, washVolume, reagentVolume, incubationHours, transferVolume
    } = data;

    const newSteps = [];
    const allCultureWells = [...new Set([...assayWells, ...controlWells])];

    // 1. Aspirar medio de cultivo
    newSteps.push({
        type: 'aspirate',
        params: {
            label: 'AlamarBlue: Aspirar Medio de Cultivo',
            color: '#ef4444',
            volume: 500, // Asumido del protocolo, podría ser un parámetro
            sourceSlot: culturePlateSlot,
            destSlot: wasteSlot,
            sourceWells: allCultureWells,
            pipetteStrategy: 'new_tip'
        }
    });

    // 2. Lavar con PBS
    newSteps.push({
        type: 'wash',
        params: {
            label: 'AlamarBlue: Lavado con PBS',
            color: '#3b82f6',
            volume: parseFloat(washVolume),
            cycles: parseInt(washCount, 10),
            sourceSlot: pbsSlot,
            destSlot: culturePlateSlot,
            wasteSlot: wasteSlot,
            destWells: allCultureWells,
            pipetteStrategy: 'new_tip'
        }
    });

    // 3. Añadir reactivo AlamarBlue
    newSteps.push({
        type: 'distribute',
        params: {
            label: 'AlamarBlue: Añadir Reactivo',
            color: '#8b5cf6',
            volume: parseFloat(reagentVolume),
            sourceSlot: reagentSlot,
            sourceWells: ['A1'],
            destSlot: culturePlateSlot,
            destWells: allCultureWells, // Se añade a todos, ensayo y control
            pipetteStrategy: 'same_tip'
        }
    });

    // 4. Pausa para incubación manual
    newSteps.push({
        type: 'pause',
        params: {
            label: 'AlamarBlue: Incubación Manual',
            color: '#f59e0b',
            timed: false,
            message: `PAUSA: Cubrir la placa con aluminio, incubar por ${incubationHours} horas (37°C, 5% CO2). Luego, volver a colocar la placa en la bahía ${culturePlateSlot} y presionar Reanudar.`
        }
    });

    // 5. Transferir a placa de lectura
    newSteps.push({
        type: 'transfer',
        params: {
            label: 'AlamarBlue: Transferir para Lectura',
            color: '#10b981',
            volume: parseFloat(transferVolume),
            sourceSlot: culturePlateSlot,
            sourceWells: allCultureWells,
            destSlot: readPlateSlot,
            destWells: allCultureWells, // Asume mapeo 1 a 1, podría necesitar lógica más compleja
            pipetteStrategy: 'new_tip'
        }
    });

    // 6. Comentario final
    newSteps.push({
        type: 'comment',
        params: {
            label: 'Final del Ensayo',
            comment: 'Ensayo AlamarBlue finalizado. Proceder a la lectura en espectrofotómetro.'
        }
    });

    // Añadir IDs únicos a cada paso
    newSteps.forEach(step => step.id = `step_${Date.now()}_${Math.random()}`);

    state.protocolSequence.push(...newSteps);

    // Limpiar los sets del asistente una vez que se ha generado el protocolo
    state.wizardAssayWells.clear();
    state.wizardControlWells.clear();

    closeModal();
    saveStateToHistory();
    renderAll();
}
// ======================== FIN DEL CAMBIO =========================

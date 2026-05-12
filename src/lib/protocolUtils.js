export function calculateWellVolumes(targetSlotId, sequence) {
  const wellVolumes = new Map();
  if (!targetSlotId) return wellVolumes;

  sequence.forEach((step) => {
    const volumePerWell = step.params.volume || 0;

    if (step.params.sourceSlot === targetSlotId) {
      (step.params.sourceWells || []).forEach((wellId) => {
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
        (step.params.destWells || []).forEach((wellId) => {
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
      summary: 'Protocolo vacío, sin acciones definidas.',
      stepCount: 0,
      labwareCount: 0,
      mainActions: [],
      labwareUsed: [],
      movementLog: [],
    };
  }

  const stepCount = sequence.length;
  const labwareInUse = Object.values(deck).filter(Boolean);
  const labwareCount = labwareInUse.length;
  const mainActions = [...new Set(sequence.map((step) => step.type))];
  const labwareUsed = [...new Set(labwareInUse.map((lw) => lw.metadata.displayName))];

  let summary = `Protocolo de ${stepCount} paso${stepCount > 1 ? 's' : ''}. `;
  summary += `Utiliza ${labwareCount} elemento${labwareCount > 1 ? 's' : ''} de labware.`;

  const movementLog = sequence.map((step) => {
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
      case 'wash': {
        const wasteName = deck[params.wasteSlot]?.metadata.displayName || `Bahía ${params.wasteSlot}`;
        return `Lavar ${destName} (${(params.destWells || []).length} pocillos) usando ${sourceName}. Desecho en ${wasteName}. (${params.cycles} ciclos de ${params.volume}µL).`;
      }
      case 'pause':
        return params.timed ? `Pausa por ${params.minutes}m ${params.seconds}s.` : `Pausa manual: ${params.message}`;
      case 'comment':
        return `Comentario: ${params.comment}`;
      case 'mix': {
        const mixLocation = deck[params.mixSlot]?.metadata.displayName || `Bahía ${params.mixSlot}`;
        return `Mezclar en ${mixLocation} (${(params.mixWells || []).length} pocillos), ${params.repetitions} veces con ${params.volume}µL.`;
      }
      default:
        return '';
    }
  });

  return { summary, stepCount, labwareCount, mainActions, labwareUsed, movementLog };
}

export function generateGcodeForSequence(sequence, deck) {
  const gcode = [];
  gcode.push('G90 ; Usar coordenadas absolutas');

  sequence.forEach((step) => {
    gcode.push(`; ----- ${step.params.label || step.type} -----`);
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

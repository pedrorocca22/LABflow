export const BAY_COORDINATES = {
    '1': { x: 150.0, y: 75.0 }, '2': { x: 250.0, y: 75.0 },
    '3': { x: 150.0, y: 150.0 }, '4': { x: 250.0, y: 150.0 },
    '5': { x: 150.0, y: 225.0 }, '6': { x: 250.0, y: 225.0 }
};

export const DEFAULT_LABWARE_LIBRARY = {
    'corning_96_wellplate_360ul_flat': { metadata: { displayName: 'Placa 96 Pocillos (360µL)', displayCategory: 'wellPlate', brand: 'Corning', isSource: false }, dimensions: { xDimension: 127.76, yDimension: 85.48 }, grid: { rows: 8, columns: 12 }, wellProperties: { diameter: 6.86, spacing: 9, offset: { x: 14.38, y: 11.24 }, bottomZ: 1.0, maxVolume: 360, wellBottomShape: 'flat' } },
    'generic_48_wellplate_1.6ml': { metadata: { displayName: 'Placa 48 Pocillos (1.6mL)', displayCategory: 'wellPlate', brand: 'Genérico', isSource: false }, dimensions: { xDimension: 127.76, yDimension: 85.48 }, grid: { rows: 6, columns: 8 }, wellProperties: { diameter: 11, spacing: 13, offset: { x: 18.38, y: 10.24 }, bottomZ: 0.8, maxVolume: 1600, wellBottomShape: 'conical' } },
    'opentrons_96_tiprack_300ul': { metadata: { displayName: 'Opentrons Rack Puntas 300µL', displayCategory: 'tipRack', isSource: false }, dimensions: { xDimension: 127.76, yDimension: 85.48 }, grid: { rows: 8, columns: 12 }, wellProperties: { diameter: 5, spacing: 9, offset: { x: 14.38, y: 11.24 }, bottomZ: 0.5, maxVolume: 300 } },
    'nest_1_reservoir_195ml': { metadata: { displayName: 'Reservorio Simple (195mL)', displayCategory: 'reservoir', isSource: true }, dimensions: { xDimension: 127.76, yDimension: 85.48 }, grid: { rows: 1, columns: 1}, wellProperties: { diameter: 80, spacing: 0, offset: { x: 63.88, y: 42.74 }, bottomZ: 1.2, maxVolume: 195000 } },
    'waste_reservoir': { metadata: { displayName: 'Reservorio de Desechos', displayCategory: 'reservoir', isSource: true }, dimensions: { xDimension: 127.76, yDimension: 85.48 }, grid: { rows: 1, columns: 1}, wellProperties: { diameter: 80, spacing: 0, offset: { x: 63.88, y: 42.74 }, bottomZ: 1.2, maxVolume: 300000 } }
};

export const COLOR_PALETTE = ['#a7f3d0', '#bfdbfe', '#fde68a', '#fecaca', '#e9d5ff', '#fbcfe8', '#ccfbf1', '#dbeafe', '#fef3c7', '#fee2e2'];

export let activeLabwareLibrary = {};
export let savedProtocols = {};

export const state = {
    deck: { '1': null, '2': null, '3': null, '4': null, '5': null, '6': null },
    protocolSequence: [],
    modal: null,
    modalSlotId: null,
    viewingSlotId: null,
    activeStepId: null,
    tempSelectedSourceWells: new Set(),
    tempSelectedDestWells: new Set(),
    activeWellSelectionTarget: null, 
    activeTab: 'workflow',
    labwareIdToDelete: null,
    labwareIdToEdit: null,
    protocolNameToDelete: null,
    dragSelection: {
        isActive: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    },
    history: [],
    historyIndex: -1,
    protocolWarnings: [], 
    // ======================= INICIO DEL CAMBIO =======================
    wizardAssayWells: new Set(),
    wizardControlWells: new Set(),
    // ======================== FIN DEL CAMBIO =========================
    calibrationState: {
        active: false,
        wizardType: null,
        labwareId: null,
        bayId: null,
        currentStep: 0,
        pointsToCalibrate: [],
        recordedPoints: {},
        currentMachinePos: { x: 50, y: 50, z: 100 } 
    },
};

export const dom = {
    labDeck: document.getElementById('lab-deck'),
    labwareDetailView: document.getElementById('labware-detail-view'),
    labwareModal: document.getElementById('labware-modal'),
    labwareOptions: document.getElementById('labware-options'),
    cancelLabwareBtn: document.getElementById('cancel-labware-selection'),
    routineSteps: document.getElementById('routine-steps'),
    addStepBtn: document.getElementById('add-step-btn'),
    configPanelTitle: document.getElementById('config-panel-title'),
    configPanelContent: document.getElementById('config-panel-content'),
    addActionModal: document.getElementById('add-action-modal'),
    actionOptions: document.getElementById('action-options'),
    cancelActionBtn: document.getElementById('cancel-action-selection'),
    tabWorkflow: document.getElementById('tab-workflow'),
    tabLabware: document.getElementById('tab-labware'),
    tabGallery: document.getElementById('tab-gallery'),
    tabControl: document.getElementById('tab-control'),
    panelWorkflow: document.getElementById('panel-workflow'),
    panelLabware: document.getElementById('panel-labware'),
    panelGallery: document.getElementById('panel-gallery'),
    panelControl: document.getElementById('panel-control'),
    labwareLibraryContent: document.getElementById('labware-library-content'),
    protocolGalleryContent: document.getElementById('protocol-gallery-content'),
    addLabwareBtn: document.getElementById('add-labware-btn'),
    addLabwareModal: document.getElementById('add-labware-modal'),
    addLabwareForm: document.getElementById('add-labware-form'),
    cancelAddLabwareBtn: document.getElementById('cancel-add-labware'),
    labwareDisplayCategory: document.getElementById('labware-displayCategory'),
    wellBottomShapeGroup: document.getElementById('well-bottom-shape-group'),
    labwareModalTitle: document.getElementById('labware-modal-title'),
    labwareIsSource: document.getElementById('labware-isSource'),
    isSourceContainer: document.getElementById('is-source-container'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    deleteModalTitle: document.getElementById('delete-modal-title'),
    deleteModalText: document.getElementById('delete-modal-text'),
    saveProtocolBtn: document.getElementById('save-protocol-btn'),
    saveProtocolModal: document.getElementById('save-protocol-modal'),
    saveProtocolForm: document.getElementById('save-protocol-form'),
    cancelSaveProtocolBtn: document.getElementById('cancel-save-protocol'),
    jogControlModal: document.getElementById('jog-control-modal'),
    jogModalTitle: document.getElementById('jog-modal-title'),
    jogInstructions: document.getElementById('jog-instructions'),
    wizardInputs: document.getElementById('wizard-inputs'),
    currentCoords: document.getElementById('current-coords'),
    cancelJogBtn: document.getElementById('cancel-jog-btn'),
    savePointBtn: document.getElementById('save-point-btn'),
    finishCalibrationBtn: document.getElementById('finish-calibration-btn'),
    calibrationDataDisplay: document.getElementById('calibration-data-display'),
    calibrationSummaryText: document.getElementById('calibration-summary-text'),
    calibZSafeInput: document.getElementById('calib-z-safe'),
    calibZBottomInput: document.getElementById('calib-z-bottom'),
    calibZSafeLabel: document.getElementById('calib-z-safe-label'),
    calibZBottomLabel: document.getElementById('calib-z-bottom-label'),
    connectRobotBtn: document.getElementById('connect-robot-btn'),
    connectBtnText: document.getElementById('connect-btn-text'),
    connectionModal: document.getElementById('connection-modal'),
    cancelConnectionBtn: document.getElementById('cancel-connection-btn'),
    submitConnectionBtn: document.getElementById('submit-connection-btn'),
    klipperIpInput: document.getElementById('klipper-ip'),
    connectionStatusIndicator: document.getElementById('connection-status-indicator'),
    connectionErrorMsg: document.getElementById('connection-error-msg'),
    runProtocolBtn: document.getElementById('run-protocol-btn'),
    controlLogConsole: document.getElementById('control-log-console'),
    pauseProtocolBtn: document.getElementById('pause-protocol-btn'),
    resumeProtocolBtn: document.getElementById('resume-protocol-btn'),
    cancelProtocolBtn: document.getElementById('cancel-protocol-btn'),
    undoBtn: document.getElementById('undo-btn'),
    redoBtn: document.getElementById('redo-btn'),
    serialDilutionModal: document.getElementById('serial-dilution-modal'),
    serialDilutionForm: document.getElementById('serial-dilution-form'),
    cancelSerialDilutionBtn: document.getElementById('cancel-serial-dilution'),
    sdPlateSlot: document.getElementById('sd-plate-slot'),
    sdDiluentSlot: document.getElementById('sd-diluent-slot'),
    sdStockSlot: document.getElementById('sd-stock-slot'),
    sdStockWell: document.getElementById('sd-stock-well'),
    elisaModal: document.getElementById('elisa-modal'),
    elisaForm: document.getElementById('elisa-form'),
    cancelElisaBtn: document.getElementById('cancel-elisa'),
    elisaStepsContainer: document.getElementById('elisa-steps-container'),
    elisaReagentAssignmentContainer: document.getElementById('elisa-reagent-assignment-container'),
    elisaManualStepWarning: document.getElementById('elisa-manual-step-warning'),
    clearProtocolBtn: document.getElementById('clear-protocol-btn'),
    // ======================= INICIO DEL CAMBIO =======================
    alamarBlueModal: document.getElementById('alamarblue-modal'),
    alamarBlueForm: document.getElementById('alamarblue-form'),
    cancelAlamarBlueBtn: document.getElementById('cancel-alamarblue'),
    abSelectAssayWellsBtn: document.getElementById('ab-select-assay-wells'),
    abSelectControlWellsBtn: document.getElementById('ab-select-control-wells'),
    // ======================== FIN DEL CAMBIO =========================
};

export function setActiveLabwareLibrary(library) {
    activeLabwareLibrary = library;
}

export function setSavedProtocols(protocols) {
    savedProtocols = protocols;
}

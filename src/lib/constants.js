export const BAY_COORDINATES = {
  1: { x: 150.0, y: 75.0 },
  2: { x: 250.0, y: 75.0 },
  3: { x: 150.0, y: 150.0 },
  4: { x: 250.0, y: 150.0 },
  5: { x: 150.0, y: 225.0 },
  6: { x: 250.0, y: 225.0 },
};

export const DEFAULT_LABWARE_LIBRARY = {
  corning_96_wellplate_360ul_flat: {
    metadata: { displayName: 'Placa 96 Pocillos (360µL)', displayCategory: 'wellPlate', brand: 'Corning', isSource: false },
    dimensions: { xDimension: 127.76, yDimension: 85.48 },
    grid: { rows: 8, columns: 12 },
    wellProperties: { diameter: 6.86, spacing: 9, offset: { x: 14.38, y: 11.24 }, bottomZ: 1.0, maxVolume: 360, wellBottomShape: 'flat' },
  },
  generic_48_wellplate_1_6ml: {
    metadata: { displayName: 'Placa 48 Pocillos (1.6mL)', displayCategory: 'wellPlate', brand: 'Genérico', isSource: false },
    dimensions: { xDimension: 127.76, yDimension: 85.48 },
    grid: { rows: 6, columns: 8 },
    wellProperties: { diameter: 11, spacing: 13, offset: { x: 18.38, y: 10.24 }, bottomZ: 0.8, maxVolume: 1600, wellBottomShape: 'conical' },
  },
  opentrons_96_tiprack_300ul: {
    metadata: { displayName: 'Opentrons Rack Puntas 300µL', displayCategory: 'tipRack', isSource: false },
    dimensions: { xDimension: 127.76, yDimension: 85.48 },
    grid: { rows: 8, columns: 12 },
    wellProperties: { diameter: 5, spacing: 9, offset: { x: 14.38, y: 11.24 }, bottomZ: 0.5, maxVolume: 300 },
  },
  nest_1_reservoir_195ml: {
    metadata: { displayName: 'Reservorio Simple (195mL)', displayCategory: 'reservoir', isSource: true },
    dimensions: { xDimension: 127.76, yDimension: 85.48 },
    grid: { rows: 1, columns: 1 },
    wellProperties: { diameter: 80, spacing: 0, offset: { x: 63.88, y: 42.74 }, bottomZ: 1.2, maxVolume: 195000 },
  },
  waste_reservoir: {
    metadata: { displayName: 'Reservorio de Desechos', displayCategory: 'reservoir', isSource: true },
    dimensions: { xDimension: 127.76, yDimension: 85.48 },
    grid: { rows: 1, columns: 1 },
    wellProperties: { diameter: 80, spacing: 0, offset: { x: 63.88, y: 42.74 }, bottomZ: 1.2, maxVolume: 300000 },
  },
};

export const COLOR_PALETTE = [
  '#a7f3d0', '#bfdbfe', '#fde68a', '#fecaca', '#e9d5ff',
  '#fbcfe8', '#ccfbf1', '#dbeafe', '#fef3c7', '#fee2e2',
];

export const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

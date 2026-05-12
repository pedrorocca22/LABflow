import { useState, useEffect } from 'react';
import { X, ScanLine } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function LabwareEditorModal() {
  const closeModal = useLabflowStore((s) => s.closeModal);
  const addLabware = useLabflowStore((s) => s.addLabware);
  const labwareIdToEdit = useLabflowStore((s) => s.labwareIdToEdit);
  const library = useLabflowStore((s) => s.labwareLibrary);

  const existing = labwareIdToEdit ? library[labwareIdToEdit] : null;

  const [form, setForm] = useState({
    displayName: '', displayCategory: 'wellPlate', brand: '', isSource: false,
    xDimension: 127.76, yDimension: 85.48,
    rows: 8, columns: 12,
    diameter: 6.86, spacing: 9, offsetX: 14.38, offsetY: 11.24, bottomZ: 1.0, maxVolume: 360,
    wellBottomShape: 'flat',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        displayName: existing.metadata.displayName,
        displayCategory: existing.metadata.displayCategory,
        brand: existing.metadata.brand || '',
        isSource: existing.metadata.isSource || false,
        xDimension: existing.dimensions.xDimension,
        yDimension: existing.dimensions.yDimension,
        rows: existing.grid.rows,
        columns: existing.grid.columns,
        diameter: existing.wellProperties.diameter,
        spacing: existing.wellProperties.spacing,
        offsetX: existing.wellProperties.offset.x,
        offsetY: existing.wellProperties.offset.y,
        bottomZ: existing.wellProperties.bottomZ,
        maxVolume: existing.wellProperties.maxVolume,
        wellBottomShape: existing.wellProperties.wellBottomShape || 'flat',
      });
    }
  }, [existing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const isSource = form.displayCategory === 'reservoir' ? true : form.isSource;
    const data = {
      metadata: { displayName: form.displayName, displayCategory: form.displayCategory, brand: form.brand, isSource },
      dimensions: { xDimension: parseFloat(form.xDimension), yDimension: parseFloat(form.yDimension) },
      grid: { rows: parseInt(form.rows), columns: parseInt(form.columns) },
      wellProperties: {
        diameter: parseFloat(form.diameter),
        spacing: parseFloat(form.spacing),
        offset: { x: parseFloat(form.offsetX), y: parseFloat(form.offsetY) },
        bottomZ: parseFloat(form.bottomZ),
        maxVolume: parseFloat(form.maxVolume),
      },
    };
    if (form.displayCategory === 'wellPlate') data.wellProperties.wellBottomShape = form.wellBottomShape;
    addLabware(data, labwareIdToEdit);
    closeModal();
  };

  const Field = ({ label, name, type = 'text', ...props }) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-surface-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: type === 'checkbox' ? e.target.checked : e.target.value }))}
        className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none"
        {...props}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800">{existing ? 'Editar' : 'Añadir'} Labware</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {existing?.calibration && (
        <div className="mb-4 p-3 border border-danger-200 rounded-lg bg-danger-50">
          <h4 className="font-medium text-danger-700 text-sm flex items-center gap-2 mb-1">
            <ScanLine className="w-4 h-4" />
            Datos de Calibración
          </h4>
          <p className="text-xs text-surface-500">Calibración guardada para {Object.keys(existing.calibration.wells || {}).length} posiciones.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre a Mostrar" name="displayName" required />
          <div className="mb-3">
            <label className="block text-xs font-medium text-surface-600 mb-1">Categoría</label>
            <select
              name="displayCategory"
              value={form.displayCategory}
              onChange={(e) => setForm((f) => ({ ...f, displayCategory: e.target.value }))}
              className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="wellPlate">Well Plate</option>
              <option value="tipRack">Tip Rack</option>
              <option value="reservoir">Reservoir</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <Field label="Marca" name="brand" />
          {form.displayCategory === 'wellPlate' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-surface-600 mb-1">Forma del Fondo</label>
              <select
                name="wellBottomShape"
                value={form.wellBottomShape}
                onChange={(e) => setForm((f) => ({ ...f, wellBottomShape: e.target.value }))}
                className="w-full p-2 text-sm border border-surface-300 rounded-md bg-white focus:ring-2 focus:ring-primary-400 outline-none"
              >
                <option value="flat">Plano</option>
                <option value="conical">Cónico</option>
                <option value="spherical">Esférico</option>
              </select>
            </div>
          )}
        </div>

        {form.displayCategory !== 'reservoir' && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-100">
            <input
              type="checkbox"
              id="isSource"
              name="isSource"
              checked={form.isSource}
              onChange={(e) => setForm((f) => ({ ...f, isSource: e.target.checked }))}
              className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isSource" className="text-sm text-surface-700">
              Habilitar como contenedor de origen (ignora validación de volumen inicial)
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Dimensión X (mm)" name="xDimension" type="number" step="0.01" required />
          <Field label="Dimensión Y (mm)" name="yDimension" type="number" step="0.01" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Filas" name="rows" type="number" min={1} required />
          <Field label="Columnas" name="columns" type="number" min={1} required />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Diámetro (mm)" name="diameter" type="number" step="0.01" required />
          <Field label="Espaciado (mm)" name="spacing" type="number" step="0.01" required />
          <Field label="Offset X (mm)" name="offsetX" type="number" step="0.01" required />
          <Field label="Offset Y (mm)" name="offsetY" type="number" step="0.01" required />
          <Field label="Z del fondo (mm)" name="bottomZ" type="number" step="0.01" required />
          <Field label="Volumen Máximo (µL)" name="maxVolume" type="number" required />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
            Guardar Labware
          </button>
        </div>
      </form>
    </div>
  );
}

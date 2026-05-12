import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export default function SaveProtocolModal() {
  const saveProtocol = useLabflowStore((s) => s.saveProtocol);
  const savedProtocols = useLabflowStore((s) => s.savedProtocols);
  const closeModal = useLabflowStore((s) => s.closeModal);
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !author.trim()) {
      setError('Introduce nombre y autor.');
      return;
    }
    if (savedProtocols[name]) {
      setError('Ya existe un protocolo con ese nombre.');
      return;
    }
    saveProtocol(name.trim(), author.trim());
    closeModal();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800">Guardar Protocolo</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nombre del Protocolo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            required
            className="w-full p-2 text-sm border border-surface-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Autor/a</label>
          <input
            type="text"
            value={author}
            onChange={(e) => { setAuthor(e.target.value); setError(''); }}
            required
            className="w-full p-2 text-sm border border-surface-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 p-2 rounded-lg">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

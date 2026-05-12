import { Wand2, TestTube2, Activity, ArrowRightLeft, ArrowUpToLine, ArrowDownToLine, ChevronsDown, Droplets, RotateCw, PauseCircle, MessageSquare, X } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';

const wizards = [
  { id: 'serialDilutionWizard', name: 'Asistente: Dilución en Serie', icon: Wand2 },
  { id: 'elisaWizard', name: 'Asistente: Ensayo ELISA', icon: TestTube2 },
  { id: 'alamarBlueWizard', name: 'Asistente: Ensayo AlamarBlue', icon: Activity },
];

const actions = [
  { id: 'transfer', name: 'Transferir', icon: ArrowRightLeft },
  { id: 'distribute', name: 'Distribuir', icon: ArrowUpToLine },
  { id: 'consolidate', name: 'Consolidar', icon: ArrowDownToLine },
  { id: 'aspirate', name: 'Aspirar', icon: ChevronsDown },
  { id: 'wash', name: 'Lavar', icon: Droplets },
  { id: 'mix', name: 'Mezclar', icon: RotateCw },
  { id: 'pause', name: 'Pausa', icon: PauseCircle },
  { id: 'comment', name: 'Comentario', icon: MessageSquare },
];

export default function ActionModal() {
  const addStep = useLabflowStore((s) => s.addStep);
  const openModal = useLabflowStore((s) => s.openModal);
  const closeModal = useLabflowStore((s) => s.closeModal);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-surface-800">Seleccionar Acción o Asistente</h3>
        <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {wizards.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              onClick={() => {
                closeModal();
                openModal(w.id);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-all text-left"
            >
              <Icon className="w-5 h-5 text-primary-600 shrink-0" />
              <span className="font-medium text-primary-800">{w.name}</span>
            </button>
          );
        })}

        <div className="my-3 border-t border-surface-200" />

        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => {
                addStep(a.id);
                closeModal();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
            >
              <Icon className="w-5 h-5 text-surface-500 shrink-0" />
              <span className="font-medium text-surface-800">{a.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-right">
        <button onClick={closeModal} className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

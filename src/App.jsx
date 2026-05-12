import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import WorkflowPanel from '@/components/layout/WorkflowPanel';
import LabwareLibraryPanel from '@/components/library/LabwareLibraryPanel';
import ProtocolGalleryPanel from '@/components/library/ProtocolGalleryPanel';
import ControlPanel from '@/components/control/ControlPanel';
import Modals from '@/components/modals/Modals';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { useKlipper } from '@/hooks/useKlipper';
import { Toaster } from 'sonner';

function App() {
  const activeTab = useLabflowStore((s) => s.activeTab);
  const undo = useLabflowStore((s) => s.undo);
  const redo = useLabflowStore((s) => s.redo);
  const activeStepId = useLabflowStore((s) => s.activeStepId);
  const deleteStep = useLabflowStore((s) => s.deleteStep);
  const openModal = useLabflowStore((s) => s.openModal);
  const closeModal = useLabflowStore((s) => s.closeModal);
  const modal = useLabflowStore((s) => s.modal);
  useKlipper();

  useEffect(() => {
    const saved = localStorage.getItem('labflow-dark');
    if (saved === '1' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const isMeta = e.ctrlKey || e.metaKey;

      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((isMeta && e.key.toLowerCase() === 'y') || (isMeta && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openModal('saveProtocol');
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openModal('action');
        return;
      }
      if (e.key === 'Escape' && modal) {
        e.preventDefault();
        closeModal();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeStepId && !modal) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        deleteStep(activeStepId);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, activeStepId, deleteStep, openModal, closeModal, modal]);

  return (
    <div className="flex flex-col h-screen bg-surface-50 text-surface-800">
      <Toaster position="top-right" richColors closeButton />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {activeTab === 'workflow' && <WorkflowPanel />}
          {activeTab === 'labware' && <LabwareLibraryPanel />}
          {activeTab === 'gallery' && <ProtocolGalleryPanel />}
          {activeTab === 'control' && <ControlPanel />}
        </main>
      </div>
      <Modals />
    </div>
  );
}

export default App;

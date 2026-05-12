import Header from '@/components/layout/Header';
import TabNav from '@/components/layout/TabNav';
import WorkflowPanel from '@/components/layout/WorkflowPanel';
import LabwareLibraryPanel from '@/components/library/LabwareLibraryPanel';
import ProtocolGalleryPanel from '@/components/library/ProtocolGalleryPanel';
import ControlPanel from '@/components/control/ControlPanel';
import Modals from '@/components/modals/Modals';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { useKlipper } from '@/hooks/useKlipper';

function App() {
  const activeTab = useLabflowStore((s) => s.activeTab);
  useKlipper();

  return (
    <div className="flex flex-col h-screen bg-surface-50 text-surface-800">
      <Header />
      <TabNav />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'workflow' && <WorkflowPanel />}
        {activeTab === 'labware' && <LabwareLibraryPanel />}
        {activeTab === 'gallery' && <ProtocolGalleryPanel />}
        {activeTab === 'control' && <ControlPanel />}
      </main>
      <Modals />
    </div>
  );
}

export default App;

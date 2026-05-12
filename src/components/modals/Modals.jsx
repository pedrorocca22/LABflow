import { useLabflowStore } from '@/stores/useLabflowStore';
import LabwareModal from './LabwareModal';
import ActionModal from './ActionModal';
import LabwareEditorModal from './LabwareEditorModal';
import ConnectionModal from './ConnectionModal';
import SaveProtocolModal from './SaveProtocolModal';
import CalibrationModal from './CalibrationModal';
import SerialDilutionWizard from './SerialDilutionWizard';
import ElisaWizard from './ElisaWizard';
import AlamarBlueWizard from './AlamarBlueWizard';

export default function Modals() {
  const modal = useLabflowStore((s) => s.modal);

  if (!modal) return null;

  const overlay = (
    <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface-0 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {modal === 'labware' && <LabwareModal />}
        {modal === 'action' && <ActionModal />}
        {modal === 'labwareEditor' && <LabwareEditorModal />}
        {modal === 'connection' && <ConnectionModal />}
        {modal === 'saveProtocol' && <SaveProtocolModal />}
        {modal === 'calibration' && <CalibrationModal />}
        {modal === 'serialDilutionWizard' && <SerialDilutionWizard />}
        {modal === 'elisaWizard' && <ElisaWizard />}
        {modal === 'alamarBlueWizard' && <AlamarBlueWizard />}
      </div>
    </div>
  );

  return overlay;
}

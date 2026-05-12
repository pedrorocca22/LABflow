import DeckGrid from '@/components/deck/DeckGrid';
import LabwareDetail from '@/components/deck/LabwareDetail';
import ConfigPanel from '@/components/config/ConfigPanel';
import RoutineList from '@/components/routine/RoutineList';

export default function WorkflowPanel() {
  return (
    <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden h-full">
      <div className="lg:col-span-5 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <div className="p-2 border-b border-surface-100">
          <DeckGrid />
        </div>
        <div className="flex-1 overflow-hidden p-2 min-h-0">
          <LabwareDetail />
        </div>
      </div>

      <div className="lg:col-span-4 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <ConfigPanel />
      </div>

      <div className="lg:col-span-3 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <RoutineList />
      </div>
    </div>
  );
}

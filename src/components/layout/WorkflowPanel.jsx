import DeckGrid from '@/components/deck/DeckGrid';
import ConfigPanel from '@/components/config/ConfigPanel';
import RoutineList from '@/components/routine/RoutineList';

export default function WorkflowPanel() {
  return (
    <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden h-full">
      <div className="lg:col-span-7 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden p-2">
          <DeckGrid />
        </div>
      </div>

      <div className="lg:col-span-3 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <ConfigPanel />
      </div>

      <div className="lg:col-span-2 bg-surface-0 rounded-lg shadow-sm border border-surface-200 flex flex-col overflow-hidden">
        <RoutineList />
      </div>
    </div>
  );
}

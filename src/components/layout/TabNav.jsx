import { FlaskConical, Library, Archive, Gamepad2 } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const tabs = [
  { id: 'workflow', label: 'Workflow', icon: FlaskConical },
  { id: 'labware', label: 'Librería Labware', icon: Library },
  { id: 'gallery', label: 'Galería de Protocolos', icon: Archive },
  { id: 'control', label: 'Control', icon: Gamepad2 },
];

export default function TabNav() {
  const activeTab = useLabflowStore((s) => s.activeTab);
  const setActiveTab = useLabflowStore((s) => s.setActiveTab);

  return (
    <nav className="bg-surface-0 border-b border-surface-200 px-4">
      <div className="flex space-x-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

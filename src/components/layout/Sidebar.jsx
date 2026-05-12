import { FlaskConical, Library, Archive, Gamepad2 } from 'lucide-react';
import { useLabflowStore } from '@/stores/useLabflowStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const tabs = [
  { id: 'workflow', label: 'Workflow', icon: FlaskConical },
  { id: 'labware', label: 'Labware', icon: Library },
  { id: 'gallery', label: 'Galería', icon: Archive },
  { id: 'control', label: 'Control', icon: Gamepad2 },
];

export default function Sidebar() {
  const activeTab = useLabflowStore((s) => s.activeTab);
  const setActiveTab = useLabflowStore((s) => s.setActiveTab);

  return (
    <nav className="w-16 bg-surface-0 border-r border-surface-200 flex flex-col items-center py-2 shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col items-center justify-center w-12 h-12 rounded-lg mb-1 transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-600'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'
            )}
            title={tab.label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

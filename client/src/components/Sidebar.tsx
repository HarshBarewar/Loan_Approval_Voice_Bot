import React from 'react';
import {
  LayoutDashboard,
  Mic,
  FlaskConical,
  History,
  BarChart3,
  Settings,
  ChevronRight
} from 'lucide-react';

export type ActiveTab = 'overview' | 'workspace' | 'scenarios' | 'history' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'workspace', label: 'Voice Agent', icon: Mic },
    { id: 'scenarios', label: 'Test Scenarios', icon: FlaskConical },
    { id: 'history', label: 'Conversation History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100 hidden md:block">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
      </div>

      <nav className="p-2 md:p-3 space-y-1 flex md:flex-col overflow-x-auto md:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-red-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-red-600 hidden md:block" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info in Sidebar */}
      <div className="mt-auto p-4 border-t border-slate-100 hidden md:block bg-slate-50/50">
        <div className="rounded-lg p-3 bg-white border border-slate-200/80 shadow-xs text-xs space-y-1 text-slate-500">
          <div className="font-semibold text-slate-700 flex items-center justify-between">
            <span>Assignment Build</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">v1.0</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Strict Loan Against Property (LAP) qualification rules applied.
          </p>
        </div>
      </div>
    </aside>
  );
};

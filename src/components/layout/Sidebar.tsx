import {
  LayoutDashboard,
  Plane,
  Building2,
  CalendarClock,
  TrendingUp,
  LineChart,
  PartyPopper,
  PieChart,
  CheckCircle2,
  FlaskConical,
  Table2,
  Code2,
  Info,
  Database,
  Settings,
  Activity,
} from 'lucide-react';
import type { PageKey } from '@/types';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Analytics' },
  { key: 'routes', label: 'Routes', icon: Plane, group: 'Analytics' },
  { key: 'airlines', label: 'Airlines', icon: Building2, group: 'Analytics' },
  { key: 'lead-time', label: 'Lead Time', icon: CalendarClock, group: 'Analytics' },
  { key: 'inflation', label: 'Inflation', icon: TrendingUp, group: 'Analytics' },
  { key: 'historical', label: 'Historical Index', icon: LineChart, group: 'Analytics' },
  { key: 'festivals', label: 'Demand & Festivals', icon: PartyPopper, group: 'Analytics' },
  { key: 'fare-composition', label: 'Fare Composition', icon: PieChart, group: 'Analytics' },
  { key: 'availability', label: 'Availability', icon: CheckCircle2, group: 'Analytics' },
  { key: 'backtesting', label: 'Back-testing', icon: FlaskConical, group: 'Analytics' },
  { key: 'data-explorer', label: 'Data Explorer', icon: Table2, group: 'Data' },
  { key: 'api-docs', label: 'API', icon: Code2, group: 'Data' },
];

const ADMIN_ITEMS: NavItem[] = [
  { key: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, group: 'Admin' },
  { key: 'admin-collection', label: 'Collection Monitor', icon: Activity, group: 'Admin' },
  { key: 'admin-quality', label: 'Data Quality', icon: Database, group: 'Admin' },
  { key: 'admin-raw', label: 'Raw Observations', icon: Table2, group: 'Admin' },
  { key: 'admin-config', label: 'Index Configuration', icon: Settings, group: 'Admin' },
  { key: 'admin-weights', label: 'Route & Weights', icon: Settings, group: 'Admin' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: 'about', label: 'About APIx', icon: Info, group: 'System' },
];

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentPage, onNavigate, collapsed, onClose }: SidebarProps) {
  const isActive = (key: PageKey) => {
    if (key === 'routes' && currentPage === 'route-details') return true;
    if (key === 'airlines' && currentPage === 'airline-details') return true;
    return currentPage === key;
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.key);
    return (
      <button
        key={item.key}
        onClick={() => {
          onNavigate(item.key);
          onClose?.();
        }}
        className={`nav-item w-full ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } flex-shrink-0 bg-navy-900 border-r border-borderColor flex flex-col h-full transition-all duration-200`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-borderColor flex-shrink-0">
        <img src="/apix-logo.svg" alt="APIx" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-base font-bold text-primaryText leading-tight">APIx</span>
            <span className="text-[10px] text-secondaryText leading-tight">Airfare Price Index</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6 no-scrollbar">
        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400 px-3 mb-1">Analytics</p>}
          {NAV_ITEMS.filter((i) => i.group === 'Analytics').map(renderItem)}
        </div>

        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400 px-3 mb-1">Data</p>}
          {NAV_ITEMS.filter((i) => i.group === 'Data').map(renderItem)}
        </div>

        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400 px-3 mb-1">Administration</p>}
          {ADMIN_ITEMS.map(renderItem)}
        </div>

        <div className="space-y-1">
          {BOTTOM_ITEMS.map(renderItem)}
        </div>
      </nav>

      {/* Demo data indicator */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-borderColor flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-secondaryText">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span>Demo Data Mode</span>
          </div>
        </div>
      )}
    </aside>
  );
}

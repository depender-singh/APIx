import { useState } from 'react';
import { Menu, ChevronDown, Bell, User, Calendar } from 'lucide-react';
import type { DateRange } from '@/types';

interface HeaderProps {
  onMenuClick: () => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  title: string;
  subtitle?: string;
}

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
  { key: 'custom', label: 'Custom' },
];

export default function Header({ onMenuClick, dateRange, onDateRangeChange, title, subtitle }: HeaderProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <header className="h-16 flex-shrink-0 bg-navy-900 border-b border-borderColor flex items-center justify-between px-4 lg:px-6 z-30">
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base lg:text-lg font-semibold text-primaryText truncate">{title}</h1>
          {subtitle && <p className="text-xs text-secondaryText truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Data status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 border border-borderColor">
          <span className="w-2 h-2 rounded-full bg-positive" />
          <span className="text-xs text-secondaryText">Updated 5 min ago</span>
        </div>

        {/* Date range selector */}
        <div className="relative">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="btn-secondary text-xs lg:text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{DATE_RANGES.find((d) => d.key === dateRange)?.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCalendar && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCalendar(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-navy-850 border border-borderColor rounded-lg shadow-xl py-1 min-w-[140px] animate-fade-in">
                {DATE_RANGES.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => {
                      onDateRangeChange(d.key);
                      setShowCalendar(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      dateRange === d.key
                        ? 'bg-electric/15 text-electric-light'
                        : 'text-secondaryText hover:text-primaryText hover:bg-navy-800'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning" />
        </button>

        {/* User */}
        <button className="btn-ghost p-2">
          <div className="w-7 h-7 rounded-full bg-electric/20 flex items-center justify-center">
            <User className="w-4 h-4 text-electric-light" />
          </div>
        </button>
      </div>
    </header>
  );
}

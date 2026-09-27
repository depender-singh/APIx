import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between p-4 border-b border-borderColor ${className}`}>
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  sparkline?: ReactNode;
}

export function KPICard({ label, value, change, changeLabel, icon, sparkline }: KPICardProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const isNeutral = change != null && change === 0;

  return (
    <Card hover className="p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="kpi-label">{label}</p>
        {icon && <div className="text-secondaryText">{icon}</div>}
      </div>
      <p className="kpi-value mb-1">{value}</p>
      <div className="flex items-center justify-between">
        {change != null && (
          <div className="flex items-center gap-1">
            {isPositive && <TrendingUp className="w-3.5 h-3.5 text-positive" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5 text-negative" />}
            {isNeutral && <Minus className="w-3.5 h-3.5 text-secondaryText" />}
            <span
              className={`text-xs font-medium ${
                isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-secondaryText'
              }`}
            >
              {change > 0 ? '+' : ''}
              {change}% {changeLabel || ''}
            </span>
          </div>
        )}
        {sparkline && <div className="flex-shrink-0">{sparkline}</div>}
      </div>
    </Card>
  );
}

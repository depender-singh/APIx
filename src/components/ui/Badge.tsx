interface BadgeProps {
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'electric' | 'teal';
  children: React.ReactNode;
  dot?: boolean;
}

export default function Badge({ variant = 'neutral', children, dot = false }: BadgeProps) {
  const classes: Record<string, string> = {
    positive: 'badge-positive',
    negative: 'badge-negative',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
    electric: 'badge-electric',
    teal: 'badge-teal',
  };

  const dotColors: Record<string, string> = {
    positive: 'bg-positive',
    negative: 'bg-negative',
    warning: 'bg-warning',
    neutral: 'bg-navy-400',
    electric: 'bg-electric',
    teal: 'bg-teal',
  };

  return (
    <span className={classes[variant]}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

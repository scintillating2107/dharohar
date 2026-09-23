interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="gov-card border-l-4 border-l-[var(--gov-navy)] p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-[var(--gov-navy)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--gov-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

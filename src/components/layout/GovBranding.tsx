export function GovEmblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="24"
          y1="8"
          x2="24"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.6"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
    </svg>
  );
}

export function GovTricolor() {
  return <div className="gov-tricolor w-full" aria-hidden="true" />;
}

interface GovHeaderProps {
  compact?: boolean;
}

export function GovHeader({ compact = false }: GovHeaderProps) {
  return (
    <header className="bg-[var(--gov-navy)] text-white">
      <GovTricolor />
      <div className={compact ? "px-4 py-2" : "px-6 py-3 lg:px-8"}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-white/90">
            <GovEmblem className={compact ? "h-8 w-8" : "h-10 w-10"} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className={`font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}>
                Dharohar
              </span>
              <span className="hidden sm:inline text-white/40">|</span>
              <span className={`text-white/80 ${compact ? "text-xs" : "text-sm"} truncate`}>
                Digital Land Record Management System
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-white/55 mt-0.5 hidden sm:block">
                Land Records Digitization &amp; Verification Platform — Demo Portal
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function GovFooter() {
  return (
    <footer className="border-t border-[var(--gov-border)] bg-white mt-auto">
      <GovTricolor />
      <div className="px-6 py-4 lg:px-8 text-xs text-[var(--gov-text-muted)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>
            © {new Date().getFullYear()} Dharohar — Land Record Intelligence Platform
            <span className="mx-2 text-[var(--gov-border)]">|</span>
            <span className="text-[var(--gov-text-light)]">Prototype for demonstration purposes</span>
          </p>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <span>Help Desk</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

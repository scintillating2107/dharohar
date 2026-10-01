import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";
import { PS_DEPARTMENT, PS_ORGANIZATION } from "@/lib/problem-statement";

export function GovEmblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
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
  return (
    <div className="gov-tricolor" aria-hidden="true">
      <span className="gov-tricolor__band gov-tricolor__saffron" />
      <span className="gov-tricolor__band gov-tricolor__white" />
      <span className="gov-tricolor__band gov-tricolor__green" />
    </div>
  );
}

interface GovHeaderProps {
  compact?: boolean;
}

export function GovHeader({ compact = false }: GovHeaderProps) {
  return (
    <header className="w-full bg-[var(--gov-navy)] text-white">
      <GovTricolor />
      <div
        className={`max-w-[1400px] mx-auto w-full ${compact ? "px-4 py-2" : "px-4 py-3 lg:px-8"}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-white/90">
            <GovEmblem className={compact ? "h-8 w-8" : "h-10 w-10"} />
          </div>
          <div className="min-w-0">
            <p className={`text-white/70 uppercase tracking-wider ${compact ? "text-[10px]" : "text-[11px]"}`}>
              {PS_ORGANIZATION}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className={`font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}>
                {APP_NAME}
              </span>
              <span className="hidden sm:inline text-white/40">|</span>
              <span
                className={`text-white/85 ${compact ? "text-xs" : "text-sm"} truncate max-w-[280px] sm:max-w-none`}
              >
                {PS_DEPARTMENT}
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-white/55 mt-0.5 hidden sm:block line-clamp-2">
                {APP_DESCRIPTION}
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-[var(--gov-navy)]">{PS_ORGANIZATION}</p>
            <p>{PS_DEPARTMENT}</p>
            <p className="mt-2">
              © {new Date().getFullYear()} {APP_NAME}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="https://dolr.digitalindia.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gov-navy)]">
              DoLR
            </a>
            <a href="https://dilrmp.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gov-navy)]">
              DILRMP
            </a>
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <span>Help Desk</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

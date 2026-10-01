"use client";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="bg-white border-b border-[var(--gov-border-light)]">
      <div className="flex h-12 items-center px-6 lg:px-8 pl-14 lg:pl-8">
        <h1 className="text-base font-semibold text-[var(--gov-navy)] truncate">{title}</h1>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/** Accessible modal built on <dialog>; closes on Escape and backdrop click. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useLocale();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-lg border border-[var(--gov-border-light)] bg-white p-0 shadow-xl backdrop:bg-black/40`}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-[var(--gov-navy)]">{t(title)}</h3>
        <div className="mt-3">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </dialog>
  );
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastStyles = {
  success: {
    bg: "bg-white border-l-4 border-l-[var(--gov-green)] border border-green-100",
    text: "text-green-900",
    icon: CheckCircle2,
    iconColor: "text-[var(--gov-green)]",
  },
  error: {
    bg: "bg-white border-l-4 border-l-red-600 border border-red-100",
    text: "text-red-900",
    icon: AlertCircle,
    iconColor: "text-red-600",
  },
  warning: {
    bg: "bg-white border-l-4 border-l-[var(--gov-saffron)] border border-amber-100",
    text: "text-amber-900",
    icon: AlertTriangle,
    iconColor: "text-[var(--gov-saffron)]",
  },
  info: {
    bg: "bg-white border-l-4 border-l-[var(--gov-navy-light)] border border-blue-100",
    text: "text-[var(--gov-navy)]",
    icon: Info,
    iconColor: "text-[var(--gov-navy-light)]",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const style = toastStyles[t.type];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg ${style.bg}`}
              role="alert"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
              <span className={`font-medium ${style.text}`}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

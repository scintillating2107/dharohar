"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { LocaleProvider } from "@/contexts/LocaleContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}

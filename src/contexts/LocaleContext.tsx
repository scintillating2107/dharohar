"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { setCurrentLocale, translate, translateDynamic, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "dharohar_locale";
const listeners = new Set<() => void>();

function read(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Vars = Record<string, string | number | null | undefined>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate UI text written in code (supports {var} interpolation) */
  t: (text: string, vars?: Vars) => string;
  /** Translate text that came from the server (messages, details, errors) */
  tx: (text: string | null | undefined) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);
  setCurrentLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // storage unavailable; preference lasts for this page only
    }
    listeners.forEach((fn) => fn());
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (text, vars) => translate(locale, text, vars),
      tx: (text) => translateDynamic(locale, text),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Shorthand for components that only need translation. */
export function useT() {
  return useLocale();
}

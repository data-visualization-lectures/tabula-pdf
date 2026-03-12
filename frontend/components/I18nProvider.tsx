"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  type Locale,
  type TranslationKey,
  dictionaries,
  detectLocale,
  t as tFn,
} from "@/lib/i18n";
import { setApiLocale } from "@/lib/api";

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ja");

  useEffect(() => {
    const detected = detectLocale();
    setLocale(detected);
    setApiLocale(detected);
    document.documentElement.lang = detected;
  }, []);

  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    tFn(dictionaries[locale], key, params);

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

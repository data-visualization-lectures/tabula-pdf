import { ja, type TranslationKeys } from "./translations/ja";
import { en } from "./translations/en";

export type Locale = "ja" | "en";

export const dictionaries: Record<Locale, TranslationKeys> = { ja, en };

export type TranslationKey = keyof TranslationKeys;

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "ja";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("en")) return "en";
  return "ja";
}

export function t(
  dict: TranslationKeys,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let str: string = dict[key];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

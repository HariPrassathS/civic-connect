/**
 * i18n configuration for CivicConnect.
 * 
 * This module provides a lightweight translation scaffold.
 * All citizen-facing strings are extracted to /messages/en.json and /messages/hi.json.
 * 
 * To fully activate next-intl or a similar library, install it and wire up 
 * the middleware + provider. For now, this provides a simple `getTranslations`
 * function that loads the correct JSON file based on locale.
 */

import en from "@/messages/en.json";
import ta from "@/messages/ta.json";

export const locales = ["en", "ta"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

const messages: Record<Locale, typeof en> = { en, ta };

/**
 * Get all translations for a given locale.
 * Falls back to English if the locale is not found.
 */
export function getMessages(locale: Locale = defaultLocale) {
  return messages[locale] || messages.en;
}

/**
 * Get a specific translation by dot-path, e.g. "nav.home".
 */
export function t(key: string, locale: Locale = defaultLocale): string {
  const msgs = getMessages(locale);
  const parts = key.split(".");
  let result: any = msgs;
  for (const part of parts) {
    result = result?.[part];
  }
  return typeof result === "string" ? result : key;
}

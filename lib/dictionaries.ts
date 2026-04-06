import "server-only";

const dictionaries = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  "zh-TW": () => import("@/messages/zh-TW.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;

export const locales: Locale[] = ["en", "zh-TW"];
export const defaultLocale: Locale = "zh-TW";

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

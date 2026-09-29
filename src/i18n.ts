import { EN } from './data/i18n/en';

type Dict = Record<string, string>;

const LANGS: Record<string, Dict> = { en: EN };
let current: Dict = EN;

/** All UI / narrative text goes through t(); gameplay code never contains display strings. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = current[key] ?? EN[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function setLanguage(lang: string): void {
  current = LANGS[lang] ?? EN;
}

export function hasKey(key: string): boolean {
  return key in current || key in EN;
}

export const LANGUAGES = Object.keys(LANGS);

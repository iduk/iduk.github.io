import { type Locale, locales, type UiKey, ui } from '../i18n/ui';

export type { Locale, UiKey };
export { locales, ui };

export const defaultLocale: Locale = 'ko';

export function t(locale: Locale, key: UiKey): string {
  return ui[locale][key];
}

/** ko has no prefix; en is prefixed with /en. */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return normalized;
  return normalized === '/' ? '/en/' : `/en${normalized}`;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'ko' ? 'en' : 'ko';
}

/** Strip a leading /en so the same page can be addressed in either locale. */
export function stripLocale(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/';
  return pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
}

export function localeFromPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko';
}

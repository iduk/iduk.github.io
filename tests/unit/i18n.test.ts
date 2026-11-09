import { describe, expect, it } from 'vitest';
import { ui } from '../../src/i18n/ui';
import { alternateLocale, localizedPath, t } from '../../src/lib/i18n';

describe('localizedPath', () => {
  it('ko has no prefix', () => {
    expect(localizedPath('ko', '/work/')).toBe('/work/');
    expect(localizedPath('ko', '/')).toBe('/');
  });
  it('en has /en prefix', () => {
    expect(localizedPath('en', '/work/')).toBe('/en/work/');
    expect(localizedPath('en', '/')).toBe('/en/');
  });
});

describe('ui dictionaries', () => {
  it('ko and en have the same key set', () => {
    expect(Object.keys(ui.ko).sort()).toEqual(Object.keys(ui.en).sort());
  });
  it('no empty strings', () => {
    for (const locale of ['ko', 'en'] as const) {
      for (const value of Object.values(ui[locale])) {
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('helpers', () => {
  it('alternateLocale flips', () => {
    expect(alternateLocale('ko')).toBe('en');
    expect(alternateLocale('en')).toBe('ko');
  });
  it('t returns the localized string', () => {
    expect(t('en', 'nav.work')).toBe(ui.en['nav.work']);
  });
});

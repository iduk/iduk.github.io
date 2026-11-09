import type { Locale } from './i18n';

const tags = { ko: 'ko-KR', en: 'en-US' } as const;

function point(raw: string, locale: Locale): string {
  const [y, m] = raw.split('-').map(Number);
  if (!m)
    return new Intl.DateTimeFormat(tags[locale], { year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(y, 0, 1)),
    );
  return new Intl.DateTimeFormat(tags[locale], {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** 기간 표기(docs/06 3절). 연도만 있으면 연도, 시작·끝이 다르면 `시작 – 끝`. */
export function formatPeriod(period: { start: string; end?: string }, locale: Locale): string {
  const start = point(period.start, locale);
  if (!period.end || period.end === period.start) return start;
  return `${start} – ${point(period.end, locale)}`;
}

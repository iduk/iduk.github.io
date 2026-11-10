import { parseFragment } from 'parse5';

export type HeadInfo = {
  lang: string;
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  alternates: Map<string, string>;
  /** property/name → 값 목록 */
  meta: Map<string, string[]>;
};

type Node = { nodeName: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };

/** HTML 문자열에서 head의 SEO 관련 태그를 뽑는다. */
export function headInfo(html: string): HeadInfo {
  const info: HeadInfo = { lang: '', title: '', alternates: new Map(), meta: new Map() };
  const lang = html.match(/<html[^>]*\blang="([^"]*)"/)?.[1];
  info.lang = lang ?? '';
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? '';
  const walk = (n: Node) => {
    const attr = (k: string) => n.attrs?.find((a) => a.name === k)?.value;
    if (n.nodeName === 'title') {
      info.title = (n.childNodes ?? [])
        .map((c) => (c as unknown as { value?: string }).value ?? '')
        .join('');
    } else if (n.nodeName === 'meta') {
      const key = attr('property') ?? attr('name');
      const content = attr('content');
      if (key && content !== undefined)
        info.meta.set(key, [...(info.meta.get(key) ?? []), content]);
    } else if (n.nodeName === 'link') {
      const rel = attr('rel');
      const href = attr('href') ?? '';
      if (rel === 'canonical') info.canonical = href;
      if (rel === 'alternate' && attr('hreflang'))
        info.alternates.set(attr('hreflang') as string, href);
    }
    for (const c of n.childNodes ?? []) walk(c);
  };
  walk(parseFragment(head) as unknown as Node);
  info.description = info.meta.get('description')?.[0];
  info.robots = info.meta.get('robots')?.[0];
  return info;
}

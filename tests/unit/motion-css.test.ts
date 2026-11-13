import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = process.env.DIST_DIR ?? join(import.meta.dirname, '../../dist');

interface Rule {
  selector: string;
  /** 바깥에서 안쪽 순서의 @규칙 머리(`@media ...`, `@supports ...`, `@layer ...`). */
  gates: string[];
  decls: Record<string, string>;
}

/** 짝이 맞는 `}`의 위치. 문자열은 건너뛴다. */
function matchBrace(src: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== '\\') quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return src.length;
}

/**
 * 중첩을 따라가는 작은 CSS 파서(재귀 하강).
 * - 스타일 규칙 하나당 Rule 하나. 안쪽에 중첩 규칙이 있어도 그 규칙 자신의 선언은 그대로 모은다.
 * - 중첩 규칙은 `&`를 부모 선택자로 바꾸거나 부모 뒤에 붙여 별도 Rule로 낸다.
 * - 스타일 규칙 안의 조건부 @규칙(@media/@supports)은 같은 선택자에 게이트가 붙은 Rule이 된다.
 * - @keyframes 안은 규칙이 아니다.
 */
function parseRules(css: string): Rule[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];

  const walk = (text: string, gates: string[], selector: string | null) => {
    const decls: Record<string, string> = {};
    const mine: Rule | null = selector === null ? null : { selector, gates, decls };
    if (mine) rules.push(mine);
    let i = 0;
    let buf = '';
    let quote = '';
    while (i < text.length) {
      const ch = text[i];
      if (quote) {
        buf += ch;
        if (ch === quote && text[i - 1] !== '\\') quote = '';
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        buf += ch;
      } else if (ch === ';') {
        const part = buf;
        buf = '';
        const c = part.indexOf(':');
        if (mine && c > 0 && !part.trim().startsWith('@')) {
          decls[part.slice(0, c).trim().toLowerCase()] = part.slice(c + 1).trim();
        }
      } else if (ch === '{') {
        const head = buf.trim();
        buf = '';
        const close = matchBrace(text, i);
        const body = text.slice(i + 1, close);
        i = close;
        if (head.startsWith('@')) {
          if (/^@(-\w+-)?keyframes/.test(head)) {
            // 규칙이 아니다
          } else if (selector !== null) {
            walk(body, [...gates, head], selector); // 스타일 규칙 안의 @media 등
          } else {
            walk(body, [...gates, head], null); // @media/@supports/@layer 블록
          }
        } else {
          const full =
            selector === null
              ? head
              : head
                  .split(',')
                  .map((h) =>
                    h.includes('&') ? h.replaceAll('&', selector) : `${selector} ${h.trim()}`,
                  )
                  .join(',');
          walk(body, gates, full);
        }
      } else {
        buf += ch;
      }
      i++;
    }
    // 마지막 선언(`;` 없이 끝남)
    const c = buf.indexOf(':');
    if (mine && c > 0 && !buf.trim().startsWith('@')) {
      decls[buf.slice(0, c).trim().toLowerCase()] = buf.slice(c + 1).trim();
    }
  };

  walk(src, [], null);
  return rules.filter((r) => Object.keys(r.decls).length > 0);
}

/** 조건 머리가 `@supports (animation-timeline: view())` 하나뿐인가(`not`·`or`·`and` 조합 거부). */
const supportsTimeline = (g: string) =>
  /^@supports\s*\(\s*animation-timeline:\s*view\(\)\s*\)$/.test(g);

/** `@media (...) and (...)` 형태이고 `not`·`or`·쉼표가 없으며 no-preference 조건을 포함하는가. */
const noPref = (g: string) =>
  /^@media\s*\(/.test(g) &&
  !/\bnot\b|\bor\b|,/.test(g) &&
  /\(\s*prefers-reduced-motion:\s*no-preference\s*\)/.test(g);

const hoverFine = (g: string) =>
  /^@media\s*\(/.test(g) &&
  !/\bnot\b|\bor\b|,/.test(g) &&
  /\(\s*hover:\s*hover\s*\)/.test(g) &&
  /\(\s*pointer:\s*fine\s*\)/.test(g);

const motionGated = (r: Rule, needTimeline: boolean) =>
  r.gates.some(noPref) && (!needTimeline || r.gates.some(supportsTimeline));

const HIDING_OR_MOVING = [
  'transform',
  'translate',
  'scale',
  'rotate',
  'clip-path',
  'mask',
  'mask-image',
];
const isAnimationProp = (p: string) => p.startsWith('animation');

/** 이 선언이 요소를 숨기거나 옮기거나 움직이게 하는가. */
function hidesOrMoves(p: string, rawValue: string): boolean {
  const v = rawValue.replace(/\s*!important\s*$/, '').trim();
  if (isAnimationProp(p)) return v !== 'none'; // `animation: none`은 끄는 규칙(인쇄)이다
  if (p === 'opacity') return !/^(1|1\.0+|100%)$/.test(v);
  if (p === 'visibility') return v !== 'visible';
  if (HIDING_OR_MOVING.includes(p)) return v !== 'none';
  return false;
}

const ruleSummary = (r: Rule, p: string, v: string) =>
  `${r.selector} { ${p}: ${v} } (게이트: ${r.gates.join(' > ') || '없음'})`;

const TARGETS = /\.(reveal|hero-line)\b/;

/** `.reveal`·`.hero-line` 규칙 중 게이트 밖에서 숨기거나 옮기는 것. */
function ungatedViolations(rules: Rule[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (!TARGETS.test(r.selector)) continue;
    if (motionGated(r, /\.reveal\b/.test(r.selector))) continue;
    for (const [p, v] of Object.entries(r.decls))
      if (hidesOrMoves(p, v)) out.push(ruleSummary(r, p, v));
  }
  return out;
}

/** 확대 규칙(.zoom … .pic의 scale/transform/transition)은 호버·모션 허용 게이트 안에만 있어야 한다. */
function zoomViolations(rules: Rule[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (!/\.zoom\b.*\.pic\b/.test(r.selector)) continue;
    const moving = Object.entries(r.decls).some(
      ([p, v]) =>
        (p === 'scale' || p === 'transform' || p.startsWith('transition') || isAnimationProp(p)) &&
        v.replace(/\s*!important\s*$/, '').trim() !== 'none',
    );
    if (moving && !(r.gates.some(hoverFine) && r.gates.some(noPref))) out.push(r.selector);
  }
  return out;
}

const MOTION_ELEMENT = /<[a-z0-9-]+\b[^>]*\bclass="([^"]*)"/g;

/** 빌드된 HTML에서 reveal/hero-line/zoom과 같은 요소에 붙은 다른 클래스를 모은다. */
function motionClasses(htmls: string[]): Set<string> {
  const found = new Set<string>();
  for (const html of htmls) {
    for (const m of html.matchAll(MOTION_ELEMENT)) {
      const classes = m[1].split(/\s+/).filter(Boolean);
      if (!classes.some((c) => c === 'reveal' || c === 'hero-line' || c === 'zoom')) continue;
      for (const c of classes) found.add(c);
      if (classes.includes('zoom')) found.add('pic'); // .zoom .pic: 안쪽 이미지
    }
  }
  return found;
}

/** 위 클래스를 쓰는 어떤 선택자든 게이트 밖에서 숨기거나 옮기면 안 된다(.text-block{opacity:0} 등). */
function classViolations(rules: Rule[], classes: Set<string>): string[] {
  const out: string[] = [];
  const named = [...classes].filter((c) => c !== 'astro-cid' && !c.startsWith('astro-'));
  for (const r of rules) {
    const hit = named.find((c) =>
      new RegExp(`\\.${c.replace(/[-]/g, '\\-')}(?![\\w-])`).test(r.selector),
    );
    if (!hit) continue;
    if (motionGated(r, false)) continue;
    for (const [p, v] of Object.entries(r.decls)) {
      if (hidesOrMoves(p, v)) out.push(ruleSummary(r, p, v));
    }
  }
  return out;
}

function walkFiles(dir: string, pick: (name: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (d === dist && name === 'html') continue; // 복사한 데모
      if (statSync(full).isDirectory()) walk(full);
      else if (pick(name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function cssSources(): string[] {
  const out = walkFiles(dist, (n) => n.endsWith('.css')).map((f) => readFileSync(f, 'utf8'));
  for (const f of walkFiles(dist, (n) => n.endsWith('.html'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g))
      out.push(m[1]);
  }
  return out;
}

const gate =
  '@layer components{@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){';
const closeGate = '}}}';

describe('검사기 자체 시험(고의로 깨뜨린 CSS)', () => {
  it('게이트 안의 .reveal은 통과', () => {
    const css = `${gate}.reveal{animation-name:reveal-up;animation-timeline:view()}${closeGate}`;
    expect(ungatedViolations(parseRules(css))).toEqual([]);
  });
  it('게이트 밖에서 opacity:0이면 잡는다', () => {
    expect(ungatedViolations(parseRules('.reveal{opacity:0}')).length).toBe(1);
  });
  it('게이트 밖 translate/transform/clip-path를 잡는다', () => {
    expect(ungatedViolations(parseRules('.hero-line{clip-path:inset(0 0 100% 0)}')).length).toBe(1);
    expect(ungatedViolations(parseRules('.a .reveal{transform:translateY(24px)}')).length).toBe(1);
    expect(ungatedViolations(parseRules('@layer c{.reveal{translate:0 24px}}')).length).toBe(1);
  });
  it('@supports만 있고 모션 허용 조건이 없으면 잡는다', () => {
    const css = '@supports (animation-timeline:view()){.reveal{animation-timeline:view()}}';
    expect(ungatedViolations(parseRules(css)).length).toBe(1);
  });
  it('모션 허용 조건만 있고 @supports가 없는 .reveal도 잡는다', () => {
    const css = '@media (prefers-reduced-motion:no-preference){.reveal{opacity:0}}';
    expect(ungatedViolations(parseRules(css)).length).toBe(1);
  });
  it('@supports not (...) / @media not (...)로 감싼 것은 게이트로 치지 않는다', () => {
    const a = `@layer c{@supports not (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){.reveal{opacity:0}}}}`;
    expect(ungatedViolations(parseRules(a)).length).toBe(1);
    const b = `@supports (animation-timeline:view()){@media not (prefers-reduced-motion:no-preference){.reveal{opacity:0}}}`;
    expect(ungatedViolations(parseRules(b)).length).toBe(1);
    const c = `@supports (animation-timeline:view()) or (display:grid){@media (prefers-reduced-motion:no-preference){.reveal{opacity:0}}}`;
    expect(ungatedViolations(parseRules(c)).length).toBe(1);
    const d = `@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference) or (min-width:1px){.reveal{opacity:0}}}`;
    expect(ungatedViolations(parseRules(d)).length).toBe(1);
  });
  it('중첩 규칙이 있어도 부모 규칙 자신의 선언을 놓치지 않는다', () => {
    expect(ungatedViolations(parseRules('.reveal{opacity:0;&:hover{color:red}}')).length).toBe(1);
    expect(
      ungatedViolations(parseRules('.reveal{color:red;&:hover{color:blue}opacity:0}')).length,
    ).toBe(1);
  });
  it('중첩된 쪽의 숨김도 잡는다(.card 안의 .reveal, & 중첩, 규칙 안의 @media)', () => {
    expect(ungatedViolations(parseRules('.card{color:red;.reveal{opacity:0}}')).length).toBe(1);
    expect(ungatedViolations(parseRules('.reveal{@media (min-width:1px){opacity:0}}')).length).toBe(
      1,
    );
    expect(ungatedViolations(parseRules('.x{&.reveal{translate:0 9px}}')).length).toBe(1);
  });
  it('마지막 선언이 세미콜론 없이 끝나도 잡는다', () => {
    expect(ungatedViolations(parseRules('.reveal{color:red;opacity:0}')).length).toBe(1);
  });
  it('@keyframes 안의 opacity:0은 규칙이 아니다', () => {
    const css = '@keyframes reveal-up{from{opacity:0;translate:0 24px}to{opacity:1}}';
    expect(parseRules(css)).toEqual([]);
  });
  it('끄는 선언(none, opacity:1 !important)은 게이트 밖이어도 허용하고, 숨기는 인쇄 규칙은 잡는다', () => {
    const off =
      '@media print{.reveal{animation:none!important;opacity:1!important;translate:none!important}}';
    expect(ungatedViolations(parseRules(off))).toEqual([]);
    expect(ungatedViolations(parseRules('@media print{.reveal{opacity:0!important}}')).length).toBe(
      1,
    );
  });
  it('호버 게이트 밖의 확대를 잡는다', () => {
    expect(zoomViolations(parseRules('.zoom:hover .pic{scale:1.03}')).length).toBe(1);
    const ok =
      '@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){.zoom:hover .pic{scale:1.03}}';
    expect(zoomViolations(parseRules(ok))).toEqual([]);
    const neg =
      '@media not (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){.zoom:hover .pic{scale:1.03}}';
    expect(zoomViolations(parseRules(neg)).length).toBe(1);
  });
  it('motion 요소의 다른 클래스(.text-block)의 게이트 밖 숨김을 잡는다', () => {
    const html = '<div class="text-block reveal astro-abc" data-x="1"></div><p class="plain"></p>';
    const classes = motionClasses([html]);
    expect([...classes].sort()).toEqual(['astro-abc', 'reveal', 'text-block']);
    expect(classViolations(parseRules('.text-block{opacity:0}'), classes).length).toBe(1);
    expect(
      classViolations(parseRules('.text-block[data-astro-cid-x]{translate:0 4px}'), classes).length,
    ).toBe(1);
    expect(classViolations(parseRules('.plain{opacity:0}'), classes)).toEqual([]);
    expect(
      classViolations(parseRules(`${gate}.text-block{opacity:0}${closeGate}`), classes),
    ).toEqual([]);
    expect(classViolations(parseRules('.text-block{color:red}'), classes)).toEqual([]);
  });
  it('.zoom 요소는 안쪽 .pic도 대상으로 본다', () => {
    const classes = motionClasses(['<figure class="image-block zoom"></figure>']);
    expect(classViolations(parseRules('.pic{opacity:0}'), classes).length).toBe(1);
  });
});

const distMissing = !existsSync(dist);
// 빌드 뒤 단계만 REQUIRE_DIST=1로 dist 없음을 실패로 본다. 빌드 전 단계(CI의 첫 test)는 건너뛴다.
if (distMissing && process.env.REQUIRE_DIST) {
  describe('빌드 결과 CSS', () => {
    it('dist/가 있어야 한다(REQUIRE_DIST일 때 건너뛰지 않는다). 먼저 pnpm build를 실행한다', () => {
      expect(existsSync(dist), `${dist} 없음`).toBe(true);
    });
  });
} else if (distMissing) {
  console.warn(
    '[motion-css] dist/가 없어 빌드 결과 CSS 검사를 건너뜁니다. pnpm build 후 다시 실행하세요.',
  );
}

describe.skipIf(distMissing)('빌드 결과 CSS: 지원하지 않는 브라우저에서도 모두 보인다', () => {
  const rules = distMissing ? [] : cssSources().flatMap(parseRules);
  const classes = distMissing
    ? new Set<string>()
    : motionClasses(
        walkFiles(dist, (n) => n.endsWith('.html')).map((f) => readFileSync(f, 'utf8')),
      );

  it('.reveal·.hero-line 규칙이 실제로 존재하고 게이트 안에 있다', () => {
    const screen = rules.filter((r) => !r.gates.includes('@media print'));
    const reveal = screen.filter((r) => /\.reveal\b/.test(r.selector));
    const hero = screen.filter((r) => /\.hero-line\b/.test(r.selector));
    expect(reveal.length).toBeGreaterThan(0);
    expect(hero.length).toBeGreaterThan(0);
    expect(reveal.every((r) => motionGated(r, true))).toBe(true);
    expect(hero.every((r) => motionGated(r, false))).toBe(true);
  });

  it('게이트 밖에서 .reveal·.hero-line이 숨겨지거나 옮겨지지 않는다', () => {
    expect(ungatedViolations(rules)).toEqual([]);
  });

  it('HTML에서 모션 요소가 쓰는 모든 클래스가 게이트 밖에서 숨기거나 옮기지 않는다', () => {
    for (const c of ['reveal', 'hero-line', 'zoom', 'text-block', 'pic', 'name', 'tags']) {
      expect(classes.has(c), `${c}가 HTML에서 모션 요소와 함께 쓰이지 않음`).toBe(true);
    }
    expect(classViolations(rules, classes)).toEqual([]);
  });

  it('이미지 확대는 호버 가능 + 모션 허용 조건 안에만 있다', () => {
    expect(zoomViolations(rules)).toEqual([]);
    expect(rules.some((r) => /\.zoom\b.*\.pic\b/.test(r.selector))).toBe(true);
  });

  it('@view-transition이 있고 JS 없이 켜진다', () => {
    const all = cssSources().join('\n');
    expect(all).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
  });
});

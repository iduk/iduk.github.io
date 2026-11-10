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

/** 중괄호를 따라가는 작은 CSS 파서. 문자열·주석을 건너뛰고, @keyframes 안쪽은 규칙으로 보지 않는다. */
function parseRules(css: string): Rule[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const stack: { head: string; keyframes: boolean }[] = [];
  let buf = '';
  let quote = '';
  const flushDecls = (body: string) => {
    const decls: Record<string, string> = {};
    for (const part of body.split(';')) {
      const i = part.indexOf(':');
      if (i > 0) decls[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
    }
    return decls;
  };
  // 규칙 본문(선언)은 중첩이 없다고 보고 `{`를 만나면 머리, `}`를 만나면 본문으로 처리한다.
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      buf += ch;
      if (ch === quote && src[i - 1] !== '\\') quote = '';
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === '{') {
      const head = buf.trim();
      const inKeyframes = stack.some((s) => s.keyframes);
      const isAt = head.startsWith('@');
      // 선언 블록의 시작인지(= 안쪽에 또 `{`가 없는지) 미리 본다.
      const close = src.indexOf('}', i);
      const nextOpen = src.indexOf('{', i + 1);
      const isLeaf = !isAt && (nextOpen === -1 || close < nextOpen);
      if (isLeaf && !inKeyframes) {
        rules.push({
          selector: head,
          gates: stack.filter((s) => s.head.startsWith('@')).map((s) => s.head),
          decls: flushDecls(src.slice(i + 1, close)),
        });
        i = close; // `}`는 아래에서 소비
        buf = '';
        i++;
        continue;
      }
      stack.push({ head, keyframes: /^@(-\w+-)?keyframes/.test(head) });
      buf = '';
    } else if (ch === '}') {
      stack.pop();
      buf = '';
      i++;
      continue;
    } else if (ch === ';' && stack.length === 0) {
      buf = ''; // @import 등
      i++;
      continue;
    } else {
      buf += ch;
    }
    i++;
  }
  return rules;
}

const HIDING_OR_MOVING = [
  'opacity',
  'transform',
  'translate',
  'scale',
  'rotate',
  'clip-path',
  'visibility',
  'mask',
  'mask-image',
  'filter',
];
const isAnimationProp = (p: string) => p.startsWith('animation') || p.startsWith('transition');

const TARGETS = /\.(reveal|hero-line)\b/;
const noPref = (g: string) =>
  /^@media/.test(g) && /prefers-reduced-motion:\s*no-preference/.test(g);
const supportsTimeline = (g: string) =>
  /^@supports/.test(g) && /animation-timeline:\s*view\(\)/.test(g);

/** `.reveal`·`.hero-line` 규칙 중 게이트 밖에서 숨기거나 옮기는 것의 설명을 모은다. */
function ungatedViolations(rules: Rule[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (!TARGETS.test(r.selector)) continue;
    const isReveal = /\.reveal\b/.test(r.selector);
    const gated = isReveal
      ? r.gates.some(supportsTimeline) && r.gates.some(noPref)
      : r.gates.some(noPref);
    if (gated) continue;
    for (const [p, v] of Object.entries(r.decls)) {
      const bad =
        isAnimationProp(p) ||
        (HIDING_OR_MOVING.includes(p) && !(p === 'opacity' && /^1(\.0+)?$/.test(v))) ||
        (p === 'visibility' && v !== 'visible');
      if (bad) out.push(`${r.selector} { ${p}: ${v} } (게이트: ${r.gates.join(' > ') || '없음'})`);
    }
  }
  return out;
}

/** 확대 규칙(.zoom .pic의 scale/transition)은 호버·모션 허용 게이트 안에만 있어야 한다. */
function zoomViolations(rules: Rule[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (!/\.zoom\b.*\.pic\b/.test(r.selector)) continue;
    const moving = Object.keys(r.decls).some(
      (p) => p === 'scale' || p === 'transform' || isAnimationProp(p) || p.startsWith('transition'),
    );
    if (!moving) continue;
    const hover = r.gates.some((g) => /hover:\s*hover/.test(g) && /pointer:\s*fine/.test(g));
    if (!(hover && r.gates.some(noPref))) out.push(r.selector);
  }
  return out;
}

function cssSources(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (d === dist && name === 'html') continue; // 복사한 데모
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.css')) out.push(readFileSync(full, 'utf8'));
      else if (name.endsWith('.html')) {
        for (const m of readFileSync(full, 'utf8').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
          out.push(m[1]);
        }
      }
    }
  };
  walk(dir);
  return out;
}

describe('검사기 자체 시험(고의로 깨뜨린 CSS)', () => {
  const gate =
    '@layer components{@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){';
  const good = `${gate}.reveal{animation-name:reveal-up;animation-timeline:view()}}}}`;
  it('게이트 안의 .reveal은 통과', () => {
    expect(ungatedViolations(parseRules(good))).toEqual([]);
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
  it('@keyframes 안의 opacity:0은 규칙이 아니다', () => {
    const css = '@keyframes reveal-up{from{opacity:0;translate:0 24px}to{opacity:1}}';
    expect(parseRules(css)).toEqual([]);
  });
  it('호버 게이트 밖의 확대를 잡는다', () => {
    expect(zoomViolations(parseRules('.zoom:hover .pic{scale:1.03}')).length).toBe(1);
    const ok =
      '@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){.zoom:hover .pic{scale:1.03}}';
    expect(zoomViolations(parseRules(ok))).toEqual([]);
  });
});

describe.skipIf(!existsSync(dist))(
  '빌드 결과 CSS: 지원하지 않는 브라우저에서도 모두 보인다',
  () => {
    const rules = existsSync(dist) ? cssSources(dist).flatMap(parseRules) : [];

    it('.reveal·.hero-line 규칙이 실제로 존재하고 게이트 안에 있다', () => {
      const reveal = rules.filter((r) => /\.reveal\b/.test(r.selector));
      const hero = rules.filter((r) => /\.hero-line\b/.test(r.selector));
      expect(reveal.length).toBeGreaterThan(0);
      expect(hero.length).toBeGreaterThan(0);
      expect(reveal.every((r) => r.gates.some(supportsTimeline) && r.gates.some(noPref))).toBe(
        true,
      );
      expect(hero.every((r) => r.gates.some(noPref))).toBe(true);
    });

    it('게이트 밖에서 .reveal·.hero-line이 숨겨지거나 옮겨지지 않는다', () => {
      expect(ungatedViolations(rules)).toEqual([]);
    });

    it('이미지 확대는 호버 가능 + 모션 허용 조건 안에만 있다', () => {
      expect(zoomViolations(rules)).toEqual([]);
      expect(rules.some((r) => /\.zoom\b.*\.pic\b/.test(r.selector))).toBe(true);
    });

    it('@view-transition이 있고 JS 없이 켜진다', () => {
      const all = cssSources(dist).join('\n');
      expect(all).toMatch(
        /@view-transition\{navigation:auto\}|@view-transition\s*\{\s*navigation:\s*auto/,
      );
    });
  },
);

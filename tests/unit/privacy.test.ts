import { describe, expect, it } from 'vitest';
import {
  isExampleEmail,
  isExamplePhone,
  sanitizeDemoText,
  scanDemoText,
  scanText,
} from '../../scripts/lib/privacy';

const MAIL = 'contact@example.com';
const PHONE = '000-0000-0000';

describe('sanitizeDemoText: 교체', () => {
  it('업체 메일을 contact@example.com으로 바꾼다', () => {
    const r = sanitizeDemoText(
      '<a href="mailto:office@acme-corp.co.kr">office@acme-corp.co.kr</a>',
    );
    expect(r.text).toBe(`<a href="mailto:${MAIL}">${MAIL}</a>`);
    expect(r.replaced).toBe(2);
    expect(r.emails).toBe(2);
  });

  it('02-xxxx-xxxx 형태 전화번호를 000-0000-0000으로 바꾼다', () => {
    const r = sanitizeDemoText('TEL 02-3456-7890 / FAX 031-456-7890 / M 010-9876-5432');
    expect(r.text).toBe(`TEL ${PHONE} / FAX ${PHONE} / M ${PHONE}`);
    expect(r.phones).toBe(3);
  });

  it('점·공백 구분, 괄호 지역번호, 국제 표기도 바꾼다', () => {
    const r = sanitizeDemoText('02.3456.7890 | (02) 3456 7890 | +82-2-3456-7890 | 0234567890');
    expect(r.text).toBe(`${PHONE} | ${PHONE} | ${PHONE} | ${PHONE}`);
    expect(r.replaced).toBe(4);
  });

  it('국가번호가 + 없이 쓰인 표기(82 2 …, 82-2-…, 82.2.…)', () => {
    const r = sanitizeDemoText(
      'T 82 2 3456 7890 | 82-2-3456-7890 | 82.2.3456.7890 | 82 31 456 7890',
    );
    expect(r.text).toBe(`T ${PHONE} | ${PHONE} | ${PHONE} | ${PHONE}`);
    expect(r.phones).toBe(4);
  });

  it('대표번호 15xx/16xx/18xx와 슬래시 구분', () => {
    const r = sanitizeDemoText('고객센터 1588-1234 / 1577 4321 / 1800-5678 / 02/3456/7890');
    expect(r.text).toBe(`고객센터 ${PHONE} / ${PHONE} / ${PHONE} / ${PHONE}`);
  });

  it('T.02-…, F: 02-… 같은 접두 표기(앞이 점이어도)', () => {
    const r = sanitizeDemoText('T.02-3456-7890 F.031-456-7890 Tel: 02-3456-7891 M.010-9876-5432');
    expect(r.text).toBe(`T.${PHONE} F.${PHONE} Tel: ${PHONE} M.${PHONE}`);
    expect(r.phones).toBe(4);
  });

  it('tel:, fax: 링크의 번호는 형태와 상관없이 바꾼다', () => {
    const r = sanitizeDemoText(
      '<a href="tel:+8197654321">a</a><a href="fax:0234567890">b</a><a href="tel:">c</a>',
    );
    expect(r.text).toBe(
      `<a href="tel:${PHONE}">a</a><a href="fax:${PHONE}">b</a><a href="tel:">c</a>`,
    );
  });

  it('인코딩된 @(&#64;, &#x40;, &commat;, %40)', () => {
    const r = sanitizeDemoText(
      'a&#64;acme-corp.co.kr b&#x40;acme-corp.co.kr c%40acme-corp.co.kr d&commat;acme-corp.co.kr',
    );
    expect(r.text).toBe(`${MAIL} ${MAIL} ${MAIL} ${MAIL}`);
    expect(r.emails).toBe(4);
  });

  it('사업자등록번호와 통신판매업 신고번호', () => {
    const r = sanitizeDemoText(
      '사업자등록번호. 123-45-67890 / 통신판매업 신고번호. 서울가나 제2099-0123',
    );
    expect(r.text).toBe('사업자등록번호. 000-00-00000 / 통신판매업 신고번호. 제0000-0000호');
    expect(r.regs).toBe(2);
  });

  it('난독화·전각 표기도 scanText 수준으로 잡는다', () => {
    const r = sanitizeDemoText(
      'a (at) acme-corp.co.kr, ａ＠acme-corp.co.kr, ０２－３４５６－７８９０',
    );
    expect(r.text).toBe(`${MAIL}, ${MAIL}, ${PHONE}`);
  });

  it('바꾸지 않는 주변 문자(한글, 비-ASCII)는 그대로 둔다', () => {
    const r = sanitizeDemoText('연락처 ㈜아이덕 ﬁ ０２－３４５６－７８９０ 끝');
    expect(r.text).toBe(`연락처 ㈜아이덕 ﬁ ${PHONE} 끝`);
  });

  it('교체 결과에는 잔여 검사(scanDemoText)가 걸리지 않는다', () => {
    const src =
      'a@b-corp.co.kr 02-3456-7890 ｘ＠y-corp.com (02)3456-7890 82 2 3456 7890 1588-1234 c%40d-corp.com 123-45-67890';
    expect(scanDemoText(sanitizeDemoText(src).text)).toEqual([]);
  });
});

describe('sanitizeDemoText: 그대로 두는 값', () => {
  const keep = [
    '010-1234-1234',
    '+82-10-1234-1234',
    MAIL,
    'name@example.org',
    'someone@mail.example.com',
    'name@domain',
    'a@b.test',
    'logo@2x.png',
    'v1.02.1234',
    'jquery 3.6.0, bootstrap 4.1.3',
    '2024-03-31 12:30:45',
    'width: 0 1234px; margin: 010px; color: #0212345;',
    'rgba(0, 10, 0, .5) 0.0123 1234',
    'copyright 2018-2026',
    'patent 10-1205809, 000-00-00000, 제0000-0000호',
    'tel: 000-0000-0000',
    // 숫자 배열·SVG 경로·좌표 목록은 건드리지 않는다
    'data: [1588, 1234, 1577, 4321, 1800, 1500]',
    '<path d="M1536 1792h1600-1280z"/>',
    '<path d="M1280 1536 1792 1600 1536 1280 1800 1234"/>',
    'values="1800 1234 1500 5678"',
    'coords=1536.1792,1600.1280',
  ];
  for (const s of keep) {
    it(`"${s}"`, () => {
      const r = sanitizeDemoText(s);
      expect(r.text).toBe(s);
      expect(r.replaced).toBe(0);
    });
  }
});

describe('sanitizeDemoText: 성질', () => {
  it('좁힌 예시 규칙: 흔한 견본 도메인과 .js/.css 접미는 면제하지 않는다', () => {
    for (const s of [
      'user@domain.com',
      'me@yourdomain.com',
      'x@mydomain.com',
      'a@b.js',
      'a@b.css',
    ]) {
      expect(sanitizeDemoText(s).text, s).toBe(MAIL);
    }
  });

  it('예시 번호는 정확히 알려진 값만 인정한다: 1234567 꼴로 끝나는 실제 번호는 바꾼다', () => {
    for (const s of [
      '031-123-4567',
      '02-1234-5678',
      '010-4561-2345',
      '010-1234-5678',
      '010-0000-1234',
      '031-456-1234',
    ]) {
      expect(sanitizeDemoText(s).text, s).toBe(PHONE);
    }
  });

  it('구분자 주변에 공백이 낀 전화(02 . 3456 . 7890)', () => {
    const r = sanitizeDemoText(
      '02 . 3456 . 7890 | 02 - 3456 - 7890 | 010 . 9876 . 5432 | 031 .456 -7890',
    );
    expect(r.text).toBe(`${PHONE} | ${PHONE} | ${PHONE} | ${PHONE}`);
  });

  it('풀어 쓴 메일(AT/DOT, 대괄호 포함)과 이중 인코딩된 @', () => {
    const r = sanitizeDemoText(
      [
        'a AT acme-corp DOT co DOT kr',
        'a at acme-corp dot com',
        'a (at) acme-corp (dot) com',
        'a[at]acme-corp[dot]com',
        'mailto:a&#37;40acme-corp.co.kr',
        'mailto:a%2540acme-corp.co.kr',
        'a&#x25;40acme-corp.co.kr',
        'a\\u0040acme-corp.co.kr',
      ].join(' | '),
    );
    expect(r.text).toBe(
      ['', '', '', '', 'mailto:', 'mailto:', '', ''].map((p) => `${p}${MAIL}`).join(' | '),
    );
    expect(r.emails).toBe(8);
  });

  it('일반 문장은 메일로 보지 않는다(점 단어가 없는 at, dot)', () => {
    for (const s of [
      'meet at noon dot',
      'look at the dog',
      'we met at 5 or at six',
      'a dot b at c',
    ]) {
      expect(sanitizeDemoText(s).replaced, s).toBe(0);
    }
  });

  it('두 번째 적용은 0건(멱등)', () => {
    const first = sanitizeDemoText(
      'x@acme-corp.co.kr 02-3456-7890 ０１０－９８７６－５４３２ 82 2 3456 7890 123-45-67890 통신판매업 신고번호 제2099-0123',
    );
    expect(first.replaced).toBe(6);
    const second = sanitizeDemoText(first.text);
    expect(second.replaced).toBe(0);
    expect(second.text).toBe(first.text);
  });

  it('메일 안의 숫자열은 전화번호로 따로 세지 않는다', () => {
    const r = sanitizeDemoText('0234567890@acme-corp.co.kr');
    expect(r.text).toBe(MAIL);
    expect(r.replaced).toBe(1);
  });

  it('긴 적대적 문자열도 빠르게 끝난다(ReDoS 없음)', () => {
    const n = 200_000;
    const inputs = [
      'a'.repeat(n),
      `${'a.'.repeat(n / 2)}@`,
      `x@${'a.'.repeat(n / 2)}`,
      `x ${'(at) '.repeat(n / 5)}`,
      'a '.repeat(n / 2),
      '0'.repeat(n),
      '0 '.repeat(n / 2),
      '02-'.repeat(n / 3),
      `+${'1 '.repeat(n / 2)}`,
      `${'ａ'.repeat(n / 2)}@`,
      '82 '.repeat(n / 3),
      '1588 '.repeat(n / 5),
      '&#64;'.repeat(n / 5),
      '%40'.repeat(n / 3),
      't.'.repeat(n / 2),
      '통신판매업 신고번호 '.repeat(n / 11),
      '123-45-'.repeat(n / 7),
    ];
    const t0 = performance.now();
    for (const s of inputs) sanitizeDemoText(s);
    expect(performance.now() - t0).toBeLessThan(4000);
  });
});

describe('예시 값 판별', () => {
  it('isExampleEmail', () => {
    expect(isExampleEmail('a@example.com')).toBe(true);
    expect(isExampleEmail('a@sub.example.org')).toBe(true);
    expect(isExampleEmail('a@b.test')).toBe(true);
    expect(isExampleEmail('logo@2x.png')).toBe(true);
    expect(isExampleEmail('a@acme-corp.co.kr')).toBe(false);
    expect(isExampleEmail('a@gmail.com')).toBe(false);
    expect(isExampleEmail('a@domain.com')).toBe(false);
  });
  it('isExamplePhone', () => {
    expect(isExamplePhone('010-1234-1234')).toBe(true);
    expect(isExamplePhone('+82 10 1234 1234')).toBe(true);
    expect(isExamplePhone('02-3456-7890')).toBe(false);
    expect(isExamplePhone('031-123-4567')).toBe(false);
    expect(isExamplePhone('02-1234-5678')).toBe(false);
  });
});

describe('scanDemoText', () => {
  it('scanText가 잡는 것을 모두 포함하고(예시 제외) 확장 패턴도 잡는다', () => {
    const kinds = (s: string) => scanDemoText(s).map((h) => h.kind);
    expect(kinds('a@acme-corp.co.kr')).toEqual(['email']);
    expect(kinds('82 2 3456 7890')).toEqual(['phone']);
    expect(kinds('사업자등록번호 123-45-67890')).toEqual(['reg']);
    expect(kinds('/Users/someone/x')).toEqual(['path']);
    expect(kinds('const token = "abc123abc123abc123";')).toEqual(['secret']);
  });
  it('예시 값과 라이브러리 식별자는 통과한다', () => {
    const ok =
      'contact@example.com 000-0000-0000 010-1234-1234 .fa-user-secret:before{content:"\\f21b"} password:!0,image:!0 token = this.token_; token = {position:1}';
    expect(scanDemoText(ok)).toEqual([]);
  });
  it('scanText 자체는 바뀌지 않았다(기본 패턴만)', () => {
    expect(scanText('82 2 3456 7890')).toEqual([]);
    expect(scanText('a@acme-corp.co.kr').map((h) => h.kind)).toEqual(['email']);
  });
});

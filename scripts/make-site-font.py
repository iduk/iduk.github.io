#!/usr/bin/env python3
"""사이트 전용 Pretendard 부분 글꼴을 만든다 (저장소 밖 일회성 도구, 의존성 목록에는 넣지 않는다).

사이트가 실제로 쓰는 글자(빌드된 dist의 본문 글자 + ASCII 전체)만 담고 굵기 축을 400~800으로 줄여
첫 로드 글꼴을 약 40KB로 만든다. 결과는 public/fonts/PretendardVariable.site.woff2와
src/styles/fonts.css이며 둘 다 커밋한다. 새 글자가 생기면 이 스크립트를 다시 돌린다
(tests/unit/site-font.test.ts가 누락을 잡는다).

사용:
  python3 -m venv /tmp/fv && /tmp/fv/bin/pip install fonttools==4.68.0 brotli==1.2.1
  npm pack pretendard@1.3.9 && tar xzf pretendard-1.3.9.tgz        # OFL 1.1 원본
  pnpm build
  /tmp/fv/bin/python scripts/make-site-font.py package/dist/web/variable/woff2/PretendardVariable.woff2
"""
import glob, html, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_FONT = os.path.join(ROOT, 'public/fonts/PretendardVariable.site.woff2')
OUT_CSS = os.path.join(ROOT, 'src/styles/fonts.css')

# 픽셀 글꼴(고정 파일, 이 스크립트가 다시 만들지 않는다). 만드는 법:
#   npm pack galmuri@2.40.3 && tar xzf galmuri-2.40.3.tgz
#   pyftsubset package/dist/Galmuri11.ttf --unicodes=U+0030-0039 --flavor=woff2 --layout-features= \
#     --no-hinting --desubroutinize --output-file=public/fonts/Galmuri11.digits.woff2
PIXEL_FACE = """@font-face {
	font-family: 'Galmuri11 Digits';
	font-style: normal;
	font-display: swap;
	font-weight: 400;
	src: url(/fonts/Galmuri11.digits.woff2) format('woff2');
	unicode-range: U+30-39;
}
"""


def used_chars():
    cs = set()
    for f in glob.glob(os.path.join(ROOT, 'dist/**/*.html'), recursive=True):
        if '/dist/html/' in f.replace(os.sep, '/'):
            continue  # 데모는 자기 글꼴을 쓴다
        t = open(f, encoding='utf8').read()
        t = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', t, flags=re.S)
        cs |= set(html.unescape(re.sub(r'<[^>]+>', ' ', t)))
    cs -= set('\n\r\t')
    cs |= {chr(c) for c in range(0x20, 0x7F)}
    if len(cs) < 100:
        sys.exit('dist가 비었거나 너무 작다. 먼저 pnpm build')
    return sorted(cs)


def ranges(chars):
    cps = sorted(ord(c) for c in chars)
    out, start, prev = [], cps[0], cps[0]
    for c in cps[1:]:
        if c != prev + 1:
            out.append((start, prev)); start = c
        prev = c
    out.append((start, prev))
    return ', '.join(f'U+{a:x}' if a == b else f'U+{a:x}-{b:x}' for a, b in out)


def main(src):
    chars = used_chars()
    with tempfile.TemporaryDirectory() as d:
        text, ranged = os.path.join(d, 't.txt'), os.path.join(d, 'r.woff2')
        open(text, 'w', encoding='utf8').write(''.join(chars))
        bindir = os.path.dirname(sys.executable)
        subprocess.check_call([os.path.join(bindir, 'fonttools'), 'varLib.instancer', src, 'wght=400:800', '-o', ranged, '--no-recalc-bounds'])
        subprocess.check_call([os.path.join(bindir, 'pyftsubset'), ranged, f'--text-file={text}', '--flavor=woff2',
                               '--layout-features=kern,ccmp,locl,mark,mkmk,liga,calt,tnum', '--no-hinting',
                               '--desubroutinize', f'--output-file={OUT_FONT}'])
    css = f"""/* 자동 생성: scripts/make-site-font.py. 직접 고치지 말 것.
Pretendard Variable (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard. SIL OFL 1.1 (/fonts/Pretendard-OFL-LICENSE.txt).
원본: npm pretendard@1.3.9. 사이트가 쓰는 {len(chars)}자만 담은 굵기 400~800 부분 글꼴 하나다.
목록에 없는 글자는 대체 글꼴(tokens.css의 --font-sans)로 그려진다. 새 글자를 쓰면 tests/unit/site-font.test.ts가
빌드 뒤 실패하므로 이 스크립트를 다시 돌려야 배포된다.
Galmuri11 (c) 2019-2025 Lee Minseo, SIL OFL 1.1 (/fonts/Galmuri-OFL-LICENSE.txt). 원본: npm galmuri@2.40.3의 Galmuri11.ttf를
숫자 0-9만 남긴 916바이트 글꼴(연도 표시용 픽셀 숫자). 만드는 법은 make-site-font.py의 PIXEL_FACE 주석을 보라. */
@font-face {{
	font-family: 'Pretendard Variable';
	font-style: normal;
	font-display: swap;
	font-weight: 400 800;
	src: url(/fonts/PretendardVariable.site.woff2) format('woff2-variations');
	unicode-range: {ranges(chars)};
}}
""" + PIXEL_FACE
    open(OUT_CSS, 'w', encoding='utf8').write(css)
    print(f'{len(chars)} chars, {os.path.getsize(OUT_FONT)} bytes')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

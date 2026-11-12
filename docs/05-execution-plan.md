# 05. 단계별 실행 계획

04번 로드맵의 각 단계를 바로 실행할 수 있는 작업 단위(스텝)로 쪼갠 문서다. 스텝 하나는 커밋 하나, 검증 하나로 끝난다.

- 상태: **계획만 있음. 아직 아무 스텝도 실행하지 않았다.**
- 작업 위치: 이 저장소 루트 (브랜치 `portfolio`)
- 원본 데이터 위치: 이 저장소와 나란히 있는 `../iduk.design` (읽기 전용으로만 쓴다)
- 버전은 02번 문서의 2026-10-23 기준 값이다. 스텝 실행 시점에 `pnpm view <패키지> version`으로 다시 확인한다.

## 진행 규칙

-1. **어떤 개인정보도 공개하지 않는다.** [07번 문서](07-privacy.md)가 모든 스텝에 우선하며, 푸시 전 자동 검사를 통과해야 한다. 커밋 작성자는 noreply 주소여야 한다.
0. **한글·영문 병행이 모든 스텝에 적용된다.** 아래 스텝에 따로 적힌 것 외에도 [06번 문서](06-i18n.md)의 규칙을 따른다.

1. 스텝은 번호 순서대로 진행한다. 앞 스텝의 "통과 기준"을 못 채우면 다음으로 넘어가지 않는다.
2. 🛑 표시가 있는 스텝은 시작 전에 사용자 확인을 받는다. 확인 없이 진행하지 않는다.
3. 스텝마다 커밋한다. 메시지는 `S04: 이미지 WebP 변환 스크립트` 형식.
4. **푸시는 S13 전까지 하지 않는다.** 저장소는 **공개로 유지**하므로 푸시한 내용은 모두 노출된다. 푸시 전에 S05의 `git grep` 검사(비공개 글 슬러그·제목, 옛 서버 호스트 이름, 옛 계정 ID, `sftp`. 앞의 세 가지 패턴은 저장소 밖 비공개 목록 `$IDUK_PRIVATE_PATTERNS`에서 읽는다)와 `git ls-files`의 용량·파일 목록을 확인한다.
5. 임시 파일은 저장소 밖에 둔다. 변환 결과가 커지는 `dist/`, `.astro/`, `node_modules/`는 `.gitignore`에 둔다.
6. 스텝이 막히면 원인을 기록하고 멈춘다. 우회하려고 보안 설정(스크립트 차단, CSP, 릴리스 대기)을 끄지 않는다.

## 전체 지도

| 스텝 | 이름 | 추정 | 🛑 | 산출물 |
|---|---|---|---|---|
| S00 | 결정과 계정 보안 | 0.5일 | ✔ | 결정 기록, 2단계 인증 |
| S01 | 저장소 정리 | 0.25일 | ✔ | 옛 코드 태그, 빈 브랜치, 웹훅·Pages 정리 |
| S02 | 프로젝트 생성 | 0.5일 | | Astro 7 + pnpm 12 골격 |
| S03 | 디자인 토큰과 레이아웃 | 0.5일 | | 글꼴, 색, 글자 크기, 헤더·푸터 |
| S04 | 이미지 변환 | 0.5일 | | WebP 마스터, `images.json` |
| S05 | 콘텐츠 변환과 번역 | 1.5일 | ✔ | `projects/*.json` 24개, 스키마 |
| S06 | Picture와 작업 상세 | 1일 | | `/work/[slug]/` |
| S07 | LongShot | 0.5일 | | 긴 캡처 24장 처리 |
| S08 | 목록과 홈 (두 언어) | 1일 | | `/work/`, `/` |
| S09 | 404·데모 정화·PDF | 0.5일 | ✔ | 나머지 페이지, `/html/*` |
| S10 | 움직임 | 0.5일 | | 스크롤 등장, 페이지 전환 |
| S11 | 보안 헤더·CSP·리다이렉트·SEO | 0.5일 | | `vercel.json`, 사이트맵 |
| S12 | 품질 게이트와 CI | 0.5일 | | 자동 검사 통과 |
| S13 | 미리보기 배포와 최종 확인 | 0.5일 | ✔ | Vercel 미리보기 주소 |
| S14 | 도메인 전환 | 0.5일 | ✔ | iduk.co.kr 새 사이트 |
| S15 | 공개 후 점검과 옛 사이트 정리 | 2주 관찰 | ✔ | 옛 호스팅 해지 |
| S16 | Neon (선택) | 2~3일 | ✔ | 문의 폼, 반응 |

---

## S00. 결정과 계정 보안 🛑

**목표** 구현 중 되묻지 않도록 결정을 끝내고, 침해에 노출된 계정을 정리한다.

**할 일**
1. README의 7가지 결정을 확정한다(이름·소개·경력은 쓰지 않음, 저장소 공개 유지). 답은 `docs/DECISIONS.md`에 한 줄씩 적는다.
2. 이미 채팅에 노출된 호스팅 FTP 비밀번호를 폐기한다. 같은 비밀번호를 쓴 곳이 있으면 모두 바꾼다.
3. GitHub, Vercel, Cafe24(도메인 등록처), Neon, 복구 메일로 쓰는 Google 계정에 2단계 인증을 켠다. 가능하면 패스키.
4. 도메인 등록처와 DNS 관리 위치를 확인한다. **등록처와 네임서버 모두 Cafe24로 확인됨, 메일은 쓰지 않음**(ns1.cafe24.com, ns1.cafe24.co.kr, ns2.cafe24.com, ns2.cafe24.co.kr, 아직 변경하지 않음). DNS 레코드를 편집하는 Cafe24 화면 위치만 확인한다. 현재 DNS 레코드 전체(A, CNAME, MX, TXT)를 캡처해서 `../iduk.co.kr/dns-before.txt`(저장소 밖)에 저장한다(비밀 값 없음).
5. 데모 폴더의 에디터 설정 파일에 남은 옛 다른 서버가 살아 있는지 확인한다. 살아 있으면 해당 계정 비밀번호를 바꾸거나 정리한다.

**통과 기준** 결정 7개 기록, 위 계정 전부 2단계 인증, DNS 레코드 기록 파일 존재.

**되돌리기** 해당 없음.

---

## S01. 저장소 정리 🛑

**목표** 푸시해도 안전한 상태를 만든다.

**할 일**
1. 저장소는 **공개로 유지**한다. 대신 `docs/`의 내용 중 공개하기 곤란한 것(침해 상세, 옛 서버 언급, 공격자 도메인)을 확인한다. 곤란하면 `docs/03-security.md`와 05번 문서의 해당 줄만 저장소 밖으로 옮기거나 요약한다.
2. 웹훅(옛 AWS 주소)을 삭제하고 GitHub Pages 설정을 끈다.
3. main의 옛 코드에 태그를 붙인다.
   ```bash
   git tag legacy-react-2022 main
   ```
4. `portfolio` 브랜치에서 옛 프로젝트 파일을 걷어낸다. `docs/`만 남긴다.
   ```bash
   git checkout portfolio
   git rm -r --cached . -q && git add docs && git status --short | head
   ```
   작업 폴더의 옛 파일은 `~/.Trash`로 옮긴다(삭제 전에 목록을 확인).
5. `.gitignore`를 만든다: `node_modules/`, `dist/`, `.astro/`, `.vercel/`, `.env*`, `.DS_Store`.
6. 문서와 `.gitignore`만 커밋한다.

**통과 기준** 태그 존재, `docs/` 공개 가능 여부 확인, `git ls-files`에 `docs/`와 `.gitignore`만 있음.

**되돌리기** 태그가 있으면 main에서 언제든 옛 코드를 복구할 수 있다.

---

## S02. 프로젝트 생성

**목표** 보안 기본값이 들어간 빈 프로젝트가 빌드된다.

**할 일**
1. pnpm 12 준비. 이 Mac의 pnpm은 8.3.1이라 Corepack으로 고정한다.
   ```bash
   corepack enable
   corepack prepare pnpm@12.15.0 --activate   # 설치 시점의 최신 12.x로
   pnpm -v
   ```
2. Astro 프로젝트를 만든다. 빈 템플릿, TypeScript strict, 의존성은 직접 설치.
   ```bash
   pnpm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
   ```
   `docs/`가 있어 폴더가 비어 있지 않다는 경고가 나오면 임시 폴더에 만들고 파일을 옮긴다.
3. `package.json`에 `"packageManager": "pnpm@12.x.y"`와 `"engines": {"node": "24.x"}`를 넣는다(S11에서 `>=22.23.4`에서 변경: Vercel이 범위를 최신 메이저 26.x로 풀어 Corepack이 없어지기 때문).
4. `pnpm-workspace.yaml`에 공급망 설정을 먼저 넣고 설치한다(02번 문서 2절). **설치 전에** 넣어야 처음 설치부터 적용된다.
   ```yaml
   minimumReleaseAge: 4320
   blockExoticSubdeps: true
   trustPolicy: no-downgrade
   allowBuilds:
     sharp: true
     esbuild: true
   ```
5. 의존성 설치: `astro`, `tailwindcss`, `@tailwindcss/vite`, `sharp`, `zod`, `@astrojs/sitemap`, 개발용 `typescript`, `@astrojs/check`, `@biomejs/biome`, `vitest`, `@playwright/test`, `@axe-core/playwright`. 변환 스크립트용 `cheerio`, `sanitize-html`은 S05에서 개발 의존성으로.
   ```bash
   pnpm add astro@7 tailwindcss @tailwindcss/vite sharp zod @astrojs/sitemap
   pnpm add -D typescript @astrojs/check @biomejs/biome vitest @playwright/test @axe-core/playwright
   ```
6. `astro.config.mjs`: `i18n`(기본 `ko`, `ko`·`en`, 기본 언어 접두어 없음), `site: 'https://iduk.co.kr'`, `output: 'static'`, `trailingSlash: 'always'`, `build.inlineStylesheets: 'auto'`, Tailwind 플러그인, 사이트맵 통합, `security.csp: true`(S11에서 세부 설정), `prefetch`는 기본값.
7. `package.json` 스크립트: `dev`, `build`, `preview`, `check`(astro check), `lint`(biome ci), `test`, `e2e`.
8. 설치 로그에서 막힌 설치 스크립트가 있는지 확인한다(`pnpm approve-builds` 목록). 허용 목록에 없는 패키지의 스크립트가 필요하다고 나오면 이유를 확인하고 결정한다.

**통과 기준**
- `pnpm install --frozen-lockfile && pnpm build && pnpm check && pnpm lint` 성공.
- `pnpm-lock.yaml` 커밋됨. `pnpm audit`에 높음 이상 취약점 없음.
- 직접 의존성 17개 이하(docs/02).

**되돌리기** 이 스텝의 커밋을 되돌린다. 아직 푸시 전이다.

---

## S03. 디자인 토큰과 레이아웃

**목표** 01번 문서의 타이포, 색, 간격이 CSS 변수로 존재하고, 빈 페이지가 보기 좋다.

**할 일**
1. 글꼴: `pretendard` 패키지에서 Variable 동적 서브셋 파일을 `public/fonts/`로 복사하고 `@font-face`를 쓴다. 외부 CDN 주소는 쓰지 않는다. 라이선스 파일(OFL)도 함께 복사한다.
   - 첫 화면에 필요한 서브셋만 `<link rel="preload">`. 나머지는 `unicode-range`로 지연 로드.
   - `font-display: swap`, 대체 글꼴 스택은 `system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`.
2. `src/styles/tokens.css`: 01번 문서 4~7절 값 그대로.
   - 글자 크기 5종(`--fs-hero`, `--fs-title`, `--fs-sub`, `--fs-body`, `--fs-meta`), 색 4종, 간격, 곡선과 시간.
   - 어두운 테마는 `prefers-color-scheme`와 `data-theme` 수동 전환 둘 다. 첫 페인트 전에 테마를 적용하는 작은 인라인 스크립트 하나만 허용하고, CSP 해시로 등록한다.
3. `src/styles/global.css`: 리셋, `text-wrap`, `:lang(ko)`에서 `word-break: keep-all`, 영문은 `text-wrap: balance`, 포커스 링, `prefers-reduced-motion` 기본 규칙.
4. `src/layouts/Base.astro`: 페이지 언어에 맞는 `lang`, `hreflang` 대체 링크, 언어 전환(`KO | EN`), 메타 태그 자리, 본문 바로가기 링크, `<Header>`, `<slot>`, `<Footer>`.
5. `src/components/Header.astro`(`iduk` 로고, Work, 테마 전환), `Footer.astro`.
6. `src/pages/index.astro`는 임시로 히어로 문구만 둔다.

**통과 기준**
- 360, 768, 1280, 1920px에서 임시 홈이 깨지지 않는다(`pnpm preview` + Playwright 스크린샷).
- 포커스 링이 모든 링크에 보인다. 본문 대비 4.5:1 이상(토큰 표와 일치).
- 홈의 첫 화면 CSS가 gzip 20KB 이하.

**되돌리기** 커밋 단위.

---

## S04. 이미지 변환

**목표** 쓰이는 60장(대표 이미지와 본문 이미지)을 WebP 마스터로 만들고 메타데이터 파일을 만든다. 원본은 건드리지 않는다.

**입력** `../iduk.design/data/posts.json`의 `images`, `featuredImage`, `contentImages`, 그리고 `../iduk.design/images/original/`.
**출력** `src/assets/images/<slug>/<번호>-<이름>.webp`, `src/content/images.json`, 변환 보고서(저장소 밖).

**할 일**
1. `scripts/convert-images.ts`를 만든다(사이트 번들에는 들어가지 않는다).
   - 대상: 공개 글 24개의 대표 이미지와 본문에 나오는 이미지(첨부만 된 이미지는 제외). 비공개 글 이미지는 변환하지 않는다.
   - 가로 2560px 초과만 축소(`withoutEnlargement`), WebP 화질 90, 메타데이터(EXIF) 제거, `sharp(..., { limitInputPixels })`로 입력 크기 상한.
   - 한글 파일명은 NFC로 정규화해서 읽고, 출력 이름은 ASCII 슬러그로 만든다. 이름이 겹치면 번호를 붙인다.
   - 세로 8192px 초과 이미지(tsp32-UI 1920×8865, yangdon-dashboard 1600×8864)도 WebP 한계(16383px) 안이라 변환 가능. 한계를 넘으면 오류로 멈추고 보고한다.
   - 평균색(`sharp().stats()`의 dominant 또는 1×1 리사이즈)을 hex로 계산한다.
   - 가로, 세로, 평균색, 원본 파일명, 용량을 `images.json`에 기록한다.
2. 단위 테스트(`vitest`): 이름 정규화, 겹침 처리, 축소 규칙.
3. 실행은 한 번에 하나의 글부터 시험하고, 전체는 마지막에 돌린다.
   ```bash
   pnpm tsx scripts/convert-images.ts --only oyedu     # 시험
   pnpm tsx scripts/convert-images.ts                  # 전체
   ```
4. 변환 보고서에 원본 대비 용량, 가로 2560 초과 개수, 실패 목록을 남긴다.

**통과 기준**
- 기대 장수와 변환 장수가 같다(61). 실패 0.
- 총 용량 25MB 이하(시험 변환 20MB, 화질 90이면 더 크므로 초과하면 보고하고 화질 조정은 사용자에게 묻는다).
- 무작위 10장을 원본과 나란히 열어 눈으로 비교한다. 글자가 번지지 않는지, 색이 변하지 않는지 확인.
- `images.json`의 모든 항목에 가로, 세로, 평균색이 있다.

**되돌리기** `src/assets/images`를 지우고 다시 실행하면 같은 결과가 나온다(결정적 변환).

---

## S05. 콘텐츠 변환 🛑

**목표** 글 24개가 검증된 JSON으로 존재한다.

**할 일**
1. `src/content.config.ts`: zod 스키마(02번 문서 5절 필드). 필수: `slug`, `title`, `year`, `cover`, `blocks`. 이미지 블록은 `images.json`의 키를 참조하고, 없으면 빌드 실패.
2. `scripts/build-content.ts`
   - 입력: `posts.json`. 공개 24개만 대상(`status === publish`, 카테고리 Portfolio).
   - 34개 글의 `dl.subject`는 cheerio로 `dt`, `dd`를 뽑아 `period`, `projectName`, `role`, `summary`로.
   - 본문 이미지는 등장 순서대로 `blocks`에 넣는다. 가로가 세로의 2.5배를 넘는 이미지는 `longshot` 블록으로 분류한다.
   - 본문 HTML은 그대로 쓰지 않는다. 남는 글은 `sanitize-html`로 허용 목록(`p`, `a`, `strong`, `em`, `ul`, `ol`, `li`, `br`)만 통과. `style`, `script`, `on*` 속성, `iframe`은 제거.
   - `legacy`: 옛 글 번호, 옛 주소(`/portfolio/<slug>/`). 슬러그 `1812`는 `jejuair-mobile`로 바꾸고 옛 슬러그를 `legacy.slug`에 기록한다.
   - `demo`: `demoLinks`가 있는 글(engineering-responsive-web → atom, telecare-service-website → hidea)에 데모 경로를 연결한다.
   - `archive2019` 본문이 현재 본문보다 자세한 글은 목록으로만 출력하고 **자동 병합하지 않는다**. 사용자가 보고 고른다.
3. 수동 정리 대상(자동 변환 불가): 구조가 다른 글, 빈 `alt`. 목록을 `docs/manual-todo.md`에 만든다.
4. `alt` 규칙: `"<프로젝트명> – <화면 설명>"`을 **한글·영문 두 벌**로. 화면 설명은 자동으로 만들 수 없으므로 초안을 채워서 사용자에게 확인받는다.
   - 스키마의 사람이 읽는 필드(`title`, `role`, `summary`, `alt`)는 `{ko, en}` 형태이고 `en`이 비면 빌드 실패([06번 문서 3절](06-i18n.md#3-콘텐츠-구조)).
   - 역할·설명·태그·alt의 영문 초안을 만든다. 확정 전에는 `status: draft-translation`을 달고, 남아 있으면 CI가 실패한다.
   - 화면 문구는 `src/i18n/ui.ts`에 두 사전으로.
5. 태그: 쓰이는 태그만 남기고 영문/한글 중복을 정리한다. 정리안을 사용자에게 보여 준다.
6. 대표 작업 6~8개 선정(`featured: true`, `order`). 선정안을 사용자에게 보여 준다.

**🛑 사용자 확인 항목** 공개 글 목록(비공개 13개는 그대로 제외), 대표 작업 선정, 태그 정리안, alt 초안, 2019 병합 후보, **영문 번역 초안(역할·설명·태그·alt·화면 문구)**.

**통과 기준**
- `pnpm astro sync`로 스키마 검증 통과.
- 깨진 이미지 참조 0, 빈 `alt` 0, 중복 슬러그 0, 옛 사이트·CDN 주소 문자열 0 (`grep -r "iduk.co.kr/wp-\|cafe24" src/content` 결과가 비어야 함).
- 비공개 글의 제목·본문·이미지가 저장소 어디에도 없다 (`git grep` 으로 비공개 슬러그 13개 검색, 결과 0).

**되돌리기** 변환은 일회성 스크립트라 `src/content/projects`를 지우고 다시 실행한다.

---

## S06. Picture와 작업 상세

**목표** `/work/[slug]/`가 24개 모두 생성된다.

**할 일**
1. `src/components/Picture.astro`
   - 입력: `images.json` 키 또는 이미지 import, `alt`, `sizes`, `priority`.
   - Astro `<Picture>`로 AVIF+WebP, 폭 640/960/1280/1920/2560. `width`, `height` 필수 전달, 배경색은 평균색.
   - `priority`일 때만 `loading="eager"`, `fetchpriority="high"`. 나머지는 `lazy`, `decoding="async"`.
2. 블록 렌더러 `src/components/blocks/`: `ImageBlock`(전체 폭), `PairBlock`(두세 장 나란히), `TextBlock`, `EmbedBlock`(데모 링크 카드).
3. `src/pages/work/[slug].astro`: `getStaticPaths`로 공개 글만 생성. 제목, 메타 표(기간·역할·태그), 블록들, 이전·다음 링크(연도순).
4. 빌드 시간을 측정해 기록한다. 5분을 넘으면 AVIF를 빼고 WebP만 먼저 낸다(`formats` 설정).

**통과 기준**
- `pnpm build`로 `/work/*/` 24개 생성. 각 페이지에 `<h1>` 하나, 모든 `<img>`에 `alt`·`width`·`height`.
- 가장 이미지가 많은 `smartfarm-android`(22장)에서 모바일 LCP 요소가 첫 이미지이고 나머지는 지연 로드.
- 360px에서 가로 스크롤이 생기지 않는다.

---

## S07. LongShot

**목표** 긴 화면 캡처 24장이 보기 좋게 보인다.

**할 일**
1. `src/components/LongShot.astro`: 브라우저 틀(CSS만, 이미지 없음) 안에 캡처를 넣고, 틀 높이를 `min(80svh, 56rem)`으로 고정한다. 틀 안에서 세로 스크롤.
   - 키보드로 스크롤할 수 있게 `tabindex="0"`, `role="region"`, `aria-label`.
   - 스크롤 가장자리 그림자는 CSS `animation-timeline: scroll()`.
   - 틀 안 이미지는 960px 폭 변형으로 시작하고, "원본 크기로 보기" 버튼을 누르면 2560px 변형을 로드한다.
2. 블록 종류 `longshot`을 S06의 렌더러에 연결한다.
3. 세로 8192px 초과 2장(tsp32-UI, yangdon-dashboard)은 특히 확인한다. 두 장 모두 공개 글(telecare-service-app, smartfarm-dashboard)에 속한다.

**통과 기준**
- 공개 글의 긴 캡처가 모두 틀 안에서 보이고, 휠·터치·키보드로 스크롤된다.
- 틀이 페이지 스크롤을 가두지 않는다(끝에 닿으면 페이지가 이어서 스크롤된다: `overscroll-behavior: auto`).
- 모바일에서 첫 로드에 2560px 변형을 받지 않는다(네트워크 탭 확인).

---

## S08. 목록과 홈

**할 일**
1. `/work/`와 `/en/work/`: 연도별 그룹. 각 행은 연도, 제목, 태그. 데스크톱에서 행에 마우스를 올리면 큰 미리보기 이미지가 커서 근처에 뜬다(CSS만, 터치에는 없음).
   - 태그 필터: JS 없이 `<details>`와 앵커 또는 빌드 시 태그별 페이지(`/work/tag/<tag>/`)로. 첫 구현은 태그별 페이지.
2. 홈 `/`: 히어로(`iduk` 워드마크와 `Selected Work`), 대표 작업 행(큰 이미지, 제목, 연도, 태그), "전체 작업 보기". 푸터는 `© iduk`와 언어 전환만.
   - 히어로 아래 첫 번째 대표 이미지만 `priority`.
3. 대표 이미지 행과 목록 행 사이는 같은 이미지가 이어지도록 `view-transition-name`을 `work-<slug>`로 부여한다(S10에서 활성화).

**통과 기준**
- 홈 모바일 LCP 요소가 첫 대표 이미지이고 CLS 0.05 이하(Lighthouse).
- 태그 페이지가 JS 없이 동작한다(JS 끄고 확인).
- 홈 첫 화면 JS 0~소량(gzip 30KB 이하).

---

## S09. 404·데모 정화·PDF 🛑

**할 일**
1. About·Contact 페이지는 만들지 않는다(이름·경력 미공개).
2. 연락처는 사이트 어디에도 두지 않는다([07번 문서](07-privacy.md)). 푸터는 `© iduk`와 언어 전환만.
3. `404.astro`: 큰 글자 안내와 홈 링크.
4. 데모 복사: `../iduk.design/html/{atom,hidea,sprx,suwon}` → `public/html/`.
   ```bash
   rsync -a --exclude='.DS_Store' --exclude='.vscode' --exclude='*.map' --exclude='.git' \
     ../iduk.design/html/ public/html/
   ```
   복사 후 `public/html`에서 옛 서버 호스트 이름과 `sftp`를 검색해 접속 정보가 없는지 확인한다(호스트 패턴은 비공개 목록에서 읽는다).
5. **데모 정화(🛑 기본값 적용 여부 확인).** 복사본의 메일·전화번호를 예시 값으로 교체하고 교체 목록을 저장소 밖 보고서에 남긴다([07번 문서 4절](07-privacy.md#4-데모와-콘텐츠-속-제3자-정보)).
6. 데모 내부 점검: 외부 주소로 나가는 스크립트·CSS(예: 오래된 CDN)를 목록으로 만들고, 사라진 주소는 로컬 사본으로 대체할지 사용자에게 묻는다.
7. PDF 3개는 **모두 보류한다(현재 `public/files/`에 공개하는 PDF 없음).** 문서 속성(작성자·회사)은 `scripts/copy-pdfs.ts`가 지울 수 있지만, 본문 속 연락처가 **윤곽선(outline)이나 래스터 그림**으로 들어 있으면 텍스트 추출·패턴 검사·`public-guard`가 보지 못한다(실제로 한 브로셔의 둘째 쪽 구석에 제3자 회사 주소·메일·전화·팩스가 그림으로 들어 있었다). **PDF는 모든 페이지를 사람이 눈으로 훑어 본 뒤에만 올린다.** 올릴 때는 `scripts/lib/pdf.ts`의 `REVIEWED_PDFS`와 `copy-pdfs.ts`의 `PUBLISH`에 함께 적는다. 파일은 sha256으로 구분하고(`HELD_PDF_SHA256`), 링크는 걸 곳이 정해지면 사용자가 연결한다.

**통과 기준**
- `/html/atom/`, `/hidea/`, `/sprx/`, `/suwon/`의 모든 페이지가 200이고 이미지가 깨지지 않는다(링크 검사 스크립트).
- 접속 정보 문자열 0.

---

## S10. 움직임

**할 일**
1. 스크롤 등장: `.reveal` 클래스에 `animation-timeline: view()`, `@supports`로 감싸고 미지원 브라우저는 즉시 표시.
2. 히어로 문구: 줄 단위 마스크 열림, 800ms, 첫 로드 한 번.
3. 이미지 호버: 1.03배, 640ms, `@media (hover: hover)`에서만.
4. 페이지 전환: `@view-transition { navigation: auto; }`와 `::view-transition-*` 규칙. 대표 이미지 ↔ 상세 대표 이미지는 같은 `view-transition-name`.
5. `prefers-reduced-motion: reduce`: 이동·확대 제거, 120ms 이하 투명도만.
6. JS를 쓰지 않는다. ClientRouter는 쓰지 않는다.

**통과 기준**
- 지원 브라우저(Chrome)에서 전환이 보이고, Safari·Firefox에서 일반 이동으로 정상 동작.
- 모션 줄이기를 켜면 움직임이 사라진다(Playwright `reducedMotion: 'reduce'`).
- INP 150ms 이하.

---

## S11. 보안 헤더·CSP·리다이렉트·SEO

**할 일**
1. `vercel.json`
   - 헤더: `Content-Security-Policy`는 Astro가 만드는 meta(해시와 `default-src` 등)와 `vercel.json` 헤더(해시 불필요한 지시어만, `default-src` 없음. 03번 문서 4.2)를 함께 쓴다. 그리고 `Strict-Transport-Security`(처음에는 `max-age=300`, 안정되면 올림), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`(카메라, 마이크, 위치 모두 비움), `Cross-Origin-Opener-Policy: same-origin`.
   - `/html/*`에는 데모 전용 완화 정책을 따로 둔다(03번 문서 참조).
   - 리다이렉트는 `pnpm exec tsx scripts/gen-redirects.ts`가 `src/content/projects/*.json`의 `legacy.path`에서 만든다(손으로 고치지 않는다, `--check`로 최신 여부 확인, 단위 테스트가 24개 전부 일치를 검사). 상태 코드는 `statusCode: 301`(`permanent`는 308). 규칙은 슬래시 있는 형태 24개와 `/portfolio/` 하나, 총 25개다. `/portfolio/<slug>/` → `/work/<slug>/`(301), `/portfolio/1812/` → `/work/jejuair-mobile/`. 슬래시 없는 옛 주소는 규칙 없이 `trailingSlash`의 308 다음 301로 두 번 이동한다. 옛 `/?p=ID`·`/?page_id=ID`는 리다이렉트하지 않는다(쿼리가 목적지로 전달되어 반복된다. 홈이 쿼리를 무시하고 200). `/wp-admin`·`/wp-login.php`·`/xmlrpc.php`는 404.
   - 옛 이미지 경로(`/wp-content/uploads/...`)는 연결하지 않는다.
2. Astro `security.csp`로 스크립트·스타일 해시를 생성하고 `default-src 'self'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`를 지시한다.
3. SEO: 언어별 `<title>`, 설명, `hreflang` 상호 연결과 `x-default`, 사이트맵 i18n(404, `/html/`, `/files/`, `/og/` 제외, `lastmod` 없음: 결정적인 값이 없다), 정규 주소, 열린 그래프 이미지(작업 대표 이미지에서 1200×630 JPEG을 빌드 시 `/og/<slug>.jpg`로 생성: 세로로 긴 이미지는 위쪽을 자르고, 파일마다 300KB 미만, 메타데이터 없음. 홈·목록·태그는 `/og/default.jpg`=홈 첫 대표 작업), `sitemap-index.xml`, `robots.txt`(전체 허용, `/html` 막지 않음). **JSON-LD는 넣지 않는다.** `Person`은 07번 문서가 금지하고, 저자 없는 `CreativeWork`는 얻는 것이 작은데 인라인 스크립트라 해시가 필요하다.
4. `security.txt`, `Person` 구조화 데이터, `mailto:`는 만들지 않는다([07번](07-privacy.md)).

**통과 기준**
- `pnpm build && pnpm preview` 후 `curl -sI`로 헤더 확인. 브라우저 콘솔에 CSP 위반 0.
- securityheaders.com 등급 A 이상(미리보기 배포 후 S13에서 확인).
- 리다이렉트 표의 모든 경로가 기대한 주소로 이동한다(자동 테스트).

---

## S12. 품질 게이트와 CI

**할 일**
1. 단위 테스트: 변환 스크립트(이름 정규화, 블록 분류, 정화).
2. E2E(Playwright): 두 언어 모두, 한글 페이지마다 영문 쌍과 `hreflang` 상호 연결, 언어 전환 링크 24개 글 확인. 홈, 목록, 상세 3종, 404, 리다이렉트, 데모 첫 페이지. 뷰포트 360/768/1280/1920.
3. 접근성(axe): 위 페이지 모두 위반 0.
4. 링크 검사: 내부 링크, 이미지, `/html/*` 전체.
5. 예산 검사: Lighthouse CI로 모바일 성능·접근성·권장사항·SEO 95 이상, JS·CSS·글꼴 예산.
6. GitHub Actions `ci.yml`: 권한 `contents: read`, 외부 액션은 커밋 SHA로 고정, `pnpm install --frozen-lockfile`, 순서는 lint → check → test → build → e2e → lighthouse.
7. `weekly-cloak-check.yml`(예약): 사이트를 일반 방문자 헤더로 두 번 요청해 본문이 같은지 비교하고, 응답에 허용 목록 밖 스크립트 주소가 있으면 실패해 알림을 보낸다.
8. Dependabot 대신 `pnpm outdated` 월 1회 수동 확인을 문서화한다(자동 병합 금지).

**통과 기준** CI 전체 녹색. 일부러 `alt`를 비운 시험 커밋이 CI에서 실패하는 것을 확인한다.

### S12 구현 메모

**로컬에서 한 줄로** (CI와 같은 순서)

```bash
pnpm gate        # lint → check → test → build → check-privacy → budgets → e2e(axe, 반응형, 링크 포함)
pnpm gate:full   # gate + Lighthouse(모바일)
```

개별 실행: `pnpm check-privacy`(기본 모드: 추적 파일 + `dist/`, 이미지 GPS, 소스맵, `mailto:`/`tel:`, 내부 링크), `pnpm check-privacy --pre-publish`(S13·S14 전에 사람이 실행: 번역 초안 표시가 남아 있으면 실패. CI는 기본 모드만 쓴다), `pnpm budgets`(첫 로드 바이트 예산), `pnpm lighthouse`(`--collect.numberOfRuns=1`로 빠르게), `pnpm e2e`. 비공개 패턴 파일이 있으면 `IDUK_PRIVATE_PATTERNS=/경로/파일 pnpm check-privacy --require-private`로 돌린다(없으면 로컬에서는 경고만). 이웃 폴더의 `../iduk.design`이 있으면 비공개 글 제목·슬러그 검사가 자동으로 켜진다. CI에서는 꺼지므로 푸시 전에는 반드시 로컬에서 `pnpm gate`(또는 `pnpm check-privacy --archive ../iduk.design`)를 한 번 돌린다(docs/07 6절). 자세한 규칙은 docs/07 6절.

**CI 설정 (`.github/workflows/ci.yml`)**
- 저장소 비밀 값 **`IDUK_PRIVATE_PATTERNS_B64`**를 한 번 만든다: 비공개 패턴 파일(줄마다 정규식)을 `base64 < 파일 | tr -d '\n'`으로 한 줄로 만들어 넣는다(한 줄이라 로그 마스킹이 값 전체에 걸린다). 워크플로는 이것을 러너 임시 파일로 풀어 `check-privacy`에 `$IDUK_PRIVATE_PATTERNS`로 넘기고 바로 지운다. 값은 어디에도 출력하지 않는다. 비밀 값이 없으면 CI에서 이 단계가 실패한다(의도).
- 포크에서 온 PR에는 비밀 값이 전달되지 않는다. 그 경우에만 `--allow-missing-private`로 비공개 패턴 검사를 건너뛰고 `::warning`으로 크게 알린다. 병합 전에 관리자가 저장소 안의 브랜치로 옮겨 전체 검사를 돌린다. `pull_request_target`은 쓰지 않는다.
- 외부 액션은 `actions/checkout`(v6.1.0), `actions/setup-node`(v6.5.0), `actions/upload-artifact`(v6.0.0)뿐이고 `git ls-remote`로 태그의 커밋 SHA를 확인해 고정했다(세 태그 모두 주석 없는 태그라 태그 값이 곧 커밋이다). 갱신할 때도 같은 방법으로 SHA를 확인하고 `# vX.Y.Z` 주석을 맞춘다. `tests/unit/ci-config.test.ts`가 SHA 고정, 권한, 순서, `--frozen-lockfile`, `run:` 안의 `${{ }}` 금지 등을 YAML 텍스트에서 검사한다.
- Node는 `package.json`의 `engines.node`(24.x), pnpm은 `packageManager`(corepack)에서 온다. 시험 보고서(`playwright-report/`, `test-results/`, `.lighthouseci/reports/`)는 실패해도 올리며 비밀 값이 들어 있지 않다.
- GitHub Actions는 푸시 전에는 돌 수 없다. 첫 푸시에서 처음 돌고, 로컬에서는 같은 단계를 `pnpm gate:full`로 돌려 본다.

**주간 은폐 검사 (`weekly-cloak-check.yml`, `scripts/cloak-check.ts`)** 저장소 변수 `SITE_URL`(예: `https://iduk.co.kr`)을 정하면 매주 월요일에 운영 주소의 `/`, `/en/`, `/work/`를 일반 방문자(한글), 검색에서 온 방문자(Referer), 검색 로봇(User-Agent)으로 요청해 본문 유사도(0.98 미만이면 실패)와, 스크립트·스타일·iframe 주소가 사이트 자신 또는 `scripts/cloak-allow.txt` 밖인지 본다. 다른 호스트로의 리다이렉트와 200이 아닌 응답도 실패다. 변수가 없으면 알림만 남기고 성공한다(도메인 전환 전에도 무해). 실패 알림은 워크플로 실패 메일이고 이슈는 만들지 않는다(권한 `contents: read`만). 설치 없이 `node scripts/cloak-check.ts`로 돈다.

**알려진 한계(메모)** `packageManager`는 `pnpm@12.18.0`만 적고 무결성 해시(`+sha512...`)는 붙이지 않았다. 해시 값을 이 환경에서 직접 확인할 수 없어 넣지 않았다. 알 수 없는 확장자(`.sql`, `.mdx`, `.jsonl`, `.rss`)와 UTF-16 파일도 `check-privacy`가 공개 패턴으로 본다.

**월 1회 수동 점검 (Dependabot, 자동 병합 없음)** 매월 첫 주에 `pnpm outdated`를 보고, 올릴 것은 한 번에 하나씩 `pnpm update <패키지>`로 올린 뒤 락 파일 diff를 사람이 읽고 `pnpm gate:full`을 통과시킨 다음 커밋한다. `minimumReleaseAge`, `trustPolicy`, `blockExoticSubdeps`, `allowBuilds`는 완화하지 않는다: 신뢰 등급 하락으로 설치가 막힌 버전은 올리지 않고 이유를 docs/02에 적는다(예: `@vercel/routing-utils`, `lighthouse` 13.4 이상).

**측정 결과** (2026-11-10, 로컬 Chromium, Lighthouse 12.6.1 모바일 기본 프리셋, 각 페이지 3회 중앙값, LHCI 정적 서버는 HTTP/1.1)

| 페이지 | 성능 | 접근성 | 권장사항 | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| 홈(ko) | 89 | 96 | 100 | 100 | 3.25s | 0 | 0 |
| 홈(en) | 98 | 96 | 100 | 100 | 2.26s | 0 | 0 |
| 목록 | 94 | 100 | 100 | 100 | 2.56s | 0 | 0 |
| 태그(web) | 94 | 100 | 100 | 100 | 2.56s | 0 | 0 |
| 상세 expressway(가장 무거움) | 93 | 100 | 100 | 100 | 2.94s | 0 | 0 |
| 상세 telecare-service-app(LongShot) | 92 | 97 | 100 | 100 | 3.01s | 0 | 0 |
| 상세 oyedu | 96 | 100 | 100 | 100 | 2.41s | 0 | 0 |

- 접근성·권장사항·SEO는 기준(95)을 넘는다. 접근성 96~97은 스크롤로 나타나는 요소(`.reveal`)가 화면에 들어오는 순간의 중간 투명도를 Lighthouse가 대비 부족으로 잡은 것이다(axe로 끝까지 스크롤한 정적 상태는 위반 0).
- **성능 95와 LCP 1.8초는 한글 페이지에서 미달이다.** 원인은 Pretendard 한글 동적 서브셋이다: 본문 글자가 걸리는 서브셋 10~11개(약 250~280KB)가 첫 로드에 내려가며, Lighthouse의 느린 4G 모사(1.6Mbps)에서 이 글꼴 전송이 FCP·LCP 계산에 들어가 LCP 이미지와 대역을 나눈다. 같은 dist에서 글꼴 선언만 지운 시험은 100점이었고, 영문 홈(필요한 서브셋이 적음)은 98이다. 스타일시트를 HTML에 넣는 시험(`inlineStylesheets: 'always'`)은 개선이 없어 되돌렸다. `favicon.ico` 404(콘솔 오류, 권장사항 96)는 파비콘 추가로 고쳤다. 남은 선택지: 사이트에서 쓰는 글자만 담은 한글 서브셋 하나로 줄이기(원본 Pretendard 가변 글꼴과 subsetting 도구 필요), 또는 S13에서 Vercel 미리보기(HTTP/2, CDN)로 다시 재서 기준을 정하기. `lighthouserc.json`의 성능·LCP 기준은 계획의 목표(95, 1.8초) 그대로 두었으므로 이 상태로는 CI의 Lighthouse 단계가 실패한다.
- 결정적 예산(`pnpm budgets`, 81쪽, 모바일 412px·DPR 1.75): 첫 로드 JS gzip 0.6KB(상한 30KB), CSS gzip 최대 19.9KB(상한 26KB, 원본 71KB), 글꼴 파일 최대 11개·280KB(상한 14개·400KB), 즉시 불러오는 이미지 최대 44KB(상한 80KB). 글꼴 선택(unicode-range)은 `tests/e2e/budgets-fonts.spec.ts`가 실제 Chromium의 요청과 대표 24쪽에서 같음을 확인한다.

---

## S13. 미리보기 배포와 최종 확인 🛑

**할 일**
1. Vercel에서 프로젝트를 가져온다(GitHub 앱 권한은 이 저장소 하나만). `vercel.json`이 프레임워크 Astro, 설치 명령 `pnpm install --frozen-lockfile`, 빌드 `pnpm build`, 출력 `dist`를 정한다. 대시보드에서 따로 정해야 하는 것(문서 근거):
   - **환경 변수 `ENABLE_EXPERIMENTAL_COREPACK=1`.** 락 파일 버전이 `9.0`이라 Vercel이 락 파일만 보면 pnpm 9 또는 10을 고른다(https://vercel.com/docs/package-managers). `packageManager: pnpm@12.18.0`을 따르게 하려면 Corepack을 켜야 한다(https://vercel.com/docs/builds/configure-a-build#corepack). 실험 기능이라 빌드 로그에서 실제 pnpm 버전(`pnpm -v`)을 확인한다. 이 값은 비밀이 아니다.
   - **Node 버전.** `package.json`의 `engines.node`가 `24.x`다. 이 값이 대시보드의 Node 설정보다 우선하며 사용 가능한 최신 24.x로 풀린다(https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). 범위(`>=22.23.4`)로 두면 최신 메이저 26.x가 선택되는데, Node 25부터는 Corepack이 배포본에 없다(https://nodejs.org/en/blog/release/v25.0.0). 대시보드의 Node 설정은 기본값으로 둔다. **첫 미리보기 빌드 로그에서 `node -v`가 24.x인지, `pnpm -v`가 12.18.0인지 확인한다.**
2. 환경 변수 없음(1단계). Deployment Protection은 미리보기에만 켠다.
3. `portfolio` 브랜치를 푸시하고 미리보기 주소를 받는다. **푸시 전에 S05의 `git grep` 검사를 다시 실행한다.**
4. 미리보기에서 점검한다.
   - 실제 휴대폰(iOS Safari, Android Chrome)과 데스크톱 3종 브라우저.
   - Lighthouse 모바일, securityheaders, SSL Labs는 도메인 연결 후.
   - 이미지 용량과 Vercel 데이터 전송량 대시보드.
5. 방화벽 규칙을 설정한다(03번 문서 4.3): 사용자 정의 규칙 3개 이내, 요율 제한 1개. 규칙 1(차단): Request Path starts with `/wp-` OR equals `/xmlrpc.php` OR starts with `/phpmyadmin` OR ends with `.php` → Deny.
   - 미리보기에서 `vercel.json` 해석을 확인한다(로컬 시험이 증명하지 못하는 것, 03번 문서 4.2): `curl -sI`로 `/`, `/en/`, `/html/atom/`의 헤더(엄격한 CSP와 완화 CSP가 합쳐지지 않았는지, `X-Robots-Tag`), `/portfolio/oyedu/`와 `/portfolio/1812/`의 `301`과 `Location`, 슬래시 없는 `/portfolio/oyedu`가 308 다음 301로 도착하는지, `/?p=1`이 이동 없이 200인지, `/html/atom/`(슬래시 형태)에 완화 CSP와 `X-Robots-Tag`가 붙는지, `/wp-login.php`가 404인지.
6. 점검 결과를 `docs/launch-checklist.md`에 기록하고 사용자에게 보고한다.

**통과 기준** 04번 문서 단계 4의 완료 기준 전부. 사용자가 미리보기를 보고 승인.

**되돌리기** 프로젝트 삭제만으로 원상 복구. 도메인은 아직 연결하지 않았다.

---

## S14. 도메인 전환 🛑

사용자가 승인한 뒤에만 시작한다. 04번 문서 단계 5와 같다.

1. 24시간 전에 현재 DNS TTL을 300초로 낮춘다.
2. S00의 `dns-before.txt`(저장소 밖)와 현재 상태가 같은지 확인한다.
3. Vercel에 `iduk.co.kr`, `www.iduk.co.kr`을 추가한다. **네임서버는 Cafe24 그대로 두고**, Cafe24 DNS 관리에서 Vercel이 안내하는 값으로 루트 도메인 A 레코드와 `www` CNAME만 바꾼다. 메일은 쓰지 않으므로 MX 걱정은 없지만, 기존 TXT(인증 등)는 용도를 확인하기 전에는 지우지 않는다. 네임서버는 바꾸지 않는다. 바꿀 이유가 없고, 해지 시 DNS 소실 위험만 줄이면 된다.
4. 인증서 발급을 기다린 뒤 확인한다: HTTPS, `www` → 루트 이동, 옛 주소 리다이렉트 표본 5개.
5. HSTS `max-age`를 단계적으로 올린다(300 → 1주 → 1년). 서브도메인 포함·preload는 마지막에 사용자 확인 후.
6. 구글 서치 콘솔: 사이트맵 제출, 스팸 주소 삭제 요청, 보안 문제 보고서 확인.
7. 첫 은폐 검사 실행.

**통과 기준** `https://iduk.co.kr`이 새 사이트를 보여 주고 오류 로그가 없다.

**되돌리기** DNS를 `dns-before.txt`로 복원한다. 옛 호스팅은 감염 상태이므로 임시로만, 가능하면 안내 페이지만 올린다.

---

## S15. 공개 후 점검과 옛 사이트 정리 🛑

**첫 24시간** Vercel 로그(1시간만 보관), 구글 서치 콘솔 오류, 404 상위 목록을 확인한다.
**첫 2주** 주 1회 은폐 검사 결과, 검색 노출, 404 증가 여부.
**2주 뒤**
1. 옛 호스팅의 DB, 파일을 최종 백업해 이미 보관 중인 `iduk.co.kr/DataBackup`과 대조한다.
2. **해지 전에 DNS가 호스팅에 묶여 있는지 확인한다.** 네임서버가 Cafe24라서, 호스팅을 해지하면 DNS 레코드(A, MX 포함)도 같이 사라질 수 있다. Cafe24 고객센터나 도메인 관리 화면에서 "호스팅 해지와 무관하게 네임서버 서비스가 유지되는지"를 확인하고, 안 되면 네임서버 유지 서비스를 따로 신청하거나 DNS 이전을 먼저 계획한다. 확인 뒤에 호스팅 서비스를 해지하거나 PHP·DB를 끈다. phpMyAdmin 외부 노출을 먼저 닫는다.
3. 노출된 모든 비밀번호가 교체되었는지 확인한다.
4. `iduk.design` 아카이브를 외부 저장소(암호화 디스크 또는 비공개 클라우드)에 하나 더 보관한다. 비공개 글과 2019 XML이 들어 있다.
5. 이 문서들의 상태를 "완료"로 바꾸고 배운 점을 `docs/RETRO.md`에 적는다.

---

## S16. Neon (선택, 나중) 🛑

02번 문서 9절과 03번 문서 4.6절을 따른다. 시작 조건: 1단계가 안정적으로 운영되고, 문의 폼이나 반응이 실제로 필요하다고 결정했을 때.

1. `@astrojs/vercel` 어댑터 추가. 정적 페이지는 그대로 두고 API 경로만 요청 시 실행(`prerender = false`).
2. Neon 프로젝트 생성. 역할 2개(앱, 마이그레이션), 앱 역할은 INSERT와 필요한 SELECT만.
3. Drizzle 스키마와 마이그레이션: `messages`, `reactions`, `reaction_votes`.
4. 입력 검증(zod), 길이 제한, 허니팟, 요율 제한(방화벽), 출처 확인, 오류 응답에 내부 정보 없음.
5. 환경 변수는 Vercel의 민감 값으로만. 미리보기는 Neon 브랜치로 분리.
6. 주 1회 `pg_dump` 예약 작업과 보관 위치.
7. 문의 폼 스팸 시험, 요율 제한 시험, 권한 시험(앱 역할이 DROP·UPDATE 못 하는지).

**통과 기준** 03번 문서의 문의 API 점검 항목 전부, 한도 초과 시 동작 확인.

---

## 한 번에 보는 체크리스트

- [ ] S00 결정 7개, 2단계 인증, DNS 기록
- [ ] S01 태그, 정리된 브랜치, docs 공개 가능 확인
- [ ] S02 Astro 7 + pnpm 12 골격, 공급망 설정, 빌드 통과
- [ ] S03 토큰·글꼴·레이아웃
- [ ] S04 이미지 60장 WebP, `images.json`
- [ ] S05 글 24개 JSON, 비공개 글 유출 0
- [ ] S06 작업 상세 24개
- [ ] S07 LongShot
- [x] S08 목록과 홈
- [x] S09 404·데모 정화·PDF
- [ ] S10 움직임
- [ ] S11 헤더·CSP·리다이렉트·SEO
- [ ] S12 CI 녹색, 예약 검사
- [ ] S13 미리보기 승인
- [ ] S14 도메인 전환
- [ ] S15 2주 관찰 후 옛 사이트 정리
- [ ] S16 (선택) Neon

## 각 스텝을 시작할 때 쓰는 말

문서를 읽고 진행시킬 때는 다음처럼 요청하면 된다.

- "S02까지 진행해줘": S00·S01의 확인이 끝난 상태에서 S02까지 실행하고 멈춘다.
- "S04 시험 변환만 해줘": `--only oyedu` 한 글만 변환해서 결과를 보여 준다.
- "S05 확인 항목 보여줘": 대표 작업 선정안, 태그 정리안, alt 초안을 표로 보여 준다.

# iduk 포트폴리오 사이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 워드프레스 포트폴리오 공개 글 24개를 한글·영문 정적 사이트(Astro 7)로 옮긴다.

**Architecture:** 원본 아카이브(`../iduk.design`)를 일회성 스크립트로 변환해 WebP 마스터와 zod 검증 JSON을 만들고, Astro가 이를 정적 페이지로 렌더링한다. 요청 시 실행되는 코드는 없다. 보안·개인정보 검사는 CI와 푸시 전 검사로 강제한다.

**Tech Stack:** Astro 7, pnpm 12, TypeScript strict, Tailwind 4, sharp, zod, Vitest, Playwright, axe, Biome. (버전은 설치 시점에 `pnpm view`로 확인해 고정한다.)

**Spec:** 이 저장소의 `docs/` 전체. 충돌하면 `07-privacy.md` > `06-i18n.md` > `01`~`05` 순으로 따른다. 단계 번호(S02 등)는 `docs/05-execution-plan.md`의 것이다.

## Global Constraints

- 어떤 개인정보도 저장소·빌드 결과·커밋 기록에 넣지 않는다(메일, 전화, 실명, `/Users/` 경로, 접속 정보). 연락처·About·Contact 페이지는 만들지 않는다. 푸터는 `© iduk`와 언어 전환뿐.
- **푸시하지 않는다.** 로컬 커밋만 한다. 커밋 작성자는 noreply 주소여야 한다(Task 1에서 설정).
- 공개 글 24개(`status === publish`, 카테고리 Portfolio)만 대상. 비공개 13개의 제목·본문·이미지는 저장소에 없어야 한다.
- 한글 기본(`/`), 영문 `/en/`. 사람이 읽는 필드는 `{ko, en}` 한 쌍이고 `en`이 비면 빌드 실패.
- 정적 출력. 런타임 이미지 서버·서버 함수·ClientRouter·외부 CDN·외부 글꼴 서버 금지.
- pnpm 12, `packageManager` 고정, `pnpm-workspace.yaml`에 `minimumReleaseAge: 4320`, `blockExoticSubdeps: true`, `trustPolicy: no-downgrade`, `allowBuilds`는 `sharp`, `esbuild`만. 직접 의존성 15개 이하. 설치는 `pnpm install --frozen-lockfile`.
- WebP 마스터: 화질 90, 가로 2560px 초과만 축소, 메타데이터 제거. 총 25MB 이하.
- 타이포·색·간격·움직임 값은 `docs/01-concept-design.md` 4~7절 그대로. 포인트 색 `#D93036`(밝은 테마) / `#F97272`(어두운 테마).
- 성능 목표: Lighthouse 모바일 95 이상, LCP 1.8초 이하, CLS 0.05 이하, 첫 화면 JS gzip 30KB 이하. 접근성 WCAG 2.2 AA, axe 위반 0.
- 원본 데이터(`../iduk.design`)는 읽기만 한다. 수정하지 않는다.
- 임시 파일은 저장소 밖에 둔다. 비밀번호·토큰을 파일, 로그, 커밋에 쓰지 않는다.

## Review Focus

1. 360px 폭에서 긴 영문 제목이 목록 행, 이전·다음 링크, 히어로에서 잘리거나 가로 스크롤을 만든다. → Task 7, 11의 Playwright 검사.
2. 영문 번역이 비어 있거나 초안 표시가 남은 글이 빌드를 통과한다. → Task 4 스키마 테스트, Task 11 CI 검사.
3. 한글 파일명(NFC/NFD 혼재)과 이름이 겹치는 이미지가 누락되거나 덮어써진다. → Task 3 테스트.
4. 비공개 글이나 접속 정보(`옛서버호스트`, `sftp`)가 변환 결과에 섞인다. → Task 4, 8, 11의 검사.
5. 세로 8000px이 넘는 캡처가 WebP 한계(16383px)나 메모리 제한에서 실패한다. → Task 3 테스트.
6. 자바스크립트를 끈 상태에서 내비게이션·태그 필터·언어 전환이 동작하지 않는다. → Task 7 검사.

## File Structure

```
scripts/lib/names.ts        파일명 정규화·중복 처리 (순수 함수)
scripts/lib/convert.ts      이미지 한 장 변환과 평균색 (sharp)
scripts/lib/blocks.ts       dl.subject 파싱, 이미지 분류, 본문 정화
scripts/lib/privacy.ts      개인정보 패턴 검사, 데모 텍스트 정화
scripts/convert-images.ts   CLI: 93장 변환, images.json 생성
scripts/build-content.ts    CLI: posts.json → src/content/projects/*.json
scripts/copy-demos.ts       CLI: ../iduk.design/html → public/html (정화)
scripts/check-privacy.ts    CLI: 저장소·dist 검사 (CI 사용)
src/content.config.ts       zod 스키마 (projects, tags, images)
src/content/                projects/*.json, tags.json, images.json
src/assets/images/<slug>/   WebP 마스터
src/i18n/ui.ts              화면 문구 사전 (ko, en)
src/lib/i18n.ts             로케일 유틸
src/lib/projects.ts         공개 글 조회, 이전·다음
src/styles/                 tokens.css, global.css, fonts.css
src/layouts/Base.astro
src/components/             Header, Footer, Picture, LongShot, WorkRow, blocks/*
src/views/                  페이지 본체(두 언어 공용)
src/pages/ , src/pages/en/  얇은 라우트 파일
vercel.json                 헤더, 리다이렉트
tests/                      Vitest 단위, Playwright e2e
.github/workflows/          ci.yml, weekly-cloak-check.yml
```

---

### Task 1: 저장소 정리와 기본 설정 (S01)

**Files:**
- Create: `.gitignore`
- Modify: git 설정과 브랜치 상태 (파일 변경 없음)
- 옛 웹팩 프로젝트 파일은 `~/.Trash/iduk-legacy-react-20261109`로 옮긴다(삭제 전 목록 확인).

**Interfaces:**
- Produces: 깨끗한 `portfolio` 브랜치(문서와 `.gitignore`만 추적), 로컬 태그 `legacy-react-2022`(main 가리킴).

- [ ] **Step 1:** 이 저장소의 `user.email`을 `iduk@users.noreply.github.com`, `user.name`을 `iduk`로 설정한다(`--local`). 사용자가 실제 noreply 주소를 알려 주면 그 값으로 교체하고, 이미 만든 로컬 커밋 작성자는 푸시 전에 `git rebase --exec` 로 맞춘다.
- [ ] **Step 2:** `git tag legacy-react-2022 main`(로컬만, 푸시 금지). 옛 코드를 `git ls-files`로 나열해 사용자에게 보이기 전에 Trash로 옮긴다.
- [ ] **Step 3:** `.gitignore`: `node_modules/`, `dist/`, `.astro/`, `.vercel/`, `.env*`, `.DS_Store`, `.superpowers/`, `test-results/`, `playwright-report/`.
- [ ] **Step 4:** 검증: `git ls-files` 가 `docs/`와 `.gitignore`뿐이다. `git log -1 --format=%ae` 가 noreply.
- [ ] **Step 5:** 커밋 `S01: 저장소 정리와 문서 추가`.

### Task 2: 프로젝트 골격 (S02, S03)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `src/styles/{tokens,global,fonts}.css`, `src/layouts/Base.astro`, `src/components/{Header,Footer}.astro`, `src/i18n/ui.ts`, `src/lib/i18n.ts`, `src/pages/index.astro`, `src/pages/en/index.astro`, `public/fonts/*`, `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces: `type Locale = 'ko' | 'en'`; `t(locale: Locale, key: UiKey): string`; `localizedPath(locale: Locale, path: string): string` (`ko`는 접두어 없음, `en`은 `/en` 접두어); `alternateLocale(locale: Locale): Locale`; `ui: Record<Locale, Record<UiKey, string>>`.
- Base 레이아웃은 `lang`, `hreflang` 대체 링크, 언어 전환 `KO | EN`, 본문 바로가기, 테마 전환을 제공한다.

- [ ] **Step 1:** 실패하는 테스트 `tests/unit/i18n.test.ts`: `localizedPath('ko','/work/')==='/work/'`, `localizedPath('en','/work/')==='/en/work/'`, `Object.keys(ui.ko)`와 `Object.keys(ui.en)`가 같은 집합.
- [ ] **Step 2:** 실행해서 실패 확인: `pnpm vitest run tests/unit/i18n.test.ts`.
- [ ] **Step 3:** `pnpm-workspace.yaml`의 보안 설정을 **먼저** 만들고 Astro 7 프로젝트를 구성한다. `docs/05` S02의 의존성 목록을 따른다. `astro.config.mjs`는 `site: 'https://iduk.co.kr'`, `trailingSlash: 'always'`, `i18n`(기본 `ko`, 접두어 없음), Tailwind 플러그인, 사이트맵 i18n, `security.csp: true`, 프로덕션 소스맵 끔.
- [ ] **Step 4:** `src/lib/i18n.ts`, `src/i18n/ui.ts`(메뉴, 푸터, 404 문구)를 구현해 테스트 통과.
- [ ] **Step 5:** 토큰·글꼴: Pretendard Variable 서브셋과 OFL 라이선스를 `public/fonts/`에 복사(외부 CDN 없음). 토큰은 `docs/01` 값 그대로, 어두운 테마는 `prefers-color-scheme`와 `data-theme`. 임시 홈(`iduk` 워드마크, `Selected Work`)을 두 언어로.
- [ ] **Step 6:** 검증: `pnpm install --frozen-lockfile && pnpm build && pnpm check && pnpm lint && pnpm vitest run` 통과, `pnpm audit` 높음 이상 0, 직접 의존성 15개 이하, 설치 로그에 허용 목록 밖 스크립트 실행 없음.
- [ ] **Step 7:** 커밋 `S02-S03: 프로젝트 골격과 디자인 토큰`.

### Task 3: 이미지 변환 (S04)

**Files:**
- Create: `scripts/lib/names.ts`, `scripts/lib/convert.ts`, `scripts/convert-images.ts`, `tests/unit/names.test.ts`, `tests/unit/convert.test.ts`
- Output: `src/assets/images/<slug>/*.webp`, `src/content/images.json`

**Interfaces:**
- Produces:
  - `slugifyFileName(name: string): string` — NFC 정규화 후 ASCII 소문자·숫자·하이픈만 남긴다.
  - `uniqueName(base: string, taken: Set<string>): string` — 겹치면 `-2`, `-3`을 붙인다.
  - `convertImage(src: string, dest: string, opts?: { maxWidth?: number; quality?: number }): Promise<{ width: number; height: number; avgColor: string; bytes: number }>` — 기본 `maxWidth=2560`, `quality=90`, 확대 금지, 메타데이터 제거.
  - `images.json`: `Record<imageKey, { src, width, height, avgColor, bytes, original }>`.

- [ ] **Step 1:** 실패하는 테스트: `slugifyFileName('주문-서비스.PNG')`와 NFD로 분해된 같은 이름이 같은 결과를 낸다. `uniqueName('a', new Set(['a']))==='a-2'`. 합성 이미지(4000×1000)가 가로 2560으로 줄고, 1000×1000은 그대로, 1600×9000이 실패 없이 변환(WebP 세로 한계 16383 이내). 출력에 EXIF가 없다. `avgColor`가 `^#[0-9a-f]{6}$`.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** `names.ts`, `convert.ts` 구현. 세로가 16383을 넘으면 오류를 던져 CLI가 중단·보고한다. `sharp`에 `limitInputPixels`를 설정.
- [ ] **Step 4:** `convert-images.ts`: `../iduk.design/data/posts.json`의 공개 글이 참조하는 이미지(`featuredImage`, `images`)만 변환. `--only <slug>` 지원. 비공개 글 이미지는 건드리지 않는다. 보고서(원본 대비 용량, 가로 2560 초과 수, 실패 목록)는 저장소 밖(`$TMPDIR`)에 쓴다.
- [ ] **Step 5:** 시험: `--only oyedu` 한 건 → 결과 확인 후 전체 실행. 무작위 10장을 원본과 나란히 비교한 요약을 보고한다(글자 번짐·색 변화 없는지).
- [ ] **Step 6:** 검증: 변환 장수 = 공개 글 참조 이미지 수(기대값은 실행 결과로 보고), 실패 0, 총 용량 25MB 이하(초과하면 화질을 바꾸지 말고 보고), `images.json` 모든 항목에 가로·세로·평균색.
- [ ] **Step 7:** 커밋 `S04: 이미지 WebP 변환`.

### Task 4: 콘텐츠 변환과 스키마 (S05)

**Files:**
- Create: `scripts/lib/blocks.ts`, `scripts/lib/privacy.ts`, `scripts/build-content.ts`, `src/content.config.ts`, `src/content/tags.json`, `src/content/projects/*.json`, `tests/unit/blocks.test.ts`, `tests/unit/schema.test.ts`, `docs/manual-todo.md`

**Interfaces:**
- Produces:
  - `const L = z.object({ ko: z.string().min(1), en: z.string().min(1) })`.
  - `projectSchema`: `{ slug, year: number, order: number, title: L, role: L, summary: L, tags: string[], featured: boolean, cover: { image: string, alt: L }, blocks: Block[], demo?: string, legacy: { id: number, path: string, slug?: string }, status?: 'draft-translation' }`.
  - `Block`: `{type:'image', image, alt: L}` | `{type:'pair', images: {image, alt: L}[]}` | `{type:'longshot', image, alt: L}` | `{type:'text', body: L}` | `{type:'demo', demo: string}`. `image`는 `images.json` 키이고 없으면 스키마 오류.
  - `classifyImage(width: number, height: number): 'image' | 'longshot'` — 세로/가로 > 2.5면 `longshot`.
  - `parseSubject(html: string): { period?: string; name?: string; role?: string; summary?: string }`.
  - `sanitizeBody(html: string): string` — `p,a,strong,em,ul,ol,li,br`만 허용, `style/script/on*/iframe` 제거.
  - `scanText(text: string): { kind: 'email'|'phone'|'path'|'secret'; match: string }[]`.

- [ ] **Step 1:** 실패하는 테스트: `classifyImage(1000, 2501)==='longshot'`, `classifyImage(1000, 2500)==='image'`(경계값 2.5는 일반 이미지). `sanitizeBody('<p onclick="x()">a</p><style>b</style>')==='<p>a</p>'`. `parseSubject`가 `dl.subject`의 `dt`·`dd`를 뽑는다. `scanText`가 메일·전화·`/Users/` 경로를 찾는다. 스키마: `en`이 빈 문자열이면 실패, 존재하지 않는 이미지 키면 실패, `status:'draft-translation'`은 통과하되 별도 필드로 식별 가능.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** 위 함수와 스키마 구현. `build-content.ts`는 공개 글 24개만 변환, 슬러그 `1812`→`jejuair-mobile`(`legacy.slug`에 원래 값), `demoLinks`를 `demo`로 연결(engineering-responsive-web→atom, telecare-service-website→hidea), 이미지는 등장 순서대로 `blocks`에, `scanText`로 메일·전화가 걸리면 중단하고 보고한다. `archive2019`는 병합하지 않고 "더 자세한 글 후보"만 `docs/manual-todo.md`에 목록으로 쓴다.
- [ ] **Step 4:** 번역과 alt 초안: 역할·설명·태그 이름·alt의 영문·한글 초안을 작성하고 모든 초안 글에 `status: 'draft-translation'`을 단다. 대표 작업(`featured`) 6~8개와 태그 정리안(쓰이는 태그만, 키+언어별 이름)을 제안값으로 넣는다. 이 값들은 사용자 확인 대상이며 Task 11의 공개 전 검사에서 초안 표시가 남아 있으면 실패한다.
- [ ] **Step 5:** 검증: `pnpm astro sync` 통과, 깨진 이미지 참조 0, 빈 `alt` 0, 중복 슬러그 0, `git grep -nE "wp-content|cafe24|iduk\.co\.kr/wp"` 결과 0, 비공개 슬러그 13개로 `git grep` 결과 0.
- [ ] **Step 6:** 커밋 `S05: 콘텐츠 변환과 스키마`. 사용자 검토 항목(대표 작업, 태그, alt, 영문 번역, 2019 병합 후보)을 요약으로 남긴다.

### Task 5: Picture와 작업 상세 (S06)

**Files:**
- Create: `src/components/Picture.astro`, `src/components/blocks/{ImageBlock,PairBlock,TextBlock,DemoBlock}.astro`, `src/lib/projects.ts`, `src/views/WorkDetail.astro`, `src/pages/work/[slug].astro`, `src/pages/en/work/[slug].astro`, `tests/unit/projects.test.ts`

**Interfaces:**
- Consumes: Task 2의 `t`, `localizedPath`; Task 4의 스키마.
- Produces: `getPublicProjects(): Promise<Project[]>`(연도 내림차순), `neighbors(projects: Project[], slug: string): { prev?: Project; next?: Project }`. `Picture` props: `{ image: string; alt: string; sizes: string; priority?: boolean }` — 폭 640/960/1280/1920/2560의 AVIF·WebP, 원본보다 큰 폭 없음, `width`·`height` 필수, 배경색은 평균색, `priority`만 `loading=eager`·`fetchpriority=high`.

- [ ] **Step 1:** 실패하는 테스트: `neighbors`가 양끝에서 `prev`/`next`를 `undefined`로 돌려준다. 공개 글 24개 모두 `/work/<slug>/`와 `/en/work/<slug>/`가 생성되는지 빌드 결과로 확인하는 e2e 목록 테스트.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** 구현. 상세 페이지: 제목, 메타 표(기간·역할·태그), 블록들, 이전·다음, 언어 전환 링크가 같은 슬러그의 반대 언어 주소. `title`·`description`은 언어별.
- [ ] **Step 4:** 빌드 시간을 측정해 보고. 5분을 넘으면 `formats`를 WebP만으로 줄인다.
- [ ] **Step 5:** 검증: 상세 48개(24×2) 생성, 각 `<h1>` 하나, 모든 `<img>`에 `alt`·`width`·`height`, `smartfarm-android`(22장)에서 첫 이미지만 eager.
- [ ] **Step 6:** 커밋 `S06: Picture와 작업 상세`.

### Task 6: LongShot (S07)

**Files:**
- Create: `src/components/LongShot.astro`, `src/components/blocks/LongShotBlock.astro`
- Modify: 블록 렌더러에 `longshot` 연결

**Interfaces:**
- Consumes: Task 4의 `longshot` 블록, Task 5의 `Picture`.
- Produces: `LongShot` props `{ image: string; alt: string }`.

- [ ] **Step 1:** 실패하는 e2e: 공개 글의 긴 캡처 영역이 `role="region"`, `tabindex="0"`, `aria-label`을 가지고 키보드로 스크롤된다. 영역 끝에서 페이지 스크롤이 이어진다(`overscroll-behavior: auto`). 모바일 첫 로드에서 2560px 변형을 받지 않는다.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** CSS만으로 만든 브라우저 틀, 높이 `min(80svh, 56rem)`, 틀 안 세로 스크롤, 가장자리 그림자는 `animation-timeline: scroll()`, "원본 크기로 보기"는 `<a>` 링크로 2560px 파일을 연다(JS 없음).
- [ ] **Step 4:** 검증: e2e 통과, 360px에서 가로 스크롤 없음.
- [ ] **Step 5:** 커밋 `S07: LongShot`.

### Task 7: 작업 목록·태그·홈 (S08)

**Files:**
- Create: `src/components/WorkRow.astro`, `src/views/{Home,WorkIndex,TagIndex}.astro`, `src/pages/{work/index,work/tag/[tag]}.astro`, `src/pages/en/...` 동일, `tests/e2e/lists.spec.ts`
- Modify: `src/pages/index.astro`, `src/pages/en/index.astro`

**Interfaces:**
- Consumes: `getPublicProjects`, `localizedPath`, `Picture`.
- Produces: 목록 행 `WorkRow` props `{ project: Project; locale: Locale; withPreview?: boolean }`. 각 대표 이미지에 `view-transition-name: work-<slug>`.

- [ ] **Step 1:** 실패하는 e2e(JS 끈 컨텍스트): 홈에 대표 작업 6~8개, `/work/`에 연도별 그룹과 24개 행, 태그 페이지가 JS 없이 동작, 언어 전환 링크 작동. 360px에서 가로 스크롤 없음과 긴 영문 제목이 잘리지 않음.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** 구현. 홈: 히어로(`iduk` 워드마크, `Selected Work`), 대표 이미지 행(첫 번째만 `priority`), "전체 작업 보기". 목록: 데스크톱 호버 미리보기는 CSS만. 태그는 빌드 시 태그별 페이지.
- [ ] **Step 4:** 검증: e2e 통과, 홈 모바일 LCP 요소가 첫 대표 이미지(Lighthouse 로컬 실행 결과 보고).
- [ ] **Step 5:** 커밋 `S08: 목록, 태그, 홈`.

### Task 8: 404, 데모, PDF (S09)

**Files:**
- Create: `scripts/copy-demos.ts`, `src/pages/404.astro`, `tests/unit/privacy.test.ts`
- Modify: `scripts/lib/privacy.ts`
- Output: `public/html/{atom,hidea,sprx,suwon}`, `public/files/*.pdf`

**Interfaces:**
- Produces: `sanitizeDemoText(text: string): { text: string; replaced: number }` — 메일은 `contact@example.com`, 전화는 `000-0000-0000`으로 교체. 라이브러리 예시 값(`010-1234-1234`)은 건드리지 않는다.

- [ ] **Step 1:** 실패하는 테스트: 업체 메일·`02-XXXX-XXXX` 형태가 교체된다, `010-1234-1234`는 그대로, 교체 개수가 보고된다.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** `copy-demos.ts`: `.DS_Store`, `.vscode`, `*.map`, `.git` 제외하고 복사한 뒤 텍스트 파일(`html/css/js`)에 `sanitizeDemoText` 적용. 교체 보고서는 저장소 밖에 쓴다. 복사 후 `옛서버호스트`, `sftp`가 없는지 검사. PDF 3개는 파일명을 ASCII로 하고 작성자·회사 속성을 제거.
- [ ] **Step 4:** 404는 한 페이지에 한글·영문 안내와 홈 링크.
- [ ] **Step 5:** 검증: `/html/*` 모든 페이지가 200이고 깨진 내부 링크 0(링크 검사). **작업 상세 페이지의 데모 링크(`/html/atom/`, `/html/hidea/`)가 실제로 200인지 포함**(Task 5에서 404로 남겨 둠). 접속 정보 문자열 0. 데모 속 사라진 외부 주소 목록을 보고(대체 여부는 사용자 결정).
- [ ] **Step 6:** 커밋 `S09: 404, 데모, PDF`.

### Task 9: 움직임 (S10)

**Files:**
- Modify: `src/styles/global.css`, 해당 컴포넌트
- Create: `tests/e2e/motion.spec.ts`

- [ ] **Step 1:** 실패하는 e2e: `reducedMotion: 'reduce'`에서 `.reveal`에 이동·확대 애니메이션이 없고, JS 번들에 라우터가 없다.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** `docs/01` 7절 표 그대로: 스크롤 등장(`animation-timeline: view()`, `@supports`), 히어로 줄 열림, 호버 확대(`@media (hover: hover)`), `@view-transition { navigation: auto; }`, 공유 요소 전환. 모션 줄이기는 120ms 이하 투명도만. JS 없음.
- [ ] **Step 4:** 검증: e2e 통과, 미지원 브라우저를 가정해 `@supports` 밖에서도 모든 요소가 보인다.
- [ ] **Step 5:** 커밋 `S10: 움직임`.

### Task 10: 보안 헤더·리다이렉트·SEO (S11)

**Files:**
- Create: `vercel.json`, `tests/e2e/headers-redirects.spec.ts`
- Modify: `astro.config.mjs`, `src/layouts/Base.astro`

- [ ] **Step 1:** 실패하는 테스트: `/portfolio/oyedu`→`/work/oyedu/`(301), `/portfolio/1812`→`/work/jejuair-mobile/`, `/wp-admin`·`/wp-login.php`·`/xmlrpc.php`는 404, 응답에 `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security(max-age=300)`가 있고 브라우저 콘솔에 CSP 위반 0, 모든 한글 페이지에 영문 쌍과 상호 `hreflang`(`x-default`는 한글).
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** `vercel.json` 헤더와 리다이렉트, `/html/*` 전용 완화 정책(`docs/03` 4절 참고), Astro `security.csp` 해시, `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`. SEO: 언어별 title·설명·canonical, OG 이미지(1200×630 크롭, 빌드 시; 현재는 세로가 긴 이미지가 원본 비율로 나오므로 크롭 필요)와 `og:image:width`·`og:image:height`·`og:image:alt`, 사이트맵 i18n, `robots.txt`, `og:locale`. **`security.txt`, `Person` 구조화 데이터, `mailto:`는 만들지 않는다.**
- [ ] **Step 4:** 검증: 테스트 통과, `curl -sI`로 `pnpm preview` 응답 헤더 확인.
- [ ] **Step 5:** 커밋 `S11: 헤더, 리다이렉트, SEO`.

### Task 11: 품질 게이트와 CI (S12)

**Files:**
- Create: `scripts/check-privacy.ts`, `.github/workflows/ci.yml`, `.github/workflows/weekly-cloak-check.yml`, `lighthouserc.json`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `scripts/privacy-allow.txt`

**Interfaces:**
- Consumes: `scanText`. Produces: `check-privacy` 종료 코드 0/1.

- [ ] **Step 1:** 실패하는 테스트: 메일 형태 문자열이 있는 임시 파일을 넣으면 `check-privacy`가 1을 돌려준다(검사 자체의 시험). `status: draft-translation`이 있으면 공개 전 검사 모드가 실패한다.
- [ ] **Step 2:** 실행해서 실패 확인.
- [ ] **Step 3:** `check-privacy`: `docs/07` 6절 항목(메일, 전화, `/Users/`, `gmail|naver|kakao|옛서버호스트|sftp|옛계정ID`, `dist`의 `mailto:|tel:`, 이미지 GPS, 프로덕션 소스맵). `docs/`는 메일·전화·`/Users/` 패턴만 검사하고(`@scope/패키지` 표기는 허용 목록), `옛서버호스트|sftp|옛계정ID` 같은 키워드는 `src/`, `public/`, `dist/`에서만 검사한다(문서가 설명 목적으로 언급함). **dist의 모든 내부 `href`가 실제 파일로 해석되는지 검사**(데모 링크 포함), axe(두 언어 전 페이지 위반 0), 360/768/1280/1920 뷰포트 가로 스크롤 없음, 링크 검사, Lighthouse CI(모바일 95, JS·CSS·글꼴 예산). CI는 `permissions: contents: read`, 외부 액션은 커밋 SHA 고정, `--frozen-lockfile`. 주간 은폐 검사: 일반 방문자 헤더로 두 번 요청해 본문이 같은지와 허용 목록 밖 스크립트 주소를 비교.
- [ ] **Step 3b:** 일부러 `alt`를 비운 시험 변경이 CI에서 실패하는 것을 확인한 뒤 원복.
- [ ] **Step 4:** 검증: `pnpm lint && pnpm check && pnpm vitest run && pnpm build && pnpm e2e` 전부 통과, `check-privacy` 0.
- [ ] **Step 5:** 커밋 `S12: 품질 게이트와 CI`.

---

## 이 계획 밖 (사람이 하거나 별도 계획)

- **S00:** GitHub 이메일 비공개 설정과 실제 noreply 주소, Cafe24 Whois 공개 범위, 카페24 DB 정리, 커밋 기록 처리 결정.
- **공개 전 사용자 검토:** Task 4의 대표 작업·태그·alt·영문 번역 초안, Task 8의 데모 사라진 외부 주소 처리.
- **S13~S15:** 푸시, Vercel 미리보기, 도메인 전환, 옛 호스팅 정리. 푸시는 이 계획 완료 후 사용자 승인으로만.
- **S16:** Neon 문의 폼(선택).

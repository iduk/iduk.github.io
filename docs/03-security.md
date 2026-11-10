# 03. 보안

## 1. 이번 감염에서 확인된 사실

| 항목 | 내용 |
|---|---|
| 감염 위치 | DB에 저장된 PHP 코드. WPCode 플러그인의 스니펫 글 타입과 옵션 테이블 |
| 시작 | 2024-09-28 KST에 스니펫이 처음 만들어졌다 |
| 마지막 변경 | 2026-08-20 KST. 그동안 공격자가 코드를 9번 교체했다 |
| 방문자 영향 | 로그아웃 상태의 방문자에게 IP당 24시간에 한 번 공격자 서버(공격자 도메인)가 보낸 내용을 대신 보여 줬다. 관리자와 관리자 화면에서는 보이지 않았다 |
| 원격 조종 | 특정 쿠키를 가진 요청이면 관리자 계정을 새로 만들 수 있었다 |
| 은폐 | 관리자 화면에서 WPCode 메뉴와 플러그인 목록을 숨겼다 |
| 파일 | 워드프레스 코어, 플러그인, 테마 파일은 공식본과 일치했다. 파일 검사로는 발견되지 않는다 |
| 침입 경로 | **확정하지 못했다.** 접근 로그가 없다. 스니펫을 만들려면 관리자 권한이 필요해서 관리자 계정 탈취가 가장 유력하다. 4.8.5 버전의 phpMyAdmin이 인터넷에 공개돼 있었던 것도 가능한 경로다 |

## 2. 교훈과 새 구조의 대응

| 이번에 일어난 일 | 새 구조의 대응 |
|---|---|
| 관리자 로그인으로 코드가 실행되는 플러그인을 설치할 수 있었다 | 관리자 화면 자체가 없다. 사이트를 바꾸려면 GitHub에서 변경을 올려야 한다 |
| DB에 코드가 저장되고 실행됐다 | 정적 출력이라 요청 시점에 실행되는 코드가 없다. 2단계의 DB에도 코드나 HTML을 저장하지 않는다 |
| 방문자별로 다른 화면을 보여 은폐했다 | 주 1회 "다르게 보이는지" 검사를 자동으로 돌린다 |
| 오래 방치된 도구(phpMyAdmin 4.8.5)가 열려 있었다 | 쓰지 않는 서비스는 두지 않는다. 의존성 갱신을 자동 제안으로 받는다 |
| 평문 FTP로 비밀번호가 오갔다 | FTP가 없다. 배포는 Git 연결로만 한다 |
| 비밀번호가 여러 곳에 쓰이고 대화창에 노출됐다 | 기존 비밀번호를 전부 폐기하고 패스키와 2단계 인증으로 바꾼다 |
| 로그가 없어서 침입을 추적할 수 없었다 | Vercel Hobby의 로그는 1시간뿐이라, 외부 점검과 알림을 따로 둔다 |

## 3. 전환 전에 끝낼 일

새 사이트를 만들기 전에 계정부터 정리한다. 기존 계정이 뚫려 있었다면 새 인프라도 같은 방식으로 뚫린다.

1. 지금까지 쓴 비밀번호를 모두 폐기하고 새로 만든다. 대상은 호스팅 FTP, 워드프레스 관리자, DB, 호스팅 관리 화면이다.
2. 모든 계정의 복구 메일로 쓰는 구글 계정에 패스키 또는 2단계 인증을 켠다. 가장 중요하다.
3. 아래 계정에도 패스키 또는 2단계 인증을 켠다: GitHub, Vercel, Neon, 도메인 등록처.
4. 도메인 등록처에서 도메인 잠금을 켠다. 지원하면 DNSSEC도 켠다.
5. **옛 다른 서버를 확인한다.** HTML 데모 폴더의 에디터 설정 파일에 그 서버의 FTP 계정이 남아 있다. 지금도 살아 있는 서버라면 같은 위험이 있다.
6. 기존 저장소 `iduk/iduk.github.io`에 걸린 외부 웹훅(AWS Amplify 주소로 보이는 것)을 확인하고 쓰지 않으면 지운다. GitHub Pages 설정도 끈다.
7. 로컬의 옛 백업(`iduk.co.kr` 폴더)에는 wp-config.php의 DB 비밀번호와 악성 코드가 그대로 들어 있다. 암호화된 보관함에 두 곳으로 복사해 두고, Git이나 클라우드 동기화 폴더에는 두지 않는다. Documents 폴더가 iCloud에 동기화되는지 확인한다.

## 4. 통제 계층

### 4.1 구조

- 정적 출력만 쓴다. 서버 렌더링, 서버 아일랜드, ClientRouter는 쓰지 않는다.
- 사이트에 로그인 기능이 없다.
- 변경은 GitHub 풀 리퀘스트를 통해서만 들어간다. Vercel은 Git 연결로만 배포한다. 배포용 토큰을 만들지 않는다.
- 콘텐츠도 신뢰하지 않는다. 옛 사이트에서 가져온 HTML은 빌드 단계에서 정화하고, 본문 HTML을 그대로 렌더링하지 않는다.

### 4.2 HTTP 헤더

`vercel.json`으로 응답에 붙인다. 규칙은 서로 겹치지 않게 세 개로 나눈다.

| 규칙(`source`) | 헤더 |
|---|---|
| `/(.*)` (전부) | `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` |
| `/((?!html(?:/\|$)).*)` (`/html` 밖 전부) | 엄격한 `Content-Security-Policy` |
| `/html/:path*` (데모) | 완화한 `Content-Security-Policy`, `X-Robots-Tag: noindex, nofollow` |

| 헤더 | 값 | 비고 |
|---|---|---|
| Content-Security-Policy (헤더) | `img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` | **`default-src`, `script-src`, `style-src`를 넣지 않는다.** 아래 "헤더와 meta의 관계" 참고 |
| Content-Security-Policy (meta, Astro) | `default-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src 'self' <해시…>; style-src 'self' <해시…>` | `astro.config.mjs`의 `security.csp.directives`와 해시. 페이지마다 다르다 |
| Strict-Transport-Security | 지금 `max-age=300`. 올리는 순서는 아래 | 모든 하위 도메인이 HTTPS인지 확인한 뒤에 올린다 |
| X-Content-Type-Options | `nosniff` | |
| Referrer-Policy | `strict-origin-when-cross-origin` | |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | |
| Cross-Origin-Opener-Policy | `same-origin` | |

**HSTS 올리는 순서.** 처음 배포는 `max-age=300`(5분)이다. 도메인 전환(S14) 뒤 문제가 없으면 `max-age=86400`(1일, 첫 주) → `max-age=31536000`(1년) 순으로 `vercel.json` 값만 바꿔 배포한다. `includeSubDomains`와 `preload`는 모든 하위 도메인이 HTTPS인 것을 확인한 뒤 사용자 확인을 받아 마지막에 붙인다(`preload` 등록은 되돌리기 어렵다). 이 표의 현재 값이 `vercel.json`과 같아야 한다(단위 테스트가 `max-age=300`을 고정한다. 올릴 때 테스트의 기대값도 함께 바꾼다).

**헤더와 meta의 관계.** 브라우저는 정책이 둘 이상이면 모두 통과해야 허용한다(교집합). 그래서 헤더에 `default-src 'self'`를 두면 `script-src`·`style-src`가 따로 없는 헤더 정책이 해시된 인라인 `<style>`·`<script>`를 막는다(meta가 허용해도 소용없다). 실제로 헤더에 `default-src`를 넣어 보면 위반이 나는 것을 e2e 대조군 시험이 확인한다. 그러므로 `default-src`와 해시가 필요한 지시어는 meta에만 두고, 헤더는 해시가 필요 없고 meta가 적용하지 못하는 지시어(`frame-ancestors`, `upgrade-insecure-requests`)와 중복 방어(`img-src` 등)만 갖는다. meta에는 `frame-ancestors`를 넣을 수 없다(브라우저가 무시하고 콘솔에 경고한다).

- Astro의 CSP 기능은 개발 서버에서 동작하지 않는다. `build`와 `preview`로 확인한다. `astro preview`는 `vercel.json`을 적용하지 않으므로 `tests/helpers/static-server.ts`가 `vercel.json`을 해석해 적용하는 서버를 쓴다(한계는 아래).
- `/html/*` 데모는 인라인 스크립트·스타일을 쓰고 외부 호스트 몇 곳을 부른다. 이 경로에만 완화 정책을 둔다. 지시어마다 실제로 요청하는 호스트만 허용하고 와일드카드는 쓰지 않는다.

  | 지시어 | 허용 | 쓰는 데모 |
  |---|---|---|
  | `script-src` | `'self' 'unsafe-inline' https://ajax.googleapis.com` | hidea(jQuery) |
  | `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com https://pro.fontawesome.com` | atom, hidea |
  | `font-src` | `'self' https://fonts.gstatic.com https://pro.fontawesome.com` | 위 스타일시트가 부르는 글꼴 |
  | `img-src` | `'self' data: https://images.unsplash.com` | atom(business.html) |
  | `frame-src` | `https://www.youtube.com` | hidea(유튜브 임베드) |
  | `connect-src` | `'self'` | |
  | 그 밖 | `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` | |

  지도 서비스 호스트(`maps.googleapis.com`, `dmaps.daum.net`)는 S09에서 지도 임베드를 중립화해서 더 이상 필요 없고 허용하지 않는다. 근거는 두 가지다. (1) `public/html`의 HTML·CSS 정적 참조를 훑은 목록, (2) 실제 Chromium으로 데모의 모든 html 페이지를 열어 요청된 외부 출처를 기록한 것(`tests/e2e/headers-redirects.spec.ts`가 외부 요청을 빈 응답으로 막고 출처를 출력한다). 한계: 외부 스크립트가 런타임에 불러오는 호스트(예: 유튜브 플레이어 내부)는 빈 응답 때문에 드러나지 않는다.
- atom 데모의 `modernizr-custom.js`는 기능 탐지로 문자열 평가, blob·data 워커, data 미디어를 일부러 시도한다. 완화 정책은 이를 막고(`unsafe-eval`, `worker-src blob: data:`, `media-src data:`를 열지 않는다) Modernizr는 "미지원"으로 처리하며 화면은 그대로다. 그 결과 atom 데모에서 콘솔에 CSP 경고가 남는다. e2e는 이 알려진 탐지 항목만 정확히 허용하고 그 밖의 위반은 실패로 센다. 경고를 없애려면 위 세 지시어를 여는 방법뿐이고(데모 보안 약화), 권장하지 않는다.
- `/html/*`에는 `X-Robots-Tag: noindex, nofollow`를 붙인다. 의뢰인 제작물을 검색에 노출하지 않는 기본값이다. `robots.txt`에서는 `/html`을 막지 않는다(막으면 크롤러가 noindex를 읽지 못한다).
- 외부 스크립트, 외부 글꼴, 외부 CDN은 본 사이트(`/html/*` 밖)에서 쓰지 않는다. 서드파티 스크립트는 0개다.

**Vercel 규칙 해석(문서 근거와 한계).** https://vercel.com/docs/project-configuration/vercel-json 기준.
- `trailingSlash: true`: 슬래시 없는 경로는 308로 슬래시를 붙인다. 확장자 있는 경로(`/robots.txt`, `/files/*.pdf`, `/html/*/x.html`)는 이동하지 않는다. `cleanUrls`는 쓰지 않는다(`.html` 주소를 확장자 없는 주소로 보내 데모 링크를 깨뜨린다).
- `redirects`의 `permanent: true`는 308이다. 301을 쓰려고 `statusCode: 301`을 쓴다.
- `source`는 쿼리를 뺀 경로에 맞춘다. 쿼리 옛 주소(`/?p=ID`, `/?page_id=ID`)는 `has: [{type: query, key}]`로 맞춘다.
- 헤더 규칙이 여럿 맞을 때 같은 헤더 이름이 어떻게 합쳐지는지는 문서에 없다. 그래서 `Content-Security-Policy`를 내는 규칙이 어떤 경로에서도 정확히 하나만 맞게 `source`를 서로 배타적으로 썼다. `/html/`을 빼는 전방탐색은 문서의 "Negative lookahead" 예시와 같은 형태다(`/((?!maintenance).*)`). 단위 테스트(`tests/unit/vercel-config.test.ts`)가 대표 경로 14개에서 CSP 규칙이 정확히 하나, 헤더 이름 중복 0임을 검사한다.
- 하이픈·소문자만 쓰는 슬러그에서만 안전하다. `source`에는 path-to-regexp 문법이 쓰이므로 슬러그에 `:`·`(`·`*` 같은 문자가 들어오면 생성기가 막는다.

**로컬 검증 도구의 한계.** `tests/helpers/vercel-routes.ts`는 위 문서 내용을 따르는 작은 해석기이며 Vercel의 구현이 아니다. 다음은 실제 Vercel에서 S13 미리보기 배포로만 확인된다: 같은 헤더 이름의 병합, `source` 정규식 지원(`(?!…)` 그룹), 리다이렉트와 `trailingSlash` 이동의 순서, 리다이렉트 목적지로 쿼리가 전달되는지(`/?p=1` → `/`가 `/?p=1`로 가서 되풀이되지 않는지), 헤더가 리다이렉트·404 응답에도 붙는지.

### 4.3 Vercel 방화벽 (Hobby)

기본으로 DDoS 완화가 켜져 있다. 사용자 규칙은 3개, 요율 제한 규칙은 프로젝트당 1개, IP 차단은 3개까지다.

| 규칙 | 조건 | 동작 |
|---|---|---|
| 1 | 경로가 `/wp-`로 시작, 또는 `/xmlrpc.php`와 같음, 또는 `/phpmyadmin`으로 시작, 또는 `.php`로 끝남(대시보드: Request Path starts with `/wp-` OR equals `/xmlrpc.php` OR starts with `/phpmyadmin` OR ends with `.php`) | 차단(Deny) |
| 2 | 경로 `/api/contact`로 가는 POST를 같은 IP에서 분당 5회 초과 (2단계) | 요율 제한 |
| 3 | 예비. 공격이 오면 임시 차단용으로 비워 둔다 | |

규칙 1은 옛 워드프레스 주소를 계속 두드리는 봇을 걸러 낸다. 이 규칙은 대시보드 설정이라 `vercel.json`에는 없다(S13). `vercel.json`은 이 경로에 리다이렉트·예외·재작성을 두지 않아 방화벽이 꺼져 있어도 정적 404가 나온다(자동 시험으로 확인). 구글에 스팸 주소가 남아 있을 수 있어서 정적 404가 아니라 차단으로 둔다. 공격 상황에서는 Attack Mode를 켤 수 있다.

### 4.4 의존성과 공급망

- 패키지 매니저는 pnpm이다. 설치 스크립트는 허용 목록(sharp, esbuild)만 실행한다. 신규 릴리스는 3일 지난 것만 설치한다. 하위 의존성이 git 주소나 임의 파일이면 거부한다.
- 잠금 파일을 커밋하고 `pnpm install --frozen-lockfile`로만 설치한다.
- 갱신은 Renovate(`minimumReleaseAge`) 또는 Dependabot(`cooldown`)이 풀 리퀘스트로 제안한다. 보안 수정만 대기 없이 바로 받는다. 한 번에 한 묶음씩 병합하고, 병합 전에 CI와 미리보기를 확인한다.
- 직접 의존성은 15개 안쪽을 지킨다.
- `pnpm audit --prod`를 CI에서 돌린다.
- 프레임워크 보안 공지는 GitHub의 `withastro/astro` 저장소 알림으로 받는다. 적용 전에는 공식 공지로 수정 버전을 직접 확인한다.

### 4.5 CI와 저장소

- GitHub Actions의 권한은 `contents: read`만 준다. 외부 액션은 커밋 해시로 고정한다. `pull_request_target`은 쓰지 않는다.
- CI에는 비밀 값이 필요 없다. 빌드는 Vercel이 한다.
- main 브랜치에는 직접 푸시하지 않고 풀 리퀘스트로만 병합한다. 개인 저장소에서 쓸 수 있는 범위로 설정한다.
- 저장소 공개 여부에 따라 쓸 수 있는 GitHub 보안 기능이 다르다. 비밀 값 검사와 푸시 차단은 무료 플랜 기준을 설정 화면에서 확인한다.
- `.env` 파일은 Git에 올리지 않는다(기존 `.gitignore`에 있음). 2단계 이전에는 비밀 값이 아예 없다.

### 4.6 2단계 문의 API

| 통제 | 내용 |
|---|---|
| 입력 검증 | zod로 모든 필드 길이와 형식을 제한하고 본문 크기를 제한한다 |
| 봇 방지 | 숨김 입력칸(허니팟), 보이지 않는 캡차(Cloudflare Turnstile 등), 요율 제한 |
| 요청 출처 | Astro의 `security.checkOrigin`은 기본으로 켜져 있다. 끄지 않는다 |
| 호스트 헤더 | `security.allowedDomains`에 `iduk.co.kr`만 등록한다. 호스트 헤더를 이용한 서버 요청 위조를 막는다 |
| DB | 앱 역할은 INSERT 중심 최소 권한. IP는 해시해서만 저장한다 |
| 메일 | 문의 내용을 메일 제목이나 헤더에 그대로 넣지 않는다 |
| 응답 | 내부 오류 메시지를 사용자에게 보여 주지 않는다 |

### 4.7 비밀 값

- 2단계 이후 모든 비밀 값은 Vercel 환경 변수(민감 값으로 표시)에만 둔다. 코드와 채팅에 붙여 넣지 않는다.
- 브라우저로 나가는 변수 접두어(`PUBLIC_`)는 비밀이 아닌 값에만 쓴다.
- 환경 변수는 빌드 시작 때 zod로 검증한다. 빠지면 빌드가 실패한다.
- 미리보기와 운영은 값을 분리한다.

## 5. 감시

Vercel Hobby의 런타임 로그는 1시간만 남는다. 로그에 의존하지 않고 결과를 감시한다.

| 점검 | 방법 | 주기 |
|---|---|---|
| **은폐 검사** | 운영 주소의 홈과 대표 글 3개를 일반 브라우저, 검색 로봇, 모바일, 검색 결과에서 온 것처럼 요청해서 응답을 비교한다. 이번 감염이 쓴 방식이다 | 주 1회 (GitHub Actions 예약 실행, 비밀 값 불필요) |
| 외부 주소 점검 | 응답에 나온 스크립트와 링크의 호스트가 허용 목록 안인지 확인한다 | 위와 같이 |
| 가동 점검 | 무료 가동 모니터링 서비스 | 5분 |
| 구글 서치 콘솔 | 보안 문제와 수동 조치 알림을 메일로 받는다 | 상시 |
| 배포 알림 | 예상하지 못한 배포가 있으면 메일로 알린다. Vercel과 GitHub 알림을 켠다 | 상시 |
| 의존성 경고 | GitHub 보안 경고 | 상시 |

## 6. 복구

- **콘텐츠:** Git이 곧 백업이다. 저장소를 두 곳 이상에 복제해 둔다(로컬, GitHub).
- **DB (2단계):** Neon 무료 플랜의 복원 가능 기간이 6시간이므로 주 1회 `pg_dump`를 암호화해서 따로 보관한다.
- **배포:** Vercel에서 이전 배포로 즉시 되돌릴 수 있다.

### 침해가 의심될 때의 순서

1. 증거를 먼저 남긴다. 화면, 응답 내용, 배포 기록을 저장한다.
2. GitHub, Vercel, Neon의 로그인 세션과 토큰을 모두 폐기한다.
3. Vercel에서 마지막으로 깨끗했던 배포로 되돌린다.
4. 비밀번호를 바꾸고 환경 변수를 교체한다.
5. 최근 커밋과 의존성 변경을 검토한다.
6. 구글 서치 콘솔에서 보안 문제를 확인하고 필요하면 재검토를 요청한다.

## 7. 옛 사이트 정리

새 사이트로 전환하고 2주 동안 이상이 없으면 아래를 한다.

1. 카페24 호스팅의 파일과 DB를 삭제하거나 호스팅을 해지한다. 그 전에 전체 백업이 로컬에 있는지 다시 확인한다.
2. 카페24 CDN(`iduk.cdn3.cafe24.com`)의 이미지도 같이 없어진다. 새 사이트는 CDN을 가리키지 않으므로 영향이 없다. 다만 외부 사이트가 이 주소를 직접 링크했다면 깨진다.
3. 옛 주소가 검색 결과에 남아 있으면 서치 콘솔의 삭제 요청과 사이트맵 재제출로 정리한다.

## 8. 공개 후 점검 목록

- [ ] 보안 헤더 점검 서비스에서 A 이상
- [ ] 미리보기에서 `/?p=1`이 `/`로 한 번만 이동하고 되풀이되지 않는다(4.2 "Vercel 규칙 해석")
- [ ] Mozilla Observatory에서 B+ 이상
- [ ] CSP 위반이 브라우저 콘솔에 없다
- [ ] HSTS 사전 등록은 1주 관찰 뒤에 신청한다
- [ ] 외부 호스트 요청이 0건이다(분석 제외)
- [ ] 옛 워드프레스 주소(`/wp-login.php`, `/xmlrpc.php`)가 차단된다
- [ ] 모든 계정에 패스키 또는 2단계 인증이 켜져 있다
- [ ] 첫 주간 은폐 검사가 통과했다

## 9. 프레임워크 보안 공지에 대한 참고

- React 서버 컴포넌트의 통신 프로토콜에서 나온 원격 코드 실행 취약점(CVE-2025-55182)은 2025년 12월 5일에 CISA의 실제 악용 취약점 목록에 올랐다.
- 2026년 5월과 10월에 Next.js 보안 릴리스가 이어졌다. 10월 건은 2차 출처(호스팅 업체 공지)에서만 확인했고, 적용 대상 버전으로 Next.js 16.4.1 이상과 React 19.3.1 이상이 언급됐다.
- Astro는 2026년에 SSRF와 XSS 공지가 여럿 있었다. 대부분 서버 렌더링, 서버 아일랜드, 뷰 트랜지션 값 처리와 관련된 것이다. 모두 2차 출처이므로 공식 공지를 확인한다.
- 어느 프레임워크를 쓰든 결론은 같다. 쓰는 기능을 줄이고, 갱신 제안을 받고, 정적으로 내보낸다.

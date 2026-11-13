# 공개 점검 기록

S13 미리보기 배포의 점검 결과. 개인 정보와 배포 주소는 적지 않는다.

## S13 미리보기 배포 (2026-11-13)

배포 방식: Vercel CLI로 `--prod --skip-domain` 배포(도메인 별칭 없음), 프로젝트 `iduk-portfolio`, 배포 보호 `all`.
빌드: Node 24, Corepack의 pnpm 12.18.0, 이미지 466장 최적화 포함 약 10분.

### 사고 기록
- 첫 두 번의 배포(`vercel deploy`, `--target preview`)가 프로덕션으로 올라가 별칭 주소가 인증 없이 열렸다(HTTP 200). 보호 범위가 `all_except_custom_domains`라 프로덕션 별칭이 제외된 것이 원인이었다. 두 배포는 바로 삭제했고(별칭 404 확인), 보호를 `all`로 바꾼 뒤 별칭 없이 다시 배포했다.
- `vercel link`가 프로젝트를 GitHub 저장소(프로덕션 브랜치 `main`)에 자동 연결했다.
- 교훈: 새 프로젝트의 첫 배포는 대상 지정과 무관하게 프로덕션이 된다. 배포 전에 보호 범위부터 확인한다.

### 통과 (실제 Vercel 엣지 응답, `vercel curl`)
| 항목 | 결과 |
|---|---|
| 외부 접근 | 고유 주소 302(로그인), 별칭 404 |
| `/`, `/en/`, `/work/`, `/work/tag/web/` | 200 |
| `/nope/` | 404 |
| `/portfolio/oyedu/`, `/portfolio/1812/` | 301, `/work/oyedu/`, `/work/jejuair-mobile/` |
| `/portfolio/oyedu` | 308 후 301 |
| `/?p=1` | 이동 없이 200 |
| `/wp-login.php`, `/xmlrpc.php` | 404 |
| 보안 헤더 | CSP 1개(메타와 합쳐지지 않음), HSTS 300초, nosniff, Referrer-Policy, Permissions-Policy, COOP |
| `X-Robots-Tag` | 사이트 `noindex`, 데모 `noindex, nofollow`(데모는 완화 CSP) |
| 캐시 | `/_astro/*` 1년 immutable, 고정 이름 글꼴은 재검증 |
| `sitemap-index.xml`, `robots.txt`, 글꼴 | 200 |

### 통과 (실제 브라우저, Chromium 412px DPR 1.75)
엣지 응답을 `vercel curl`로 받아 그대로 렌더링했다(보호된 주소라 직접 접속 불가).
- 홈 ko/en, expressway, 태그 페이지: 글꼴 파일 1개, 외부 요청 0, 콘솔 메시지 0, Pretendard Variable 적용.
- 404 페이지 정상 렌더링.
- atom 데모: 화면과 이미지 정상.

### 미확인과 대책
| 항목 | 이유 | 대책 |
|---|---|---|
| atom 데모의 CSP 차단(worker, `data:` 오디오) | 옛 라이브러리의 기능 감지로 추정, 화면 영향 없음 | 사용자 결정(기본: 열지 않음) |
| Lighthouse(Vercel 주소), Safari 실기기 | 보호 때문에 도구가 접근 불가 | 공개 후 점검 |
| GitHub Actions 실행 | 첫 푸시 전 | 푸시 후 실행 결과 확인 |
| `--pre-publish` | 번역 초안 24개 프로젝트와 14개 태그가 `draft-translation` | 검수 후 통과해야 공개(S14 전제) |
| 보류 PDF 3개, 인물 이미지 검토, 파비콘 확정 | 사용자 결정 필요 | docs/manual-todo.md |

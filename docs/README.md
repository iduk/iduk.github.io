# iduk.design 포트폴리오 기획·구현 계획

- 작성일: 2026-10-23
- 상태: 계획 단계, 구현 전
- 대상 저장소: iduk/iduk.github.io, 작업 브랜치 portfolio
- 대상 도메인: iduk.co.kr

## 한 줄 컨셉

큰 글자와 큰 이미지만 남기고, 움직임은 조용하고 부드럽게 만든 포트폴리오.

## 왜 새로 만드나

기존 워드프레스 사이트는 2024년 9월부터 2026년 10월까지 감염된 상태였다. 방문자에게 스팸을 보여 주고 원격으로 관리자 계정을 만들 수 있는 백도어가 DB에 숨어 있었다. 새 사이트는 "침입당해도 실행될 코드가 없는 구조"를 첫 번째 설계 기준으로 삼는다.

## 기술 결정 요약

| 영역 | 선택 | 한 줄 이유 |
|---|---|---|
| 프레임워크 | Astro 7, 정적 출력 | 콘텐츠 사이트에 맞고, 기본으로 JS를 거의 보내지 않으며, 서버 코드가 없다 |
| 보류한 대안 | Next.js 16 | 로그인, 관리자 화면, 실시간 기능이 필요해지면 다시 검토 |
| 패키지 매니저 | pnpm 12 | 의존성 설치 스크립트 기본 차단, 신규 릴리스 24시간 대기 기본값 |
| 스타일 | Tailwind CSS 4, CSS 변수 토큰 | 빌드 도구가 가볍고, 반응형 글자 크기 토큰을 만들기 쉽다 |
| 글꼴 | Pretendard Variable 자체 호스팅 | 라이선스 OFL, 외부 CDN 불필요 |
| 이미지 | WebP 마스터에서 AVIF/WebP 반응형을 빌드 시 생성 | 런타임 이미지 서버가 없고, Vercel 이미지 한도를 쓰지 않는다 |
| 콘텐츠 | Astro Content Collections와 zod 검증, 원본은 JSON | 깨진 데이터를 빌드에서 막는다 |
| 호스팅 | Vercel Hobby, 정적 배포 | 무료, 공개·비공개 저장소 모두 가능 |
| DB | 2단계에서 Neon. 1단계는 DB 없음 | 문의 폼과 반응 수만 DB가 필요하다 |
| 움직임 | CSS 스크롤 애니메이션, 브라우저 기본 페이지 전환 | JS 번들이 늘지 않고 CSP와 충돌하지 않는다 |

## 문서 목차

1. [기획과 디자인](01-concept-design.md): 정보 구조, 타이포, 색, 이미지 연출, 움직임, 접근성
2. [기술 구성](02-architecture.md): 프레임워크와 패키지 매니저 비교, 저장소 구조, 콘텐츠 파이프라인, 이미지, 성능 예산, Neon
3. [보안](03-security.md): 이번 감염에서 얻은 교훈, 계층별 통제, 모니터링, 복구
4. [구현 로드맵](04-roadmap.md): 단계별 작업, 완료 기준, 도메인 전환 절차, 위험
5. [단계별 실행 계획](05-execution-plan.md): S00~S16 스텝별 명령, 통과 기준, 되돌리기, 사용자 확인 지점
6. [한글·영문 병행](06-i18n.md): 주소 체계, 콘텐츠 구조, 번역 방식, SEO, 테스트. 다국어 규칙은 이 문서가 우선
7. [개인정보 비공개](07-privacy.md): 이메일을 포함한 모든 개인정보 비공개 원칙, 커밋 기록, 데모 정화, 자동 검사. 이 원칙이 모든 문서보다 우선

## 먼저 정해야 할 것

아래는 구현을 시작하기 전에 사용자가 정해야 한다. 기본값은 굵게 표시했다.

| 번호 | 질문 | 기본값 |
|---|---|---|
| 1 | 이름, 소개, 경력 | **쓰지 않음.** 현재 포트폴리오 작업만 올린다. 로고는 `iduk` 글자만 |
| 2 | 비공개 글 13개 중 공개할 것. 2012년에서 2015년 작업이 대부분이다 | **전부 비공개 유지** |
| 3 | Vercel Hobby는 비상업 개인용이다. 프리랜서 영업 용도면 Pro가 필요할 수 있다 | **취업과 개인 기록용으로 Hobby** |
| 4 | 도메인 등록처와 네임서버 모두 **Cafe24로 확인됨**. 메일은 **쓰지 않음** | **네임서버는 Cafe24 유지, A/CNAME만 변경.** 메일 레코드 걱정 없음 |
| 5 | 저장소 공개 여부 | **공개 유지.** 단, 비공개 글·2019 XML·원본 이미지·접속 정보·**어떤 개인정보도** 넣지 않는다([07번](07-privacy.md)) |
| 6 | 한글·영문 | **한글 기본 + 영문 병행으로 확정.** 영문은 `/en/`. 자세한 규칙은 [06 다국어](06-i18n.md) |
| 7 | 2021년 이후 신규 작업을 추가할 것인지 | 공개 글은 2020년이 마지막이라 추가 권장 |

## 조사 기준

모든 버전과 무료 한도는 2026-10-23에 npm 레지스트리와 각 공식 문서에서 확인했다. 설치 시점에 다시 확인한다.

- Vercel Hobby 플랜: https://vercel.com/docs/plans/hobby
- Vercel 패키지 매니저 지원: https://vercel.com/docs/package-managers
- Vercel WAF 요율 제한: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Astro 이미지: https://docs.astro.build/en/guides/images/
- Astro 설정 참조(CSP, 이미지, 보안): https://docs.astro.build/en/reference/configuration-reference/
- Astro 뷰 트랜지션: https://docs.astro.build/en/guides/view-transitions/
- Next.js CSP 가이드: https://nextjs.org/docs/app/guides/content-security-policy
- pnpm 공급망 보안: https://pnpm.io/supply-chain-security
- npm 12 설정: https://docs.npmjs.com/cli/v12/using-npm/config
- Neon 요금: https://neon.com/pricing

2차 출처에서만 확인된 내용에는 본문에 표시했다. 보안 공지는 적용 전에 공식 GitHub Security Advisory로 다시 확인한다.

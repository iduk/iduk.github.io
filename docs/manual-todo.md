# 수동 확인 목록

`pnpm tsx scripts/build-content.ts` 가 만든 파일이다. 직접 고치지 말고 `scripts/content-data.ts` 를 고친 뒤 다시 만든다.

## 1. 2019년 버전 본문 병합 후보

원본 데이터의 `archive2019`(2019-03 내보내기 본문)에만 있고 현재 본문에는 없는 줄이다. 자동으로 합치지 않았다. 쓸 줄을 고르면 `scripts/content-data.ts` 의 `text`에 옮긴다.

- `smartfarm-dashboard`
  - 컨셉 시안 및 프로젝트 전체 페이지 디자인
  - Bootstrap + Material Form UI Custom.
  - Desktop Total 40 page. / App UI 등록 예정
- `healthcare-icon-set`
  - 헬스케어를 주제로 한 아이콘 UI 작업
  - 고유 이미지의 아이콘을 제작하여 기업 아이덴티티를 강화할 목적 - 구글 아이콘 그리드를 참고하여 나름의 규칙으로 제작 (svg, png 등으로 추출하여 차후 웹폰트도 만들 생각이었으나 불발...)
- `product-mockup`
  - 리본실버케어 주요제품 목업
  - 플랫폼의 서비스 확장을 고려하여 스케치툴로 만들어본 목업 습작
- `telecare-service-app`
  - 텔레케어 플랫폼 앱서비스 런칭 "TSP v3.2"
  - 영어, 일본어, 독일어 등 다국어 화면대응
- `smartband-app-ui`
  - 학생감성평가 네이티브앱 화면 디자인 산출물
  - 화면 UI 디자인, 웹화면 퍼블리싱(Bootstrap Customize)
- `exhibition-booth-design`
  - 독일 뒤셀도르프 메디카, 전시부스 판넬 디자인
- `telecare-service-website`
  - 텔레케어 기업 반응형웹 템플릿
  - UI 디자인 / 반응형 퍼블리싱
- `website-renewal-ui`
  - 마케팅 전문기업 이레컴즈 기업사이트 메인 리뉴얼
  - 데스크탑 UI 디자인
- `online-ad-company-responsive-web`
  - 데스크탑~모바일 화면 UI 디자인
- `ad-company-wordpress`
  - 기본 스킨에 게시판, 문의하기 등 기능적인 부분 플러그인 활용
  - 하드코딩으로 UI디자인 작업
- `chinese-community`
  - 중국의 한류 뷰티 커뮤니티 플랫폼 "美丽思密达" 런칭
  - 중국 정서의 UI 디자인 및 프로젝트 총괄 담당
  - 데스크탑 버전 웹서비스 화면 UI 디자인+퍼블리싱
  - 모바일웹 서비스 화면 UI 디자인+퍼블리싱
- `cardduck`
  - 신용카드의 혜택을 비교하여 더 나은 신용카드를 제공하는 서비스 플랫폼 "CardDuck"
  - 데스크탑/모바일웹 UI 디자인+퍼블리싱 제작
  - 서비스 기획 및 카드혜택 정보등록 및 검수

## 2. 영문 번역·alt 초안 검토

- 모든 글(24개)과 태그에 `status: draft-translation` 이 붙어 있다. 영문 제목·역할·설명·본문·태그 이름·alt(한글·영문)를 검토하고 확정한 글에서 표시를 지운다. 표시가 남아 있으면 공개 전 검사(Task 11)가 실패한다.
- alt는 파일명과 맥락에서 쓴 초안이고, 일부(8장)만 실제 화면을 보고 썼다. 이미지 안에 보이는 이름·번호는 자동으로 찾을 수 없으므로 표지 24장과 본문 이미지를 한 번 훑어본다(개인정보 육안 확인). 예: expressway 화면에 사용자 이름 표시 칸이 있다(가상 이름으로 보임).
- 영문 고유명사 표기(예: 7daycomz(이레컴즈), LivOn Silver Care(리본실버케어), Jeju Air)는 원문 표기에서 추정한 것이다.

## 3. 원문에 있던 것 중 확인이 필요한 것

- 외부 링크는 원문 그대로 본문 `text` 블록에 남겼다. 오래된 주소는 사라졌거나 다른 주인이 쓸 수 있으니 공개 전에 열어 보고 살아 있는 것만 둔다.
  - `coinghost-landing-web`: http://coinghost.io/
  - `telecare-service-app`: http://family.livoncare.com
  - `telecare-service-app`: https://play.google.com/store/apps/details?id=com.ionicframework.livonapp397686
  - `smartband-app-ui`: https://play.google.com/store/apps/details?id=kr.hidea.smartband
  - `chinese-community`: http://www.meilismd.com
- `online-ad-company-responsive-web`: 본문 기간이 2017.9로 적혀 있으나 글 작성일은 2016-04이다. 원문(2019년 버전 포함)이 모두 2017.9라 그대로 두었다.
- `exhibition-booth-design`: 이미지 이름의 `w275`, `w375` 뜻을 알 수 없어 alt에 그대로 적었다.
- `jejuair-mobile` 의 이미지 키는 옛 슬러그 그대로 `1812/...` 이다(`src/assets/images/1812/`). 글 슬러그와 달라도 키로만 참조하므로 동작에는 문제 없다.
- 표지(`cover`)가 세로로 긴 글이 있다(`bed-mattress-website`). 표지를 잘라 쓸지 본문 이미지로 바꿀지 결정한다.
- 본문에 이미지가 없고 표지만 있는 글: `oyedu`, `coinghost-landing-web`, `engineering-responsive-web`, `smartfarm-android`, `cooking-landing-page-template`

## 4. 레이아웃 제안(자동 판단 아님)

- 나란히 놓는 `pair` 블록은 원문 순서에서 같은 크기의 연속 이미지로 골랐다: expressway(라이트·다크), healthcare-icon-set(모션·도어 센서), exhibition-brochure(내지 1·2, 3·4), chinese-community(PC 화면 2장).
- 원문의 이미지 설명 글("Light Ver.", "Dark Ver.", 센서 이름)은 해당 이미지의 alt에 합쳤고 별도 글 블록은 만들지 않았다.

## 5. 변환하지 않는 이미지

원본 글에 첨부만 되어 있고 본문에는 나오지 않던 이미지(일부는 다른 글의 썸네일)는 변환하지 않는다. 변환 대상은 표지와 본문 이미지뿐이며, `images.json`의 모든 키와 `src/assets/images`의 모든 파일이 글에서 쓰인다(테스트가 검사). 첨부 이미지를 쓰고 싶으면 먼저 원문 본문 규칙(`lib/posts.ts`의 `usedImagePaths`)을 바꿔야 한다.

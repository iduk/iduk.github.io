/**
 * build-content가 쓰는 손으로 쓴 부분: 한글 원문에서 옮긴 영문 초안, alt 초안, 태그, 대표 작업 제안.
 * 원문은 ../iduk.design/data/posts.json 의 공개 글 24개뿐이다. 모든 글은 draft-translation 상태로 나간다.
 *
 * 규칙
 * - `ko`에는 원문 문장을 그대로 두는 것을 원칙으로 한다. 예외로 원문이 영어인 일부 줄(role 등)은 ko를
 *   한글로 다시 썼고, 그 줄의 원문은 en에 남겼다. build-content가 dt 이름·dd 줄·링크가 ko 또는 en의
 *   role/summary/text 안에 남아 있는지 검사하므로, 줄을 지우면 빌드가 실패한다.
 * - alt는 "<프로젝트> – <화면 설명>". 파일명과 맥락(일부는 실제 화면)에서 쓴 초안이다.
 * - alts·pairs의 키는 images.json 키에서 글 슬러그(`<slug>/`)와 번호(`NN-`)를 뺀 이름이다.
 */
import type { LText } from '../src/lib/schema';

const l = (ko: string, en: string): LText => ({ ko, en });

export type TagDef = { id: string; name: LText };

export type ProjectMeta = {
  /** 새 슬러그. 없으면 원본 슬러그를 쓴다. */
  newSlug?: string;
  title: LText;
  role: LText;
  summary: LText;
  tags: string[];
  featured: boolean;
  coverAlt: LText;
  /** 본문 이미지 alt(이미지 키 접미어 → alt) */
  alts: Record<string, LText>;
  /** dl.subject에서 role/summary로 옮기지 않은 줄과 링크를 담은 본문(HTML, 정화 전) */
  text?: LText;
  /** 나란히 놓을 연속된 이미지 쌍(접미어 두 개, 본문 등장 순서) */
  pairs?: [string, string][];
};

/** 쓰이는 태그만. 기준 두 개: 분야(어디서)와 한 일(무엇을). 카드에는 분야, 한 일 순서로 나온다. */
export const tags: TagDef[] = [
  { id: 'healthcare', name: l('헬스케어', 'Healthcare') },
  { id: 'smartfarm', name: l('스마트팜', 'Smart farm') },
  { id: 'transport', name: l('교통·항공', 'Transport and aviation') },
  { id: 'commerce', name: l('뷰티·커머스', 'Beauty and commerce') },
  { id: 'finance', name: l('금융·핀테크', 'Finance and fintech') },
  { id: 'corporate', name: l('마케팅·기업', 'Marketing and corporate') },
  { id: 'ui-design', name: l('UX/UI', 'UX/UI design') },
  { id: 'publishing', name: l('웹 퍼블리싱', 'Front-end development') },
  { id: 'planning', name: l('서비스 기획', 'Service planning') },
  { id: 'graphic', name: l('아이콘·그래픽', 'Icon and graphic') },
];

export const meta: Record<string, ProjectMeta> = {
  oyedu: {
    title: l('OY Education', 'OY Education'),
    role: l('Web,App (Mobile First)', 'Web and app, mobile first'),
    summary: l(
      "OliveYoung Education & Community — 올리브영 매장 직원들을 위한 '소통' 프로젝트",
      "OliveYoung Education & Community: a 'communication' project for Olive Young store staff",
    ),
    tags: ['commerce', 'ui-design'],
    featured: true,
    coverAlt: l(
      'OY Education – 스마트폰 화면에 담은 앱 디자인 목업',
      'OY Education – app screens shown on smartphone mockups',
    ),
    alts: {},
  },
  'coinghost-mobile-app': {
    title: l('COINGHOST Mobile App', 'COINGHOST Mobile App'),
    role: l('앱 UI 디자인', 'App UI design'),
    summary: l('코인고스트 모바일앱', 'Mobile app for COINGHOST'),
    tags: ['finance', 'ui-design'],
    featured: false,
    coverAlt: l('COINGHOST 모바일 앱 – 대표 화면', 'COINGHOST Mobile App – cover screen'),
    alts: {
      'coinghost-app-showcase': l(
        'COINGHOST 모바일 앱 – 앱 화면 모음',
        'COINGHOST Mobile App – app screens overview',
      ),
    },
  },
  'coinghost-landing-web': {
    title: l('COINGHOST Landing Web', 'COINGHOST Landing Web'),
    role: l('랜딩 웹 UI 디자인, 퍼블리싱', 'Landing web UI design, publishing'),
    summary: l('코인고스트 백서 랜딩페이지', 'Whitepaper landing page for COINGHOST'),
    tags: ['finance', 'ui-design', 'publishing'],
    featured: false,
    coverAlt: l(
      'COINGHOST 랜딩 웹 – 가치 소개와 토큰 배분 섹션이 보이는 페이지',
      'COINGHOST Landing Web – page showing the value section and token allocation chart',
    ),
    alts: {},
    text: l(
      '<p><a href="http://coinghost.io/">http://coinghost.io/</a></p>',
      '<p><a href="http://coinghost.io/">http://coinghost.io/</a></p>',
    ),
  },
  '1812': {
    newSlug: 'jejuair-mobile',
    title: l('JEJUair Mobile', 'JEJUair Mobile'),
    role: l('UI 디자인', 'UI design'),
    summary: l(
      "Jejuair Mobile Crew — 제주항공 모바일 크루 시스템 'J-CREW' UI Design.",
      "Jejuair Mobile Crew: UI design for 'J-CREW', Jeju Air's mobile crew system",
    ),
    tags: ['transport', 'ui-design'],
    featured: true,
    coverAlt: l(
      'JEJUair Mobile – J-CREW 앱 화면 목업',
      'JEJUair Mobile – J-CREW app screens on phone mockups',
    ),
    alts: {
      'jejuair-jcrew-mobile': l(
        'JEJUair Mobile – J-CREW 로그인과 일정 캘린더 화면',
        'JEJUair Mobile – J-CREW login and schedule calendar screens',
      ),
    },
  },
  expressway: {
    title: l('ExpressWay', 'ExpressWay'),
    role: l(
      '데스크탑 UI 메인,레이아웃 디자인 및 퍼블리싱',
      'Desktop UI design (main screen and layout) and publishing',
    ),
    summary: l('한국도로공사 VMS 웹시스템', 'VMS web system for the Korea Expressway Corporation'),
    tags: ['transport', 'ui-design', 'publishing'],
    featured: true,
    coverAlt: l(
      'ExpressWay – 도로 CCTV 채널 라이브뷰 모니터링 화면',
      'ExpressWay – live view monitoring screen with four road camera channels',
    ),
    alts: {
      'ex-main-light': l(
        'ExpressWay – 채널 라이브뷰 모니터링 화면, 라이트 버전',
        'ExpressWay – live view monitoring screen, light version',
      ),
      'ex-main-dark': l(
        'ExpressWay – 채널 라이브뷰 모니터링 화면, 다크 버전',
        'ExpressWay – live view monitoring screen, dark version',
      ),
    },
    pairs: [['ex-main-light', 'ex-main-dark']],
  },
  'engineering-responsive-web': {
    title: l('Engineering Responsive Web', 'Engineering Responsive Web'),
    role: l('반응형웹 UI 디자인 및 퍼블리싱', 'Responsive web UI design and publishing'),
    summary: l(
      'Atom Engineering 건축사무소',
      'Responsive website for Atom Engineering, an architecture firm',
    ),
    tags: ['corporate', 'ui-design', 'publishing'],
    featured: true,
    coverAlt: l(
      'Atom Engineering – "Are you in a safe building now?" 문구가 있는 메인 화면',
      'Atom Engineering – home page with the headline "Are you in a safe building now?"',
    ),
    alts: {},
  },
  'smartfarm-android': {
    title: l('Smartfarm UI for Android', 'Smartfarm UI for Android'),
    role: l('모바일 UI 디자인', 'Mobile UI Design'),
    summary: l('스마트팜 IoT, 양돈', 'Smart farm IoT: pig farming'),
    tags: ['smartfarm', 'ui-design'],
    featured: false,
    coverAlt: l(
      'Smartfarm Android – 대시보드, 환경 설정, 개체 목록 화면 목업',
      'Smartfarm UI for Android – dashboard, environment settings and animal list screens',
    ),
    alts: {},
    text: l('<p>Bootstrap + Material UI Custom.</p>', '<p>Bootstrap + Material UI Custom.</p>'),
  },
  'smartfarm-dashboard': {
    title: l('SmartFarm Dashboard', 'SmartFarm Dashboard'),
    role: l('스마트팜 관리자 화면 UI 작업', 'Admin screen UI design for a smart farm'),
    summary: l(
      '스마트팜 IoT, 축산 농장 프로젝트, "양돈"',
      'Smart farm IoT project for a livestock farm, "Yangdon" (pig farming)',
    ),
    tags: ['smartfarm', 'ui-design'],
    featured: true,
    coverAlt: l(
      'SmartFarm Dashboard – 관리자 대시보드 대표 화면',
      'SmartFarm Dashboard – admin dashboard cover screen',
    ),
    alts: {
      'yangdon-dashboard': l(
        'SmartFarm Dashboard – 관리자 화면 전체 캡처',
        'SmartFarm Dashboard – full-length capture of the admin screens',
      ),
    },
    text: l('<p>Bootstrap + Material UI Custom.</p>', '<p>Bootstrap + Material UI Custom.</p>'),
  },
  'smartfarm-dashboard-firststeps': {
    title: l('SmartFarm Dashboard "FirstSteps"', 'SmartFarm Dashboard "FirstSteps"'),
    role: l('컨셉 시안 및 화면 UI 디자인', 'Concept drafts and screen UI design'),
    summary: l(
      '스마트팜 IoT 버섯농장 프로젝트, "첫걸음"',
      'Smart farm IoT project for a mushroom farm, "FirstSteps"',
    ),
    tags: ['smartfarm', 'ui-design'],
    featured: false,
    coverAlt: l(
      'SmartFarm FirstSteps – 데스크탑 관리자 화면 대표 이미지',
      'SmartFarm Dashboard "FirstSteps" – desktop admin cover image',
    ),
    alts: {
      'firststeps-dashboard': l(
        'SmartFarm FirstSteps – 버섯농장 관리자 화면 전체 캡처',
        'SmartFarm Dashboard "FirstSteps" – full-length capture of the mushroom farm admin screens',
      ),
    },
    text: l('<p>41 Page / Desktop Admin Design.</p>', '<p>41 Page / Desktop Admin Design.</p>'),
  },
  'healthcare-icon-set': {
    title: l('Healthcare Icon Set', 'Healthcare Icon Set'),
    role: l('아이콘 디자인', 'Icon design'),
    summary: l(
      'Home IoT + Healthcare 플랫폼 서비스 아이콘',
      'Service icons for a Home IoT + Healthcare platform',
    ),
    tags: ['healthcare', 'graphic'],
    featured: false,
    coverAlt: l(
      'Healthcare Icon Set – 서비스 아이콘 대표 이미지',
      'Healthcare Icon Set – service icons cover image',
    ),
    alts: {
      'healthcare-iconset-sketch': l(
        'Healthcare Icon Set – 아이콘 스케치',
        'Healthcare Icon Set – icon sketches',
      ),
      'healthcare-icon-motion': l(
        'Healthcare Icon Set – 모션 감지 센서 아이콘',
        'Healthcare Icon Set – motion detection sensor icon',
      ),
      'healthcare-icon-door': l(
        'Healthcare Icon Set – 도어 센서 아이콘',
        'Healthcare Icon Set – door sensor icon',
      ),
      'healthcare-icon-home': l(
        'Healthcare Icon Set – 홈 IoT 아이콘',
        'Healthcare Icon Set – home IoT icon',
      ),
      'healthcare-iconset-white': l(
        'Healthcare Icon Set – 흰 배경의 전체 아이콘 세트',
        'Healthcare Icon Set – the complete icon set on a white background',
      ),
    },
    pairs: [['healthcare-icon-motion', 'healthcare-icon-door']],
  },
  'product-mockup': {
    title: l('Products MockUp', 'Products MockUp'),
    role: l('제품 목업 스케치', 'Product mockup sketches'),
    summary: l('리본실버케어 주요제품 목업', 'Mockups of the main products of LivOn Silver Care'),
    tags: ['healthcare', 'graphic'],
    featured: false,
    coverAlt: l(
      'Products MockUp – 제품 목업 대표 이미지',
      'Products MockUp – product mockup cover image',
    ),
    alts: {
      'livon-product-flat-mockup': l(
        'Products MockUp – 주요 제품 플랫 목업',
        'Products MockUp – flat mockup of the main products',
      ),
    },
  },
  'telecare-service-app': {
    title: l('Telecare Service Platform APP', 'Telecare Service Platform APP'),
    role: l(
      '앱 서비스 디자인, 반응형 웹 퍼블리싱, 다국어 대응',
      'App service design, responsive web publishing and multilingual support',
    ),
    summary: l(
      '독거노인을 위한 텔레케어 서비스 플랫폼 "TSP v3.2" 런칭',
      'Launch of "TSP v3.2", a telecare service platform for elderly people living alone',
    ),
    tags: ['healthcare', 'ui-design', 'publishing'],
    featured: true,
    coverAlt: l(
      'Telecare Service Platform – TSP v3.2 앱 화면 대표 이미지',
      'Telecare Service Platform – TSP v3.2 app cover image',
    ),
    alts: {
      'tsp32-ui': l(
        'Telecare Service Platform – TSP v3.2 앱 UI 전체 캡처',
        'Telecare Service Platform – full-length capture of the TSP v3.2 app UI',
      ),
    },
    text: l(
      '<ul><li>Android/iOS 앱서비스 전반 디자인</li><li>반응형웹 화면 퍼블리싱(MaterializeCSS Customize)</li><li>영어, 일본어, 독일어 등 다국어 대응</li></ul><p><a href="http://family.livoncare.com">Web Service 바로가기</a></p><p><a href="https://play.google.com/store/apps/details?id=com.ionicframework.livonapp397686">Play Store 바로가기</a></p>',
      '<ul><li>Overall design of the Android/iOS app service</li><li>Responsive web screen publishing (customized MaterializeCSS)</li><li>Multilingual support: English, Japanese, German and more</li></ul><p><a href="http://family.livoncare.com">Go to the web service</a></p><p><a href="https://play.google.com/store/apps/details?id=com.ionicframework.livonapp397686">Go to the Play Store</a></p>',
    ),
  },
  'smartband-app-ui': {
    title: l('SmartBand App UI', 'SmartBand App UI'),
    role: l(
      '네이티브앱·반응형웹 UI 디자인, 웹화면 퍼블리싱',
      'Native app and responsive web UI design, web screen publishing',
    ),
    summary: l(
      'PAPS 체력측정시스템 기술개발 과제 — 학생감성평가 네이티브앱 및 반응형웹 화면 디자인 산출물',
      'PAPS fitness measurement system R&D project: design deliverables for a student emotion assessment native app and responsive web',
    ),
    tags: ['healthcare', 'ui-design', 'publishing'],
    featured: false,
    coverAlt: l('SmartBand App UI – 앱 화면 대표 이미지', 'SmartBand App UI – app cover image'),
    alts: {
      'smartband-students': l(
        'SmartBand App UI – 학생 체력측정 시스템 앱 화면',
        'SmartBand App UI – student fitness measurement system app screens',
      ),
    },
    text: l(
      '<p><a href="https://play.google.com/store/apps/details?id=kr.hidea.smartband">Google Play 앱서비스 바로가기</a></p>',
      '<p><a href="https://play.google.com/store/apps/details?id=kr.hidea.smartband">Go to the app on Google Play</a></p>',
    ),
  },
  'telecare-service-showcase-ui': {
    title: l('Telecare Service Showcase UI', 'Telecare Service Showcase UI'),
    role: l('컨셉 디자인', 'Concept design'),
    summary: l(
      '앱서비스 고도화를 위한 컨셉 시안 — LivOn TSP ver3.1, Concept Design',
      'Concept drafts for upgrading the app service (LivOn TSP ver3.1)',
    ),
    tags: ['healthcare', 'ui-design'],
    featured: false,
    coverAlt: l(
      'Telecare Service Showcase – TSP ver3.1 컨셉 화면 대표 이미지',
      'Telecare Service Showcase UI – TSP ver3.1 concept cover image',
    ),
    alts: {
      'tsp3-1-styleguide': l(
        'Telecare Service Showcase – TSP 3.1 스타일 가이드',
        'Telecare Service Showcase UI – TSP 3.1 style guide',
      ),
    },
  },
  'exhibition-brochure': {
    title: l('Exhibition Brochure', 'Exhibition Brochure'),
    role: l('브로슈어 제작', 'Brochure design'),
    summary: l(
      '독일 뒤셀도르프 메디카 박람회 브로슈어 제작 — MEDICA 2016, World Forum for Medicine',
      'Brochure for MEDICA 2016, the World Forum for Medicine, in Düsseldorf, Germany',
    ),
    tags: ['healthcare', 'graphic'],
    featured: false,
    coverAlt: l(
      'Exhibition Brochure – 브로슈어 대표 이미지',
      'Exhibition Brochure – brochure cover image',
    ),
    alts: {
      'brochure-design-mockup': l(
        'Exhibition Brochure – 브로슈어 목업',
        'Exhibition Brochure – brochure mockup',
      ),
      'brochure-design-open': l(
        'Exhibition Brochure – 펼친 브로슈어',
        'Exhibition Brochure – opened brochure',
      ),
      'brochure-design-inner1': l(
        'Exhibition Brochure – 내지 1',
        'Exhibition Brochure – inner page 1',
      ),
      'brochure-design-inner2': l(
        'Exhibition Brochure – 내지 2',
        'Exhibition Brochure – inner page 2',
      ),
      'brochure-design-inner3': l(
        'Exhibition Brochure – 내지 3',
        'Exhibition Brochure – inner page 3',
      ),
      'brochure-design-inner4': l(
        'Exhibition Brochure – 내지 4',
        'Exhibition Brochure – inner page 4',
      ),
      'brochure-design-back': l('Exhibition Brochure – 뒷면', 'Exhibition Brochure – back cover'),
    },
    pairs: [
      ['brochure-design-inner1', 'brochure-design-inner2'],
      ['brochure-design-inner3', 'brochure-design-inner4'],
    ],
  },
  'exhibition-booth-design': {
    title: l('Exhibition Booth Design', 'Exhibition Booth Design'),
    role: l('전시부스 판넬 디자인', 'Exhibition booth panel design'),
    summary: l(
      '독일 뒤셀도르프 메디카 박람회 전시부스 판넬 디자인 — MEDICA 2016, World Forum for Medicine',
      'Booth panel design for MEDICA 2016, the World Forum for Medicine, in Düsseldorf, Germany',
    ),
    tags: ['healthcare', 'graphic'],
    featured: false,
    coverAlt: l(
      'Exhibition Booth Design – 전시부스 대표 이미지',
      'Exhibition Booth Design – booth cover image',
    ),
    alts: {
      'booth-w275': l(
        'Exhibition Booth Design – 판넬 디자인, w275 버전',
        'Exhibition Booth Design – panel design, w275 version',
      ),
      'booth-w375': l(
        'Exhibition Booth Design – 판넬 디자인, w375 버전',
        'Exhibition Booth Design – panel design, w375 version',
      ),
    },
  },
  'telecare-service-website': {
    title: l('Telecare Service Website', 'Telecare Service Website'),
    role: l('반응형 웹사이트', 'Responsive Website'),
    summary: l(
      '기업 반응형웹, 랜딩 페이지 템플릿',
      'Corporate responsive website and landing page template',
    ),
    tags: ['healthcare', 'ui-design', 'publishing'],
    featured: false,
    coverAlt: l(
      'Telecare Service Website – 반응형 웹사이트 대표 이미지',
      'Telecare Service Website – responsive website cover image',
    ),
    alts: {
      'hidea-mobile-mockup': l(
        'Telecare Service Website – 모바일 반응형 화면 목업',
        'Telecare Service Website – responsive mobile screen mockup',
      ),
      'hidea-index': l(
        'Telecare Service Website – 메인 페이지 전체 캡처',
        'Telecare Service Website – full-length capture of the home page',
      ),
    },
  },
  'cooking-landing-page-template': {
    title: l('Cooking Landing Page Template', 'Cooking Landing Page Template'),
    role: l('템플릿 습작', 'Template design study'),
    summary: l(
      '요식업계 컨셉의 템플릿 디자인 습작',
      'A template design study with a food business concept',
    ),
    tags: ['ui-design'],
    featured: false,
    coverAlt: l(
      'Cooking Landing Page Template – 요리 사진이 있는 MOMS RECIPY 랜딩 페이지',
      'Cooking Landing Page Template – MOMS RECIPY landing page with food photography',
    ),
    alts: {},
  },
  'website-renewal-ui': {
    title: l('AD Website Renewal Design', 'AD Website Renewal Design'),
    role: l('웹사이트 UI 디자인', 'Website UI design'),
    summary: l(
      '마케팅 전문기업 이레컴즈 웹사이트 메인화면 리뉴얼',
      'Main page renewal for the website of 7daycomz (이레컴즈), a marketing company',
    ),
    tags: ['corporate', 'ui-design'],
    featured: false,
    coverAlt: l(
      'AD Website Renewal Design – 리뉴얼 메인 화면 대표 이미지',
      'AD Website Renewal Design – renewed main page cover image',
    ),
    alts: {
      '7daycomz-renew-main': l(
        'AD Website Renewal Design – 리뉴얼한 메인 화면',
        'AD Website Renewal Design – the renewed main page',
      ),
    },
  },
  'online-ad-company-responsive-web': {
    title: l('J-bro Company Responsive Website', 'J-bro Company Responsive Website'),
    role: l('반응형웹 UI 디자인', 'Responsive web UI design'),
    summary: l(
      '온라인 마케팅 기업 Jbro, 반응형 웹사이트',
      'Responsive website for Jbro, an online marketing company',
    ),
    tags: ['corporate', 'ui-design'],
    featured: false,
    coverAlt: l(
      'J-bro 반응형 웹사이트 – 대표 이미지',
      'J-bro Company Responsive Website – cover image',
    ),
    alts: {
      'jbro-main': l(
        'J-bro 반응형 웹사이트 – 메인 화면',
        'J-bro Company Responsive Website – main page',
      ),
    },
  },
  'ad-company-wordpress': {
    title: l('AD Company WordPress', 'AD Company WordPress'),
    role: l(
      '워드프레스 반응형 웹사이트 제작 (플러그인 기능 + 디자인 커스텀)',
      'Responsive WordPress website (plugin features and design customization)',
    ),
    summary: l(
      '마케팅 전문기업 "이레컴즈", 워드프레스 반응형 웹사이트 제작',
      'Responsive WordPress website for 7daycomz (이레컴즈), a marketing company',
    ),
    tags: ['corporate', 'ui-design', 'publishing'],
    featured: false,
    coverAlt: l(
      'AD Company WordPress – 워드프레스 사이트 대표 이미지',
      'AD Company WordPress – WordPress site cover image',
    ),
    alts: {
      '7daycomz-index': l(
        'AD Company WordPress – 메인 페이지 전체 캡처',
        'AD Company WordPress – full-length capture of the home page',
      ),
    },
    text: l(
      '<ul><li>웹 화면 캡쳐본</li><li>기본 스킨에 게시판, 문의하기 등 기능 부분 플러그인 + 디자인 커스텀</li></ul>',
      '<ul><li>Web screen captures</li><li>Base skin with plugins for features such as a bulletin board and an inquiry form, plus custom design</li></ul>',
    ),
  },
  'chinese-community': {
    title: l('중국 한류 뷰티 플랫폼 서비스', 'Beauty platform service for CHINA'),
    role: l(
      'UI 전반 디자인 및 서비스 기획, 프로젝트 총괄',
      'Overall UI design, service planning and project lead',
    ),
    summary: l(
      '한류 뷰티 커뮤니티 플랫폼 서비스 "美丽思密达"',
      'Korean Wave beauty community platform for China, "美丽思密达"',
    ),
    tags: ['commerce', 'ui-design', 'planning'],
    featured: true,
    coverAlt: l(
      '중국 뷰티 플랫폼 – 웹 서비스 대표 이미지',
      'Beauty platform service for CHINA – web service cover image',
    ),
    alts: {
      'meilismd-pc-browser': l(
        '중국 뷰티 플랫폼 – PC 브라우저 메인 화면',
        'Beauty platform service for CHINA – desktop browser main page',
      ),
      'meilismd-pc-browser-mypage': l(
        '중국 뷰티 플랫폼 – PC 브라우저 마이페이지 화면',
        'Beauty platform service for CHINA – desktop browser My Page',
      ),
      'meilismd-ui': l(
        '중국 뷰티 플랫폼 – 웹·모바일 UI 전체 캡처',
        'Beauty platform service for CHINA – full-length capture of the web and mobile UI',
      ),
    },
    pairs: [['meilismd-pc-browser', 'meilismd-pc-browser-mypage']],
    text: l(
      '<p>중국 한류열풍에 가세하여 국내 최고의 성형외과와 의료진 소개하고 한국 뷰티 정보를 제공하는 커뮤니티와 한국 연예 뉴스 등을 제공하는 중국 현지 플랫폼 서비스</p><ul><li>UI 전반 디자인 및 서비스 기획, 프로젝트 총괄 수행</li><li>웹 서비스 + 하이브리드앱 디자인 및 프론트 개발</li><li>그 외 온라인 광고 컨텐츠, 제안서 템플릿 디자인</li></ul><p><a href="http://www.meilismd.com">웹 서비스 바로가기</a></p>',
      '<p>A local platform service for China, riding the Korean Wave: it introduces leading Korean plastic surgery clinics and their medical staff, and offers a community with Korean beauty information plus Korean entertainment news.</p><ul><li>Overall UI design, service planning and project lead</li><li>Web service and hybrid app design, and front-end development</li><li>Online advertising content and proposal template design</li></ul><p><a href="http://www.meilismd.com">Go to the web service</a></p>',
    ),
  },
  cardduck: {
    title: l('Card Duck', 'Card Duck'),
    role: l(
      '데스크탑 및 모바일 UI 디자인 + 프론트 코딩',
      'Desktop and mobile UI design and front-end coding',
    ),
    summary: l(
      '카드 혜택을 비교하여 더 나은 카드를 제공하는 서비스 "카드덕"(Card Duck)',
      'A service that compares credit card benefits to offer better cards: "Card Duck"',
    ),
    tags: ['finance', 'ui-design', 'publishing'],
    featured: true,
    coverAlt: l(
      'Card Duck – 카드 비교 서비스 대표 이미지',
      'Card Duck – card comparison service cover image',
    ),
    alts: {
      'cardduck-pc-main': l(
        'Card Duck – 신용카드 비교 사이트 PC 메인 화면',
        'Card Duck – credit card comparison site, desktop main page',
      ),
      'cardduck-pc-detail': l(
        'Card Duck – 신용카드 비교 사이트 PC 상세 화면',
        'Card Duck – credit card comparison site, desktop detail page',
      ),
      'cardduck-mobile': l(
        'Card Duck – 신용카드 비교 사이트 모바일 화면',
        'Card Duck – credit card comparison site, mobile screens',
      ),
    },
    text: l(
      '<p>플랫폼 전반 브랜딩 디자인 및 서비스 구성 기획 참여</p>',
      '<p>Took part in overall platform branding design and service structure planning.</p>',
    ),
  },
  'bed-mattress-website': {
    title: l('Bed Mattress Website', 'Bed Mattress Website'),
    role: l('데스크탑 UI 디자인 + 웹 퍼블리싱', 'Desktop UI design and web publishing'),
    summary: l(
      '매트리스 수입/병행 기업 "BM Ultra" 웹사이트',
      'Website for BM Ultra, a mattress importer (parallel imports)',
    ),
    tags: ['commerce', 'ui-design', 'publishing'],
    featured: false,
    coverAlt: l(
      'Bed Mattress Website – BM Ultra 메인 화면 대표 이미지',
      'Bed Mattress Website – BM Ultra main page cover image',
    ),
    alts: {
      'bmultra-main': l(
        'Bed Mattress Website – BM Ultra 메인 화면',
        'Bed Mattress Website – BM Ultra main page',
      ),
      'bmultra-sub': l(
        'Bed Mattress Website – BM Ultra 서브 화면',
        'Bed Mattress Website – BM Ultra sub page',
      ),
    },
  },
};

export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];

const ko = {
  'nav.work': '작업',
  'nav.skip': '본문으로 건너뛰기',
  'nav.home': '홈',
  'theme.toggle': '테마 전환',
  'lang.switch': '언어 선택',
  'lang.ko': '한국어',
  'lang.en': 'English',
  'footer.copyright': '© iduk',
  'home.heading': '대표 작업',
  'home.description': '인터페이스와 서비스 화면을 디자인합니다.',
  'notfound.title': '페이지를 찾을 수 없습니다',
  'notfound.body': '주소가 바뀌었거나 없는 페이지입니다.',
  'notfound.home': '홈으로 돌아가기',
} as const;

export type UiKey = keyof typeof ko;

const en: Record<UiKey, string> = {
  'nav.work': 'Work',
  'nav.skip': 'Skip to content',
  'nav.home': 'Home',
  'theme.toggle': 'Toggle theme',
  'lang.switch': 'Language',
  'lang.ko': '한국어',
  'lang.en': 'English',
  'footer.copyright': '© iduk',
  'home.heading': 'Selected Work',
  'home.description': 'Designing interfaces and service screens.',
  'notfound.title': 'Page not found',
  'notfound.body': 'The address has changed or the page does not exist.',
  'notfound.home': 'Back to home',
};

export const ui: Record<Locale, Record<UiKey, string>> = { ko, en };

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://iduk.co.kr',
  output: 'static',
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'auto',
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    syntaxHighlight: 'prism',
  },
  security: {
    // 스크립트·스타일 해시는 Astro가 페이지마다 meta로 넣는다. 아래 지시어도 같은 meta에 들어간다.
    // frame-ancestors는 meta에서 무시되므로(콘솔 경고) 여기에 넣지 않고 vercel.json 헤더에 둔다.
    // default-src는 meta에만 둔다: 헤더에 두면 두 정책의 교집합이라 meta가 허용한 해시된 인라인이 막힌다.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  integrations: [
    sitemap({
      // 404, 데모(/html/), PDF(/files/), OG 이미지는 사이트맵에 넣지 않는다. lastmod는 결정적인 값이 없어 넣지 않는다.
      filter: (page) => !/\/404\/?$|\/html\/|\/files\/|\/og\//.test(new URL(page).pathname),
      i18n: {
        defaultLocale: 'ko',
        locales: { ko: 'ko-KR', en: 'en-US' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
    },
  },
});

// Applies the stored theme before first paint. Loaded as a blocking script in <head>
// (covered by CSP script-src 'self'; no inline code).
(() => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch {}
})();

// Cross-document view transitions can be aborted by the browser (for example "Viewport size changed" when the
// window or DevTools resizes during a navigation). The page still loads normally; handle the rejections so they
// do not pile up as console errors.
for (const type of ['pagereveal', 'pageswap']) {
  addEventListener(type, (e) => {
    const t = e.viewTransition;
    if (t) for (const k of ['ready', 'finished', 'updateCallbackDone']) t[k].catch(() => {});
  });
}

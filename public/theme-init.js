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

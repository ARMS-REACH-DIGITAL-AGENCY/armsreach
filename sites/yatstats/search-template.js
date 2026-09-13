(() => {
  if (window.__yatHomepageLoader) return;
  window.__yatHomepageLoader = true;

  function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    if (onload) script.addEventListener('load', onload, { once: true });
    document.head.appendChild(script);
  }

  loadScript('./homepage-platform-style.js', () => {
    loadScript('./hero-journey.js');
  });
})();

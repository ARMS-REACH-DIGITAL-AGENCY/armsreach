(() => {
  if (window.__yatHomepageLoader) return;
  window.__yatHomepageLoader = true;

  const script = document.createElement('script');
  script.src = './hero-journey.js';
  script.async = false;
  document.head.appendChild(script);
})();

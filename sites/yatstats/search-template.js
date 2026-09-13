(() => {
  if (window.__yatHomepageLoader) return;
  window.__yatHomepageLoader = true;
  const styleScript = document.createElement('script');
  styleScript.src = './homepage-platform-style.js';
  styleScript.async = false;
  document.head.appendChild(styleScript);
  styleScript.onload = () => {
    const tourScript = document.createElement('script');
    tourScript.src = './audience-tours.js';
    tourScript.async = false;
    document.head.appendChild(tourScript);
  };
})();

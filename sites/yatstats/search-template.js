(() => {
  const ORIGINAL_SEARCH = 'https://cdn.jsdelivr.net/gh/ARMS-REACH-DIGITAL-AGENCY/armsreach@55f327fc90fdbe4b21c214bbebf8cc52570c20b6/sites/yatstats/search-template.js';
  const MODAL_SCRIPT = './subdomain-modal.js';

  function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    if (onload) script.addEventListener('load', onload, { once: true });
    document.head.appendChild(script);
  }

  loadScript(ORIGINAL_SEARCH, () => loadScript(MODAL_SCRIPT));
})();

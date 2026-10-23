// Corporate YAT?STATS GA4 measurement. The school microsites use the same
// property but load their own tag from mike_crozite_template.
//
// Only run on the real corporate domain, never on preview deployments. The
// yat_ga_internal cookie is intentionally shared with school microsites so
// Pete's test sessions can be excluded across the entire YAT?STATS network.
(() => {
  'use strict';

  const host = window.location.hostname.toLowerCase();
  if (host !== 'yatstats.com' && host !== 'www.yatstats.com') return;
  if (window.__yatCorporateAnalyticsStarted) return;
  window.__yatCorporateAnalyticsStarted = true;

  const measurementId = 'G-WQHT9SNHLC';

  // Match the school-template controls: ?yat_internal=1 opts this browser
  // out across *.yatstats.com; ?yat_internal=0 removes that exclusion.
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('yat_internal');
    if (mode === '1' || mode === '0') {
      document.cookie =
        'yat_ga_internal=' + (mode === '1' ? '1' : '') +
        ';path=/;max-age=' + (mode === '1' ? '31536000' : '0') +
        ';SameSite=Lax;Secure;domain=.yatstats.com';
      params.delete('yat_internal');
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + (query ? '?' + query : '') + window.location.hash
      );
    }
  } catch (_error) {
    // Tracking must never interfere with the page or navigation.
  }
  if (/(?:^|;\s*)yat_ga_internal=1(?:;|$)/.test(document.cookie)) return;

  const path = window.location.pathname;
  const tour = /^\/(fans|programs|players|partners)\/?$/i.exec(path);
  const audienceRole = tour ? tour[1].toLowerCase() : '';
  const pageType = path === '/' ? 'corporate_home'
    : tour ? 'audience_tour'
    : /^\/partners\/dashboard(?:\/|$)/i.test(path) ? 'partner_portal'
    : /^\/(privacy-policy|terms-and-conditions)\/?$/i.test(path) ? 'legal'
    : 'corporate_content';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // The page_view below is the sole initial page view. GA4 must not send a
  // second automatic one; path and role are included for sponsor reporting.
  window.gtag('config', measurementId, { send_page_view: false });
  window.gtag('event', 'page_view', {
    page_location: window.location.origin + path, // No query tokens or PII.
    page_path: path,
    page_title: document.title,
    page_type: pageType,
    content_group: pageType,
    ...(audienceRole ? { audience_role: audienceRole } : {})
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);

  // One selection event per user click, even though the scrolling homepage
  // ticker renders two copies of each audience link to loop seamlessly.
  if (pageType === 'corporate_home') {
    document.addEventListener('click', (event) => {
      const anchor = event.target && event.target.closest &&
        event.target.closest('a[href]');
      if (!anchor) return;
      let dest;
      try { dest = new URL(anchor.getAttribute('href'), window.location.href); }
      catch (_error) { return; }
      if (dest.origin !== window.location.origin) return;
      const match = /^\/(fans|programs|players|partners)\/?$/i.exec(dest.pathname);
      if (!match) return;
      const role = match[1].toLowerCase();
      window.gtag('event', 'select_content', {
        content_type: 'audience_tour',
        item_id: role,
        audience_role: role,
        page_type: 'corporate_home'
      });
    }, true);
  }
})();

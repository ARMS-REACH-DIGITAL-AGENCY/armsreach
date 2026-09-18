(() => {
  if (window.__yatTourInteractionOverride) return;
  window.__yatTourInteractionOverride = true;

  const PLATFORM_ORIGIN = 'https://hamilton.az.yatstats.com';
  const S3 = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';

  // The iframe starts on Hamilton but can navigate to any other school
  // subdomain (Perry, Basha, ...) via the site's own global search. Messages
  // to/from it must not be pinned to Hamilton's origin specifically or the
  // bridge silently goes dead the moment a visitor searches their way to a
  // different school.
  function trustedMicrositeOrigin(origin) {
    try {
      const host = new URL(origin).hostname;
      return host === 'yatstats.com' || host.endsWith('.yatstats.com');
    } catch (_) {
      return false;
    }
  }
  const CAREER_BG = `${PLATFORM_ORIGIN}/img/career-path-default.png`;
  const HS_BG = `${S3}/players/then/180827.jpg`;
  const NOW_BG = `${S3}/players/now/180827.jpg`;
  const SCHOOL_BG = `${S3}/schools/5004.png`;

  const TOPIC_BACKGROUNDS = {
    'Why YAT?STATS': { src: CAREER_BG, pos: 'center 48%' },
    'Home School': { src: HS_BG, pos: 'center 34%' },
    'Search': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Flip Cards': { src: HS_BG, pos: 'center 28%' },
    'Player Profile': { src: NOW_BG, pos: 'center 28%' },
    'Favorite / Super Fan': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Golden Timeline': { src: CAREER_BG, pos: 'center 50%' },
    'Contribute': { src: HS_BG, pos: 'center 35%' },

    'Your Journey': { src: CAREER_BG, pos: 'center 48%' },
    'Stats + News': { src: NOW_BG, pos: 'center 26%' },
    'Stay Connected': { src: HS_BG, pos: 'center 35%' },

    'The Question': { src: CAREER_BG, pos: 'center 48%' },
    'Your Clubhouse': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Program History': { src: HS_BG, pos: 'center 30%' },
    'ARMS': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Fundraising': { src: HS_BG, pos: 'center 38%' },
    'Sponsors': { src: SCHOOL_BG, pos: '18% 50%', contain: true },

    'Why It Works': { src: HS_BG, pos: 'center 38%' },
    'Sponsor a School': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Brand Alignment': { src: HS_BG, pos: 'center 33%' },
    'Relevant Exposure': { src: NOW_BG, pos: 'center 25%' },
    'ARMS + Leads': { src: SCHOOL_BG, pos: '18% 50%', contain: true },
    'Scale': { src: CAREER_BG, pos: 'center 48%' }
  };

  const TOUR_ACTIONS = {
    'Home School': { action: 'openLogin', selector: '#btnAccount' },
    'Search': { action: 'openSearch', selector: '#openSearch' },
    'Flip Cards': { action: 'flipAll', selector: '#flipAllCards' },
    'Favorite / Super Fan': { action: 'openFavorites', selector: '[data-open-favorites],#openFavorites' },
    'Player Profile': { action: 'openPlayerProfile', selector: '.yat-card[data-playerid="180827"]' },
    'Stats + News': { action: 'openStats', selector: '#ppTab-stats' },
    'Golden Timeline': { action: 'openGoldenTimeline', selector: '#playerCareerImages' },
    'Contribute': { action: 'openUpload', selector: '#ppTab-upload' },
    'Program History': { action: 'openAllTime', selector: '[href="#sec-alltime"]' },
    'Sponsors': { action: 'openPartners', selector: '[href="#sec-partner"]' }
  };

  const style = document.createElement('style');
  style.id = 'yat-tour-interaction-override-style';
  style.textContent = `
    /* Background/person changes dissolve instead of popping between story points. */
    .slide .bg,
    .slide .person{
      transition:opacity .42s ease, filter .42s ease!important;
      will-change:opacity;
    }
    .slide:not(.is-active) .person{opacity:.22!important}
    .slide.is-active .person{opacity:1!important}
    .slide:not(.is-active) .bg{opacity:.62!important}
    .slide.is-active .bg{opacity:1!important}
    .slide .bg.topic-contain{
      object-fit:contain!important;
      background:radial-gradient(circle at 19% 50%,rgba(122,31,43,.28),transparent 34%),#101214!important;
      padding:18px 58% 18px 2%!important;
      filter:brightness(.72) saturate(.9)!important;
    }
    @media (prefers-reduced-motion: reduce){
      .slide .bg,.slide .person{transition:none!important}
    }
  `;
  document.head.appendChild(style);

  function waitForTour(attempt = 0) {
    const track = document.getElementById('track');
    const frame = document.getElementById('frame');
    const stage = document.getElementById('stage');
    const loader = document.getElementById('loader');
    const url = document.getElementById('url');
    const label = document.getElementById('label');
    if (!track || !frame || !stage || !loader || !url || !label) {
      if (attempt < 180) window.setTimeout(() => waitForTour(attempt + 1), 40);
      return;
    }
    install(track, frame, stage, loader, url, label);
  }

  function install(track, frame, stage, loader, url, label) {
    if (track.dataset.tourBehavior === '1') return;
    track.dataset.tourBehavior = '1';

    const slides = [...track.querySelectorAll('.slide')];
    const progress = [...document.querySelectorAll('.progress button')];
    let active = -1;
    let syncTimer = 0;
    let bridgeReady = false;

    /* Assign a topic-specific visual bed to each stop now, while keeping the assets swappable later. */
    slides.forEach((slide) => {
      const topic = slide.querySelector('.cap')?.textContent?.trim() || '';
      const bg = slide.querySelector('.bg');
      const config = TOPIC_BACKGROUNDS[topic];
      if (!bg || !config) return;
      bg.src = config.src;
      bg.style.objectPosition = config.pos || 'center center';
      bg.classList.toggle('topic-contain', !!config.contain);
    });

    /*
      Keep the live Hamilton iframe stable. The original tour swaps frame.src whenever
      the stop URL changes; that is what caused the visible reload from slide 3 -> 4.
      Intercept subsequent .src assignments and preserve the current DOM/session state.
    */
    const nativeSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    if (nativeSrc?.get && nativeSrc?.set) {
      try {
        Object.defineProperty(frame, 'src', {
          configurable: true,
          enumerable: true,
          get() { return nativeSrc.get.call(frame); },
          set(requested) {
            frame.dataset.requestedUrl = String(requested || '');
            loader.classList.add('hidden');
            /* Deliberately do not call the native setter: no navigation, no reload. */
          }
        });
      } catch (_) {}
    }

    // device-preview-override.js, always loaded right after this script on
    // every page, owns .stage entirely -- its own fit/zoom/pan system
    // computes exact rounded pixel positioning. This older reanchor loop
    // pre-dates that and fought it: a MutationObserver reactively rewrote
    // any style change back to a translateX(-50%)-based transform a frame
    // later, permanently winning the fight (it's reactive, so it always
    // gets the last word) and silently undoing the newer positioning --
    // and any pinch-zoom pan -- on every update. A flag-based guard here
    // does not work either: this script's own install() resolves
    // synchronously (the DOM is already built by the time it runs), before
    // device-preview-override.js's script tag has even executed to set
    // that flag. Since the two scripts are never loaded without each
    // other, this whole mechanism is simply removed rather than gated.

    function sendTourAction(index) {
      const slide = slides[index];
      if (!slide) return;
      const topic = slide.querySelector('.cap')?.textContent?.trim() || '';
      const command = TOUR_ACTIONS[topic];
      const payload = {
        source: 'yatstats-corporate-tour',
        type: 'YAT_TOUR_ACTION',
        topic,
        action: command?.action || 'highlightOnly',
        selector: command?.selector || null,
        bridgeReady
      };
      try { frame.contentWindow?.postMessage(payload, '*'); } catch (_) {}
    }

    function syncActive(index) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      if (index === active) return;
      active = index;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === active));

      /* The iframe remains on its current page; the laser/callout tells the user where to act. */
      url.textContent = 'hamilton.az.yatstats.com';
      loader.classList.add('hidden');
      sendTourAction(active);
    }

    function activeFromProgress() {
      const i = progress.findIndex((button) => button.classList.contains('active'));
      if (i >= 0) syncActive(i);
    }

    const progressObserver = new MutationObserver(() => activeFromProgress());
    progress.forEach((button) => progressObserver.observe(button, { attributes: true, attributeFilter: ['class'] }));

    track.addEventListener('scroll', () => {
      clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        syncActive(i);
      }, 95);
    }, { passive: true });

    window.addEventListener('message', (event) => {
      if (!trustedMicrositeOrigin(event.origin)) return;
      if (event.data?.type === 'YAT_TOUR_ACK') bridgeReady = true;
    });

    // Same reasoning as device-preview-override.js's own retry loop: the
    // framed page's bridge only starts listening once its React app has
    // hydrated, which lags the browser's 'load' event, especially right
    // after a fresh cross-origin navigation. Retry until confirmed rather
    // than risk a single dropped HELLO leaving bridgeReady stuck false.
    let helloRetryTimer = null;
    frame.addEventListener('load', () => {
      loader.classList.add('hidden');
      bridgeReady = false;
      clearInterval(helloRetryTimer); // A prior in-flight retry loop must not keep running (or pile up) past this new load.
      const attempt = () => {
        try {
          frame.contentWindow?.postMessage({source:'yatstats-corporate-tour',type:'YAT_TOUR_HELLO'}, '*');
        } catch (_) {}
      };
      attempt();
      let attempts = 0;
      // Widened to match device-preview-override.js's own retry window: a
      // cold serverless start on a school subdomain that hasn't been hit
      // recently can take several seconds before any JS reaches the browser,
      // well past what hydration lag alone would need.
      helloRetryTimer = setInterval(() => {
        attempts++;
        if (bridgeReady || attempts >= 75) { clearInterval(helloRetryTimer); return; }
        attempt();
      }, 400);
    });

    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === 0));
    syncActive(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForTour(), { once: true });
  } else {
    waitForTour();
  }
})();
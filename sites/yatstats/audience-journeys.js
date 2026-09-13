// Four audience-specific guided tours (Fan, Coach, Player, Sponsor).
// The tour strip is modeled directly on the real "Golden Line" career-strip
// component from the microsite (mike_crozite_template's CareerStrip.tsx /
// ZoomableCareerTimeline.tsx): a compact row of small photo+label cards that
// scrolls horizontally and keeps growing with more entries — not a paginated
// full-screen carousel. Clicking (or auto-advancing to) a card drives the
// static live iframe below it; the iframe area itself never moves or scrolls.
// The Fan tour keeps the original hero placement (eager-loaded, already tuned
// hotspots); Coach / Player / Sponsor are standalone sections lower on the
// page and lazy-load their iframe only once scrolled into view.
(() => {
  if (window.__yatAudienceJourneys) return;
  window.__yatAudienceJourneys = true;

  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const TOUR_MS = 6000;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Cody Bellinger is a known Hamilton alumni record used as a stable tour example.
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;

  // A small pool of real photography already used elsewhere on this site.
  // Reused across cards/sections as a placeholder — swap in real per-stop
  // photography once available.
  const IMG_PITCHER = `${PLATFORM}/img/career-path-default.png`;
  const IMG_CARD_GALLERY = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69d3e9436ea2b5d7c0c73155.jpg';
  const IMG_FANS = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5fab618c8d2e6017c698.png';
  const IMG_FIELD = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5f8c7bdf3880b88d573f.png';

  // ── CSS — the card strip is a close match to CareerStrip.tsx's real
  // .golden-line-strip / .gl-card styling (colors, proportions, gold glow
  // line), so this reads as "the same component" rather than a new one.
  const css = `
    .yat-tour{position:relative;width:min(1400px,calc(100% - 34px));margin:34px auto 0}
    .yat-audience-section .yat-tour{width:100%;margin:0}
    .yat-audience-section{overflow:hidden}

    .yat-gl-strip{position:relative;height:132px;overflow:hidden;isolation:isolate;background:linear-gradient(90deg,rgba(16,16,16,.98),rgba(8,8,8,.98));border:1px solid #2d3136;border-bottom:0;border-radius:14px 14px 0 0}
    .yat-gl-line{position:absolute;left:18px;right:18px;bottom:9px;z-index:1;height:3px;background:linear-gradient(90deg,rgba(245,165,51,.12),#f5a533 16%,#ffc947 52%,#f5a533 100%);box-shadow:0 0 7px rgba(255,207,62,.85),0 0 18px rgba(255,180,32,.48);pointer-events:none}
    .yat-gl-track-wrap{position:relative;z-index:2;height:100%;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;padding:16px 18px}
    .yat-gl-track-wrap::-webkit-scrollbar{display:none}
    .yat-gl-track{height:100%;display:flex;align-items:stretch;gap:10px}
    .yat-gl-card{position:relative;flex:0 0 132px;display:grid;grid-template-columns:56px minmax(0,1fr);align-items:stretch;width:132px;padding:4px;border:1px solid rgba(255,255,255,.18);border-radius:0;background:linear-gradient(135deg,rgba(29,29,29,.98),rgba(7,7,7,.92));color:#fff;text-align:left;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.34);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
    .yat-gl-card:hover{transform:translateY(-2px) scale(1.01);border-color:rgba(245,200,90,.7)}
    .yat-gl-card.active{border-color:#f5c85a;box-shadow:0 0 18px rgba(245,200,90,.32),0 10px 24px rgba(0,0,0,.5);transform:translateY(-2px)}
    .yat-gl-photo{display:block;width:54px;height:92px;overflow:hidden;border:1px solid rgba(245,200,90,.5);background:#111}
    .yat-gl-photo img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
    .yat-gl-copy{min-width:0;padding:4px 1px 3px 6px;align-self:stretch;display:flex;flex-direction:column}
    .yat-gl-kicker,.yat-gl-label,.yat-gl-hint{display:block;overflow:hidden;text-overflow:ellipsis}
    .yat-gl-kicker{white-space:nowrap;color:#f5c85a;font:800 8px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase}
    .yat-gl-label{margin-top:4px;white-space:nowrap;color:#fff;font:800 12px/1 "Bebas Neue",Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase}
    .yat-gl-hint{margin-top:auto;white-space:normal;overflow-wrap:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:rgba(255,255,255,.68);font:700 8px/1.2 Inter,sans-serif}

    .yat-live-platform{position:relative;border:1px solid #35393e;border-radius:0 0 14px 14px;overflow:hidden;background:#0b0d0e;box-shadow:0 26px 70px rgba(0,0,0,.42)}
    .yat-live-platform.expanded{position:fixed;z-index:99998;inset:10px;margin:0;border-radius:12px;display:grid;grid-template-rows:auto 1fr auto;background:#090a0b}
    body.yat-live-preview-lock{overflow:hidden}
    .yat-live-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px 10px 8px 13px;min-height:44px;border-bottom:1px solid #292d31;background:linear-gradient(180deg,#141618,#0e1011)}
    .yat-live-address{min-width:0;display:flex;align-items:center;gap:9px}.yat-live-dots{display:flex;gap:4px;flex:0 0 auto}.yat-live-dots i{display:block;width:6px;height:6px;border-radius:50%;background:#3c4146}.yat-live-dots i:nth-child(2){background:#785d20}.yat-live-dots i:nth-child(3){background:#6f2630}
    .yat-live-url{min-width:0;color:#777c82;font-size:.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yat-live-url strong{color:#cacdd0;margin-right:6px}
    .yat-live-actions{display:flex;gap:6px;flex:0 0 auto}.yat-live-action{display:inline-flex;align-items:center;justify-content:center;min-height:29px;padding:0 9px;border:1px solid #30343a;border-radius:6px;background:#17191c;color:#c8cbce;font:800 8px/1 Inter,sans-serif;text-decoration:none;cursor:pointer}.yat-live-action:hover{border-color:#645124;color:#efc454}.yat-live-close{display:none}.yat-live-platform.expanded .yat-live-close{display:inline-flex}
    .yat-live-frame-wrap{position:relative;width:100%;height:min(68vh,675px);background:#fff}.yat-live-platform.expanded .yat-live-frame-wrap{height:auto;min-height:0}
    .yat-live-loading{position:absolute;z-index:4;inset:0;display:grid;place-items:center;background:#0b0d0e;color:#878c91;font:700 9px/1.4 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;transition:opacity .2s ease}.yat-live-loading.hidden{opacity:0;pointer-events:none}.yat-live-loading span:before{content:"";display:block;width:23px;height:23px;margin:0 auto 10px;border:2px solid #33373c;border-top-color:#efb936;border-radius:50%;animation:yatSpin .8s linear infinite}@keyframes yatSpin{to{transform:rotate(360deg)}}
    .yat-live-frame{position:relative;z-index:2;width:100%;height:100%;border:0;background:#fff;opacity:0;transition:opacity .2s ease}.yat-live-frame.loaded{opacity:1}
    .yat-live-callout{position:absolute;z-index:5;left:var(--tour-x,90%);top:var(--tour-y,10%);transform:translate(-50%,-50%);pointer-events:none;transition:left .45s ease,top .45s ease,opacity .25s ease;filter:drop-shadow(0 7px 15px rgba(0,0,0,.35))}.yat-live-callout-dot{width:15px;height:15px;border:2px solid #111;border-radius:50%;background:#f5bd38;box-shadow:0 0 0 6px rgba(245,189,56,.25),0 0 0 13px rgba(245,189,56,.09);animation:yatPulse 1.7s ease-in-out infinite}.yat-live-callout-label{position:absolute;left:22px;top:50%;transform:translateY(-50%);white-space:nowrap;padding:6px 8px;border:1px solid rgba(245,189,56,.5);border-radius:6px;background:rgba(8,9,10,.90);color:#f6ca60;font:900 7px/1 Inter,sans-serif;letter-spacing:.09em;text-transform:uppercase}@keyframes yatPulse{50%{box-shadow:0 0 0 9px rgba(245,189,56,.18),0 0 0 18px rgba(245,189,56,.03)}}
    .yat-live-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:8px 12px;border-top:1px solid #292d31;background:#0d0f10;color:#6f747a;font-size:.58rem}.yat-live-footer strong{color:#aeb2b6}.yat-live-footer em{font-style:normal;color:#cba744}

    @media(max-width:980px){
      .yat-tour{width:min(100% - 24px,1400px);margin-top:25px}
      .yat-audience-section .yat-tour{width:100%;margin-top:0}
      .yat-live-frame-wrap{height:68vh;min-height:540px}.yat-live-action.open-full{display:none}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:620px){
      .yat-tour{width:calc(100% - 18px)}
      .yat-audience-section .yat-tour{width:100%}
      .yat-gl-strip{height:118px}.yat-gl-card{flex-basis:112px;width:112px}.yat-gl-photo{width:46px;height:80px}
      .yat-live-url{max-width:47vw}.yat-live-frame-wrap{height:66vh;min-height:510px}.yat-live-footer{align-items:flex-start;flex-direction:column;gap:3px}.yat-live-callout-label{display:none}
    }
  `;

  const style = document.createElement('style');
  style.id = 'yat-audience-journeys-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ── Tour content, one dataset per audience ─────────────────────────────
  // Photos are reused from the site's existing image pool (placeholder —
  // swap in dedicated photography per stop). Hotspot x/y on the callout dot
  // are approximate on every stop except Fan's, which were tuned against
  // real screenshots of the live site.

  const fanTour = {
    id: 'fan', kicker: 'Test drive the platform',
    stops: [
      { image: IMG_PITCHER, label: 'Search', hint: 'Find anybody, from anywhere in the network.', url: PLATFORM, callout: 'GLOBAL SEARCH', x: 91, y: 7 },
      { image: IMG_FANS, label: 'Filter', hint: 'Sort by name, level, class and favorites.', url: PLATFORM, callout: 'SORT + FILTER', x: 87, y: 13 },
      { image: IMG_CARD_GALLERY, label: 'Cards', hint: 'Flip a card for current production.', url: CODY_CARD, callout: 'TAP / FLIP A PLAYER CARD', x: 22, y: 43 },
      { image: IMG_FIELD, label: 'Stats', hint: 'Production stays attached to home.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { image: IMG_PITCHER, label: 'News', hint: 'Milestones and roster moves, live.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { image: IMG_FANS, label: 'Line', hint: 'High school through the pros, one line.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, label: 'Memory', hint: 'Fans help document the journey.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const coachTour = {
    id: 'coach', alt: false, kicker: 'For coaches & boosters',
    stops: [
      { image: IMG_FIELD, label: 'Home', hint: 'A living alumni home for the program.', url: PLATFORM, callout: 'YOUR PROGRAM COMMUNITY', x: 50, y: 10 },
      { image: IMG_CARD_GALLERY, label: 'Roster', hint: 'Every era of the program, one place.', url: `${PLATFORM}/?view=active`, callout: 'ACTIVE ALUMNI GALLERY', x: 50, y: 50 },
      { image: IMG_PITCHER, label: 'Flip', hint: 'Show where a former player is now.', url: CODY_CARD, callout: 'FLIP A PLAYER CARD', x: 22, y: 43 },
      { image: IMG_FANS, label: 'Engage', hint: 'Reasons to check in before you ask.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'ALUMNI NEWS & UPDATES', x: 50, y: 79 },
      { image: IMG_FIELD, label: 'Legacy', hint: 'Championships and memories, preserved.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, label: 'Backer', hint: 'A stronger pitch than another banner.', url: PLATFORM, callout: 'SPONSOR-READY COMMUNITY', x: 85, y: 14 },
    ],
  };

  const playerTour = {
    id: 'player', alt: true, kicker: 'For players & alumni',
    stops: [
      { image: IMG_PITCHER, label: 'Career', hint: 'One profile follows the whole journey.', url: CODY_PROFILE, callout: 'PLAYER PROFILE', x: 50, y: 14 },
      { image: IMG_FIELD, label: 'Stats', hint: 'Production stays attached to home.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { image: IMG_FANS, label: 'Line', hint: 'Build the record a stat sheet can’t.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, label: 'Flip', hint: 'The hometown image never disappears.', url: CODY_CARD, callout: 'FLIP YOUR PLAYER CARD', x: 22, y: 43 },
      { image: IMG_PITCHER, label: 'News', hint: 'Share milestones with people who care.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { image: IMG_FIELD, label: 'Memory', hint: 'Playing ends. The identity doesn’t.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const sponsorTour = {
    id: 'sponsor', alt: false, kicker: 'For local partners',
    stops: [
      { image: IMG_FANS, label: 'People', hint: 'Real hometown attention, already there.', url: PLATFORM, callout: 'AN ACTIVE HOMETOWN COMMUNITY', x: 50, y: 10 },
      { image: IMG_PITCHER, label: 'Legacy', hint: 'Nostalgia is an engagement engine.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, label: 'Reach', hint: 'Put your brand inside the community.', url: `${PLATFORM}/?view=active`, callout: 'WHERE YOUR BRAND WOULD APPEAR', x: 50, y: 50 },
      { image: IMG_FIELD, label: 'Player', hint: 'A real alumni community, not a mockup.', url: CODY_CARD, callout: 'A REAL PLAYER, NOT A MOCKUP', x: 22, y: 43 },
      { image: IMG_FANS, label: 'Value', hint: 'More than a booster donation.', url: PLATFORM, callout: 'A STRONGER LOCAL OFFER', x: 85, y: 14 },
      { image: IMG_PITCHER, label: 'Scale', hint: 'One school is the proof, not the ceiling.', url: PLATFORM, callout: 'ONE OF THOUSANDS OF PROGRAMS', x: 70, y: 65 },
    ],
  };

  // ── Shared engine ────────────────────────────────────────────────────────

  function buildTourMarkup(tour) {
    return `
      <div class="yat-gl-strip" role="region" aria-label="${tour.kicker} tour">
        <div class="yat-gl-line" aria-hidden="true"></div>
        <div class="yat-gl-track-wrap">
          <div class="yat-gl-track" role="list">
            ${tour.stops.map((stop, index) => `
              <button type="button" class="yat-gl-card${index === 0 ? ' active' : ''}" role="listitem" data-index="${index}" aria-label="${stop.label}">
                <span class="yat-gl-photo"><img src="${stop.image}" alt="" loading="lazy"></span>
                <span class="yat-gl-copy">
                  <span class="yat-gl-kicker">${String(index + 1).padStart(2, '0')}</span>
                  <span class="yat-gl-label">${stop.label}</span>
                  <span class="yat-gl-hint">${stop.hint}</span>
                </span>
              </button>`).join('')}
          </div>
        </div>
      </div>
      <div class="yat-live-platform">
        <div class="yat-live-bar">
          <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
          <div class="yat-live-actions"><button type="button" class="yat-live-action yat-live-expand">Expand</button><a class="yat-live-action open-full yat-live-open" href="${PLATFORM}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close">Close</button></div>
        </div>
        <div class="yat-live-frame-wrap">
          <div class="yat-live-loading"><span>Loading the live community</span></div>
          <iframe class="yat-live-frame" title="Live YAT?STATS ${tour.kicker} tour" loading="lazy" allow="fullscreen; autoplay; clipboard-write"></iframe>
          <div class="yat-live-callout" aria-hidden="true"><div class="yat-live-callout-dot"></div><div class="yat-live-callout-label"></div></div>
        </div>
        <div class="yat-live-footer"><span><strong>LIVE PLATFORM:</strong> everything inside the frame is the real Hamilton subdomain.</span><span><em>Tour stops change the live view. You can interact with it at any time.</em></span></div>
      </div>`;
  }

  // Wires one mounted tour block's interactivity. The card strip itself is a
  // plain, continuously scrollable row (no snapping) — exactly like the real
  // Golden Line strip — so clicking a card (or the auto-advance timer) is the
  // single source of truth for which stop is "active", driving the card
  // highlight and the STATIC iframe below it. The iframe area never scrolls
  // or changes shape; only its content and the active card change.
  // `lazy` defers the first iframe load (and the auto-advance timer) until
  // the block scrolls into view, and pauses the timer again once it scrolls out.
  function wireTour(container, tour, { lazy = false } = {}) {
    const cards = [...container.querySelectorAll('.yat-gl-card')];
    const frame = container.querySelector('.yat-live-frame');
    const loader = container.querySelector('.yat-live-loading');
    const urlLabel = container.querySelector('.yat-live-url');
    const openFull = container.querySelector('.yat-live-open');
    const callout = container.querySelector('.yat-live-callout');
    const calloutLabel = container.querySelector('.yat-live-callout-label');
    const liveShell = container.querySelector('.yat-live-platform');
    const frameWrap = container.querySelector('.yat-live-frame-wrap');
    const expand = container.querySelector('.yat-live-expand');
    const close = container.querySelector('.yat-live-close');

    let activeIndex = 0;
    let interacted = false;
    let started = false;
    let tourTimer = null;
    let lastUrl = '';

    function pauseTour() {
      interacted = true;
      if (tourTimer) clearInterval(tourTimer);
      tourTimer = null;
    }

    function startTimer() {
      if (reducedMotion || interacted || tourTimer) return;
      tourTimer = setInterval(() => applyStop((activeIndex + 1) % tour.stops.length), TOUR_MS);
    }

    function applyStop(index, userInitiated = false) {
      const stop = tour.stops[index];
      if (!stop) return;
      activeIndex = index;
      if (userInitiated) pauseTour();

      cards.forEach((card, i) => {
        const isActive = i === index;
        card.classList.toggle('active', isActive);
        if (isActive) card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
      });

      calloutLabel.textContent = stop.callout;
      callout.style.setProperty('--tour-x', `${stop.x}%`);
      callout.style.setProperty('--tour-y', `${stop.y}%`);

      openFull.href = stop.url;
      try {
        const parsed = new URL(stop.url);
        urlLabel.innerHTML = `<strong>LIVE YAT?STATS</strong>${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.hash || ''}`;
      } catch {}

      if (lastUrl !== stop.url) {
        lastUrl = stop.url;
        loader.classList.remove('hidden');
        frame.classList.remove('loaded');
        frame.src = stop.url;
      }
    }

    function begin() {
      if (started) return;
      started = true;
      applyStop(0);
      startTimer();
    }

    cards.forEach((card) => card.addEventListener('click', () => { begin(); applyStop(Number(card.dataset.index), true); }));
    frame.addEventListener('load', () => { loader.classList.add('hidden'); frame.classList.add('loaded'); });
    frameWrap.addEventListener('pointerenter', () => pauseTour());
    frameWrap.addEventListener('touchstart', () => pauseTour(), { passive: true });

    expand.addEventListener('click', () => {
      begin();
      pauseTour();
      liveShell.classList.add('expanded');
      document.body.classList.add('yat-live-preview-lock');
      close.focus();
    });
    close.addEventListener('click', () => {
      liveShell.classList.remove('expanded');
      document.body.classList.remove('yat-live-preview-lock');
      expand.focus();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && liveShell.classList.contains('expanded')) {
        liveShell.classList.remove('expanded');
        document.body.classList.remove('yat-live-preview-lock');
        expand.focus();
      }
    });

    if (!lazy) {
      begin();
      return;
    }

    if (!('IntersectionObserver' in window)) { begin(); return; }
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          begin();
          startTimer();
        } else if (tourTimer) {
          clearInterval(tourTimer);
          tourTimer = null;
        }
      });
    }, { threshold: 0.15, rootMargin: '120px 0px' });
    visibilityObserver.observe(liveShell);
  }

  function mountFanTour() {
    const oldSearch = document.getElementById('global-search');
    if (!oldSearch || document.getElementById('yat-guided-tour')) return;
    const tour = document.createElement('section');
    tour.id = 'yat-guided-tour';
    tour.className = 'yat-tour';
    tour.innerHTML = buildTourMarkup(fanTour);
    oldSearch.insertAdjacentElement('afterend', tour);
    wireTour(tour, fanTour, { lazy: false });
    return tour;
  }

  function mountAudienceSection(tour, afterEl) {
    if (document.getElementById(`audience-${tour.id}`)) return;
    const section = document.createElement('section');
    section.id = `audience-${tour.id}`;
    section.className = `section yat-audience-section${tour.alt ? ' alt' : ''}`;
    section.innerHTML = `<div class="shell">${buildTourMarkup(tour)}</div>`;
    afterEl.insertAdjacentElement('afterend', section);
    wireTour(section, tour, { lazy: true });
    return section;
  }

  function init() {
    const fanSection = mountFanTour();
    const anchor = fanSection || document.getElementById('global-search');
    if (!anchor) return;
    let last = anchor;
    [coachTour, playerTour, sponsorTour].forEach((tour) => {
      const mounted = mountAudienceSection(tour, last);
      if (mounted) last = mounted;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

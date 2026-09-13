// Four audience-specific guided tours (Fan, Coach, Player, Sponsor).
// Each is the same engine instantiated once per audience: a swipeable photo +
// quote carousel IS the tour narration — no separate intro text, tab row, or
// caption card — and whichever slide is active drives the live iframe below
// it to the matching page on the real Hamilton subdomain. The Fan tour keeps
// the original hero placement (eager-loaded, already tuned hotspots); Coach /
// Player / Sponsor are standalone sections lower on the page and lazy-load
// their iframe only once scrolled into view.
(() => {
  if (window.__yatAudienceJourneys) return;
  window.__yatAudienceJourneys = true;

  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const TOUR_MS = 7000;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Cody Bellinger is a known Hamilton alumni record used as a stable tour example.
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;

  // A small pool of real photography already used elsewhere on this site.
  // Reused across slides/sections as a placeholder — swap in real photography
  // per stop once available.
  const IMG_PITCHER = `${PLATFORM}/img/career-path-default.png`;
  const IMG_CARD_GALLERY = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69d3e9436ea2b5d7c0c73155.jpg';
  const IMG_FANS = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5fab618c8d2e6017c698.png';
  const IMG_FIELD = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5f8c7bdf3880b88d573f.png';

  const css = `
    .yat-tour{position:relative;width:min(1400px,calc(100% - 34px));margin:34px auto 0}
    .yat-audience-section .yat-tour{width:100%;margin:0}
    .yat-audience-section{overflow:hidden}

    .yat-story-wrap{position:relative}
    .yat-story-strip{position:relative;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border:1px solid #2d3136;border-radius:14px 14px 0 0;background:#0b0d0e}
    .yat-story-strip::-webkit-scrollbar{display:none}
    .yat-story-slide{flex:0 0 100%;min-width:0;scroll-snap-align:start;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);min-height:360px}
    .yat-story-photo{position:relative;overflow:hidden;background:#111;min-width:0}
    .yat-story-photo img{width:100%;height:100%;object-fit:cover;display:block}
    .yat-story-copy{display:flex;flex-direction:column;justify-content:center;gap:14px;padding:clamp(26px,4vw,44px);min-width:0;max-width:100%}
    .yat-story-kicker{margin:0;color:#e8b73f;font:900 10px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
    .yat-story-copy blockquote{margin:0;max-width:100%;overflow-wrap:break-word;font:800 clamp(1.35rem,2.6vw,2.2rem)/1.2 Manrope,Inter,sans-serif;letter-spacing:-.02em;color:#f3f4f5}
    .yat-story-copy mark{background:linear-gradient(135deg,#efb936,#ffd76a);color:#14171a;padding:1px 8px;border-radius:5px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
    .yat-story-sub{margin:0;color:#9199a1;font-size:.85rem;line-height:1.55;max-width:48ch;overflow-wrap:break-word}
    .yat-story-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(5,7,8,.65);color:#fff;font-size:1.1rem;line-height:1;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(6px)}
    .yat-story-nav:hover{border-color:#efb936;color:#efb936}
    .yat-story-nav.prev{left:14px}.yat-story-nav.next{right:14px}
    .yat-story-dots{display:flex;justify-content:center;gap:7px;padding:12px;background:#101214;border:1px solid #2d3136;border-top:0}
    .yat-story-dot{width:7px;height:7px;border-radius:50%;background:#2d3136;border:0;cursor:pointer;padding:0}
    .yat-story-dot.active{background:#efb936;width:20px;border-radius:4px}

    .yat-live-platform{position:relative;border:1px solid #35393e;border-top:0;border-radius:0 0 14px 14px;overflow:hidden;background:#0b0d0e;box-shadow:0 26px 70px rgba(0,0,0,.42);margin-top:-1px}
    .yat-live-platform.expanded{position:fixed;z-index:99998;inset:10px;margin:0;border-radius:12px;border-top:1px solid #35393e;display:grid;grid-template-rows:auto 1fr auto;background:#090a0b}
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
      .yat-story-slide{grid-template-columns:minmax(0,1fr);min-height:0}
      .yat-story-photo{height:44vw;min-height:190px;max-height:320px}
      .yat-live-frame-wrap{height:68vh;min-height:540px}.yat-live-action.open-full{display:none}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:620px){
      .yat-tour{width:calc(100% - 18px)}
      .yat-audience-section .yat-tour{width:100%}
      .yat-story-photo{height:52vw;min-height:0}
      .yat-story-nav{width:32px;height:32px;font-size:.95rem}
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
      { image: IMG_PITCHER, quote: 'When a baseball player’s journey doesn’t end at graduation, <mark>neither should his story.</mark>', sub: 'Tap the search icon to find anyone in the entire YAT?STATS network.', url: PLATFORM, callout: 'GLOBAL SEARCH', x: 91, y: 7 },
      { image: IMG_FANS, quote: 'A big alumni list only helps if <mark>you can actually find your guy.</mark>', sub: 'Sort and filter the gallery by name, level, graduating class and favorites.', url: PLATFORM, callout: 'SORT + FILTER', x: 87, y: 13 },
      { image: IMG_CARD_GALLERY, quote: 'Every alumni card has <mark>another side.</mark>', sub: 'Flip a player card to move from the high-school story to current production.', url: CODY_CARD, callout: 'TAP / FLIP A PLAYER CARD', x: 22, y: 43 },
      { image: IMG_FIELD, quote: 'Stats tell you what happened. <mark>They don’t have to lose where it started.</mark>', sub: 'Current production stays attached to the hometown identity.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { image: IMG_PITCHER, quote: 'The story <mark>keeps moving</mark> between the box scores.', sub: 'Player news follows milestones and roster moves as they happen.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { image: IMG_FANS, quote: 'Stats tell you what happened. <mark>Memories tell you why it mattered.</mark>', sub: 'The Golden Timeline follows a player from high school through the pros.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, quote: 'The people who lived it <mark>can help preserve it.</mark>', sub: 'Fans, family and teammates can add photos and memories to a player’s journey.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const coachTour = {
    id: 'coach', alt: false, kicker: 'For coaches & boosters',
    stops: [
      { image: IMG_FIELD, quote: 'Your former players are already a community — <mark>scattered across old spreadsheets and group texts.</mark>', sub: 'Give the program a living alumni home instead.', url: PLATFORM, callout: 'YOUR PROGRAM COMMUNITY', x: 50, y: 10 },
      { image: IMG_CARD_GALLERY, quote: 'Every era of the program, <mark>one gallery.</mark>', sub: 'Alumni tracking organized around your school, not scattered across whichever team a player is on now.', url: `${PLATFORM}/?view=active`, callout: 'ACTIVE ALUMNI GALLERY', x: 50, y: 50 },
      { image: IMG_PITCHER, quote: 'Show boosters and families <mark>where a former player is now.</mark>', sub: 'Flip a card from the high-school story to current college or pro production.', url: CODY_CARD, callout: 'FLIP A PLAYER CARD', x: 22, y: 43 },
      { image: IMG_FANS, quote: 'Stay relevant <mark>before you ask for anything.</mark>', sub: 'Milestones and updates give alumni and families a reason to keep checking in.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'ALUMNI NEWS & UPDATES', x: 50, y: 79 },
      { image: IMG_FIELD, quote: 'Championships, coaches and memories — <mark>preserved on one timeline.</mark>', sub: 'The Golden Timeline carries the program’s history forward with every player.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, quote: 'A stronger pitch than <mark>another banner.</mark>', sub: 'A sponsor-ready community gives local partners a more meaningful offer.', url: PLATFORM, callout: 'SPONSOR-READY COMMUNITY', x: 85, y: 14 },
    ],
  };

  const playerTour = {
    id: 'player', alt: true, kicker: 'For players & alumni',
    stops: [
      { image: IMG_PITCHER, quote: 'High school is the anchor. <mark>It’s not the ceiling.</mark>', sub: 'One profile follows your journey through college, pro ball and beyond.', url: CODY_PROFILE, callout: 'PLAYER PROFILE', x: 50, y: 14 },
      { image: IMG_FIELD, quote: 'Current production <mark>stays attached to home.</mark>', sub: 'Fans who knew you before college or pro ball can still follow what you’re doing now.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { image: IMG_FANS, quote: 'Build the record <mark>a stat sheet can’t.</mark>', sub: 'Photos and milestones from every stage of the journey live on the Golden Timeline.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, quote: 'The hometown image <mark>never disappears.</mark>', sub: 'Your card flips from the high-school story to what you’re doing right now.', url: CODY_CARD, callout: 'FLIP YOUR PLAYER CARD', x: 22, y: 43 },
      { image: IMG_PITCHER, quote: 'Share milestones with <mark>the people who already care.</mark>', sub: 'Hometown fans and former teammates follow along without hunting across unrelated feeds.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { image: IMG_FIELD, quote: 'Playing ends. <mark>The alumni identity doesn’t.</mark>', sub: 'Add your own photos and memories to the profile the program keeps.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const sponsorTour = {
    id: 'sponsor', alt: false, kicker: 'For local partners',
    stops: [
      { image: IMG_FANS, quote: 'Parents, alumni and former teammates already care — <mark>because these are their people.</mark>', sub: 'Back a hometown community that already has real attention.', url: PLATFORM, callout: 'AN ACTIVE HOMETOWN COMMUNITY', x: 50, y: 10 },
      { image: IMG_PITCHER, quote: 'Nostalgia isn’t decoration. <mark>It’s an engagement engine.</mark>', sub: 'The Golden Timeline surfaces exactly the memories that make a sponsor message land.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { image: IMG_CARD_GALLERY, quote: 'Put your brand <mark>inside the community.</mark>', sub: 'Appear around the alumni, players and stories people already value.', url: `${PLATFORM}/?view=active`, callout: 'WHERE YOUR BRAND WOULD APPEAR', x: 50, y: 50 },
      { image: IMG_FIELD, quote: 'Real players. <mark>Not a mockup.</mark>', sub: 'Every flipped card is a reminder this is a real alumni community.', url: CODY_CARD, callout: 'A REAL PLAYER, NOT A MOCKUP', x: 22, y: 43 },
      { image: IMG_FANS, quote: 'More than <mark>a booster donation.</mark>', sub: 'Fund a useful platform and earn measurable hometown exposure in return.', url: PLATFORM, callout: 'A STRONGER LOCAL OFFER', x: 85, y: 14 },
      { image: IMG_PITCHER, quote: 'One school is the proof. <mark>Not the ceiling.</mark>', sub: 'The same sponsorship model can extend to every program that activates YAT?STATS.', url: PLATFORM, callout: 'ONE OF THOUSANDS OF PROGRAMS', x: 70, y: 65 },
    ],
  };

  // ── Shared engine ────────────────────────────────────────────────────────

  function buildTourMarkup(tour) {
    return `
      <div class="yat-story-wrap">
        <div class="yat-story-strip" role="region" aria-roledescription="carousel" aria-label="${tour.kicker}">
          ${tour.stops.map((stop) => `
            <div class="yat-story-slide">
              <div class="yat-story-photo"><img src="${stop.image}" alt="" loading="lazy"></div>
              <div class="yat-story-copy">
                <p class="yat-story-kicker">${tour.kicker}</p>
                <blockquote>${stop.quote}</blockquote>
                <p class="yat-story-sub">${stop.sub}</p>
              </div>
            </div>`).join('')}
        </div>
        <button type="button" class="yat-story-nav prev" aria-label="Previous story">‹</button>
        <button type="button" class="yat-story-nav next" aria-label="Next story">›</button>
        <div class="yat-story-dots">${tour.stops.map((_, i) => `<button type="button" class="yat-story-dot${i === 0 ? ' active' : ''}" aria-label="Go to story ${i + 1}"></button>`).join('')}</div>
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

  // Wires one mounted tour block's interactivity. The story strip uses native
  // scroll-snap so touch/trackpad swiping "just works"; an IntersectionObserver
  // watches which slide is actually in view (from a swipe, an arrow click, or
  // the auto-advance timer) and that's the single source of truth for which
  // stop is "active" — driving the dot state, the callout, and the iframe.
  // `lazy` defers the first iframe load (and the auto-advance timer) until the
  // block scrolls into view, and pauses the timer again once it scrolls out.
  function wireTour(container, tour, { lazy = false } = {}) {
    const strip = container.querySelector('.yat-story-strip');
    const slides = [...container.querySelectorAll('.yat-story-slide')];
    const dots = [...container.querySelectorAll('.yat-story-dot')];
    const prevBtn = container.querySelector('.yat-story-nav.prev');
    const nextBtn = container.querySelector('.yat-story-nav.next');
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
      tourTimer = setInterval(() => goTo((activeIndex + 1) % tour.stops.length), TOUR_MS);
    }

    function goTo(index, userInitiated = false) {
      index = Math.max(0, Math.min(tour.stops.length - 1, index));
      if (userInitiated) pauseTour();
      strip.scrollTo({ left: slides[index].offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
    }

    function applyStop(index) {
      const stop = tour.stops[index];
      if (!stop) return;
      activeIndex = index;
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

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

    // root:strip means slide 0 reads as "in view" the instant it mounts,
    // regardless of whether the section itself is scrolled into the page
    // viewport — so slides aren't observed until begin() actually runs.
    const slideObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const index = slides.indexOf(entry.target);
          if (index !== -1) applyStop(index);
        }
      });
    }, { root: strip, threshold: [0.6] });

    function begin() {
      if (started) return;
      started = true;
      applyStop(0);
      slides.forEach((slide) => slideObserver.observe(slide));
      startTimer();
    }

    prevBtn.addEventListener('click', () => goTo(activeIndex - 1, true));
    nextBtn.addEventListener('click', () => goTo(activeIndex + 1, true));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i, true)));
    strip.addEventListener('pointerdown', () => pauseTour(), { once: true });
    strip.addEventListener('touchstart', () => pauseTour(), { once: true, passive: true });

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

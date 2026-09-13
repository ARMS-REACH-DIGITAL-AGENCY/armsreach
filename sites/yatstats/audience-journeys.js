// Four audience-specific guided tours (Fan, Coach, Player, Sponsor).
// Each is the same engine instantiated once per audience: a horizontal strip of
// tour stops narrates a feature, and clicking a stop drives the live iframe
// below it to the matching page on the real Hamilton subdomain. The Fan tour
// keeps the original hero placement (eager-loaded, already tuned hotspots);
// Coach / Player / Sponsor are new standalone sections lower on the page and
// lazy-load their iframe only once scrolled into view.
(() => {
  if (window.__yatAudienceJourneys) return;
  window.__yatAudienceJourneys = true;

  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const YATI = 'https://yatstats-assets.s3.us-west-2.amazonaws.com/yatstats/YaTi.png';
  const TOUR_MS = 9500;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Cody Bellinger is a known Hamilton alumni record used as a stable tour example.
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;

  const css = `
    .yat-tour{position:relative;width:min(1400px,calc(100% - 34px));margin:34px auto 0}
    .yat-audience-section .yat-tour{width:100%;margin:0}
    .yat-tour-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;margin:0 0 17px;padding:0 3px}
    .yat-tour-intro .eyebrow{margin-bottom:7px!important}.yat-tour-intro h2{font:800 clamp(1.85rem,3vw,3.15rem)/1.02 Manrope,Inter,sans-serif;letter-spacing:-.04em;margin:0}.yat-tour-intro h2 span{color:#efb936}.yat-tour-intro p{max-width:580px;margin:0;color:#888d93;font-size:.78rem;text-align:right}
    .yat-tour-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 1px 8px}.yat-tour-tabs::-webkit-scrollbar{display:none}
    .yat-tour-tab{flex:1 0 auto;min-width:112px;border:1px solid #2c3034;background:#101214;color:#8c9197;border-radius:8px;padding:10px 12px;cursor:pointer;text-align:center;font:850 10px/1 Inter,sans-serif;letter-spacing:.055em;text-transform:uppercase;transition:.18s ease}.yat-tour-tab:hover{color:#fff;border-color:#565b61}.yat-tour-tab.active{color:#111;background:linear-gradient(135deg,#e7ad2c,#ffd66a);border-color:#f2c44d;box-shadow:0 8px 28px rgba(239,185,54,.13)}
    .yat-tour-guide{position:relative;display:grid;grid-template-columns:66px minmax(0,1fr) auto;align-items:center;gap:14px;min-height:92px;margin-bottom:10px;padding:12px 16px 12px 10px;border:1px solid #2d3136;border-radius:12px;background:linear-gradient(135deg,#131516,#0d0f10);overflow:hidden}.yat-tour-guide:after{content:"";position:absolute;width:280px;height:150px;right:-80px;top:-85px;background:radial-gradient(circle,rgba(239,185,54,.10),transparent 67%);pointer-events:none}
    .yat-tour-yati{position:relative;z-index:2;width:62px;height:70px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 8px 11px rgba(0,0,0,.32))}
    .yat-tour-speech{position:relative;z-index:2;min-width:0}.yat-tour-kicker{display:block;margin-bottom:4px;color:#e8b73f;font:900 8px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase}.yat-tour-speech h3{margin:0 0 4px;font:800 clamp(1rem,1.5vw,1.35rem)/1.08 Manrope,Inter,sans-serif;letter-spacing:-.025em}.yat-tour-speech p{margin:0;max-width:850px;color:#989da2;font-size:.72rem;line-height:1.45}
    .yat-tour-progress{position:relative;z-index:2;display:flex;align-items:center;gap:9px;color:#6f747a;font:800 8px/1 Inter,sans-serif;white-space:nowrap;text-transform:uppercase;letter-spacing:.08em}.yat-tour-progress b{color:#e9bb4e;font-size:12px}.yat-tour-progress button{border:0;background:transparent;color:#8b9095;cursor:pointer;padding:5px}.yat-tour-progress button:hover{color:#fff}

    .yat-live-platform{position:relative;border:1px solid #35393e;border-radius:14px;overflow:hidden;background:#0b0d0e;box-shadow:0 26px 70px rgba(0,0,0,.42)}
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

    .yat-audience-section{overflow:hidden}
    .yat-audience-section .yat-tour-intro{padding:0}

    @media(max-width:980px){
      .yat-tour{width:min(100% - 24px,1400px);margin-top:25px}
      .yat-audience-section .yat-tour{width:100%;margin-top:0}
      .yat-tour-intro{grid-template-columns:1fr;gap:7px}.yat-tour-intro p{text-align:left;max-width:720px}.yat-tour-tab{min-width:116px}.yat-tour-guide{grid-template-columns:58px minmax(0,1fr);gap:11px}.yat-tour-yati{width:54px;height:62px}.yat-tour-progress{grid-column:2;justify-content:flex-start;margin-top:-6px}
      .yat-live-frame-wrap{height:68vh;min-height:540px}.yat-live-action.open-full{display:none}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:620px){
      .yat-tour{width:calc(100% - 18px)}
      .yat-audience-section .yat-tour{width:100%}
      .yat-tour-intro h2{font-size:1.75rem}.yat-tour-intro p{font-size:.72rem}.yat-tour-tabs{margin-left:-1px;margin-right:-1px}.yat-tour-tab{min-width:106px;padding:9px 10px;font-size:8px}.yat-tour-guide{grid-template-columns:48px minmax(0,1fr);padding:9px 10px;min-height:86px}.yat-tour-yati{width:44px;height:54px}.yat-tour-speech h3{font-size:1rem}.yat-tour-speech p{font-size:.66rem}.yat-tour-progress{font-size:7px}.yat-live-url{max-width:47vw}.yat-live-frame-wrap{height:66vh;min-height:510px}.yat-live-footer{align-items:flex-start;flex-direction:column;gap:3px}.yat-live-callout-label{display:none}
    }
  `;

  const style = document.createElement('style');
  style.id = 'yat-audience-journeys-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ── Tour content, one dataset per audience ─────────────────────────────
  // Approximate hotspot coordinates (x/y) on the coach/player/sponsor stops are
  // placeholders pending visual calibration against the live Hamilton site —
  // only the fan stops below have been tuned against real screenshots.

  const fanTour = {
    id: 'fan', mount: 'hero', eyebrow: 'Test drive the platform',
    title: "Don't take our word for it. <span>Use it.</span>",
    lede: 'This is the actual Hamilton YAT?STATS community—not another mockup. Follow the guided tour or ignore us and click around on your own.',
    stops: [
      { label: 'Search', kicker: 'Find anybody, from anywhere', title: 'Search the entire YAT?STATS network.', copy: 'Tap the magnifying glass in the live community. Search by player name, high school, or the college/pro team he plays for now.', url: PLATFORM, callout: 'GLOBAL SEARCH', x: 91, y: 7 },
      { label: 'Filter + Sort', kicker: 'Make a big alumni list useful', title: 'Narrow the community to exactly what matters.', copy: 'Sort and filter the alumni gallery by name, level, graduating class, favorites and more. The community reshapes around the fan, coach or alumnus using it.', url: PLATFORM, callout: 'SORT + FILTER', x: 87, y: 13 },
      { label: 'Player Cards', kicker: 'The hometown roster, still alive', title: 'Every alumni card has another side.', copy: 'We dropped the preview onto Cody Bellinger. Open a player card and flip it to move from the high-school story to current next-level production.', url: CODY_CARD, callout: 'TAP / FLIP A PLAYER CARD', x: 22, y: 43 },
      { label: 'Stats', kicker: 'What is he doing now?', title: 'Current production stays attached to where he came from.', copy: 'The player profile keeps schedules and current stats connected to the hometown identity instead of making fans hunt across unrelated stat sites.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { label: 'News', kicker: 'The next chapter keeps moving', title: 'Follow the story between the box scores.', copy: 'Player news and updates live beside the stats so the community can follow milestones, roster moves and the moments that keep an alumni story current.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { label: 'Golden Timeline', kicker: 'Past + present on one career line', title: 'This is where YAT?STATS becomes more than a stat site.', copy: 'The Golden Timeline anchors a player at high school and follows the journey through college, pro baseball and the memories contributed by the people who were there.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { label: 'Contribute', kicker: 'Fans help document the journey', title: 'The people who lived the story can help preserve it.', copy: 'Family, teammates, coaches and fans can add photos and memories from youth ball, high school, college, pro ball or a fan moment—and place them on the player’s journey.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const coachTour = {
    id: 'coach', mount: 'section', alt: false,
    eyebrow: 'For coaches & boosters', title: "Turn decades of alumni into <span>a program asset.</span>",
    lede: 'Your former players are already a community — scattered across old spreadsheets and group texts. This is the same clubhouse YAT?STATS gives your program.',
    stops: [
      { label: 'Your Clubhouse', kicker: 'A living alumni home', title: 'Give the program a place to recognize its own.', copy: 'The microsite organizes active and former alumni around the school, turning decades of program history into something visible and useful again.', url: PLATFORM, callout: 'YOUR PROGRAM COMMUNITY', x: 50, y: 10 },
      { label: 'Alumni Gallery', kicker: 'Every era, one roster', title: 'Every era of the program lives in one gallery.', copy: 'Active alumni tracking is organized around your program instead of scattered across whichever team a player happens to be on now.', url: `${PLATFORM}/?view=active`, callout: 'ACTIVE ALUMNI GALLERY', x: 50, y: 50 },
      { label: 'Flip Cards', kicker: 'Recognize them the way fans do', title: 'Show boosters and families where a former player is now.', copy: 'Flip a card from the high-school story to current college or pro production — an easy way to show the program’s reach.', url: CODY_CARD, callout: 'FLIP A PLAYER CARD', x: 22, y: 43 },
      { label: 'Stay Relevant', kicker: 'Engage before you ask for anything', title: 'Give alumni and families a reason to keep checking in.', copy: 'Milestones and updates create ongoing reasons to engage with the program — the relationship comes before any fundraising ask.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'ALUMNI NEWS & UPDATES', x: 50, y: 79 },
      { label: 'Program History', kicker: 'Preserve what the scoreboard forgets', title: 'Championships, coaches and memories on one timeline.', copy: 'The Golden Timeline anchors a player at your high school and carries the program’s history forward with him.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { label: 'Local Sponsors', kicker: 'A stronger pitch than another banner', title: 'Local businesses can help fund the platform.', copy: 'A sponsor-ready community gives local partners a more meaningful offer than a traditional booster donation.', url: PLATFORM, callout: 'SPONSOR-READY COMMUNITY', x: 85, y: 14 },
    ],
  };

  const playerTour = {
    id: 'player', mount: 'section', alt: true,
    eyebrow: 'For players & alumni', title: "Your story can stay connected to <span>where it started.</span>",
    lede: "High school is the anchor, but the profile follows you through college, pro ball and whatever comes after the uniform.",
    stops: [
      { label: 'Your Profile', kicker: 'One profile, the whole journey', title: 'One profile follows you forward, not just through high school.', copy: 'Fans who knew you before college or pro ball can still see what you’re doing now without losing the hometown context.', url: CODY_PROFILE, callout: 'PLAYER PROFILE', x: 50, y: 14 },
      { label: 'Current Stats', kicker: 'What you’re doing right now', title: 'Current production stays attached to home.', copy: 'Schedules and stats stay connected to the program that started your story instead of living on an unrelated stat site.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'CURRENT STATS', x: 50, y: 79 },
      { label: 'Golden Timeline', kicker: 'Build the record a stat sheet can’t', title: 'Photos and milestones from every stage of the journey.', copy: 'Youth ball, high school, college, pro ball — the memories that documented the journey can live on the same line as the stats.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { label: 'Flip Card', kicker: 'Past on the front, present on the back', title: 'The hometown image never disappears.', copy: 'Your high-school card flips to current production — the identity that got you here stays visible next to what you’re doing now.', url: CODY_CARD, callout: 'FLIP YOUR PLAYER CARD', x: 22, y: 43 },
      { label: 'News', kicker: 'The next chapter keeps moving', title: 'Share milestones with the people who already care.', copy: 'Hometown fans and former teammates can follow roster moves and milestones without hunting across unrelated feeds.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'PLAYER NEWS', x: 50, y: 79 },
      { label: 'Contribute', kicker: 'Legacy is bigger than one season', title: 'Playing ends. The alumni identity doesn’t.', copy: 'Add your own photos and memories so the profile becomes a living history the program keeps — even after the final season.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'ADD A MEMORY', x: 48, y: 58 },
    ],
  };

  const sponsorTour = {
    id: 'sponsor', mount: 'section', alt: false,
    eyebrow: 'For local partners', title: "Back the hometown attention <span>that already exists.</span>",
    lede: 'Parents, alumni, fans and former teammates already care — because these are their people. Support the community they’re already paying attention to.',
    stops: [
      { label: 'The Community', kicker: 'Attention that’s already there', title: 'Baseball communities already have emotional attention.', copy: 'Parents, alumni, fans and former teammates care because these are their people and their hometown stories — not a cold audience.', url: PLATFORM, callout: 'AN ACTIVE HOMETOWN COMMUNITY', x: 50, y: 10 },
      { label: 'Program History', kicker: 'Nostalgia is an engagement engine', title: 'A familiar school or championship memory earns attention.', copy: 'The Golden Timeline surfaces exactly the kind of nostalgia that makes a hometown sponsor message land, instead of getting scrolled past.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'THE GOLDEN TIMELINE', x: 37, y: 38 },
      { label: 'Alumni Reach', kicker: 'Put your brand inside the community', title: 'Your name appears around stories people already value.', copy: 'A sponsor can support the school microsite and appear around the alumni, players and fan behaviors the community already cares about.', url: `${PLATFORM}/?view=active`, callout: 'WHERE YOUR BRAND WOULD APPEAR', x: 50, y: 50 },
      { label: 'Player Cards', kicker: 'Visibility tied to real players', title: 'Sponsorship sits next to real hometown stories, not a banner ad.', copy: 'Every flipped card is a reminder that this is a real alumni community — a stronger association than generic digital advertising.', url: CODY_CARD, callout: 'A REAL PLAYER, NOT A MOCKUP', x: 22, y: 43 },
      { label: 'Local Value', kicker: 'More than a booster donation', title: 'Fund a useful platform, not just a sign on a fence.', copy: 'Local businesses help provide the community platform to the school while earning measurable hometown exposure in return.', url: PLATFORM, callout: 'A STRONGER LOCAL OFFER', x: 85, y: 14 },
      { label: 'Scale', kicker: 'One school is the proof, not the ceiling', title: 'The model can repeat school by school.', copy: 'Hamilton is the flagship. The same sponsorship model can extend to every program that activates a YAT?STATS community.', url: PLATFORM, callout: 'ONE OF THOUSANDS OF PROGRAMS', x: 70, y: 65 },
    ],
  };

  // ── Shared engine ────────────────────────────────────────────────────────

  function buildTourMarkup(tour) {
    return `
      <div class="yat-tour-intro">
        <div><p class="eyebrow">${tour.eyebrow}</p><h2>${tour.title}</h2></div>
        <p>${tour.lede}</p>
      </div>
      <div class="yat-tour-tabs" role="tablist" aria-label="${tour.eyebrow} feature tour">
        ${tour.stops.map((stop, index) => `<button class="yat-tour-tab${index === 0 ? ' active' : ''}" type="button" role="tab" aria-selected="${index === 0}" data-tour-index="${index}">${stop.label}</button>`).join('')}
      </div>
      <div class="yat-tour-guide" aria-live="polite">
        <img class="yat-tour-yati" src="${YATI}" alt="YAT?STATS mascot">
        <div class="yat-tour-speech"><span class="yat-tour-kicker"></span><h3></h3><p></p></div>
        <div class="yat-tour-progress"><span><b>01</b> / ${String(tour.stops.length).padStart(2, '0')}</span><button type="button" aria-label="Pause guided tour">Pause</button></div>
      </div>
      <div class="yat-live-platform">
        <div class="yat-live-bar">
          <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
          <div class="yat-live-actions"><button type="button" class="yat-live-action yat-live-expand">Expand</button><a class="yat-live-action open-full yat-live-open" href="${PLATFORM}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close">Close</button></div>
        </div>
        <div class="yat-live-frame-wrap">
          <div class="yat-live-loading"><span>Loading the live community</span></div>
          <iframe class="yat-live-frame" title="Live YAT?STATS ${tour.eyebrow} tour" loading="lazy" allow="fullscreen; autoplay; clipboard-write"></iframe>
          <div class="yat-live-callout" aria-hidden="true"><div class="yat-live-callout-dot"></div><div class="yat-live-callout-label"></div></div>
        </div>
        <div class="yat-live-footer"><span><strong>LIVE PLATFORM:</strong> everything inside the frame is the real Hamilton subdomain.</span><span><em>Tour stops change the live view. You can interact with it at any time.</em></span></div>
      </div>`;
  }

  // Wires one mounted tour block's interactivity. `lazy` defers the first
  // iframe load (and the auto-advance timer) until the block scrolls into view,
  // and pauses the timer again whenever it scrolls back out.
  function wireTour(container, tour, { lazy = false } = {}) {
    const frame = container.querySelector('.yat-live-frame');
    const loader = container.querySelector('.yat-live-loading');
    const urlLabel = container.querySelector('.yat-live-url');
    const openFull = container.querySelector('.yat-live-open');
    const callout = container.querySelector('.yat-live-callout');
    const calloutLabel = container.querySelector('.yat-live-callout-label');
    const kicker = container.querySelector('.yat-tour-kicker');
    const title = container.querySelector('.yat-tour-speech h3');
    const copy = container.querySelector('.yat-tour-speech p');
    const count = container.querySelector('.yat-tour-progress b');
    const pauseBtn = container.querySelector('.yat-tour-progress button');
    const tabs = [...container.querySelectorAll('.yat-tour-tab')];
    const liveShell = container.querySelector('.yat-live-platform');
    const frameWrap = container.querySelector('.yat-live-frame-wrap');
    const expand = container.querySelector('.yat-live-expand');
    const close = container.querySelector('.yat-live-close');

    let activeIndex = 0;
    let interacted = false;
    let started = false;
    let tourTimer = null;
    let lastUrl = '';

    function pauseTour(label = 'Paused') {
      interacted = true;
      if (tourTimer) clearInterval(tourTimer);
      tourTimer = null;
      pauseBtn.textContent = label;
    }

    function startTimer() {
      if (reducedMotion || interacted || tourTimer) return;
      tourTimer = setInterval(() => {
        if (!interacted) updateStop((activeIndex + 1) % tour.stops.length, false);
      }, TOUR_MS);
    }

    function updateStop(index, userInitiated = false) {
      const stop = tour.stops[index];
      if (!stop) return;
      activeIndex = index;
      if (userInitiated) pauseTour('Manual tour');

      tabs.forEach((tab, i) => {
        const isActive = i === index;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        if (isActive) tab.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
      });

      kicker.textContent = stop.kicker;
      title.textContent = stop.title;
      copy.textContent = stop.copy;
      count.textContent = String(index + 1).padStart(2, '0');
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
      updateStop(0, false);
      startTimer();
    }

    tabs.forEach((tab) => tab.addEventListener('click', () => { begin(); updateStop(Number(tab.dataset.tourIndex), true); }));
    pauseBtn.addEventListener('click', () => pauseTour('Manual tour'));
    frame.addEventListener('load', () => { loader.classList.add('hidden'); frame.classList.add('loaded'); });
    frameWrap.addEventListener('pointerenter', () => { if (!interacted) pauseTour('You’re driving'); });
    frameWrap.addEventListener('touchstart', () => { if (!interacted) pauseTour('You’re driving'); }, { passive: true });

    expand.addEventListener('click', () => {
      begin();
      pauseTour('You’re driving');
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

    if (!reducedMotion) pauseBtn.textContent = 'Manual tour';
    if (!('IntersectionObserver' in window)) { begin(); return; }
    const observer = new IntersectionObserver((entries) => {
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
    observer.observe(liveShell);
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

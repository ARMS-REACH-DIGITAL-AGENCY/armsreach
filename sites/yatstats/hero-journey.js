(() => {
  if (window.__yatGuidedTourV2) return;
  window.__yatGuidedTourV2 = true;

  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const CUTOUT_PREFIX = `${S3_BASE}/players/cutouts/`;
  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const CAREER_BG = `${PLATFORM}/img/career-path-default.png`;
  const YATI = `${S3_BASE}/yatstats/YaTi.png`;
  const ROTATE_MS = 5200;
  const TOUR_MS = 9500;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Cody Bellinger is a known Hamilton alumni record used as a stable tour example.
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;

  const tourStops = [
    {
      key: 'search', label: 'Search', kicker: 'Find anybody, from anywhere',
      title: 'Search the entire YAT?STATS network.',
      copy: 'Tap the magnifying glass in the live community. Search by player name, high school, or the college/pro team he plays for now.',
      url: PLATFORM,
      callout: 'GLOBAL SEARCH', x: 91, y: 7,
    },
    {
      key: 'filter', label: 'Filter + Sort', kicker: 'Make a big alumni list useful',
      title: 'Narrow the community to exactly what matters.',
      copy: 'Sort and filter the alumni gallery by name, level, graduating class, favorites and more. The community reshapes around the fan, coach or alumnus using it.',
      url: PLATFORM,
      callout: 'SORT + FILTER', x: 87, y: 13,
    },
    {
      key: 'cards', label: 'Player Cards', kicker: 'The hometown roster, still alive',
      title: 'Every alumni card has another side.',
      copy: 'We dropped the preview onto Cody Bellinger. Open a player card and flip it to move from the high-school story to current next-level production.',
      url: CODY_CARD,
      callout: 'TAP / FLIP A PLAYER CARD', x: 22, y: 43,
    },
    {
      key: 'stats', label: 'Stats', kicker: 'What is he doing now?',
      title: 'Current production stays attached to where he came from.',
      copy: 'The player profile keeps schedules and current stats connected to the hometown identity instead of making fans hunt across unrelated stat sites.',
      url: `${CODY_PROFILE}#ppTab-stats`,
      callout: 'CURRENT STATS', x: 50, y: 79,
    },
    {
      key: 'news', label: 'News', kicker: 'The next chapter keeps moving',
      title: 'Follow the story between the box scores.',
      copy: 'Player news and updates live beside the stats so the community can follow milestones, roster moves and the moments that keep an alumni story current.',
      url: `${CODY_PROFILE}#ppTab-news`,
      callout: 'PLAYER NEWS', x: 50, y: 79,
    },
    {
      key: 'timeline', label: 'Golden Timeline', kicker: 'Past + present on one career line',
      title: 'This is where YAT?STATS becomes more than a stat site.',
      copy: 'The Golden Timeline anchors a player at high school and follows the journey through college, pro baseball and the memories contributed by the people who were there.',
      url: `${CODY_PROFILE}#playerCareerImages`,
      callout: 'THE GOLDEN TIMELINE', x: 37, y: 38,
    },
    {
      key: 'contribute', label: 'Contribute', kicker: 'Fans help document the journey',
      title: 'The people who lived the story can help preserve it.',
      copy: 'Family, teammates, coaches and fans can add photos and memories from youth ball, high school, college, pro ball or a fan moment—and place them on the player’s journey.',
      url: `${CODY_PROFILE}#ppTab-upload`,
      callout: 'ADD A MEMORY', x: 48, y: 58,
    },
  ];

  const css = `
    /* Density pass: make desktop 100% feel closer to the old 75% zoom. */
    .header-inner{min-height:58px!important}.brand img{width:126px!important}.nav{gap:16px!important}.nav a{font-size:.72rem!important}.button.small{min-height:34px!important;padding:7px 12px!important;font-size:.69rem!important}
    .section{padding:70px 0!important}.section-head{max-width:780px!important;margin-bottom:32px!important}.section-head h2{font-size:clamp(2rem,3.6vw,3.65rem)!important}.section-head p{font-size:.9rem!important}.shell{width:min(1280px,calc(100% - 42px))!important}

    /* The hero is intentionally NOT a SaaS card. It is the same visual language as the player career anchor. */
    .hero{padding:0 0 54px!important;background:#08090a!important;overflow:hidden!important}
    .hero>.shell{width:100%!important;max-width:none!important;margin:0!important}
    .hero:before{display:none!important}
    .hero-grid{display:block!important;width:100%!important}
    .hero-grid>.product-wrap,.hero-grid>div:first-child{display:none!important}
    .hero-media{display:none!important}
    .yat-journey-hero{position:relative;width:100%;margin:0;overflow:hidden;background:#111;isolation:isolate}
    .yat-journey-canvas{position:relative;width:100%;height:clamp(500px,45vw,720px);overflow:hidden;background:#26322f}
    .yat-journey-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;z-index:1;user-select:none;-webkit-user-drag:none}
    .yat-journey-cutout-wrap{position:absolute;left:2.4%;bottom:-1%;z-index:3;width:37%;height:103%;pointer-events:none}
    .yat-journey-cutout{position:absolute;left:0;bottom:0;width:100%;height:100%;object-fit:contain;object-position:left bottom;filter:drop-shadow(0 20px 30px rgba(0,0,0,.34));opacity:0;transform:translateX(-1.5%) scale(.985);transition:opacity .85s ease,transform 1.05s cubic-bezier(.2,.75,.2,1)}
    .yat-journey-cutout.active{opacity:1;transform:translateX(0) scale(1)}
    .yat-journey-sheen{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.10),transparent 34%,transparent 79%,rgba(0,0,0,.05)),linear-gradient(180deg,rgba(0,0,0,.12),transparent 16%,transparent 80%,rgba(0,0,0,.20))}
    .yat-journey-badge{position:absolute;z-index:5;left:24px;bottom:22px;display:flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(5,7,8,.60);backdrop-filter:blur(9px);color:#fff;font:800 8px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase}
    .yat-journey-badge i{display:block;width:7px;height:7px;border-radius:50%;background:#efb936;box-shadow:0 0 0 4px rgba(239,185,54,.14)}
    .yat-journey-scroll{position:absolute;z-index:5;right:25px;bottom:21px;color:rgba(255,255,255,.76);font:800 8px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;display:flex;align-items:center;gap:8px}.yat-journey-scroll b{color:#efb936;font-size:15px;line-height:.7}

    /* Remove the old duplicate search UI. The live product itself is now the demonstration. */
    #global-search{display:none!important}

    .yat-tour{position:relative;width:min(1400px,calc(100% - 34px));margin:34px auto 0}
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

    /* A live demo makes the old giant Hamilton screenshot redundant. Keep the proof metrics, not the screenshot. */
    #proof .proof-shot{display:none!important}#proof .proof-card{padding-top:2px!important}#proof .metrics{margin-top:0!important;border-top:0!important}

    @media(max-width:980px){
      .header-inner{min-height:62px!important}.brand img{width:132px!important}.section{padding:62px 0!important}.shell{width:min(100% - 30px,1280px)!important}
      .yat-journey-canvas{height:clamp(390px,58vw,580px)}.yat-journey-cutout-wrap{left:-1%;width:44%;height:102%}.yat-journey-badge{left:13px;bottom:13px}.yat-journey-scroll{right:14px;bottom:14px}
      .yat-tour{width:min(100% - 24px,1400px);margin-top:25px}.yat-tour-intro{grid-template-columns:1fr;gap:7px}.yat-tour-intro p{text-align:left;max-width:720px}.yat-tour-tab{min-width:116px}.yat-tour-guide{grid-template-columns:58px minmax(0,1fr);gap:11px}.yat-tour-yati{width:54px;height:62px}.yat-tour-progress{grid-column:2;justify-content:flex-start;margin-top:-6px}
      .yat-live-frame-wrap{height:68vh;min-height:540px}.yat-live-action.open-full{display:none}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:620px){
      .section{padding:54px 0!important}.hero{padding-bottom:40px!important}.yat-journey-canvas{height:56.25vw;min-height:300px;max-height:420px}.yat-journey-bg{object-position:center center}.yat-journey-cutout-wrap{left:-5%;width:51%;height:103%}.yat-journey-badge{font-size:6px;padding:5px 7px}.yat-journey-scroll{font-size:6px}.yat-tour{width:calc(100% - 18px)}.yat-tour-intro h2{font-size:1.75rem}.yat-tour-intro p{font-size:.72rem}.yat-tour-tabs{margin-left:-1px;margin-right:-1px}.yat-tour-tab{min-width:106px;padding:9px 10px;font-size:8px}.yat-tour-guide{grid-template-columns:48px minmax(0,1fr);padding:9px 10px;min-height:86px}.yat-tour-yati{width:44px;height:54px}.yat-tour-speech h3{font-size:1rem}.yat-tour-speech p{font-size:.66rem}.yat-tour-progress{font-size:7px}.yat-live-url{max-width:47vw}.yat-live-frame-wrap{height:66vh;min-height:510px}.yat-live-footer{align-items:flex-start;flex-direction:column;gap:3px}.yat-live-callout-label{display:none}
    }
  `;

  const style = document.createElement('style');
  style.id = 'yat-guided-tour-styles';
  style.textContent = css;
  document.head.appendChild(style);

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function imageExists(url, timeout = 4500) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (value) => { if (done) return; done = true; clearTimeout(timer); resolve(value); };
      const timer = setTimeout(() => finish(false), timeout);
      img.onload = () => finish(Boolean(img.naturalWidth && img.naturalHeight));
      img.onerror = () => finish(false);
      img.src = url;
    });
  }

  async function listS3Cutouts() {
    const found = [];
    let token = '';
    for (let page = 0; page < 3; page++) {
      const params = new URLSearchParams({ 'list-type': '2', prefix: 'players/cutouts/', 'max-keys': '1000' });
      if (token) params.set('continuation-token', token);
      const response = await fetch(`${S3_BASE}/?${params}`, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`S3 list ${response.status}`);
      const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
      xml.querySelectorAll('Key').forEach((node) => {
        const key = node.textContent || '';
        if (/^players\/cutouts\/[^/]+\.png$/i.test(key)) found.push(`${S3_BASE}/${key}`);
      });
      const truncated = xml.querySelector('IsTruncated')?.textContent === 'true';
      token = xml.querySelector('NextContinuationToken')?.textContent || '';
      if (!truncated || !token) break;
    }
    return shuffle([...new Set(found)]);
  }

  async function discoverCutoutsFromPlayers() {
    const fragments = shuffle(['an','er','on','ar','el','in','en','al','ma','ro','ch','br','wi','li','mi','jo','da','co']).slice(0, 7);
    const payloads = await Promise.allSettled(fragments.map(async (q) => {
      const r = await fetch(`${PLATFORM}/api/players/search?q=${encodeURIComponent(q)}&limit=35`, { cache: 'no-store' });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data?.players) ? data.players : [];
    }));
    const ids = [];
    payloads.forEach((result) => {
      if (result.status === 'fulfilled') result.value.forEach((p) => {
        const id = String(p?.playerId || p?.playerid || p?.id || '').trim();
        if (id) ids.push(id);
      });
    });
    // Stable known Hamilton example first, then randomized discoveries.
    const unique = ['180827', ...shuffle([...new Set(ids)])].slice(0, 72);
    const valid = [];
    for (let i = 0; i < unique.length && valid.length < 22; i += 6) {
      const checks = await Promise.all(unique.slice(i, i + 6).map(async (id) => {
        const url = `${CUTOUT_PREFIX}${encodeURIComponent(id)}.png`;
        return (await imageExists(url, 3000)) ? url : null;
      }));
      valid.push(...checks.filter(Boolean));
    }
    return shuffle([...new Set(valid)]);
  }

  async function buildCutoutPool() {
    try {
      const listed = await listS3Cutouts();
      if (listed.length) return listed;
    } catch (err) {
      console.info('YAT?STATS hero: direct S3 listing unavailable; using player-index fallback.');
    }
    try { return await discoverCutoutsFromPlayers(); }
    catch (err) { console.warn('YAT?STATS hero: cutout discovery failed.', err); return []; }
  }

  function mountHero() {
    const grid = document.querySelector('.hero-grid');
    if (!grid || grid.dataset.journeyHero === '2') return null;
    grid.dataset.journeyHero = '2';
    grid.innerHTML = `
      <section class="yat-journey-hero" aria-label="YAT?STATS baseball journey hero">
        <div class="yat-journey-canvas">
          <img class="yat-journey-bg" src="${CAREER_BG}" alt="Baseball journeys don't always end at graduation. Neither should their stories.">
          <div class="yat-journey-cutout-wrap" aria-hidden="true"><img class="yat-journey-cutout yat-cutout-a" alt=""><img class="yat-journey-cutout yat-cutout-b" alt=""></div>
          <div class="yat-journey-sheen"></div>
          <div class="yat-journey-badge"><i></i>Real high-school players from the YAT?STATS platform</div>
          <a class="yat-journey-scroll" href="#yat-guided-tour">Test drive YAT?STATS <b>↓</b></a>
        </div>
      </section>`;
    return grid.querySelector('.yat-journey-hero');
  }

  function mountTour() {
    const oldSearch = document.getElementById('global-search');
    if (!oldSearch || document.getElementById('yat-guided-tour')) return null;

    const tour = document.createElement('section');
    tour.id = 'yat-guided-tour';
    tour.className = 'yat-tour';
    tour.innerHTML = `
      <div class="yat-tour-intro">
        <div><p class="eyebrow">Test drive the platform</p><h2>Don't take our word for it. <span>Use it.</span></h2></div>
        <p>This is the actual Hamilton YAT?STATS community—not another mockup. Follow the guided tour or ignore us and click around on your own.</p>
      </div>
      <div class="yat-tour-tabs" role="tablist" aria-label="YAT?STATS feature tour">
        ${tourStops.map((stop, index) => `<button class="yat-tour-tab${index === 0 ? ' active' : ''}" type="button" role="tab" aria-selected="${index === 0}" data-tour-index="${index}">${stop.label}</button>`).join('')}
      </div>
      <div class="yat-tour-guide" aria-live="polite">
        <img class="yat-tour-yati" src="${YATI}" alt="YAT?STATS mascot">
        <div class="yat-tour-speech"><span class="yat-tour-kicker" id="yat-tour-kicker"></span><h3 id="yat-tour-title"></h3><p id="yat-tour-copy"></p></div>
        <div class="yat-tour-progress"><span><b id="yat-tour-count">01</b> / 07</span><button id="yat-tour-pause" type="button" aria-label="Pause guided tour">Pause</button></div>
      </div>
      <div class="yat-live-platform" id="yat-live-platform">
        <div class="yat-live-bar">
          <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url" id="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
          <div class="yat-live-actions"><button type="button" class="yat-live-action" id="yat-live-expand">Expand</button><a class="yat-live-action open-full" id="yat-live-open" href="${PLATFORM}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close" id="yat-live-close">Close</button></div>
        </div>
        <div class="yat-live-frame-wrap" id="yat-live-wrap">
          <div class="yat-live-loading" id="yat-live-loading"><span>Loading the live community</span></div>
          <iframe class="yat-live-frame" id="yat-live-frame" src="${PLATFORM}" title="Live YAT?STATS guided product tour" loading="eager" allow="fullscreen; autoplay; clipboard-write"></iframe>
          <div class="yat-live-callout" id="yat-live-callout" aria-hidden="true"><div class="yat-live-callout-dot"></div><div class="yat-live-callout-label" id="yat-live-callout-label"></div></div>
        </div>
        <div class="yat-live-footer"><span><strong>LIVE PLATFORM:</strong> everything inside the frame is the real Hamilton subdomain.</span><span><em>Tour stops change the live view. You can interact with it at any time.</em></span></div>
      </div>`;

    oldSearch.insertAdjacentElement('afterend', tour);

    const frame = tour.querySelector('#yat-live-frame');
    const loader = tour.querySelector('#yat-live-loading');
    const urlLabel = tour.querySelector('#yat-live-url');
    const openFull = tour.querySelector('#yat-live-open');
    const callout = tour.querySelector('#yat-live-callout');
    const calloutLabel = tour.querySelector('#yat-live-callout-label');
    const kicker = tour.querySelector('#yat-tour-kicker');
    const title = tour.querySelector('#yat-tour-title');
    const copy = tour.querySelector('#yat-tour-copy');
    const count = tour.querySelector('#yat-tour-count');
    const pauseBtn = tour.querySelector('#yat-tour-pause');
    const tabs = [...tour.querySelectorAll('.yat-tour-tab')];
    const liveShell = tour.querySelector('#yat-live-platform');
    const frameWrap = tour.querySelector('#yat-live-wrap');
    const expand = tour.querySelector('#yat-live-expand');
    const close = tour.querySelector('#yat-live-close');

    let activeIndex = 0;
    let interacted = false;
    let tourTimer = null;
    let lastUrl = '';

    function pauseTour(label = 'Paused') {
      interacted = true;
      if (tourTimer) clearInterval(tourTimer);
      tourTimer = null;
      pauseBtn.textContent = label;
    }

    function updateStop(index, userInitiated = false) {
      const stop = tourStops[index];
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

    tabs.forEach((tab) => tab.addEventListener('click', () => updateStop(Number(tab.dataset.tourIndex), true)));
    pauseBtn.addEventListener('click', () => pauseTour('Manual tour'));
    frame.addEventListener('load', () => { loader.classList.add('hidden'); frame.classList.add('loaded'); });
    frameWrap.addEventListener('pointerenter', () => { if (!interacted) pauseTour('You’re driving'); });
    frameWrap.addEventListener('touchstart', () => { if (!interacted) pauseTour('You’re driving'); }, { passive: true });

    expand.addEventListener('click', () => {
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

    updateStop(0, false);
    if (!reducedMotion) {
      tourTimer = setInterval(() => {
        if (!interacted) updateStop((activeIndex + 1) % tourStops.length, false);
      }, TOUR_MS);
    } else {
      pauseBtn.textContent = 'Manual tour';
    }

    return tour;
  }

  async function startRotation(hero) {
    if (!hero) return;
    const imgs = [hero.querySelector('.yat-cutout-a'), hero.querySelector('.yat-cutout-b')];
    const pool = await buildCutoutPool();
    if (!pool.length) return;
    let active = 0;
    let index = Math.floor(Math.random() * pool.length);

    async function show(url, first = false) {
      const next = first ? imgs[0] : imgs[1 - active];
      await new Promise((resolve) => { next.onload = resolve; next.onerror = resolve; next.src = url; });
      if (!next.naturalWidth) return;
      requestAnimationFrame(() => {
        imgs.forEach((img) => img.classList.remove('active'));
        next.classList.add('active');
        active = imgs.indexOf(next);
      });
    }

    await show(pool[index], true);
    if (reducedMotion || pool.length < 2) return;
    setInterval(() => { index = (index + 1) % pool.length; show(pool[index]); }, ROTATE_MS);
  }

  function init() {
    const hero = mountHero();
    mountTour();
    startRotation(hero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

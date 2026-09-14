(() => {
  if (window.__yatStoryTimelineOverride) return;
  window.__yatStoryTimelineOverride = true;

  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const YATI = `${S3_BASE}/yatstats/YaTi.png`;
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;
  const AUTO_ADVANCE_MS = 9000;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const stops = [
    {
      key: 'why',
      label: 'The Why',
      kicker: 'The problem that started YAT?STATS',
      title: 'Graduation should not erase the connection.',
      copy: 'Players move on. Coaches, families, teammates and hometown fans still care. YAT?STATS keeps the journey connected to the program and people who helped start it.',
      url: PLATFORM,
      callout: 'THE HOMETOWN IS THE ANCHOR', x: 16, y: 17,
    },
    {
      key: 'mike',
      label: 'Mike Woods',
      kicker: 'The question behind the platform',
      title: '“Where are our guys now?”',
      copy: 'Hall of Fame coach Mike Woods wanted one reliable place to follow Hamilton alumni instead of hunting across rosters, box scores and social feeds.',
      url: PLATFORM,
      callout: 'NO MORE HUNTIN’ & PECKIN’', x: 14, y: 17,
    },
    {
      key: 'hamilton',
      label: 'Hamilton',
      kicker: 'The first live clubhouse',
      title: 'Hamilton became the proof of concept.',
      copy: 'One high-school program, generations of alumni and one living hometown view became the model for how every baseball community could reconnect.',
      url: PLATFORM,
      callout: 'THE FIRST YAT?STATS CLUBHOUSE', x: 15, y: 17,
    },
    {
      key: 'difference',
      label: 'What’s Different',
      kicker: 'Organized around where the story began',
      title: 'The high school remains the anchor.',
      copy: 'Other tools organize players by where they play now. YAT?STATS keeps the current chapter attached to the hometown program, history and community that came first.',
      url: CODY_CARD,
      callout: 'PAST ON THE FRONT · PRESENT ON THE BACK', x: 23, y: 44,
    },
    {
      key: 'search',
      label: 'Search',
      kicker: 'Find anybody, from anywhere',
      title: 'Search the entire YAT?STATS network.',
      copy: 'Use Global Search by player name, high school or current college/pro team. A Cubs or Arizona State search can cross every hometown community at once.',
      url: PLATFORM,
      callout: 'GLOBAL SEARCH', x: 91, y: 8,
    },
    {
      key: 'filter',
      label: 'Filter + Sort',
      kicker: 'Make a large alumni community useful',
      title: 'Narrow the clubhouse to what matters.',
      copy: 'Sort and filter by name, level, class, status and favorites so every fan, coach or alumnus can reshape the same community around his interests.',
      url: PLATFORM,
      callout: 'SORT + FILTER', x: 87, y: 13,
    },
    {
      key: 'cards',
      label: 'Player Cards',
      kicker: 'The hometown roster is still alive',
      title: 'Every alumni card has another side.',
      copy: 'The front preserves the high-school identity. Flip it to see the next-level chapter, then open the complete player profile for the full journey.',
      url: CODY_CARD,
      callout: 'TAP / FLIP A PLAYER CARD', x: 22, y: 43,
    },
    {
      key: 'stats',
      label: 'Stats',
      kicker: 'What is he doing now?',
      title: 'Current production stays connected to home.',
      copy: 'Schedules and statistics remain attached to the high-school story, giving hometown fans one place to follow the players they already care about.',
      url: `${CODY_PROFILE}#ppTab-stats`,
      callout: 'CURRENT STATS', x: 50, y: 79,
    },
    {
      key: 'news',
      label: 'News',
      kicker: 'The story between the box scores',
      title: 'Follow the next chapter as it happens.',
      copy: 'News and updates sit beside the statistics so milestones, roster moves and meaningful moments become part of one continuous player story.',
      url: `${CODY_PROFILE}#ppTab-news`,
      callout: 'PLAYER NEWS', x: 50, y: 79,
    },
    {
      key: 'timeline',
      label: 'Golden Timeline',
      kicker: 'Past + present on one career line',
      title: 'This is where YAT?STATS becomes more than a stat site.',
      copy: 'The Golden Timeline follows a player from youth and high school into college, pro baseball and life after the uniform—without losing the people and memories behind it.',
      url: `${CODY_PROFILE}#playerCareerImages`,
      callout: 'THE GOLDEN TIMELINE', x: 37, y: 38,
    },
    {
      key: 'contribute',
      label: 'Contribute',
      kicker: 'The people who were there complete the story',
      title: 'Fans can help preserve the journey.',
      copy: 'Family, teammates, coaches and fans can add photos and memories from every stage of baseball and place them on the player’s timeline.',
      url: `${CODY_PROFILE}#ppTab-upload`,
      callout: 'ADD A MEMORY', x: 48, y: 58,
    },
  ];

  const style = document.createElement('style');
  style.id = 'yat-story-timeline-override';
  style.textContent = `
    /* One-screen homepage modeled on the player-profile shell. */
    body.yat-one-screen-home main > section:not(.hero),
    body.yat-one-screen-home .footer{display:none!important}

    .hero{padding:0!important;background:#08090a!important;overflow:hidden!important}
    .hero > .shell{width:min(1500px,calc(100% - 20px))!important;max-width:none!important;height:100%!important;margin:0 auto!important;display:flex!important;flex-direction:column!important}
    .yat-journey-hero{position:relative!important;flex:0 0 auto!important;width:100%!important;margin:0!important;overflow:hidden!important;border:1px solid #262a2e;border-top:0;background:#0b0c0d!important;isolation:isolate}
    .yat-story-top{display:grid;grid-template-columns:clamp(300px,25vw,390px) minmax(0,1fr);height:188px;border-bottom:1px solid #292d31;background:#0b0c0d}
    .yat-story-top .yat-journey-canvas{height:188px!important;min-height:0!important;border-right:1px solid #292d31;background:#25302d!important}
    .yat-story-top .yat-journey-bg{object-fit:cover!important;object-position:center center!important;filter:brightness(.9) saturate(.95)}
    .yat-story-top .yat-journey-cutout-wrap{left:0!important;bottom:-1%!important;width:53%!important;height:103%!important}
    .yat-story-top .yat-journey-badge{left:9px!important;bottom:9px!important;padding:4px 7px!important;font-size:6px!important;letter-spacing:.09em!important}
    .yat-story-top .yat-journey-scroll{right:9px!important;bottom:9px!important;font-size:6px!important;letter-spacing:.09em!important;pointer-events:none}
    .yat-story-narration{position:relative;display:grid;grid-template-columns:70px minmax(0,1fr) auto;align-items:center;gap:14px;padding:16px 18px;overflow:hidden;background:radial-gradient(circle at 90% 5%,rgba(200,169,110,.11),transparent 34%),linear-gradient(145deg,#111315,#0c0e0f)}
    .yat-story-narration:after{content:"";position:absolute;right:-65px;bottom:-105px;width:260px;height:210px;border:1px solid rgba(200,169,110,.08);border-radius:50%;pointer-events:none}
    .yat-story-yati{position:relative;z-index:1;width:66px;height:88px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 8px 12px rgba(0,0,0,.36))}
    .yat-story-copy{position:relative;z-index:1;min-width:0}
    .yat-story-kicker{display:block;margin-bottom:5px;color:#c8a96e;font:500 9px/1 Oswald,Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
    .yat-story-copy h1{margin:0 0 5px!important;max-width:none!important;color:#f3f3f1!important;font:400 clamp(24px,2.4vw,38px)/.98 "Bebas Neue",Oswald,Inter,sans-serif!important;letter-spacing:.01em!important;text-transform:uppercase}
    .yat-story-copy p{margin:0;max-width:900px;color:#a0a4a9;font:300 12px/1.42 Oswald,Inter,sans-serif}
    .yat-story-meta{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:10px;min-width:112px;color:#777c82;font:400 9px/1 Oswald,Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase}
    .yat-story-meta b{color:#d1b16f;font-size:13px;font-weight:500}
    .yat-story-controls{display:flex;gap:5px}.yat-story-controls button{width:30px;height:28px;border:1px solid #30343a;border-radius:4px;background:#131517;color:#aaa;font:500 14px/1 Oswald,sans-serif;cursor:pointer}.yat-story-controls button:hover{border-color:#766236;color:#fff}

    .yat-story-track-shell{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:stretch;height:58px;background:#050607}
    .yat-story-track-arrow{border:0;border-right:1px solid #24272b;background:#0c0d0e;color:#777;font-size:16px;cursor:pointer}.yat-story-track-arrow:last-child{border-right:0;border-left:1px solid #24272b}.yat-story-track-arrow:hover{color:#fff;background:#151719}
    .yat-story-track{display:flex;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity}.yat-story-track::-webkit-scrollbar{display:none}
    .yat-story-stop{position:relative;flex:0 0 142px;border:0;border-right:1px solid #24272b;background:#0d0f10;color:#858a90;text-align:left;padding:8px 10px;cursor:pointer;scroll-snap-align:center;transition:.15s ease}
    .yat-story-stop:hover{background:#151718;color:#fff}.yat-story-stop.active{background:#f1f1ed;color:#101112}
    .yat-story-stop:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:transparent}.yat-story-stop.active:after{background:#c8a96e}
    .yat-story-number{display:block;font:400 7px/1 Oswald,sans-serif;letter-spacing:.13em;opacity:.58}.yat-story-label{display:block;margin-top:12px;font:400 15px/1 "Bebas Neue",Oswald,sans-serif;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    /* The old separate tour UI is gone. The live frame sits directly under the timeline. */
    #global-search,.yat-tour-intro,.yat-tour-tabs,.yat-tour-guide{display:none!important}
    .yat-live-platform{position:relative!important;flex:1 1 auto!important;min-height:0!important;margin:8px 0 10px!important;display:grid!important;grid-template-rows:38px minmax(0,1fr) 24px!important;border:1px solid #30343a!important;border-radius:8px!important;overflow:hidden!important;background:#0b0d0e!important;box-shadow:none!important}
    .yat-live-bar{min-height:38px!important;padding:6px 9px 6px 12px!important}.yat-live-action{min-height:26px!important}
    .yat-live-frame-wrap{position:relative!important;width:100%!important;height:auto!important;min-height:0!important;overflow:hidden!important;background:#050505!important}
    .yat-live-frame{position:absolute!important;left:50%!important;top:0!important;transform-origin:top center!important;border:0!important;background:#fff!important}
    .yat-live-footer{padding:5px 10px!important;font-size:8px!important;min-height:24px!important}
    .yat-live-callout{z-index:7!important}

    @media (min-width:860px){
      html,body{height:100%}
      body.yat-one-screen-home{overflow:hidden}
      body.yat-one-screen-home .hero{height:calc(100dvh - 58px)!important;min-height:620px!important}
      body.yat-one-screen-home .hero > .shell{height:100%!important}
      body.yat-one-screen-home .yat-journey-hero{flex:0 0 246px!important}
    }

    @media (max-width:1050px){
      .yat-story-top{grid-template-columns:300px minmax(0,1fr)}
      .yat-story-narration{grid-template-columns:58px minmax(0,1fr) auto;padding:13px 14px;gap:11px}
      .yat-story-yati{width:54px;height:76px}.yat-story-copy p{font-size:11px}.yat-story-meta{min-width:92px}
    }

    @media (max-width:859px){
      body.yat-one-screen-home{overflow:auto}
      .hero > .shell{width:100%!important}
      .yat-story-top{grid-template-columns:1fr;height:auto}
      .yat-story-top .yat-journey-canvas{height:152px!important;border-right:0;border-bottom:1px solid #292d31}
      .yat-story-narration{grid-template-columns:52px minmax(0,1fr);min-height:126px;padding:12px}
      .yat-story-yati{width:48px;height:66px}.yat-story-copy h1{font-size:25px!important}.yat-story-copy p{font-size:10.5px}
      .yat-story-meta{grid-column:1/-1;display:flex;flex-direction:row;justify-content:space-between;align-items:center;width:100%;min-width:0}
      .yat-story-track-shell{height:55px;grid-template-columns:28px minmax(0,1fr) 28px}.yat-story-stop{flex-basis:126px}
      .yat-live-platform{height:62vh!important;min-height:500px!important;margin:8px!important}
      .yat-live-footer span:last-child{display:none}
    }
  `;
  document.head.appendChild(style);

  function waitForExistingUi(attempt = 0) {
    const hero = document.querySelector('.hero');
    const journey = document.querySelector('.yat-journey-hero');
    const canvas = document.querySelector('.yat-journey-canvas');
    const tour = document.getElementById('yat-guided-tour');
    const live = document.getElementById('yat-live-platform');
    if (hero && journey && canvas && tour && live) {
      build(hero, journey, canvas, tour, live);
      return;
    }
    if (attempt < 120) window.setTimeout(() => waitForExistingUi(attempt + 1), 50);
  }

  function build(hero, journey, canvas, oldTour, live) {
    if (document.body.classList.contains('yat-one-screen-home')) return;
    document.body.classList.add('yat-one-screen-home');

    /* Stop the legacy tour timer before removing its controls. */
    document.getElementById('yat-tour-pause')?.click();

    const heroShell = hero.querySelector(':scope > .shell');
    const top = document.createElement('div');
    top.className = 'yat-story-top';
    canvas.parentNode.insertBefore(top, canvas);
    top.appendChild(canvas);

    const narration = document.createElement('div');
    narration.className = 'yat-story-narration';
    narration.setAttribute('aria-live', 'polite');
    narration.innerHTML = `
      <img class="yat-story-yati" src="${YATI}" alt="YaTi, the YAT?STATS clubhouse guide">
      <div class="yat-story-copy">
        <span class="yat-story-kicker" id="yat-story-kicker"></span>
        <h1 id="yat-story-title"></h1>
        <p id="yat-story-copy"></p>
      </div>
      <div class="yat-story-meta">
        <span><b id="yat-story-count">01</b> / ${String(stops.length).padStart(2, '0')}</span>
        <span id="yat-story-mode">GUIDED TOUR</span>
        <div class="yat-story-controls"><button id="yat-story-prev" type="button" aria-label="Previous timeline stop">‹</button><button id="yat-story-next" type="button" aria-label="Next timeline stop">›</button></div>
      </div>`;
    top.appendChild(narration);

    const trackShell = document.createElement('div');
    trackShell.className = 'yat-story-track-shell';
    trackShell.innerHTML = `
      <button class="yat-story-track-arrow" id="yat-track-left" type="button" aria-label="Scroll timeline left">‹</button>
      <div class="yat-story-track" id="yat-story-track" role="tablist" aria-label="YAT?STATS story and feature timeline">
        ${stops.map((stop, index) => `<button class="yat-story-stop${index === 0 ? ' active' : ''}" type="button" role="tab" aria-selected="${index === 0}" data-story-index="${index}"><span class="yat-story-number">${String(index + 1).padStart(2, '0')}</span><span class="yat-story-label">${stop.label}</span></button>`).join('')}
      </div>
      <button class="yat-story-track-arrow" id="yat-track-right" type="button" aria-label="Scroll timeline right">›</button>`;
    journey.appendChild(trackShell);

    /* The frame is now the next row, not wrapped in a second marketing section. */
    heroShell.appendChild(live);
    oldTour.remove();

    const frame = live.querySelector('#yat-live-frame');
    const frameWrap = live.querySelector('#yat-live-wrap');
    const loader = live.querySelector('#yat-live-loading');
    const urlLabel = live.querySelector('#yat-live-url');
    const openFull = live.querySelector('#yat-live-open');
    const callout = live.querySelector('#yat-live-callout');
    const calloutLabel = live.querySelector('#yat-live-callout-label');
    const kicker = document.getElementById('yat-story-kicker');
    const title = document.getElementById('yat-story-title');
    const copy = document.getElementById('yat-story-copy');
    const count = document.getElementById('yat-story-count');
    const mode = document.getElementById('yat-story-mode');
    const track = document.getElementById('yat-story-track');
    const tabs = [...track.querySelectorAll('.yat-story-stop')];
    const prev = document.getElementById('yat-story-prev');
    const next = document.getElementById('yat-story-next');

    let activeIndex = 0;
    let manual = false;
    let timer = null;
    let lastUrl = '';

    function fitFrame() {
      if (!frame || !frameWrap) return;
      const width = frameWrap.clientWidth;
      const height = frameWrap.clientHeight;
      if (!width || !height) return;

      if (width < 820) {
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.transform = 'translateX(-50%) scale(1)';
        return;
      }

      const logicalWidth = Math.max(1440, width);
      const scale = Math.min(1, width / logicalWidth);
      frame.style.width = `${logicalWidth}px`;
      frame.style.height = `${Math.ceil(height / scale)}px`;
      frame.style.transform = `translateX(-50%) scale(${scale})`;
    }

    function setManual() {
      if (manual) return;
      manual = true;
      mode.textContent = 'YOU’RE DRIVING';
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function update(index, userInitiated = false) {
      const stop = stops[index];
      if (!stop) return;
      if (userInitiated) setManual();
      activeIndex = index;

      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
        if (selected) tab.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
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

    tabs.forEach((tab) => tab.addEventListener('click', () => update(Number(tab.dataset.storyIndex), true)));
    prev.addEventListener('click', () => update((activeIndex - 1 + stops.length) % stops.length, true));
    next.addEventListener('click', () => update((activeIndex + 1) % stops.length, true));
    document.getElementById('yat-track-left')?.addEventListener('click', () => track.scrollBy({ left: -420, behavior: reducedMotion ? 'auto' : 'smooth' }));
    document.getElementById('yat-track-right')?.addEventListener('click', () => track.scrollBy({ left: 420, behavior: reducedMotion ? 'auto' : 'smooth' }));
    frameWrap.addEventListener('pointerdown', setManual, { passive: true });
    track.addEventListener('pointerdown', setManual, { passive: true });
    frame.addEventListener('load', () => {
      loader.classList.add('hidden');
      frame.classList.add('loaded');
      fitFrame();
    });

    if ('ResizeObserver' in window) new ResizeObserver(fitFrame).observe(frameWrap);
    window.addEventListener('resize', fitFrame, { passive: true });
    document.getElementById('yat-live-expand')?.addEventListener('click', () => window.setTimeout(fitFrame, 40));
    document.getElementById('yat-live-close')?.addEventListener('click', () => window.setTimeout(fitFrame, 40));

    /* Existing top-navigation labels now drive the timeline instead of hidden long-form sections. */
    const navMap = new Map([
      ['SEARCH', 'search'],
      ['THE PROBLEM', 'why'],
      ['PROOF', 'hamilton'],
      ["WHO IT'S FOR", 'difference'],
      ['GOLDEN TIMELINE', 'timeline'],
      ['STORIES', 'contribute'],
    ]);
    document.querySelectorAll('.nav a').forEach((link) => {
      const key = navMap.get(link.textContent.trim().toUpperCase());
      if (!key) return;
      link.removeAttribute('target');
      link.setAttribute('href', '#');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const index = stops.findIndex((stop) => stop.key === key);
        if (index >= 0) update(index, true);
      });
    });

    update(0, false);
    fitFrame();
    if (!reducedMotion) timer = window.setInterval(() => { if (!manual) update((activeIndex + 1) % stops.length, false); }, AUTO_ADVANCE_MS);
    else mode.textContent = 'MANUAL TOUR';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => waitForExistingUi(), { once: true });
  else waitForExistingUi();
})();

(() => {
  if (window.__yatGuidedTourV2) return;
  window.__yatGuidedTourV2 = true;

  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const CUTOUT_PREFIX = `${S3_BASE}/players/cutouts/`;
  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const CAREER_BG = `${PLATFORM}/img/career-path-default.png`;
  const ROTATE_MS = 5200;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

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

    /* A live demo makes the old giant Hamilton screenshot redundant. Keep the proof metrics, not the screenshot. */
    #proof .proof-shot{display:none!important}#proof .proof-card{padding-top:2px!important}#proof .metrics{margin-top:0!important;border-top:0!important}

    @media(max-width:980px){
      .header-inner{min-height:62px!important}.brand img{width:132px!important}.section{padding:62px 0!important}.shell{width:min(100% - 30px,1280px)!important}
      .yat-journey-canvas{height:clamp(390px,58vw,580px)}.yat-journey-cutout-wrap{left:-1%;width:44%;height:102%}.yat-journey-badge{left:13px;bottom:13px}.yat-journey-scroll{right:14px;bottom:14px}
    }
    @media(max-width:620px){
      .section{padding:54px 0!important}.hero{padding-bottom:40px!important}.yat-journey-canvas{height:56.25vw;min-height:300px;max-height:420px}.yat-journey-bg{object-position:center center}.yat-journey-cutout-wrap{left:-5%;width:51%;height:103%}.yat-journey-badge{font-size:6px;padding:5px 7px}.yat-journey-scroll{font-size:6px}
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
    startRotation(hero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

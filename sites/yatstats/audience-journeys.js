// Four audience-specific guided tours (Fan, Coach, Player, Sponsor).
// This is the whole homepage narrative compressed into one horizontal strip
// instead of a vertical scroll: a two-column frame (photo/graphic left, copy
// right) that people slide through left-to-right. The very first frame is the
// existing homepage hero/tagline itself (same rotating high-school-silhouette
// graphic as before, on the career-path background) — not a separate hero
// section above it. Every frame after that is a feature/benefit with a CTA;
// clicking it drives the static live iframe below. The iframe never scrolls
// or resizes and carries no overlay — it's just the real site, plainly shown.
// Fan mounts eagerly in the original hero placement; Coach/Player/Sponsor are
// standalone sections lower on the page and lazy-load their iframe only once
// scrolled into view.
(() => {
  if (window.__yatAudienceJourneys) return;
  window.__yatAudienceJourneys = true;

  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const CUTOUT_PREFIX = `${S3_BASE}/players/cutouts/`;
  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const CAREER_BG = `${PLATFORM}/img/career-path-default.png`;
  const ROTATE_MS = 5200;
  const TOUR_MS = 6000;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // The real site drops from 5 columns to 4 below 1401px of actual
  // viewport width. Rendering the iframe at a fixed width comfortably above
  // that (and a fixed height covering two full rows), then CSS-scaling the
  // whole thing to fit whatever the wrap's real width is, means the site
  // inside always renders as if it had FRAME_W of room -- it never reflows
  // to 4-across, no matter how narrow the page around it gets.
  const FRAME_W = 1500;
  const FRAME_H = 950;

  // Cody Bellinger is a known Hamilton alumni record used as a stable tour example.
  const CODY_PROFILE = `${PLATFORM}/player/180827/cody-bellinger`;
  const CODY_CARD = `${PLATFORM}/?view=active&player=180827#player-180827`;

  // A small pool of real photography already used elsewhere on this site.
  // Reused across frames/sections as a placeholder — swap in dedicated
  // per-stop photography once available.
  const IMG_CARD_GALLERY = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69d3e9436ea2b5d7c0c73155.jpg';
  const IMG_FANS = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5fab618c8d2e6017c698.png';
  const IMG_FIELD = 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/8eYj1Uj7Ugt0PDUGHblx/media/69aa5f8c7bdf3880b88d573f.png';

  const css = `
    /* Density pass carried over from the old hero: keep the header compact. */
    .header-inner{min-height:58px!important}.brand img{width:126px!important}.nav{gap:16px!important}.nav a{font-size:.72rem!important}.button.small{min-height:34px!important;padding:7px 12px!important;font-size:.69rem!important}
    .section{padding:70px 0!important}.section-head{max-width:780px!important;margin-bottom:32px!important}.section-head h2{font-size:clamp(2rem,3.6vw,3.65rem)!important}.section-head p{font-size:.9rem!important}.shell{width:min(1280px,calc(100% - 42px))!important}
    .hero{padding:0 0 34px!important;background:#08090a!important;overflow:hidden!important}
    .hero>.shell{width:100%!important;max-width:none!important;margin:0!important}
    .hero:before{display:none!important}
    .hero-grid{display:block!important;width:100%!important}
    .hero-grid>.product-wrap,.hero-grid>div:first-child{display:none!important}
    .hero-media{display:none!important}

    /* Remove the old duplicate search UI. The live product itself is now the demonstration. */
    #global-search{display:none!important}
    #proof .proof-shot{display:none!important}#proof .proof-card{padding-top:2px!important}#proof .metrics{margin-top:0!important;border-top:0!important}

    .yat-tour{position:relative;width:min(1780px,calc(100% - 34px));margin:0 auto}
    .yat-audience-section .yat-tour{width:100%}

    .yat-frame-strip{position:relative;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:10px 10px 0 0;overflow:hidden}
    .yat-frame-strip::-webkit-scrollbar{display:none}
    .yat-frame-strip:after{content:"";position:absolute;left:0;right:0;bottom:0;z-index:3;height:3px;background:linear-gradient(90deg,rgba(245,165,51,.12),#f5a533 16%,#ffc947 52%,#f5a533 100%);box-shadow:0 0 7px rgba(255,207,62,.85),0 0 18px rgba(255,180,32,.48);pointer-events:none}
    .yat-frame{flex:0 0 100%;min-width:0;scroll-snap-align:start;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);height:clamp(210px,24vw,300px)}
    .yat-frame-photo{position:relative;overflow:hidden;background:#111;min-width:0}
    .yat-frame-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
    .yat-frame-photo.yat-rotating .yat-rotating-cutout{width:auto;left:2%;right:auto;object-fit:contain;object-position:left bottom;opacity:0;filter:drop-shadow(0 14px 20px rgba(0,0,0,.4));transition:opacity .85s ease}
    .yat-frame-photo.yat-rotating .yat-rotating-cutout.active{opacity:1}
    .yat-frame-copy{background:#fdfdfc;color:#14171a;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:clamp(16px,2.6vw,30px);min-width:0}
    .yat-frame-copy blockquote{margin:0;max-width:100%;overflow-wrap:break-word;font:800 clamp(1rem,1.7vw,1.5rem)/1.28 Manrope,Inter,sans-serif;letter-spacing:-.01em;color:#14171a}
    .yat-frame-copy mark{background:linear-gradient(135deg,#efb936,#ffd76a);color:#14171a;padding:1px 7px;border-radius:4px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
    .yat-frame-hint{margin:0;max-width:46ch;overflow-wrap:break-word;color:#54585e;font-size:.78rem;line-height:1.5}
    .yat-frame-cta{align-self:flex-start;margin-top:2px;display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:0;color:#96730f;font:800 .72rem/1 Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
    .yat-frame-cta:hover{color:#c99a1e}

    .yat-live-platform{position:relative;border:1px solid #35393e;border-radius:0 0 10px 10px;overflow:hidden;background:#0b0d0e;box-shadow:0 26px 70px rgba(0,0,0,.42)}
    .yat-live-platform.expanded{position:fixed;z-index:99998;inset:10px;margin:0;border-radius:12px;display:grid;grid-template-rows:auto 1fr auto;background:#090a0b}
    body.yat-live-preview-lock{overflow:hidden}
    .yat-live-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px 10px 8px 13px;min-height:44px;border-bottom:1px solid #292d31;background:linear-gradient(180deg,#141618,#0e1011)}
    .yat-live-address{min-width:0;display:flex;align-items:center;gap:9px}.yat-live-dots{display:flex;gap:4px;flex:0 0 auto}.yat-live-dots i{display:block;width:6px;height:6px;border-radius:50%;background:#3c4146}.yat-live-dots i:nth-child(2){background:#785d20}.yat-live-dots i:nth-child(3){background:#6f2630}
    .yat-live-url{min-width:0;color:#777c82;font-size:.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yat-live-url strong{color:#cacdd0;margin-right:6px}
    .yat-live-actions{display:flex;gap:6px;flex:0 0 auto}.yat-live-action{display:inline-flex;align-items:center;justify-content:center;min-height:29px;padding:0 9px;border:1px solid #30343a;border-radius:6px;background:#17191c;color:#c8cbce;font:800 8px/1 Inter,sans-serif;text-decoration:none;cursor:pointer}.yat-live-action:hover{border-color:#645124;color:#efc454}.yat-live-close{display:none}.yat-live-platform.expanded .yat-live-close{display:inline-flex}
    /* The iframe always renders at a fixed internal size (wide enough for
       the real site's 5-across layout) and is then CSS-scaled as one whole
       unit to fit whatever width the wrap actually has -- exactly like an
       <img> shrinking. The site inside never learns the container changed
       size, so it can never reflow to 4-across. */
    .yat-live-frame-wrap{position:relative;width:100%;overflow:hidden;background:#fff}
    .yat-live-platform.expanded .yat-live-frame-wrap{height:auto;min-height:0}

    /* Prototype: the WHOLE strip scrolls as one unit, graphic included --
       matching the real Golden Line strip (CareerStrip.tsx), where the
       anchor card is just the first item in one continuous scroll, not a
       pinned/sticky column. Drag it and everything moves together. */
    .yat-frame-wide{display:flex;align-items:stretch;overflow-x:auto;scrollbar-width:thin;height:clamp(140px,15vw,190px);background:#fdfdfc}
    .yat-frame-wide::-webkit-scrollbar{height:6px}
    .yat-frame-wide .yat-frame-photo{flex:0 0 260px;min-width:260px}
    .yat-number-link{flex:0 0 auto;display:flex;align-items:center;border:0;background:none;padding:0 16px;font:800 1.15rem/1 Manrope,Inter,sans-serif;color:#14171a;cursor:pointer;white-space:nowrap}
    .yat-number-link:hover,.yat-number-link.active{color:#c99a1e}
    .yat-live-loading{position:absolute;z-index:4;inset:0;display:grid;place-items:center;background:#0b0d0e;color:#878c91;font:700 9px/1.4 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;transition:opacity .2s ease}.yat-live-loading.hidden{opacity:0;pointer-events:none}.yat-live-loading span:before{content:"";display:block;width:23px;height:23px;margin:0 auto 10px;border:2px solid #33373c;border-top-color:#efb936;border-radius:50%;animation:yatSpin .8s linear infinite}@keyframes yatSpin{to{transform:rotate(360deg)}}
    .yat-live-frame{position:absolute;top:0;left:0;z-index:2;transform-origin:0 0;border:0;background:#fff;opacity:0;transition:opacity .2s ease}.yat-live-frame.loaded{opacity:1}
    .yat-live-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:8px 12px;border-top:1px solid #292d31;background:#0d0f10;color:#6f747a;font-size:.58rem}.yat-live-footer strong{color:#aeb2b6}.yat-live-footer em{font-style:normal;color:#cba744}

    @media(max-width:980px){
      .header-inner{min-height:62px!important}.brand img{width:132px!important}.section{padding:62px 0!important}.shell{width:min(100% - 30px,1280px)!important}
      .yat-live-action.open-full{display:none}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:620px){
      .section{padding:54px 0!important}
      .yat-frame{grid-template-columns:minmax(0,1fr);height:auto}
      .yat-frame-photo{height:36vw;min-height:150px}
      .yat-frame-copy{padding:14px 16px 16px}
      .yat-live-url{max-width:47vw}.yat-live-footer{align-items:flex-start;flex-direction:column;gap:3px}
      .yat-frame-wide{height:130px}.yat-frame-wide .yat-frame-photo{flex-basis:190px;min-width:190px}.yat-number-link{padding:0 12px;font-size:1rem}
    }
  `;

  const style = document.createElement('style');
  style.id = 'yat-audience-journeys-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ── Rotating high-school silhouette (the existing homepage hero graphic) ──
  // Reused verbatim as the photo for the Fan tour's first ("intro") frame.

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
    const fragments = shuffle(['an', 'er', 'on', 'ar', 'el', 'in', 'en', 'al', 'ma', 'ro', 'ch', 'br', 'wi', 'li', 'mi', 'jo', 'da', 'co']).slice(0, 7);
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

  async function startCutoutRotation(introPhotoEl) {
    if (!introPhotoEl) return;
    const imgs = [introPhotoEl.querySelector('.yat-cutout-a'), introPhotoEl.querySelector('.yat-cutout-b')];
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

  // ── Tour content, one dataset per audience ─────────────────────────────
  // The Fan tour's first stop is the homepage's own hero/tagline frame (no
  // CTA — it's the intro, not a feature). Every other stop is a feature with
  // a CTA that drives the live iframe when clicked. Photos are reused from
  // the site's existing image pool as a placeholder.

  const fanTour = {
    id: 'fan',
    stops: [
      { intro: true, quote: '“When a baseball player’s journey doesn’t end at graduation, <mark>neither should his story.</mark>”' },
      { image: IMG_FANS, quote: 'A big alumni list only helps if <mark>you can actually find your guy.</mark>', sub: 'Search the entire network by player, school or team.', url: PLATFORM, callout: 'Search the network' },
      { image: IMG_CARD_GALLERY, quote: 'Every alumni card has <mark>another side.</mark>', sub: 'Flip a card to move from the high-school story to current production.', url: CODY_CARD, callout: 'Flip a player card' },
      { image: IMG_FIELD, quote: 'Stats tell you what happened. <mark>They don’t have to lose where it started.</mark>', sub: 'Current production stays attached to the hometown identity.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'See current stats' },
      { image: IMG_FANS, quote: 'Stats tell you what happened. <mark>Memories tell you why it mattered.</mark>', sub: 'The Golden Timeline follows a player from high school through the pros.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'See the Golden Timeline' },
      { image: IMG_CARD_GALLERY, quote: 'The people who lived it <mark>can help preserve it.</mark>', sub: 'Fans, family and teammates can add photos and memories.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'Add a memory' },
    ],
  };

  const coachTour = {
    id: 'coach', alt: false,
    stops: [
      { image: IMG_FIELD, quote: 'Your former players are already a community — <mark>scattered across old spreadsheets and group texts.</mark>', sub: 'Give the program a living alumni home instead.', url: PLATFORM, callout: 'See your program' },
      { image: IMG_CARD_GALLERY, quote: 'Every era of the program, <mark>one gallery.</mark>', sub: 'Alumni tracking organized around your school, not scattered by team.', url: `${PLATFORM}/?view=active`, callout: 'See the alumni gallery' },
      { image: IMG_FANS, quote: 'Show boosters and families <mark>where a former player is now.</mark>', sub: 'Flip a card from the high-school story to current production.', url: CODY_CARD, callout: 'Flip a player card' },
      { image: IMG_FIELD, quote: 'Stay relevant <mark>before you ask for anything.</mark>', sub: 'Milestones and updates give families a reason to check in.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'See alumni news' },
      { image: IMG_CARD_GALLERY, quote: 'Championships, coaches and memories — <mark>preserved on one timeline.</mark>', sub: 'The Golden Timeline carries the program’s history forward.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'See the Golden Timeline' },
      { image: IMG_FANS, quote: 'A stronger pitch than <mark>another banner.</mark>', sub: 'A sponsor-ready community gives local partners a real offer.', url: PLATFORM, callout: 'See the community' },
    ],
  };

  const playerTour = {
    id: 'player', alt: true,
    stops: [
      { image: IMG_CARD_GALLERY, quote: 'High school is the anchor. <mark>It’s not the ceiling.</mark>', sub: 'One profile follows your journey through college, pro ball and beyond.', url: CODY_PROFILE, callout: 'See a player profile' },
      { image: IMG_FIELD, quote: 'Current production <mark>stays attached to home.</mark>', sub: 'Fans who knew you before can still follow what you’re doing now.', url: `${CODY_PROFILE}#ppTab-stats`, callout: 'See current stats' },
      { image: IMG_FANS, quote: 'Build the record <mark>a stat sheet can’t.</mark>', sub: 'Photos and milestones live on the Golden Timeline.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'See the Golden Timeline' },
      { image: IMG_CARD_GALLERY, quote: 'The hometown image <mark>never disappears.</mark>', sub: 'Your card flips from the high-school story to right now.', url: CODY_CARD, callout: 'Flip your player card' },
      { image: IMG_FIELD, quote: 'Share milestones with <mark>the people who already care.</mark>', sub: 'Hometown fans and former teammates follow along.', url: `${CODY_PROFILE}#ppTab-news`, callout: 'See player news' },
      { image: IMG_FANS, quote: 'Playing ends. <mark>The alumni identity doesn’t.</mark>', sub: 'Add your own photos and memories to the profile.', url: `${CODY_PROFILE}#ppTab-upload`, callout: 'Add a memory' },
    ],
  };

  const sponsorTour = {
    id: 'sponsor', alt: false,
    stops: [
      { image: IMG_CARD_GALLERY, quote: 'Parents, alumni and former teammates already care — <mark>because these are their people.</mark>', sub: 'Back a hometown community that already has real attention.', url: PLATFORM, callout: 'See the community' },
      { image: IMG_FIELD, quote: 'Nostalgia isn’t decoration. <mark>It’s an engagement engine.</mark>', sub: 'The Golden Timeline surfaces the memories that make a message land.', url: `${CODY_PROFILE}#playerCareerImages`, callout: 'See the Golden Timeline' },
      { image: IMG_FANS, quote: 'Put your brand <mark>inside the community.</mark>', sub: 'Appear around the alumni and stories people already value.', url: `${PLATFORM}/?view=active`, callout: 'See where you’d appear' },
      { image: IMG_CARD_GALLERY, quote: 'Real players. <mark>Not a mockup.</mark>', sub: 'Every flipped card is a real alumni community.', url: CODY_CARD, callout: 'Flip a player card' },
      { image: IMG_FIELD, quote: 'More than <mark>a booster donation.</mark>', sub: 'Fund a useful platform and earn measurable hometown exposure.', url: PLATFORM, callout: 'See the platform' },
      { image: IMG_FANS, quote: 'One school is the proof. <mark>Not the ceiling.</mark>', sub: 'The same model can extend to every program that activates YAT?STATS.', url: PLATFORM, callout: 'See the platform' },
    ],
  };

  // ── Prototype: 1–1000 index strip ───────────────────────────────────────
  // A literal proof that the strip can hold far more than a handful of
  // stops: the graphic stays put on the left, and 1000 numbered links sit
  // in a plain scrollable row to its right (only 1–9 visible on load).
  // Clicking a number cycles through the tour's real feature URLs so the
  // "click drives the iframe" wiring is still genuinely demonstrated.

  function buildNumberDemoMarkup(tour) {
    const numbers = Array.from({ length: 1000 }, (_, i) => i + 1)
      .map((n) => `<button type="button" class="yat-number-link" data-n="${n}">${n}</button>`)
      .join('');
    return `
      <div class="yat-frame yat-frame-wide" role="list" aria-label="Feature index, 1 to 1000">
        <div class="yat-frame-photo yat-rotating">
          <img class="yat-frame-bg" src="${CAREER_BG}" alt="">
          <img class="yat-rotating-cutout yat-cutout-a" alt="">
          <img class="yat-rotating-cutout yat-cutout-b" alt="">
        </div>
        ${numbers}
      </div>
      <div class="yat-live-platform">
        <div class="yat-live-bar">
          <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
          <div class="yat-live-actions"><button type="button" class="yat-live-action yat-live-expand">Expand</button><a class="yat-live-action open-full yat-live-open" href="${PLATFORM}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close">Close</button></div>
        </div>
        <div class="yat-live-frame-wrap">
          <div class="yat-live-loading"><span>Loading the live community</span></div>
          <iframe class="yat-live-frame" title="Live YAT?STATS tour" loading="lazy" allow="fullscreen; autoplay; clipboard-write"></iframe>
        </div>
        <div class="yat-live-footer"><span><strong>LIVE PLATFORM:</strong> everything inside the frame is the real Hamilton subdomain.</span><span><em>Click a number to change the live view (prototype — cycles through the real stops).</em></span></div>
      </div>`;
  }

  function wireNumberDemo(container, tour) {
    setupResponsiveFrame(container);
    const links = [...container.querySelectorAll('.yat-number-link')];
    const frame = container.querySelector('.yat-live-frame');
    const loader = container.querySelector('.yat-live-loading');
    const urlLabel = container.querySelector('.yat-live-url');
    const openFull = container.querySelector('.yat-live-open');
    const liveShell = container.querySelector('.yat-live-platform');
    const expand = container.querySelector('.yat-live-expand');
    const close = container.querySelector('.yat-live-close');
    const realStops = tour.stops.filter((stop) => !stop.intro);
    let lastUrl = '';

    function setIframe(url) {
      if (!url || lastUrl === url) return;
      lastUrl = url;
      openFull.href = url;
      try {
        const parsed = new URL(url);
        urlLabel.innerHTML = `<strong>LIVE YAT?STATS</strong>${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.hash || ''}`;
      } catch {}
      loader.classList.remove('hidden');
      frame.classList.remove('loaded');
      frame.src = url;
    }

    links.forEach((link, i) => link.addEventListener('click', () => {
      links.forEach((other) => other.classList.remove('active'));
      link.classList.add('active');
      setIframe(realStops[i % realStops.length]?.url);
    }));

    frame.addEventListener('load', () => { loader.classList.add('hidden'); frame.classList.add('loaded'); });
    expand.addEventListener('click', () => {
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

    setIframe(realStops[0]?.url || PLATFORM);
  }

  // Clicking anything inside an iframe shifts the OUTER document's focus
  // onto the <iframe> element itself, and browsers then auto-scroll the
  // outer page to bring that newly-focused element into view -- native
  // behavior, nothing to do with the microsite's own code (confirmed: the
  // real site's own scrollIntoView calls only ever touch its own document).
  // A one-shot correction on the `focus` event wasn't enough. Two likely
  // reasons: the browser's own auto-scroll can land over more than one
  // frame (so a single restore gets overwritten by the tail end of it), and
  // capturing window.scrollY *inside* the focus handler can already be too
  // late if the browser applies its correction synchronously as part of
  // the same focus dispatch. Fixed by tracking the scroll position
  // continuously -- but only while NOT guarding, so the bad jump itself
  // can never overwrite the last known-good value -- and then reverting
  // every scroll event (not just the first) for a short window after focus
  // moves into the iframe.
  //
  // Note: click/pointer events happening *inside* iframe content never
  // reach the outer document at all (that's the whole point of the frame
  // boundary), so the iframe's own `focus` event -- which the outer
  // document DOES receive as a proxy whenever focus moves anywhere inside
  // it -- is the only usable signal here, not pointerdown on our wrapper.
  let lastGoodScrollY = window.scrollY || 0;
  let scrollGuardActive = false;
  let scrollGuardTimer = null;

  function armScrollGuard() {
    scrollGuardActive = true;
    clearTimeout(scrollGuardTimer);
    scrollGuardTimer = setTimeout(() => { scrollGuardActive = false; }, 600);
  }

  window.addEventListener('scroll', () => {
    if (scrollGuardActive) {
      if (window.scrollY !== lastGoodScrollY) window.scrollTo(window.scrollX, lastGoodScrollY);
    } else {
      lastGoodScrollY = window.scrollY;
    }
  }, { passive: true });

  // Locks the iframe's own rendered size to FRAME_W x FRAME_H (so the site
  // inside always sees the same "viewport" and always lays out 5-across),
  // then scales the whole element down/up to match the wrap's real width --
  // the same trick as an <img> shrinking. Re-measures on any resize of the
  // wrap (window resize, expand/close, sidebar layout changes, etc.).
  function setupResponsiveFrame(container) {
    const wrap = container.querySelector('.yat-live-frame-wrap');
    const frame = container.querySelector('.yat-live-frame');
    frame.style.width = `${FRAME_W}px`;
    frame.style.height = `${FRAME_H}px`;

    function resize() {
      const scale = wrap.clientWidth / FRAME_W;
      frame.style.transform = `scale(${scale})`;
      wrap.style.height = `${FRAME_H * scale}px`;
    }

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap);
    else window.addEventListener('resize', resize);

    frame.addEventListener('focus', armScrollGuard);
  }

  // ── Shared engine ────────────────────────────────────────────────────────

  function frameMarkup(stop, index) {
    const photoHtml = stop.intro
      ? `<img class="yat-frame-bg" src="${CAREER_BG}" alt="">
         <img class="yat-rotating-cutout yat-cutout-a" alt="">
         <img class="yat-rotating-cutout yat-cutout-b" alt="">`
      : `<img src="${stop.image}" alt="" loading="lazy">`;
    const ctaHtml = stop.intro ? '' : `<button type="button" class="yat-frame-cta" data-index="${index}">${stop.callout} →</button>`;
    return `
      <div class="yat-frame">
        <div class="yat-frame-photo${stop.intro ? ' yat-rotating' : ''}">${photoHtml}</div>
        <div class="yat-frame-copy">
          <blockquote>${stop.quote}</blockquote>
          ${stop.sub ? `<p class="yat-frame-hint">${stop.sub}</p>` : ''}
          ${ctaHtml}
        </div>
      </div>`;
  }

  function buildTourMarkup(tour) {
    return `
      <div class="yat-frame-strip" role="region" aria-label="YAT?STATS tour">
        ${tour.stops.map((stop, index) => frameMarkup(stop, index)).join('')}
      </div>
      <div class="yat-live-platform">
        <div class="yat-live-bar">
          <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
          <div class="yat-live-actions"><button type="button" class="yat-live-action yat-live-expand">Expand</button><a class="yat-live-action open-full yat-live-open" href="${PLATFORM}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close">Close</button></div>
        </div>
        <div class="yat-live-frame-wrap">
          <div class="yat-live-loading"><span>Loading the live community</span></div>
          <iframe class="yat-live-frame" title="Live YAT?STATS tour" loading="lazy" allow="fullscreen; autoplay; clipboard-write"></iframe>
        </div>
        <div class="yat-live-footer"><span><strong>LIVE PLATFORM:</strong> everything inside the frame is the real Hamilton subdomain.</span><span><em>Click a stop above to change the live view.</em></span></div>
      </div>`;
  }

  // Wires one mounted tour block. The frame strip is a plain, continuously
  // scrollable row (swipe/drag/scroll — no arrows, no dots); scrolling just
  // browses frames and never touches the iframe. Clicking a frame's CTA is
  // the only thing that changes the STATIC iframe below, which otherwise
  // never moves, resizes, or carries anything drawn on top of it.
  // `lazy` defers the first iframe load until the block scrolls into view.
  function wireTour(container, tour, { lazy = false } = {}) {
    setupResponsiveFrame(container);
    const strip = container.querySelector('.yat-frame-strip');
    const frames = [...container.querySelectorAll('.yat-frame')];
    const ctas = [...container.querySelectorAll('.yat-frame-cta')];
    const frame = container.querySelector('.yat-live-frame');
    const loader = container.querySelector('.yat-live-loading');
    const urlLabel = container.querySelector('.yat-live-url');
    const openFull = container.querySelector('.yat-live-open');
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
      if (reducedMotion || interacted || tourTimer || frames.length < 2) return;
      tourTimer = setInterval(() => {
        activeIndex = (activeIndex + 1) % frames.length;
        strip.scrollTo({ left: frames[activeIndex].offsetLeft, behavior: 'smooth' });
      }, TOUR_MS);
    }

    function setIframe(url) {
      if (!url || lastUrl === url) return;
      lastUrl = url;
      openFull.href = url;
      try {
        const parsed = new URL(url);
        urlLabel.innerHTML = `<strong>LIVE YAT?STATS</strong>${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.hash || ''}`;
      } catch {}
      loader.classList.remove('hidden');
      frame.classList.remove('loaded');
      frame.src = url;
    }

    function begin() {
      if (started) return;
      started = true;
      setIframe(tour.stops.find((stop) => !stop.intro)?.url || PLATFORM);
      startTimer();
    }

    strip.addEventListener('pointerdown', () => pauseTour(), { once: true });
    strip.addEventListener('touchstart', () => pauseTour(), { once: true, passive: true });
    ctas.forEach((cta) => cta.addEventListener('click', () => {
      begin();
      pauseTour();
      setIframe(tour.stops[Number(cta.dataset.index)]?.url);
    }));

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
    const grid = document.querySelector('.hero-grid');
    if (grid) grid.dataset.journeyHero = '2';

    const tour = document.createElement('section');
    tour.id = 'yat-guided-tour';
    tour.className = 'yat-tour';
    // Prototype: 1-1000 index strip standing in for the feature/benefit
    // stops, per the "would you hide half the site at 100%" test — swap
    // back to buildTourMarkup/wireTour once the real stop count is settled.
    tour.innerHTML = buildNumberDemoMarkup(fanTour);
    oldSearch.insertAdjacentElement('afterend', tour);
    wireNumberDemo(tour, fanTour);
    startCutoutRotation(tour.querySelector('.yat-frame-photo.yat-rotating'));
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

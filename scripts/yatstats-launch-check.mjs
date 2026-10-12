// Real-browser launch check for the YAT?STATS homepage (yatstats.com).
// For each base URL in yatstats-launch-check.json, on desktop and mobile:
// every route loads with no missing same-origin files or script errors, the
// nav links resolve, refresh and no-slash deep links work, the live school
// iframe answers the tour's handshake, slide changes reach the school site
// as tour actions, and a jump to another school inside the iframe keeps the
// tour connected. Read-only: it only loads pages.
import { chromium } from 'playwright';
import fs from 'node:fs';

const { bases, redirects = [], spot = [] } = JSON.parse(fs.readFileSync(new URL('./yatstats-launch-check.json', import.meta.url)));
const ROUTES = ['', 'fans/', 'players/', 'programs/', 'partners/'];
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } };
const results = [];
const fail = (msg) => { results.push(`FAIL ${msg}`); };
const note = (msg) => { results.push(`note ${msg}`); };
// The school sites take tour commands only from these hosts (YatTourBridge
// on Easter-NEWS); anywhere else the iframe still works for visitors, but
// slides can't drive it.
const TRUSTED_TOUR_HOST = /^(www\.)?yatstats\.com$|^armsreach-[a-z0-9]+-arms-reach-digital-agency\.vercel\.app$|^armsreach-git-[a-z0-9-]+-arms-reach-digital-agency\.vercel\.app$/;
const ok = (msg) => { results.push(`ok   ${msg}`); };

const browser = await chromium.launch();
for (const base of bases) {
  const origin = new URL(base).origin;
  const trusted = TRUSTED_TOUR_HOST.test(new URL(base).hostname);
  results.push(`\n=== ${base} (tour commands ${trusted ? 'trusted' : 'NOT trusted on this host'})`);
  const sameSite = (r) => r.url().startsWith(origin);

  // Plain HTTP: each route, its no-slash form, and the legacy /sites/yatstats/ path.
  const http = await browser.newContext();
  for (const route of ROUTES) {
    const r = await http.request.get(base + route, { maxRedirects: 5 });
    (r.status() === 200 && sameSite(r) ? ok : fail)(`GET /${route} -> ${r.status()} ${sameSite(r) ? '' : 'redirected off-site: ' + r.url().slice(0, 60)}`);
    if (route) {
      const bare = base + route.replace(/\/$/, '');
      const rb = await http.request.get(bare, { maxRedirects: 5 });
      (rb.status() === 200 && sameSite(rb) ? ok : fail)(`GET /${route.replace(/\/$/, '')} (no slash, refresh/deep link) -> ${rb.status()} ${rb.url().replace(origin, '')}`);
    }
  }
  if (!base.includes('/sites/yatstats/')) {
    const legacy = await http.request.get(origin + '/sites/yatstats/fans/', { maxRedirects: 0 });
    ([301, 308].includes(legacy.status()) ? ok : fail)(`legacy /sites/yatstats/fans/ -> ${legacy.status()} ${legacy.headers().location || ''}`);
  }
  await http.close();

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const route of ROUTES) {
      const label = `${vpName} /${route}`;
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
      // In every frame: the school site records the tour messages it gets;
      // the homepage records what the school site sends back.
      await ctx.addInitScript(() => {
        window.__fromTour = []; window.__fromSite = [];
        addEventListener('message', (e) => {
          const d = e.data || {};
          if (d.source === 'yatstats-corporate-tour') window.__fromTour.push(`${d.type}${d.action ? ':' + d.action : ''}`);
          try { if (/(^|\.)yatstats\.com$/.test(new URL(e.origin).hostname)) window.__fromSite.push(d.type || '?'); } catch (_) {}
        });
      });
      const page = await ctx.newPage();
      const missing = []; const errors = [];
      page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) missing.push(`${r.status()} ${r.url().replace(origin, '')}`); });
      // Where each error came from: this page, or the school site in the iframe.
      page.on('pageerror', (e) => {
        const where = (String(e.stack || '').match(/https?:\/\/[^\s)]+/) || ['inline script'])[0].replace(/:\d+:\d+$/, '');
        errors.push(`${e.message.slice(0, 80)} @ ${where.slice(0, 90)}`);
      });
      const frameErrors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.startsWith(origin)) frameErrors.push(m.location().url.slice(0, 70)); });
      try {
        await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('.tour-shell', { timeout: 15000 });
        const info = await page.evaluate(() => ({
          audience: document.body.dataset.audience,
          frame: document.getElementById('frame')?.getAttribute('src') || '',
          overflow: document.documentElement.scrollWidth - innerWidth,
          nav: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)))],
        }));
        (info.frame.startsWith('https://hamilton.az.yatstats.com') ? ok : fail)(`${label} page up (${info.audience}), iframe ${info.frame}`);
        (info.overflow <= 1 ? ok : fail)(`${label} no sideways scroll (overflow ${info.overflow}px)`);
        for (const href of info.nav) {
          const r = await ctx.request.get(href);
          if (r.status() !== 200) fail(`${label} nav link ${href.replace(origin, '')} -> ${r.status()}`);
        }
        ok(`${label} ${info.nav.length} nav links checked`);

        // Handshake: the school site answers the tour's hello.
        await page.waitForFunction(() => window.__fromSite.includes('YAT_TOUR_ACK'), null, { timeout: 40000 }).catch(() => {});
        const fromSite = await page.evaluate(() => window.__fromSite.slice());
        (fromSite.includes('YAT_TOUR_ACK') ? ok : trusted ? fail : note)(`${label} school site answered the tour (${[...new Set(fromSite)].join(', ') || 'nothing'})`);

        // Slides: the next button sends tour actions into the live school site.
        const next = page.locator('#next');
        if (await next.count()) {
          for (let i = 0; i < 3; i++) { await next.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1200); }
          const site = page.frames().find((f) => f !== page.mainFrame() && /yatstats\.com/.test(new URL(f.url() || 'about:blank', 'https://x').hostname));
          const got = site ? await site.evaluate(() => window.__fromTour.slice()).catch(() => []) : [];
          const actions = got.filter((t) => t.startsWith('YAT_TOUR_ACTION'));
          (actions.length ? ok : fail)(`${label} slide clicks sent to the school site (${actions.join(', ') || 'none'})`);
        } else {
          fail(`${label} no #next slide button`);
        }

        // Cross-school: jump the iframe to another school and stay connected.
        if (vpName === 'desktop' && route === 'fans/') {
          const site = page.frames().find((f) => /hamilton\.az\.yatstats\.com/.test(f.url()));
          const before = (await page.evaluate(() => window.__fromSite.length));
          if (site) {
            await site.evaluate(() => { location.href = 'https://hamilton.az.yatstats.com/1729'; }).catch(() => {});
            await page.waitForTimeout(12000);
            const hosts = page.frames().filter((f) => f !== page.mainFrame()).map((f) => { try { return new URL(f.url()).hostname; } catch (_) { return ''; } }).filter((h) => h.endsWith('yatstats.com'));
            const after = await page.evaluate(() => window.__fromSite.slice());
            const moved = hosts.some((h) => h !== 'hamilton.az.yatstats.com');
            (moved ? ok : fail)(`${label} cross-school jump inside the iframe -> ${hosts.join(', ') || 'no school frame'}`);
            (after.length > before ? ok : trusted ? fail : note)(`${label} tour still connected after the jump (${[...new Set(after.slice(before))].join(', ') || 'no messages'})`);
          } else {
            fail(`${label} no Hamilton frame for the cross-school check`);
          }
        }

        await page.reload({ waitUntil: 'domcontentloaded' });
        const again = await page.waitForSelector('.tour-shell', { timeout: 15000 }).then(() => true).catch(() => false);
        (again ? ok : fail)(`${label} refresh reloads the tour`);
      } catch (error) {
        fail(`${label} ${String(error.message || error).split('\n')[0]}`);
      }
      if (missing.length) fail(`${label} missing files: ${missing.join(', ')}`);
      if (errors.length) fail(`${label} script errors: ${errors.join(' | ')}`);
      await ctx.close();
    }
  }
}
// After cutover: www goes to the apex, and school sites still answer.
if (redirects.length || spot.length) {
  results.push('\n=== redirects and school sites');
  const http = await browser.newContext();
  for (const [from, to] of redirects) {
    const r = await http.request.get(from, { maxRedirects: 0 }).catch((e) => null);
    const loc = r?.headers().location || '';
    (r && [301, 308].includes(r.status()) && loc.startsWith(to) ? ok : fail)(`${from} -> ${r?.status()} ${loc}`);
  }
  for (const url of spot) {
    const r = await http.request.get(url, { maxRedirects: 5, timeout: 60000 }).catch(() => null);
    (r && r.status() === 200 ? ok : fail)(`school site ${url} -> ${r?.status()} ${r ? r.url() : ''}`);
  }
  await http.close();
}
await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed - bases.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

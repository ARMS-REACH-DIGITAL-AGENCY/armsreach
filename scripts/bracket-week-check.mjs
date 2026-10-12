// Opens each test bracket's fantasy page at phone size, waits for the live
// board, and saves a screenshot plus the fantasy section's text.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BRACKETS = {
  'test-1': 'https://mike-crozite-template-7ug66mq32-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
  'test-2': 'https://mike-crozite-template-8eg40fqil-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
  'test-3': 'https://mike-crozite-template-eixpazyj1-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
  'test-4': 'https://mike-crozite-template-pj86dojio-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
  'test-5': 'https://mike-crozite-template-klrvdqj27-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
  'test-6': 'https://mike-crozite-template-b6f7o9ssr-arms-reach-digital-agency.vercel.app/5004#sec-fantasy',
};
fs.mkdirSync('results', { recursive: true });
const browser = await chromium.launch();
const summary = [`Run at ${new Date().toString()}`];
for (const [name, url] of Object.entries(BRACKETS)) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'America/Phoenix' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(20000);
    summary.push(`\n=== ${name} ${page.url()}`);
    await page.screenshot({ path: `results/${name}-top.png` });
    const sec = page.locator('#sec-fantasy');
    const text = (await sec.count()) ? await sec.innerText().catch(() => '') : await page.locator('body').innerText();
    summary.push(text.replace(/\n{2,}/g, '\n').slice(0, 6000));
    if (await sec.count()) await sec.screenshot({ path: `results/${name}-fantasy.png`, timeout: 8000 }).catch((e) => summary.push(`(section screenshot failed: ${e.message.split('\n')[0]})`));
    // Game 1 (Week 1): its innings should all be final.
    const g1 = page.getByText('GAME 1', { exact: true }).first();
    if (await g1.count()) {
      await g1.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `results/${name}-game1.png` });
    } else summary.push('(no GAME 1 tab found)');
    if (errors.length) summary.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
  } catch (e) {
    summary.push(`\n=== ${name} FAILED: ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync('results/summary.txt', summary.join('\n'));
console.log(summary.join('\n'));

// Saves what the six test brackets score from: the bracket index and each
// bracket's live lines (/api/bracket/live), for the Week 1 sports page.
import fs from 'node:fs';
const BASE = 'https://mike-crozite-template-d6dl2d5hg-arms-reach-digital-agency.vercel.app';
const FIELDS = {
  1: [25,1546,1198,34,536,5004,1729,44,4205,2196,3627,3997,1059,3395,8831,265],
  2: [8805,7733,1613,10039,2291,449,9174,473,5917,79,3733,7737,10152,2122,221,15367],
  3: [4895,25,12444,1412,10039,5065,1838,7826,473,523,463,1981,12546,1939,4830,1772],
  4: [8805,7733,4895,1412,2291,34,536,7826,5917,44,2971,2076,1151,1867,7763,1983],
  5: [1613,10410,1198,449,9174,1094,1729,79,2542,2039,11105,85,9010,10591,6649,3085],
  6: [12444,1546,10410,5065,1838,5004,1094,523,1718,13112,1363,1514,7660,1588,6776,3305],
};
fs.mkdirSync('results/news', { recursive: true });
const idx = await fetch(`${BASE}/bracket-lab/2026/index.json`);
console.log('index', idx.status);
fs.writeFileSync('results/news/index.json', await idx.text());
for (const [n, h] of Object.entries(FIELDS)) {
  const r = await fetch(`${BASE}/api/bracket/live?start=2026-10-05&weeks=2&h=${h.join(',')}`, { cache: 'no-store' });
  const t = await r.text();
  console.log('bracket', n, r.status, t.length);
  fs.writeFileSync(`results/news/live-${n}.json`, t);
}

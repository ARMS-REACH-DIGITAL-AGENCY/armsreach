/* YAT?STATS corporate website only. Port of SearchDrawerTabs.tsx renderers from read-only microsite repo at Easter-NEWS 7759d6e. No iframe, no microsite changes. */
(function(){
'use strict';
const PLATFORM_ORIGIN='https://hamilton.az.yatstats.com';
const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
const YAT_CIRCLE_CREST_FALLBACK = PLATFORM_ORIGIN + '/img/yatstats-logo-circle.png';
const HEADSHOT_SILHOUETTE_FALLBACK = PLATFORM_ORIGIN + '/img/headshot-silhouette.png';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function playerIdOf(player) {
  return String(player.playerId || player.playerid || player.id || '').trim();
}

function schoolIdOf(item) {
  return String(item.schoolId || item.hsid || '').trim();
}

function teamIdOf(item) {
  return String(item.currentTeamId || item.current_team_id || item.currentTeamid || item.current_teamid || item.teamid || item.teamId || item.team_id || '').trim();
}

// Keep search navigation inside the deployed preview instead of sending
// unpublished player IDs to their production school subdomains.
function isolatedPreviewSchoolPath(hsid) { return null; }

function playerUrl(player) {
  const hsid = encodeURIComponent(schoolIdOf(player));
  const playerId = encodeURIComponent(playerIdOf(player));
  const fallbackSlug = slugify(`${player.firstName || player.firstname || ''}-${player.lastName || player.lastname || ''}`);
  const slug = encodeURIComponent(String(player.slug || fallbackSlug));
  const microsite = String(player.micrositeUrl || player.microsite_url || '').trim().replace(/\/$/, '');

  const previewBase = isolatedPreviewSchoolPath(schoolIdOf(player));
  if (previewBase) return `${previewBase}/player/${playerId}/${slug}`;
  if (microsite) return `${microsite}/player/${playerId}/${slug}`;
  return `${PLATFORM_ORIGIN}/${hsid}/player/${playerId}/${slug}`;
}

function playerFlipCardUrl(player) {
  const playerId = encodeURIComponent(playerIdOf(player));
  const microsite = String(player.micrositeUrl || player.microsite_url || '').trim().replace(/\/$/, '');
  const base = isolatedPreviewSchoolPath(schoolIdOf(player)) || microsite || `${PLATFORM_ORIGIN}/${encodeURIComponent(schoolIdOf(player))}`;
  // A retired player's school crest opens his All-Time card, not an empty
  // Active Alumni gallery. The status comes from his actual school card.
  const status = String(player.statusLabel || player.status_label || player.status || '').trim().toUpperCase();
  const view = status.startsWith('RETIRED') || status === 'UNKNOWN' ? 'alltime' : 'active';
  return `${base}?view=${view}&player=${playerId}#player-${playerId}`;
}

function schoolUrl(program) {
  const previewBase = isolatedPreviewSchoolPath(String(program.hsid || program.schoolId || '').trim());
  if (previewBase) return previewBase;
  const microsite = String(program.microsite_url || program.micrositeUrl || '');
  if (microsite) return microsite;
  return `${PLATFORM_ORIGIN}/${encodeURIComponent(String(program.hsid || program.schoolId || ''))}`;
}

function schoolSectionUrl(program, section) {
  return `${schoolUrl(program).trim().split('#')[0]}#sec-${section}`;
}

function splitSchoolLocation(raw) {
  const parts = String(raw || '').split(',');
  return {
    city: (parts[0] || '').trim(),
    state: (parts.slice(1).join(',') || '').trim(),
  };
}

function cleanStateCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
}

function stateFullName(value) {
  const code = cleanStateCode(value);
  return STATE_NAMES[code] || String(value || 'Other').trim() || 'Other';
}

function cleanRank(value) {
  return String(value || '').trim().replace(/^#/, '').replace(/\s*\([A-Z]{2}\)\s*$/i, '');
}

function cleanLocation(city, state, fallback) {
  const c = String(city || '').trim();
  const s = String(state || '').trim();
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return String(fallback || '').trim();
}

function schoolCrestUrl(hsid, fallback) {
  const custom = String(fallback || '').trim();
  if (custom) return custom;
  return `${S3_BASE}/schools/${esc(hsid)}.png`;
}

function playerHeadshotUrl(player) {
  const custom = String(player.headshotUrl || player.headshot_url || player.playerImageUrl || player.player_image_url || player.imageUrl || player.image_url || player.photoUrl || player.photo_url || '').trim();
  if (custom) return custom;
  return `${S3_BASE}/players/now/${esc(playerIdOf(player))}.jpg`;
}

function teamLogoUrl(item) {
  const custom = String(item.teamLogoUrl || item.team_logo_url || item.currentTeamLogoUrl || item.current_team_logo_url || '').trim();
  if (custom) return custom;
  const id = teamIdOf(item);
  if (/^\d+$/.test(id)) return `${S3_BASE}/teams/${esc(id)}.png`;
  return YAT_CIRCLE_CREST_FALLBACK;
}

function schoolLogoFallback() {
  return YAT_CIRCLE_CREST_FALLBACK;
}

function playerHeadshotHtml(player) {
  // The API supplies the shared, identity-verified fallback chain. Keep the
  // existing URL contract for callers that have not supplied that field yet.
  const supplied = Array.isArray(player.headshotSources)
    ? player.headshotSources.filter((url) => typeof url === 'string' && Boolean(url.trim()))
    : [playerHeadshotUrl(player)];
  const sources = [...new Set([...supplied.filter((url) => url !== HEADSHOT_SILHOUETTE_FALLBACK), HEADSHOT_SILHOUETTE_FALLBACK])];
  const fallback = sources[0] === HEADSHOT_SILHOUETTE_FALLBACK;
  return `<img src="${esc(sources[0])}" alt="" class="yat-search-thumb yat-search-player-headshot" data-headshot-sources="${esc(JSON.stringify(sources))}" data-headshot-index="0" data-silhouette-fallback="${fallback}" onerror="const sources=JSON.parse(this.dataset.headshotSources||'[]');const index=Number(this.dataset.headshotIndex||0)+1;this.dataset.headshotIndex=String(index);if(!sources[index]){this.onerror=null;return;}this.dataset.silhouetteFallback=String(index===sources.length-1);if(index===sources.length-1)this.onerror=null;this.src=sources[index];" />`;
}

function renderPlayerRows(players, emptyText) {
  if (!players.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;

  return `
    <div class="yat-search-section-label">Players</div>
    <div class="yat-search-card-list yat-search-player-list">
      ${players.map((p) => {
        const name = String(p.displayName || `${p.firstName || p.firstname || ''} ${p.lastName || p.lastname || ''}`.trim() || p.playerId || 'Player');
        const school = String(p.schoolName || p.hsname || '').trim();
        const location = cleanLocation(p.city, p.state);
        const secondLine = [school, location ? `(${location})` : ''].filter(Boolean).join(' ');
        const team = String(p.currentTeamName || p.current_team_name || '').trim();
        const schoolHover = school ? `${school}${location ? ` (${location})` : ''} · Flip card gallery` : 'Flip card gallery';
        const crest = schoolCrestUrl(schoolIdOf(p), p.crestUrl || p.crest_url || p.logoUrl || p.logo_url || p.schoolLogoUrl || p.school_logo_url);
        return `
          <div class="yat-search-card yat-search-player-card yat-search-player-result" data-player-id="${esc(playerIdOf(p))}" data-player-name="${esc(name)}" data-headshot-url="${esc(playerHeadshotUrl(p))}" data-school-id="${esc(schoolIdOf(p))}" data-school-name="${esc(school)}">
            ${favoriteButtonHtml(p, name)}
            <a class="yat-search-player-headshot-link" href="${esc(playerUrl(p))}" title="Open ${esc(name)} profile">
              ${playerHeadshotHtml(p)}
            </a>
            <a class="yat-search-player-text-link" href="${esc(playerUrl(p))}" title="Open ${esc(name)} profile">
              <strong>${esc(name)}</strong>
              ${team ? `<small>${esc(team)}</small>` : ''}
              ${secondLine ? `<small class="yat-search-hs-line">${esc(secondLine)}</small>` : ''}
            </a>
            <a class="yat-search-player-flip-link" href="${esc(playerFlipCardUrl(p))}" title="${esc(schoolHover)}" aria-label="${esc(schoolHover)}">
              <img src="${esc(crest)}" alt="" class="yat-search-thumb yat-search-player-hs-logo" onerror="this.src='${schoolLogoFallback()}';this.onerror=null" />
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function favoriteButtonHtml(player, name) {
  const playerId = esc(playerIdOf(player));
  const schoolId = esc(schoolIdOf(player));
  return `
    <button
      type="button"
      class="yat-search-fav-btn"
      data-fav-player-id="${playerId}"
      data-fav-player-name="${esc(name)}"
      data-fav-school-id="${schoolId}"
      aria-pressed="false"
      aria-label="Open ${esc(name)} profile for favorites"
      title="Open ${esc(name)} profile to manage favorites"
    >
      <i class="ri-heart-line" aria-hidden="true"></i>
    </button>
  `;
}

function renderSchoolRows(
  programs,
  emptyText,
  includeBracketLinks = false,
  viewOnly = false,
  options = {},
) {
  if (!programs.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;
  // Contribute's picker and the post-upload crest review share this renderer.
  // Opt in only for normal Global Search results so those approved rows stay intact.
  const globalSearch = options.globalSearch === true && !viewOnly;

  const grouped = new Map();
  programs.forEach((s) => {
    const loc = splitSchoolLocation(s.hslocation || s.location);
    const stateCode = cleanStateCode(s.regionid || loc.state || s.state || 'OTHER') || 'OTHER';
    if (!grouped.has(stateCode)) grouped.set(stateCode, []);
    grouped.get(stateCode).push(s);
  });

  return Array.from(grouped.entries()).map(([state, rows]) => `
    <div class="yat-search-section-label yat-search-state-label">${esc(stateFullName(state))}</div>
    <div class="yat-search-card-list yat-search-school-list">
      ${rows.map((school) => {
        const hsid = String(school.hsid || school.schoolId || '');
        const name = String(school.hsname || school.schoolName || 'School');
        const loc = splitSchoolLocation(school.hslocation || school.location);
        const location = cleanLocation(loc.city, loc.state, school.hslocation || school.location);
        const crest = schoolCrestUrl(hsid, school.crestUrl || school.crest_url || school.logoUrl || school.logo_url || school.schoolLogoUrl || school.school_logo_url);
        const activeCount = Number(school.current_aa ?? 0);
        const statsPending = school.active_stats_pending === true;
        const activeLabel = statsPending
          ? (activeCount > 0 ? `${activeCount}+ ACTIVE ALUMNI · MORE 2026 STATS PENDING` : '2026 STATS PENDING')
          : `${activeCount} ACTIVE ALUMNI`;
        // Only explicitly seeded 2026 tournament schools get a bracket shortcut.
        // Having a player-linked school page does NOT imply tournament membership.
        const hasSchoolDestination = Boolean(String(school.microsite_url || school.micrositeUrl || '').trim());
        const bracketEligible = school.bracket_eligible === true || school.bracket_eligible === 'true';
        const unavailable = viewOnly || !hasSchoolDestination;
        const microsite = String(school.microsite_url || school.micrositeUrl || '').trim();
        const displayUrl = microsite.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        const displayUrlHtml = esc(displayUrl).replace(/\./g, '.<wbr>');
        const globalClass = globalSearch ? ' yat-search-school-global-card' : '';
        const meta = `data-school-id="${esc(hsid)}" data-school-name="${esc(name)}" data-school-location="${esc(location)}"`;
        const crestImg = `<img src="${esc(crest)}" alt="" loading="lazy" decoding="async" class="yat-search-thumb yat-search-school-thumb" onerror="this.src='${schoolLogoFallback()}';this.onerror=null" />`;
        const identity = `
          <span class="yat-search-row-text yat-search-school-identity">
            ${location ? `<small class="yat-search-school-location">${esc(location)}</small>` : ''}
            <strong>${esc(name)}</strong>
            ${globalSearch
              ? `${hasSchoolDestination ? `<small class="yat-search-school-url">${displayUrlHtml}</small>` : '<small class="yat-search-school-status">SCHOOL PAGE NOT AVAILABLE YET</small>'}`
              : `<small class="yat-search-school-status">${esc(activeLabel)}${unavailable ? ' · SCHOOL PAGE NOT AVAILABLE YET' : ''}</small>`}
          </span>
        `;
        const count = globalSearch ? (statsPending
          ? (activeCount > 0
            ? `<span class="yat-search-school-count is-partial" title="At least ${esc(activeCount)} active alumni are confirmed by 2026 game statistics. Additional 2026 statistics are pending."><strong>${esc(activeCount)}+</strong><small>ACTIVE<br />ALUMNI<span class="yat-search-count-note">STATS<br />PENDING</span></small></span>`
            : '<span class="yat-search-school-count is-pending" title="2026 statistics are not yet available for this school; the active count is pending."><strong>—</strong><small>2026<br />STATS<br />PENDING</small></span>')
          : `<span class="yat-search-school-count"><strong>${esc(activeCount)}</strong><small>ACTIVE<br />ALUMNI</small></span>`) : '';

        if (includeBracketLinks && hasSchoolDestination && bracketEligible && !viewOnly) return `
          <div class="yat-search-card yat-search-school-card yat-search-school-bracket-card${globalClass}" ${meta}>
            <div class="yat-search-school-topline">
              <a class="yat-search-school-crest-link yat-search-school-gallery-crest-link" href="${esc(schoolSectionUrl(school, 'active'))}" title="Open ${esc(name)} flip cards" aria-label="Open ${esc(name)} flip cards">
                ${crestImg}
              </a>
              <a class="yat-search-school-gallery-link" href="${esc(schoolSectionUrl(school, 'active'))}" title="Open ${esc(name)} flip cards" aria-label="Open ${esc(name)} flip cards">
                ${identity}
              </a>
              <a class="yat-search-school-bracket-link" href="${esc(schoolSectionUrl(school, 'fantasy'))}" title="${esc(name)} fantasy bracket · Starts February 1st" aria-label="Open ${esc(name)} fantasy bracket tournament. Starts February 1st.">
                <span class="yat-bracket-symbol" aria-hidden="true"></span>
              </a>
              ${count}
            </div>
          </div>
        `;

        // A school with no microsite can display a crest, but no fake link.
        // The school picker and post-upload crest review also remain view-only.
        const tag = unavailable ? 'div' : 'a';
        return `
          <${tag} class="yat-search-card yat-search-school-card${globalClass}" ${unavailable ? '' : `href="${esc(schoolUrl(school))}"`} ${meta}>
            <div class="yat-search-school-topline">
              <span class="yat-search-school-crest-link" aria-hidden="true">${crestImg}</span>
              ${identity}
              ${count}
            </div>
          </${tag}>
        `;
      }).join('')}
    </div>
  `).join('');
}

function renderTeamRows(players, emptyText) {
  if (!players.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;

  const grouped = new Map();
  players.forEach((p) => {
    const team = String(p.currentTeamName || p.current_team_name || 'Current Team Unknown').trim() || 'Current Team Unknown';
    const level = String(p.levelLabel || p.level_label || '').trim();
    const key = `${team}${level ? ` - ${level}` : ''}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(p);
  });

  return Array.from(grouped.entries()).map(([teamLevel, rows]) => {
    const first = rows[0] || {};
    return `
      <div class="yat-search-team-group">
        <div class="yat-search-team-heading">
          <img src="${esc(teamLogoUrl(first))}" alt="" class="yat-search-thumb yat-search-team-thumb" onerror="this.src='${schoolLogoFallback()}';this.onerror=null" />
          <span>${esc(teamLevel)}</span>
        </div>
        <div class="yat-search-card-list yat-search-team-player-list">
          ${rows.map((p) => {
            const name = String(p.displayName || `${p.firstName || p.firstname || ''} ${p.lastName || p.lastname || ''}`.trim() || p.playerId || 'Player');
            const school = String(p.schoolName || p.hsname || '').trim();
            const location = cleanLocation(p.city, p.state);
            const secondLine = [school, location ? `(${location})` : ''].filter(Boolean).join(' ');
        const team = String(p.currentTeamName || p.current_team_name || '').trim();
        const schoolHover = school ? `${school}${location ? ` (${location})` : ''} · Flip card gallery` : 'Flip card gallery';
            const crest = schoolCrestUrl(schoolIdOf(p), p.crestUrl || p.crest_url || p.logoUrl || p.logo_url || p.schoolLogoUrl || p.school_logo_url);
            return `
              <div class="yat-search-card yat-search-team-player-card yat-search-player-result" data-player-id="${esc(playerIdOf(p))}" data-player-name="${esc(name)}" data-headshot-url="${esc(playerHeadshotUrl(p))}" data-school-id="${esc(schoolIdOf(p))}" data-school-name="${esc(school)}">
                ${favoriteButtonHtml(p, name)}
                <a class="yat-search-player-headshot-link" href="${esc(playerUrl(p))}" title="Open ${esc(name)} profile">
                  ${playerHeadshotHtml(p)}
                </a>
                <a class="yat-search-player-text-link" href="${esc(playerUrl(p))}" title="Open ${esc(name)} profile">
                  <strong>${esc(name)}</strong>
                  ${team ? `<small>${esc(team)}</small>` : ''}
              ${secondLine ? `<small class="yat-search-hs-line">${esc(secondLine)}</small>` : ''}
                </a>
                <a class="yat-search-player-flip-link" href="${esc(playerFlipCardUrl(p))}" title="${esc(schoolHover)}" aria-label="${esc(schoolHover)}">
                  <img src="${esc(crest)}" alt="" class="yat-search-thumb yat-search-player-hs-logo" onerror="this.src='${schoolLogoFallback()}';this.onerror=null" />
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}



function init(){
  if(document.getElementById('drawerLeft'))return;
  const container=document.createElement('div');
  container.id='yatCorporateSearch';
  container.innerHTML=[
    '<button id="yatGlobalMask" type="button" aria-label="Close global search" class="yat-global-mask"></button>',
    '<aside id="drawerLeft" class="yat-global-left-drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Search the YAT?STATS database">',
      '<button id="yatGlobalClose" type="button" aria-label="Close global search" class="yat-global-close">×</button>',
      '<div class="yat-left-search-content">',
        '<div class="yat-search-drawer-title" id="gsTitle">SEARCH THE YAT?STATS DATABASE</div>',
        '<div class="yat-search-drawer-sub">Browse by the player&#39;s name, the high school he attended, or by his current college or professional team</div>',
        '<div class="yat-gs-input-wrap"><input id="gsInput" class="yat-gs-input" type="search" placeholder="Search by name, school, or team..." aria-label="Search YAT?STATS" aria-controls="gsResults" aria-autocomplete="list" autocomplete="off"><span class="yat-search-input-icon" aria-hidden="true">⌕</span></div>',
        '<div class="yat-search-mode-tabs" id="yatSearchModeTabs"><div class="yat-search-mode-buttons" role="tablist" aria-label="Search mode">',
          '<button type="button" class="yat-search-mode-btn active" data-search-mode="name">PLAYER NAME</button>',
          '<button type="button" class="yat-search-mode-btn" data-search-mode="school">HIGH SCHOOL</button>',
          '<button type="button" class="yat-search-mode-btn" data-search-mode="team">CURRENT TEAM</button>',
        '</div></div>',
        '<div class="yat-search-status" role="status" aria-live="polite" hidden></div>',
        '<div class="yat-gs-results" id="gsResults" role="listbox" aria-label="Search results" aria-live="polite" aria-atomic="true"></div>',
      '</div>',
    '</aside>'
  ].join('');
  document.body.appendChild(container);
  const drawer=document.getElementById('drawerLeft'),input=document.getElementById('gsInput');
  const results=document.getElementById('gsResults');
  const status=drawer.querySelector('.yat-search-status');
  const buttons=Array.from(drawer.querySelectorAll('[data-search-mode]'));
  let mode='name',timer=null,controller=null,requestId=0,intendedKey=null;
  let phase='idle',nextTeamOffset=null,loadingTeamPage=false,observer=null;
  let restoreFocus=null;
  const cache=new Map();
  function setStatus(message=''){
    status.textContent=message;status.hidden=!message;
    results.setAttribute('aria-busy',String(Boolean(message)));
  }
  function invalidate(){
    requestId++;
    if(timer!==null)clearTimeout(timer);timer=null;
    controller?.abort();controller=null;
    observer?.disconnect();observer=null;nextTeamOffset=null;loadingTeamPage=false;
    return requestId;
  }
  function openSearch(){
    restoreFocus=document.activeElement;
    document.querySelector('.nav')?.classList.remove('open');
    document.getElementById('navBackdrop')?.classList.remove('open');
    document.body.style.overflow='';
    document.body.classList.add('yat-global-search-open');
    drawer.setAttribute('aria-hidden','false');
    document.querySelectorAll('[data-yat-global-search-open]').forEach(b=>b.setAttribute('aria-expanded','true'));
    input.focus();input.select();
    // Closing aborts pending work. Reopen with an existing query must not
    // remain stuck on the canceled request's loading state.
    if(input.value.trim())requestSearch(true);
  }
  function closeSearch(){
    document.body.classList.remove('yat-global-search-open');
    drawer.setAttribute('aria-hidden','true');
    document.querySelectorAll('[data-yat-global-search-open]').forEach(b=>b.setAttribute('aria-expanded','false'));
    invalidate();
    intendedKey=null;
    phase='idle';
    setStatus();
    if(restoreFocus?.isConnected)restoreFocus.focus();
  }
  window.YatGlobalSearchOpen=openSearch;
  async function loadSearch(url,signal){
    const response=await fetch(PLATFORM_ORIGIN+url,{cache:'no-store',signal});
    if(!response.ok)throw new Error('Search returned '+response.status);
    return response.json();
  }
  function readCache(key){
    const now=Date.now();
    for(const [k,v] of cache)if(v.expiresAt<=now)cache.delete(k);
    const entry=cache.get(key);
    if(entry){cache.delete(key);cache.set(key,entry);}
    return entry;
  }
  function writeCache(key,data){
    cache.delete(key);cache.set(key,{data,expiresAt:Date.now()+30000});
    while(cache.size>24)cache.delete(cache.keys().next().value);
  }
  function installMore(){
    observer?.disconnect();observer=null;
    const loadBtn=results.querySelector('.yat-search-load-more');
    if(!loadBtn||nextTeamOffset===null)return;
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting))void loadNextPage();
      },{root:results,rootMargin:'260px 0px'});
      observer.observe(loadBtn);
    }
  }
  async function loadNextPage(){
    if(mode!=='team'||nextTeamOffset===null||loadingTeamPage)return;
    const offset=nextTeamOffset,q=input.value.trim(),id=requestId;
    if(intendedKey!=='team\0'+q)return;
    const loadBtn=results.querySelector('.yat-search-load-more');
    loadingTeamPage=true;
    observer?.disconnect();
    if(loadBtn){loadBtn.disabled=true;loadBtn.textContent='Loading more teams…';}
    const ac=new AbortController();controller=ac;
    try{
      const data=await loadSearch('/api/teams/search?q='+encodeURIComponent(q)+'&limit=75&offset='+offset,ac.signal);
      if(id!==requestId||ac.signal.aborted)return;
      const html=renderTeamRows(Array.isArray(data.teams)?data.teams:[],'');
      loadBtn?.remove();
      if(html)results.insertAdjacentHTML('beforeend',html);
      nextTeamOffset=data.hasMore&&Number.isFinite(data.nextOffset)&&data.nextOffset>offset?data.nextOffset:null;
      if(nextTeamOffset!==null)results.insertAdjacentHTML('beforeend','<button type="button" class="yat-search-load-more">Load more teams</button>');
    }catch{
      if(id===requestId&&!ac.signal.aborted&&loadBtn){loadBtn.disabled=false;loadBtn.textContent='Retry loading more teams';}
    }finally{
      if(controller===ac)controller=null;
      loadingTeamPage=false;
      if(id===requestId)installMore();
    }
  }
  function renderData(searchMode,data){
    if(searchMode==='school')results.innerHTML=renderSchoolRows(Array.isArray(data.programs)?data.programs:[],'No school matches.',true,false,{globalSearch:true});
    else{
      results.innerHTML=searchMode==='name'
        ?renderPlayerRows(Array.isArray(data.players)?data.players:[],'No player matches.')
        :renderTeamRows(Array.isArray(data.teams)?data.teams:[],'No current team matches.');
      nextTeamOffset=searchMode==='team'&&data.hasMore&&Number.isFinite(data.nextOffset)?data.nextOffset:null;
      if(nextTeamOffset!==null)results.insertAdjacentHTML('beforeend','<button type="button" class="yat-search-load-more">Load more teams</button>');
    }
    installMore();phase='ready';setStatus();
  }
  async function runSearch(q,searchMode,key,id){
    if(id!==requestId)return;
    const ac=new AbortController();controller=ac;phase='loading';
    const endpoint=searchMode==='name'?'players':searchMode==='school'?'schools':'teams';
    const limit=searchMode==='name'?200:searchMode==='school'?30:75;
    try{
      const data=await loadSearch('/api/'+endpoint+'/search?q='+encodeURIComponent(q)+'&limit='+limit,ac.signal);
      if(id!==requestId||ac.signal.aborted)return;
      writeCache(key,data);renderData(searchMode,data);
    }catch{
      if(id!==requestId||ac.signal.aborted)return;
      phase='error';setStatus();
      results.innerHTML='<div class="yat-search-empty" role="alert">Search failed. Try again.</div>';
    }finally{if(controller===ac)controller=null;}
  }
  function requestSearch(immediate=false){
    const q=input.value.trim(),key=mode+'\0'+q;
    if(key===intendedKey&&phase!=='error'){
      if(immediate&&timer!==null){clearTimeout(timer);timer=null;void runSearch(q,mode,key,requestId);}
      return;
    }
    const id=invalidate();intendedKey=key;
    if(!q){phase='idle';setStatus();results.innerHTML='';return;}
    const cached=readCache(key);
    if(cached){renderData(mode,cached.data);return;}
    phase='waiting';setStatus('Searching for “'+q+'”…');
    if(immediate)void runSearch(q,mode,key,id);
    else timer=setTimeout(()=>{timer=null;void runSearch(q,mode,key,id);},90);
  }
  input.addEventListener('input',()=>requestSearch());
  input.addEventListener('search',()=>requestSearch());
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();requestSearch(true);}});
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    const next=btn.dataset.searchMode;
    if(!['name','school','team'].includes(next))return;
    mode=next;
    buttons.forEach(button=>button.classList.toggle('active',button.dataset.searchMode===next));
    requestSearch(true);
  }));
  document.addEventListener('click',e=>{
    const el=e.target instanceof Element?e.target:null;
    const trigger=el?.closest('[data-yat-global-search-open]');
    if(trigger){e.preventDefault();openSearch();return;}
    if(el?.closest('#yatGlobalClose')||el?.closest('#yatGlobalMask')){e.preventDefault();closeSearch();return;}
    if(el?.closest('.yat-search-load-more')){e.preventDefault();void loadNextPage();return;}
    const fav=el?.closest('.yat-search-fav-btn');
    if(fav&&drawer.contains(fav)){
      e.preventDefault();
      // Account actions use the REAL microsite login/Favorites flow.
      // Never present a fake successful save from a different origin.
      const card=fav.closest('.yat-search-player-result');
      const url=card?.querySelector('.yat-search-player-headshot-link')?.getAttribute('href');
      if(url)window.location.assign(url);
    }
  });
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('yat-global-search-open'))return;
    if(e.key==='Escape'){e.preventDefault();closeSearch();return;}
    if(e.key!=='Tab')return;
    const focusables=Array.from(drawer.querySelectorAll('button:not([disabled]),input,a[href]')).filter(el=>el.getClientRects().length);
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

})();

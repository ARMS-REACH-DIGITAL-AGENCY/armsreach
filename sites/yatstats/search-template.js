(() => {
  const API_BASE = 'https://hamilton.az.yatstats.com';
  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const CREST_FALLBACK = `${API_BASE}/img/yatstats-logo-circle.png`;
  const HEADSHOT_FALLBACK = `${API_BASE}/img/headshot-silhouette.png`;
  const DEBOUNCE_MS = 250;

  const styles = `
  /* Homepage global search, intentionally mirrors mike_crozite_template SearchDrawerTabs behavior */
  #global-search.yat-template-search{position:relative;margin-top:44px;border:1px solid #34383d;border-radius:22px;background:radial-gradient(circle at 76% 0%,rgba(239,185,54,.12),transparent 30%),linear-gradient(145deg,#121416,#0c0e10);padding:28px;box-shadow:0 34px 90px rgba(0,0,0,.42)}
  #global-search.yat-template-search:before{content:"";position:absolute;inset:-1px;border-radius:22px;padding:1px;background:linear-gradient(120deg,rgba(239,185,54,.32),transparent 28%,transparent 70%,rgba(239,185,54,.12));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
  .yat-home-search-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}
  .yat-home-search-head h2{font:800 clamp(2rem,4vw,3.8rem)/1.02 Manrope,Inter,sans-serif;letter-spacing:-.045em;margin:0}.yat-home-search-head h2 span{color:var(--gold)}
  .yat-home-search-head p{max-width:450px;margin:0;color:#92969b;font-size:.82rem}
  .yat-home-search-sub{margin:5px 0 0!important;max-width:650px!important;font-family:Oswald,Inter,sans-serif!important;font-size:.75rem!important;letter-spacing:.02em;text-transform:uppercase;color:#868b91!important}
  .yat-home-search-input-wrap{display:flex;align-items:center;border:1px solid #3a3f45;background:#090b0c;border-radius:12px}.yat-home-search-input-wrap:focus-within{border-color:#8d702c;box-shadow:0 0 0 3px rgba(239,185,54,.08)}
  .yat-home-search-icon{width:50px;display:grid;place-items:center;color:var(--gold);font-size:1.15rem;flex:0 0 auto}
  #yat-home-search-input{width:100%;border:0;outline:0;background:transparent;color:#fff;padding:16px 10px 16px 0;font-size:1rem}#yat-home-search-input::placeholder{color:#666b71}
  .yat-home-search-clear{display:none;border:0;background:transparent;color:#8b8f94;padding:10px 15px;cursor:pointer}.yat-home-search-clear.show{display:block}.yat-home-search-clear:hover{color:#fff}
  .yat-home-search-mode-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 14px}
  .yat-home-search-mode-btn{min-height:40px;border:1px solid #30353a;border-radius:8px;background:rgba(255,255,255,.035);color:#aeb2b6;font:500 .72rem/1.05 Oswald,Inter,sans-serif;letter-spacing:.035em;text-transform:uppercase;cursor:pointer;transition:.16s ease}
  .yat-home-search-mode-btn:hover{border-color:#594923;color:#fff}.yat-home-search-mode-btn.active{border-color:#8d702c;background:rgba(239,185,54,.09);color:var(--gold2);box-shadow:0 0 24px rgba(239,185,54,.05)}
  .yat-home-search-explain{display:flex;gap:16px;flex-wrap:wrap;color:#757a80;font-size:.64rem;margin:0 2px 13px}.yat-home-search-explain strong{color:#aeb2b7}.yat-home-search-explain span{display:flex;align-items:center;gap:6px}.yat-home-search-explain i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold)}
  #yat-home-search-results{min-height:24px}.yat-search-empty{color:#7e8389;font:400 .8rem/1.4 Oswald,Inter,sans-serif;padding:16px 2px}
  .yat-search-section-label{margin:16px 0 9px;color:#8b9096;font:800 .68rem/1 Oswald,Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase}.yat-search-state-label{color:#c5c7ca;font-size:.75rem}
  .yat-search-card-list{display:flex;flex-direction:column;gap:7px}.yat-search-card{color:#e9eaeb;text-decoration:none;border:1px solid #292e33;background:rgba(255,255,255,.025);border-radius:10px;transition:.15s ease}.yat-search-card:hover{border-color:#55471f;background:rgba(239,185,54,.035)}
  .yat-search-player-result{display:grid!important;grid-template-columns:58px minmax(0,1fr) 52px;align-items:center;column-gap:12px;padding:9px 12px}.yat-search-player-result a{color:inherit;text-decoration:none}
  .yat-search-player-headshot-link{display:flex;align-items:center;justify-content:center}.yat-search-player-headshot{width:52px;height:52px;object-fit:cover;border-radius:6px;background:#090a0b}
  .yat-search-player-text-link{display:flex;min-width:0;flex-direction:column;gap:4px}.yat-search-player-text-link strong{font:900 1rem/1.05 Oswald,Inter,sans-serif;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yat-search-player-text-link small{color:#8f949a;font:400 .67rem/1.15 Oswald,Inter,sans-serif;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .yat-search-player-flip-link{display:flex;align-items:center;justify-content:flex-end}.yat-search-player-hs-logo{width:45px;height:45px;object-fit:contain;background:transparent}.yat-search-player-headshot-link:hover img,.yat-search-player-flip-link:hover img{transform:scale(1.04)}.yat-search-player-headshot,.yat-search-player-hs-logo{transition:transform .15s ease}
  .yat-search-school-card{display:flex;align-items:stretch;flex-direction:column;gap:9px;padding:11px}.yat-search-school-topline{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:10px;width:100%}.yat-search-school-crest-link{display:flex;align-items:center;justify-content:center;width:54px;height:54px}.yat-search-school-thumb{width:52px;height:52px;object-fit:contain}.yat-search-row-text{display:flex;min-width:0;flex-direction:column;gap:4px}.yat-search-row-text strong{font:800 .95rem/1.05 Oswald,Inter,sans-serif;text-transform:uppercase}.yat-search-row-text small{color:#8f949a;font:400 .67rem/1.2 Oswald,Inter,sans-serif;text-transform:uppercase}.yat-search-school-badge{border:1px solid rgba(255,255,255,.16);border-radius:5px;padding:5px 7px;color:#83888e;font:700 .55rem/1 Oswald,Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}.yat-search-school-badge.live{border-color:rgba(0,255,140,.45);color:#61dba1}.yat-search-school-badge.candidate{border-color:rgba(255,209,102,.55);color:#ffd166}
  .yat-search-school-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;border-top:1px solid #292e33;padding-top:8px}.yat-search-school-stats span{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0}.yat-search-school-stats strong{color:#f1f2f3;font:900 .9rem/1 Oswald,Inter,sans-serif;white-space:nowrap}.yat-search-school-stats small{color:#777c82;font:400 .5rem/1.1 Oswald,Inter,sans-serif;text-transform:uppercase;white-space:nowrap}
  .yat-search-team-group{margin:15px 0 4px}.yat-search-team-heading{display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:11px;margin-bottom:7px;color:#e1e2e4;font:800 .82rem/1.1 Oswald,Inter,sans-serif;letter-spacing:.05em;text-transform:uppercase}.yat-search-team-thumb{width:50px;height:50px;object-fit:contain}.yat-search-team-player-card{border-radius:0;border-width:0 0 1px;background:transparent}.yat-search-team-player-card:hover{background:rgba(239,185,54,.025)}
  .yat-home-search-footer{display:flex;justify-content:space-between;gap:15px;align-items:center;margin-top:17px;padding-top:15px;border-top:1px solid #25292d;color:#70757b;font-size:.63rem}.yat-home-search-footer strong{color:#aeb2b7}
  @media(max-width:720px){#global-search.yat-template-search{padding:20px;margin-top:34px}.yat-home-search-head{align-items:flex-start;flex-direction:column}.yat-home-search-head h2{font-size:2.2rem}.yat-home-search-mode-buttons{gap:6px}.yat-home-search-mode-btn{font-size:.65rem;min-height:38px}.yat-home-search-explain{display:none}.yat-search-player-result{grid-template-columns:54px minmax(0,1fr) 48px;padding:8px 8px;column-gap:9px}.yat-search-player-headshot{width:48px;height:48px}.yat-search-player-hs-logo{width:41px;height:41px}.yat-search-school-topline{grid-template-columns:53px minmax(0,1fr) auto;gap:8px}.yat-search-school-thumb{width:48px;height:48px}.yat-search-school-badge{font-size:.48rem;padding:4px 5px}.yat-search-school-stats strong{font-size:.8rem}.yat-search-school-stats small{font-size:.44rem}.yat-home-search-footer{align-items:flex-start;flex-direction:column}}
  `;

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function playerIdOf(p){ return String(p?.playerId || p?.playerid || p?.id || '').trim(); }
  function schoolIdOf(p){ return String(p?.schoolId || p?.hsid || '').trim(); }
  function teamIdOf(p){ return String(p?.currentTeamId || p?.current_team_id || p?.teamid || p?.teamId || '').trim(); }
  function playerProfileUrl(p){
    const playerId = encodeURIComponent(playerIdOf(p));
    const hsid = encodeURIComponent(schoolIdOf(p));
    const fallbackSlug = slugify(`${p?.firstName || p?.firstname || ''}-${p?.lastName || p?.lastname || ''}`);
    const slug = encodeURIComponent(String(p?.slug || fallbackSlug || 'player'));
    const microsite = String(p?.micrositeUrl || p?.microsite_url || '').trim().replace(/\/$/, '');
    if(microsite) return `${microsite}/player/${playerId}/${slug}`;
    return `${API_BASE}/${hsid}/player/${playerId}/${slug}`;
  }
  function playerFlipCardUrl(p){
    const playerId = encodeURIComponent(playerIdOf(p));
    const microsite = String(p?.micrositeUrl || p?.microsite_url || '').trim().replace(/\/$/, '');
    const base = microsite || `${API_BASE}/${encodeURIComponent(schoolIdOf(p))}`;
    return `${base}?view=active&player=${playerId}#player-${playerId}`;
  }
  function schoolUrl(p){
    const microsite = String(p?.microsite_url || p?.micrositeUrl || '').trim();
    if(microsite) return microsite;
    return `${API_BASE}/${encodeURIComponent(String(p?.hsid || p?.schoolId || ''))}`;
  }
  function schoolCrestUrl(p){
    const custom = String(p?.crestUrl || p?.crest_url || p?.logoUrl || p?.logo_url || p?.schoolLogoUrl || p?.school_logo_url || '').trim();
    if(custom) return custom;
    const id = schoolIdOf(p);
    return id ? `${S3_BASE}/schools/${encodeURIComponent(id)}.png` : CREST_FALLBACK;
  }
  function playerHeadshotUrl(p){
    const custom = String(p?.headshotUrl || p?.headshot_url || p?.playerImageUrl || p?.player_image_url || p?.imageUrl || p?.image_url || '').trim();
    return custom || `${S3_BASE}/players/now/${encodeURIComponent(playerIdOf(p))}.jpg`;
  }
  function teamLogoUrl(p){
    const custom = String(p?.teamLogoUrl || p?.team_logo_url || p?.currentTeamLogoUrl || '').trim();
    if(custom) return custom;
    const id = teamIdOf(p);
    return /^\d+$/.test(id) ? `${S3_BASE}/teams/${encodeURIComponent(id)}.png` : CREST_FALLBACK;
  }
  function locationFor(p){ return [p?.city,p?.state].filter(Boolean).join(', '); }
  function splitSchoolLocation(raw){ const parts=String(raw||'').split(','); return {city:(parts[0]||'').trim(),state:(parts.slice(1).join(',')||'').trim()}; }
  function stateName(code){
    const states={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia'};
    const clean=String(code||'').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,2); return states[clean]||clean||'Other';
  }
  function rank(value){ return String(value??'').trim().replace(/^#/,'').replace(/\s*\([A-Z]{2}\)\s*$/i,''); }
  function imgFallback(img, fallback){ img.onerror=null; img.src=fallback; }
  window.yatHomeImgFallback = imgFallback;

  function renderPlayerRows(players, emptyText){
    if(!players.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;
    return `<div class="yat-search-section-label">Players</div><div class="yat-search-card-list yat-search-player-list">${players.map(p=>{
      const name=String(p?.displayName || `${p?.firstName||p?.firstname||''} ${p?.lastName||p?.lastname||''}`.trim() || 'Player');
      const school=String(p?.schoolName||p?.hsname||'').trim();
      const loc=locationFor(p);
      const second=[school,loc?`(${loc})`:''].filter(Boolean).join(' ');
      return `<div class="yat-search-card yat-search-player-card yat-search-player-result">
        <a class="yat-search-player-headshot-link" href="${esc(playerProfileUrl(p))}" title="Open ${esc(name)} full player profile"><img src="${esc(playerHeadshotUrl(p))}" class="yat-search-player-headshot" alt="${esc(name)} current headshot" onerror="yatHomeImgFallback(this,'${HEADSHOT_FALLBACK}')"></a>
        <a class="yat-search-player-text-link" href="${esc(playerProfileUrl(p))}" title="Open ${esc(name)} full player profile"><strong>${esc(name)}</strong>${second?`<small>${esc(second)}</small>`:''}</a>
        <a class="yat-search-player-flip-link" href="${esc(playerFlipCardUrl(p))}" title="Open ${esc(name)} on ${esc(school||'his high school')} home page"><img src="${esc(schoolCrestUrl(p))}" class="yat-search-player-hs-logo" alt="${esc(school)} crest" onerror="yatHomeImgFallback(this,'${CREST_FALLBACK}')"></a>
      </div>`;
    }).join('')}</div>`;
  }

  function renderSchoolRows(programs, emptyText){
    if(!programs.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;
    const groups=new Map();
    programs.forEach(s=>{const loc=splitSchoolLocation(s?.hslocation||s?.location);const key=String(s?.regionid||loc.state||s?.state||'OTHER').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,2)||'OTHER';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);});
    return Array.from(groups.entries()).map(([state,rows])=>`<div class="yat-search-section-label yat-search-state-label">${esc(stateName(state))}</div><div class="yat-search-card-list yat-search-school-list">${rows.map(s=>{
      const hsid=String(s?.hsid||s?.schoolId||'');const name=String(s?.hsname||s?.schoolName||'School');const loc=splitSchoolLocation(s?.hslocation||s?.location);const location=[loc.city,loc.state].filter(Boolean).join(', ');const live=String(s?.microsite_url||s?.micrositeUrl||'').trim();const badge=live?'Live':(s?.current_aa||s?.mlb||s?.atnla?'Candidate':'Not Active');const stateLabel=String(s?.regionid||loc.state||'State').trim().toUpperCase();const drafted=(s?.drafted_ratio||(s?.drafted_hs&&s?.drafted?`${s.drafted_hs}/${s.drafted}`:'--'));
      return `<a class="yat-search-card yat-search-school-card" href="${esc(schoolUrl(s))}"><div class="yat-search-school-topline"><span class="yat-search-school-crest-link"><img src="${esc(hsid?`${S3_BASE}/schools/${encodeURIComponent(hsid)}.png`:CREST_FALLBACK)}" class="yat-search-school-thumb" alt="" onerror="yatHomeImgFallback(this,'${CREST_FALLBACK}')"></span><span class="yat-search-row-text"><strong>${esc(name)}</strong>${location?`<small>${esc(location)}</small>`:''}</span><span class="yat-search-school-badge ${live?'live':badge==='Candidate'?'candidate':''}">${esc(badge)}</span></div><div class="yat-search-school-stats"><span><strong>${esc(s?.current_aa??0)}</strong><small>Active</small></span><span><strong>${esc(s?.atnla??0)}</strong><small>All-Time</small></span><span><strong>${esc(drafted)}</strong><small>Drafted</small></span><span><strong>${esc(s?.mlb??0)}</strong><small>MLB</small></span><span><strong>${s?.yatstats_national_rank?`#${esc(rank(s.yatstats_national_rank))}`:'--'}</strong><small>Nat'l Rank</small></span><span><strong>${s?.yatstats_state_rank?`#${esc(rank(s.yatstats_state_rank))}`:'--'}</strong><small>${esc(stateLabel)}</small></span></div></a>`;
    }).join('')}</div>`).join('');
  }

  function renderTeamRows(players, emptyText){
    if(!players.length) return `<div class="yat-search-empty">${esc(emptyText)}</div>`;
    const groups=new Map();
    players.forEach(p=>{const team=String(p?.currentTeamName||p?.current_team_name||'Current Team Unknown').trim()||'Current Team Unknown';const level=String(p?.levelLabel||p?.level_label||'').trim();const key=`${team}${level?` - ${level}`:''}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});
    return Array.from(groups.entries()).map(([teamLevel,rows])=>{const first=rows[0]||{};return `<div class="yat-search-team-group"><div class="yat-search-team-heading"><img src="${esc(teamLogoUrl(first))}" class="yat-search-team-thumb" alt="" onerror="yatHomeImgFallback(this,'${CREST_FALLBACK}')"><span>${esc(teamLevel)}</span></div><div class="yat-search-card-list yat-search-team-player-list">${rows.map(p=>{
      const name=String(p?.displayName||`${p?.firstName||p?.firstname||''} ${p?.lastName||p?.lastname||''}`.trim()||'Player');const school=String(p?.schoolName||p?.hsname||'').trim();const loc=locationFor(p);const second=[school,loc?`(${loc})`:''].filter(Boolean).join(' ');
      return `<div class="yat-search-card yat-search-team-player-card yat-search-player-result"><a class="yat-search-player-headshot-link" href="${esc(playerProfileUrl(p))}" title="Open ${esc(name)} full player profile"><img src="${esc(playerHeadshotUrl(p))}" class="yat-search-player-headshot" alt="${esc(name)} current headshot" onerror="yatHomeImgFallback(this,'${HEADSHOT_FALLBACK}')"></a><a class="yat-search-player-text-link" href="${esc(playerProfileUrl(p))}" title="Open ${esc(name)} full player profile"><strong>${esc(name)}</strong>${second?`<small>${esc(second)}</small>`:''}</a><a class="yat-search-player-flip-link" href="${esc(playerFlipCardUrl(p))}" title="Open ${esc(name)} on ${esc(school||'his high school')} home page"><img src="${esc(schoolCrestUrl(p))}" class="yat-search-player-hs-logo" alt="${esc(school)} crest" onerror="yatHomeImgFallback(this,'${CREST_FALLBACK}')"></a></div>`;
    }).join('')}</div></div>`;}).join('');
  }

  async function fetchJson(path){const res=await fetch(`${API_BASE}${path}`,{cache:'no-store'});if(!res.ok)throw new Error(`Search ${res.status}`);return res.json();}

  function init(){
    const original=document.getElementById('global-search');
    if(!original||original.dataset.templateSearchReady==='1')return;
    original.dataset.templateSearchReady='1';
    original.className='yat-template-search';
    original.innerHTML=`
      <div class="yat-home-search-head"><div><p class="eyebrow">Enter the actual platform</p><h2>Search the YAT?STATS <span>database.</span></h2><p class="yat-home-search-sub">Browse by the player's name, the high school he attended, or by his current college or professional team</p></div><p>Use the same search workflow that lives inside every YAT?STATS school community. Choose how you want to search, then go straight into the platform.</p></div>
      <div class="yat-home-search-input-wrap"><div class="yat-home-search-icon" aria-hidden="true">⌕</div><input id="yat-home-search-input" type="search" autocomplete="off" placeholder="Search by name, school, or team..." aria-label="Search the YAT?STATS database"><button type="button" id="yat-home-search-clear" class="yat-home-search-clear" aria-label="Clear search">✕</button></div>
      <div class="yat-home-search-mode-buttons" role="tablist" aria-label="Search mode"><button type="button" class="yat-home-search-mode-btn active" data-search-mode="name" role="tab" aria-selected="true">Player Name</button><button type="button" class="yat-home-search-mode-btn" data-search-mode="school" role="tab" aria-selected="false">High School</button><button type="button" class="yat-home-search-mode-btn" data-search-mode="team" role="tab" aria-selected="false">Current Team</button></div>
      <div class="yat-home-search-explain"><span><i></i><strong>Player photo or name</strong> opens the full player profile</span><span><i></i><strong>High school crest</strong> opens that player on his school home page</span></div>
      <div id="yat-home-search-results" aria-live="polite"><div class="yat-search-empty">Start typing, then choose Player Name, High School, or Current Team.</div></div>
      <div class="yat-home-search-footer"><span><strong>Live YAT?STATS data</strong> — not a homepage demo</span><span>Search results open the actual platform ↗</span></div>`;

    const input=document.getElementById('yat-home-search-input');
    const clear=document.getElementById('yat-home-search-clear');
    const results=document.getElementById('yat-home-search-results');
    const tabs=[...original.querySelectorAll('.yat-home-search-mode-btn')];
    let mode='name';let timer=null;let requestId=0;

    async function run(){
      const q=String(input.value||'').trim();
      clear.classList.toggle('show',!!q);
      if(!q){results.innerHTML='<div class="yat-search-empty">Start typing, then choose Player Name, High School, or Current Team.</div>';return;}
      const id=++requestId;results.innerHTML='<div class="yat-search-empty">Searching…</div>';
      try{
        if(mode==='name'){
          const data=await fetchJson(`/api/players/search?q=${encodeURIComponent(q)}&limit=30`);if(id!==requestId)return;results.innerHTML=renderPlayerRows(Array.isArray(data.players)?data.players:[],'No player matches.');return;
        }
        if(mode==='school'){
          const data=await fetchJson(`/api/schools/search?q=${encodeURIComponent(q)}&limit=30`);if(id!==requestId)return;results.innerHTML=renderSchoolRows(Array.isArray(data.programs)?data.programs:[],'No school matches.');return;
        }
        const data=await fetchJson(`/api/teams/search?q=${encodeURIComponent(q)}&limit=75`);if(id!==requestId)return;results.innerHTML=renderTeamRows(Array.isArray(data.teams)?data.teams:[],'No current team matches.');
      }catch(err){if(id===requestId){console.warn('YAT?STATS homepage search failed',err);results.innerHTML='<div class="yat-search-empty">Search failed. Try again.</div>';}}
    }
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,DEBOUNCE_MS);});
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';run();input.blur();}});
    clear.addEventListener('click',()=>{input.value='';run();input.focus();});
    tabs.forEach(tab=>tab.addEventListener('click',()=>{mode=tab.dataset.searchMode||'name';tabs.forEach(t=>{const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active));});run();input.focus();}));
  }

  const style=document.createElement('style');style.id='yat-home-template-search-styles';style.textContent=styles;document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

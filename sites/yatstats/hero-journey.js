(() => {
  if (window.__yatJourneyHero) return;
  window.__yatJourneyHero = true;

  const S3_BASE = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const CUTOUT_PREFIX = `${S3_BASE}/players/cutouts/`;
  const SEARCH_API = 'https://hamilton.az.yatstats.com';
  const CAREER_BG = `${SEARCH_API}/img/career-path-default.png`;
  const DEFAULT_PREVIEW = 'https://hamilton.az.yatstats.com';
  const ROTATE_MS = 5200;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const css = `
    .hero{padding-top:40px!important}
    .hero-grid{display:block!important}
    .hero-grid>.product-wrap,.hero-grid>div:first-child{display:none!important}
    .hero-media{display:none!important}

    .yat-journey-hero{position:relative;width:100%;margin:0 auto 24px;overflow:hidden;border:1px solid #35383c;border-radius:20px;background:#101214;box-shadow:0 38px 90px rgba(0,0,0,.5);isolation:isolate}
    .yat-journey-canvas{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#24302c}
    .yat-journey-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;user-select:none;-webkit-user-drag:none}
    .yat-journey-cutout-wrap{position:absolute;left:1.8%;bottom:-.5%;z-index:3;width:42%;height:101%;pointer-events:none}
    .yat-journey-cutout{position:absolute;left:0;bottom:0;width:100%;height:100%;object-fit:contain;object-position:left bottom;filter:drop-shadow(0 18px 24px rgba(0,0,0,.28));opacity:0;transform:translateX(-1.5%) scale(.985);transition:opacity .85s ease,transform 1.05s cubic-bezier(.2,.75,.2,1)}
    .yat-journey-cutout.active{opacity:1;transform:translateX(0) scale(1)}
    .yat-journey-sheen{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.09),transparent 37%,transparent 78%,rgba(0,0,0,.04))}
    .yat-journey-badge{position:absolute;z-index:5;left:18px;top:17px;display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(5,7,8,.62);backdrop-filter:blur(9px);color:#fff;font:800 9px/1 Inter,sans-serif;letter-spacing:.11em;text-transform:uppercase}
    .yat-journey-badge i{display:block;width:7px;height:7px;border-radius:50%;background:#efb936;box-shadow:0 0 0 4px rgba(239,185,54,.14)}
    .yat-journey-meta{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;align-items:center;padding:20px 22px;background:linear-gradient(180deg,#121416,#0d0f10);border-top:1px solid #292d31}
    .yat-journey-meta h1{margin:0 0 8px!important;font:800 clamp(1.75rem,3.8vw,3.4rem)/1.02 Manrope,Inter,sans-serif!important;letter-spacing:-.045em!important;max-width:none!important}.yat-journey-meta h1 span{color:#efb936!important;background:none!important;-webkit-text-fill-color:initial!important}
    .yat-journey-meta p{margin:0;color:#9ca0a5;font-size:.86rem;max-width:760px}
    .yat-journey-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
    .yat-journey-mini{display:flex;gap:16px;flex-wrap:wrap;margin-top:13px;color:#83888e;font-size:.65rem;font-weight:700}.yat-journey-mini strong{color:#d8dadd}

    .yat-live-platform{position:relative;margin:28px 0 42px;border:1px solid #35393e;border-radius:20px;overflow:hidden;background:#0b0d0e;box-shadow:0 30px 80px rgba(0,0,0,.42)}
    .yat-live-platform.expanded{position:fixed;z-index:99998;inset:12px;margin:0;border-radius:14px;display:grid;grid-template-rows:auto 1fr auto;background:#090a0b}
    body.yat-live-preview-lock{overflow:hidden}
    .yat-live-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px 10px 15px;min-height:52px;border-bottom:1px solid #292d31;background:linear-gradient(180deg,#141618,#0e1011)}
    .yat-live-address{min-width:0;display:flex;align-items:center;gap:10px}.yat-live-dots{display:flex;gap:5px;flex:0 0 auto}.yat-live-dots i{display:block;width:6px;height:6px;border-radius:50%;background:#3c4146}.yat-live-dots i:nth-child(2){background:#785d20}.yat-live-dots i:nth-child(3){background:#6f2630}
    .yat-live-url{min-width:0;color:#858a90;font-size:.64rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yat-live-url strong{color:#d3d5d7;margin-right:6px}
    .yat-live-actions{display:flex;gap:7px;flex:0 0 auto}.yat-live-action{display:inline-flex;align-items:center;justify-content:center;min-height:33px;padding:0 10px;border:1px solid #30343a;border-radius:7px;background:#17191c;color:#d8dadd;font:800 9px/1 Inter,sans-serif;text-decoration:none;cursor:pointer}.yat-live-action:hover{border-color:#645124;color:#efc454}.yat-live-close{display:none}.yat-live-platform.expanded .yat-live-close{display:inline-flex}
    .yat-live-frame-wrap{position:relative;width:100%;height:min(74vh,830px);background:#fff}.yat-live-platform.expanded .yat-live-frame-wrap{height:auto;min-height:0}
    .yat-live-loading{position:absolute;z-index:1;inset:0;display:grid;place-items:center;background:#0b0d0e;color:#878c91;font:700 10px/1.4 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;transition:opacity .2s ease}.yat-live-loading.hidden{opacity:0;pointer-events:none}.yat-live-loading span:before{content:"";display:block;width:25px;height:25px;margin:0 auto 12px;border:2px solid #33373c;border-top-color:#efb936;border-radius:50%;animation:yatSpin .8s linear infinite}@keyframes yatSpin{to{transform:rotate(360deg)}}
    .yat-live-frame{position:relative;z-index:2;width:100%;height:100%;border:0;background:#fff;opacity:0;transition:opacity .2s ease}.yat-live-frame.loaded{opacity:1}
    .yat-live-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px 14px;border-top:1px solid #292d31;background:#0d0f10;color:#747980;font-size:.62rem}.yat-live-footer strong{color:#b9bcc0}.yat-live-footer em{font-style:normal;color:#d2aa47}

    #proof .proof-shot{display:none!important}
    #proof .proof-card{padding-top:2px!important}
    #proof .metrics{margin-top:0!important;border-top:0!important}

    @media(max-width:800px){
      .yat-journey-hero{border-radius:14px}.yat-journey-badge{left:10px;top:10px;font-size:7px;padding:6px 8px}.yat-journey-cutout-wrap{left:-2%;width:47%;height:102%}
      .yat-journey-meta{grid-template-columns:1fr;padding:18px}.yat-journey-actions{justify-content:flex-start}.yat-journey-actions .button{width:100%}
      .yat-live-platform{border-radius:14px}.yat-live-frame-wrap{height:72vh;min-height:560px}.yat-live-action.open-full{display:none}.yat-live-footer{align-items:flex-start;flex-direction:column}
      .yat-live-platform.expanded{inset:0;border:0;border-radius:0}.yat-live-platform.expanded .yat-live-frame-wrap{min-height:0;height:auto}
    }
    @media(max-width:520px){
      .hero{padding-top:22px!important}.yat-journey-canvas{aspect-ratio:16/9}.yat-journey-cutout-wrap{left:-4%;width:49%}.yat-journey-meta h1{font-size:1.78rem!important}.yat-journey-meta p{font-size:.78rem}.yat-journey-mini{gap:9px;font-size:.58rem}.yat-live-url{max-width:48vw}.yat-live-frame-wrap{height:68vh;min-height:520px}
    }
  `;

  const style = document.createElement('style');
  style.id = 'yat-journey-hero-styles';
  style.textContent = css;
  document.head.appendChild(style);

  function shuffle(list){
    const copy=[...list];
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }

  function imageExists(url, timeout=5000){
    return new Promise(resolve=>{
      const img=new Image();
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
      const timer=setTimeout(()=>finish(false),timeout);
      img.onload=()=>finish(Boolean(img.naturalWidth&&img.naturalHeight));
      img.onerror=()=>finish(false);
      img.src=url;
    });
  }

  async function listS3Cutouts(){
    const found=[];
    let token='';
    for(let page=0;page<3;page++){
      const params=new URLSearchParams({'list-type':'2',prefix:'players/cutouts/','max-keys':'1000'});
      if(token)params.set('continuation-token',token);
      const response=await fetch(`${S3_BASE}/?${params}`,{mode:'cors',cache:'no-store'});
      if(!response.ok)throw new Error(`S3 list ${response.status}`);
      const xmlText=await response.text();
      const xml=new DOMParser().parseFromString(xmlText,'application/xml');
      xml.querySelectorAll('Key').forEach(node=>{
        const key=node.textContent||'';
        if(/^players\/cutouts\/[^/]+\.png$/i.test(key))found.push(`${S3_BASE}/${key}`);
      });
      const truncated=xml.querySelector('IsTruncated')?.textContent==='true';
      token=xml.querySelector('NextContinuationToken')?.textContent||'';
      if(!truncated||!token)break;
    }
    return shuffle([...new Set(found)]);
  }

  async function discoverCutoutsFromPlayers(){
    const fragments=shuffle(['an','er','on','ar','el','in','en','al','ma','ro','ch','br','wi','li','mi','jo','da','co']).slice(0,7);
    const payloads=await Promise.allSettled(fragments.map(async q=>{
      const r=await fetch(`${SEARCH_API}/api/players/search?q=${encodeURIComponent(q)}&limit=35`,{cache:'no-store'});
      if(!r.ok)return [];
      const data=await r.json();
      return Array.isArray(data?.players)?data.players:[];
    }));
    const ids=[];
    payloads.forEach(result=>{if(result.status==='fulfilled')result.value.forEach(p=>{const id=String(p?.playerId||p?.playerid||p?.id||'').trim();if(id)ids.push(id);});});
    const unique=shuffle([...new Set(ids)]).slice(0,70);
    const valid=[];
    for(let i=0;i<unique.length&&valid.length<18;i+=6){
      const batch=unique.slice(i,i+6);
      const checks=await Promise.all(batch.map(async id=>{const url=`${CUTOUT_PREFIX}${encodeURIComponent(id)}.png`;return (await imageExists(url,3000))?url:null;}));
      valid.push(...checks.filter(Boolean));
    }
    return shuffle(valid);
  }

  async function buildCutoutPool(){
    try{
      const listed=await listS3Cutouts();
      if(listed.length)return listed;
    }catch(err){console.info('YAT?STATS hero: direct S3 listing unavailable, using player-index fallback.');}
    try{return await discoverCutoutsFromPlayers();}catch(err){console.warn('YAT?STATS hero: cutout discovery failed.',err);return [];}
  }

  function mountHero(){
    const grid=document.querySelector('.hero-grid');
    if(!grid||grid.dataset.journeyHero==='1')return null;
    grid.dataset.journeyHero='1';
    grid.innerHTML=`
      <section class="yat-journey-hero" aria-label="The Golden Timeline journey anchor">
        <div class="yat-journey-canvas">
          <img class="yat-journey-bg" src="${CAREER_BG}" alt="Baseball journeys don't always end at graduation. Neither should their stories.">
          <div class="yat-journey-cutout-wrap" aria-hidden="true"><img class="yat-journey-cutout yat-cutout-a" alt=""><img class="yat-journey-cutout yat-cutout-b" alt=""></div>
          <div class="yat-journey-sheen"></div>
          <div class="yat-journey-badge"><i></i>The same journey anchor used on player profiles</div>
        </div>
        <div class="yat-journey-meta">
          <div>
            <p class="eyebrow">The Golden Timeline</p>
            <h1>Follow the journey. <span>Help preserve it.</span></h1>
            <p>Every player profile begins with his high-school story and grows forward through college, professional baseball and fan-contributed memories. The homepage now uses that same visual language — with real player cutouts rotating from the YAT?STATS asset library.</p>
            <div class="yat-journey-mini"><span><strong>Past + present</strong> on one timeline</span><span><strong>Fans can contribute</strong> photos + memories</span><span><strong>17,000+</strong> programs searchable</span></div>
          </div>
          <div class="yat-journey-actions"><a class="button" href="#global-search">Search the YAT?STATS Database</a></div>
        </div>
      </section>`;
    return grid.querySelector('.yat-journey-hero');
  }

  function mountLivePreview(){
    const search=document.getElementById('global-search');
    if(!search||document.getElementById('yat-live-platform'))return null;
    const shell=document.createElement('section');
    shell.id='yat-live-platform';
    shell.className='yat-live-platform';
    shell.innerHTML=`
      <div class="yat-live-bar">
        <div class="yat-live-address"><span class="yat-live-dots"><i></i><i></i><i></i></span><span class="yat-live-url" id="yat-live-url"><strong>LIVE YAT?STATS</strong>hamilton.az.yatstats.com</span></div>
        <div class="yat-live-actions"><button type="button" class="yat-live-action" id="yat-live-expand">Expand preview</button><a class="yat-live-action open-full" id="yat-live-open" href="${DEFAULT_PREVIEW}" target="_blank" rel="noopener">Open full site ↗</a><button type="button" class="yat-live-action yat-live-close" id="yat-live-close">Close</button></div>
      </div>
      <div class="yat-live-frame-wrap"><div class="yat-live-loading" id="yat-live-loading"><span>Loading the live Hamilton community</span></div><iframe class="yat-live-frame" id="yat-live-frame" src="${DEFAULT_PREVIEW}" title="Live YAT?STATS school community preview" loading="eager" allow="fullscreen; autoplay; clipboard-write"></iframe></div>
      <div class="yat-live-footer"><span><strong>This is the actual platform.</strong> Search above and choose a school, player profile, or school crest to load it here.</span><span><em>Browse without leaving the homepage.</em></span></div>`;
    search.insertAdjacentElement('afterend',shell);

    const frame=shell.querySelector('#yat-live-frame');
    const label=shell.querySelector('#yat-live-url');
    const loader=shell.querySelector('#yat-live-loading');
    const open=shell.querySelector('#yat-live-open');
    const expand=shell.querySelector('#yat-live-expand');
    const close=shell.querySelector('#yat-live-close');

    function loadUrl(raw,labelText){
      let url;
      try{url=new URL(raw,location.href);}catch{return;}
      loader.classList.remove('hidden');
      frame.classList.remove('loaded');
      frame.src=url.href;
      open.href=url.href;
      label.innerHTML=`<strong>LIVE YAT?STATS</strong>${labelText||url.hostname}${url.pathname==='/'?'':url.pathname}`;
      shell.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'});
    }
    frame.addEventListener('load',()=>{loader.classList.add('hidden');frame.classList.add('loaded');});
    expand.addEventListener('click',()=>{shell.classList.add('expanded');document.body.classList.add('yat-live-preview-lock');close.focus();});
    close.addEventListener('click',()=>{shell.classList.remove('expanded');document.body.classList.remove('yat-live-preview-lock');expand.focus();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&shell.classList.contains('expanded')){shell.classList.remove('expanded');document.body.classList.remove('yat-live-preview-lock');expand.focus();}});

    search.addEventListener('click',event=>{
      const a=event.target.closest?.('a[href]');
      if(!a)return;
      let url;
      try{url=new URL(a.href,location.href);}catch{return;}
      if(!url.hostname.endsWith('.yatstats.com'))return;
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      event.stopPropagation();
      const text=(a.getAttribute('title')||a.textContent||url.hostname).replace(/\s+/g,' ').trim();
      loadUrl(url.href,text.length<72?text:url.hostname);
    },true);

    return {shell,loadUrl};
  }

  async function startRotation(hero){
    if(!hero)return;
    const imgs=[hero.querySelector('.yat-cutout-a'),hero.querySelector('.yat-cutout-b')];
    const pool=await buildCutoutPool();
    if(!pool.length)return;
    let active=0,index=Math.floor(Math.random()*pool.length);

    async function show(url,first=false){
      const next=first?imgs[0]:imgs[1-active];
      await new Promise(resolve=>{next.onload=resolve;next.onerror=resolve;next.src=url;});
      if(!next.naturalWidth)return;
      requestAnimationFrame(()=>{
        imgs.forEach(img=>img.classList.remove('active'));
        next.classList.add('active');
        active=imgs.indexOf(next);
      });
    }

    await show(pool[index],true);
    if(reducedMotion||pool.length<2)return;
    setInterval(()=>{index=(index+1)%pool.length;show(pool[index]);},ROTATE_MS);
  }

  function init(){
    const hero=mountHero();
    mountLivePreview();
    startRotation(hero);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

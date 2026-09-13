(() => {
  if (window.__yatAudienceToursPrototype) return;
  window.__yatAudienceToursPrototype = true;

  const PLATFORM = 'https://hamilton.az.yatstats.com';
  const S3 = 'https://yatstats-assets.s3.us-west-2.amazonaws.com';
  const YATI = `${S3}/yatstats/YaTi.png`;
  const CODY = `${PLATFORM}/player/180827/cody-bellinger`;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const story = {
    label: 'The YAT?STATS Story', hat: '★', tone: 'story',
    stops: [
      {key:'why', label:'The Why', title:'Graduation should not erase the connection.', copy:'Players move on. Coaches, parents, teammates and hometown fans still care. YAT?STATS exists to keep that baseball journey connected to home.', type:'panel', panel:'why'},
      {key:'mike', label:'Mike Woods', title:'It started with one simple frustration.', copy:'Hall of Fame coach Mike Woods wanted one place to answer a basic question: where are our guys now?', type:'panel', panel:'mike'},
      {key:'prototype', label:'Prototype', title:'Hamilton became the first clubhouse.', copy:'The original prototype organized alumni around the high school program instead of around whichever team they happened to play for next.', type:'live', url:PLATFORM},
      {key:'different', label:'Different', title:'The high school is the anchor.', copy:'Stats are useful. The differentiator is keeping a player’s past, present, people and memories attached to the program that started the story.', type:'live', url:`${CODY}#playerCareerImages`},
      {key:'golden', label:'Golden Timeline', title:'Stats tell what happened. People preserve why it mattered.', copy:'Fans, family, coaches and teammates can contribute memories and photos to the same career line that follows the athlete forward.', type:'live', url:`${CODY}#playerCareerImages`},
      {key:'ecosystem', label:'The Ecosystem', title:'One platform. Four different reasons to care.', copy:'Fans create attention. Programs reconnect alumni. Athletes stay connected. Sponsors help fund the community. Each audience strengthens the others.', type:'panel', panel:'ecosystem'}
    ]
  };

  const tours = {
    fan: {
      label:'Fan / Family', hat:'🧢', eyebrow:'FAN TOUR', title:'Follow the guys you still care about.',
      stops:[
        {key:'explore',label:'Explore',title:'Start inside a real hometown clubhouse.',copy:'Hamilton is our live example. Browse the same cards, players and tools a fan would actually use.',type:'live',url:PLATFORM},
        {key:'icons',label:'Icons',title:'Every icon has a job.',copy:'Menu, search, sort, filter, favorites, account and theme controls are all part of the fan experience. This stop will become the complete icon-by-icon field guide.',type:'panel',panel:'icons'},
        {key:'search',label:'Search',title:'Search by player, high school, or current team.',copy:'Want every YAT?STATS player currently with the Cubs or Arizona State? Search by Current Team instead of hunting school by school.',type:'live',url:PLATFORM},
        {key:'cards',label:'Flip Cards',title:'Past on the front. Present on the back.',copy:'The high-school image keeps the hometown identity visible. Flip the card for current production, then open the full player profile.',type:'live',url:`${PLATFORM}/?view=active&player=180827#player-180827`},
        {key:'profile',label:'Player Profile',title:'Go deeper than the card.',copy:'Stats, schedule, news, Golden Timeline and contributions all live on the player profile.',type:'live',url:CODY},
        {key:'join',label:'Join',title:'Visitor → Fan starts at a home school.',copy:'A visitor can browse. When they join from a school community, that school becomes their Home School and their account becomes part of that community.',type:'panel',panel:'fanLevels'},
        {key:'favorite',label:'Favorite',title:'Fans can build a quick “these are my guys” view.',copy:'A Fan can favorite players from their Home School for a focused experience instead of scanning every alumnus.',type:'live',url:CODY},
        {key:'superfan',label:'Super Fan',title:'Super Fans can favorite players across schools.',copy:'Upgrade and the boundary disappears. Build a custom cross-school gallery from any players in the YAT?STATS network.',type:'panel',panel:'superfan'},
        {key:'gallery',label:'My Gallery',title:'One custom flip-card deck, regardless of high school.',copy:'That is the Super Fan payoff: follow the specific players you care about even when they came from different hometown programs.',type:'panel',panel:'gallery'},
        {key:'contribute',label:'Contribute',title:'Help preserve the journey you witnessed.',copy:'Fans can add photos and memories to a player’s Golden Timeline so the profile becomes a living baseball history, not just a stat page.',type:'live',url:`${CODY}#ppTab-upload`}
      ]
    },
    coach: {
      label:'Coach / Booster', hat:'🧢', eyebrow:'PROGRAM TOUR', title:'Turn alumni history into a program asset.',
      stops:[
        {key:'problem',label:'The Problem',title:'Your alumni already matter. They are just scattered.',copy:'Former players, parents and families usually disappear into old spreadsheets, phones and social media after graduation.',type:'panel',panel:'coachProblem'},
        {key:'clubhouse',label:'Your Clubhouse',title:'Give the program a living alumni home.',copy:'The microsite organizes active and former alumni around the school, making decades of program history visible and useful.',type:'live',url:PLATFORM},
        {key:'arms',label:'ARMS',title:'The website is only the visible half.',copy:'Behind it, Alumni Relationship Management can capture contacts, segment alumni and families, and automate ongoing relationship-building.',type:'panel',panel:'arms'},
        {key:'engage',label:'Engage',title:'Stay relevant before asking for money.',copy:'Updates, milestones, stories and nostalgia create reasons for alumni and families to keep engaging with the program.',type:'panel',panel:'engage'},
        {key:'fundraise',label:'Fundraise',title:'Relationship first. Fundraising second.',copy:'The long-term objective is to turn stronger alumni relationships into recurring program support instead of one-off asks.',type:'panel',panel:'fundraise'},
        {key:'sponsors',label:'Sponsors',title:'Local sponsors can help fund the platform.',copy:'Businesses align with a school community they already want to reach, helping underwrite the program while receiving useful local visibility.',type:'panel',panel:'sponsorModel'}
      ]
    },
    athlete: {
      label:'Current Athlete', hat:'⚾', eyebrow:'ATHLETE TOUR', title:'Your baseball story should stay yours.',
      stops:[
        {key:'profile',label:'Your Profile',title:'One profile follows the journey forward.',copy:'High school is the anchor, but the profile continues through college, transfers, professional baseball and beyond.',type:'live',url:CODY},
        {key:'stats',label:'Stats',title:'Your current production stays connected to home.',copy:'Fans who knew you before college or pro ball can still see what you are doing now without losing the hometown context.',type:'live',url:`${CODY}#ppTab-stats`},
        {key:'timeline',label:'Timeline',title:'Build the record the stat sheet cannot.',copy:'Photos, memories and milestones from every stage of baseball can live on the Golden Timeline.',type:'live',url:`${CODY}#playerCareerImages`},
        {key:'community',label:'Community',title:'Stay connected to coaches, teammates and hometown fans.',copy:'YAT?STATS creates an alumni identity tied to the program, not just another isolated player page.',type:'panel',panel:'athleteCommunity'},
        {key:'opportunity',label:'Opportunity',title:'Visibility can create future value.',copy:'Mentorship, alumni business connections, NIL opportunities and post-playing relationships can eventually grow from the same verified community.',type:'panel',panel:'athleteOpportunity'},
        {key:'legacy',label:'Legacy',title:'Playing ends. Alumni does not.',copy:'Your profile remains part of the school’s history after the final season, giving the next generation a visible lineage to follow.',type:'panel',panel:'legacy'}
      ]
    },
    partner: {
      label:'Sponsor / Investor', hat:'🎩', eyebrow:'PARTNER TOUR', title:'Back the hometown attention that already exists.',
      stops:[
        {key:'attention',label:'Attention',title:'Baseball communities already have emotional attention.',copy:'Parents, alumni, fans and former teammates care because these are their people and their hometown stories.',type:'panel',panel:'attention'},
        {key:'nostalgia',label:'Nostalgia',title:'Nostalgia is not decoration. It is an engagement engine.',copy:'A familiar school, player or championship memory creates a level of relevance generic digital advertising rarely gets.',type:'panel',panel:'nostalgia'},
        {key:'placement',label:'Placement',title:'Put the brand inside the community experience.',copy:'A sponsor can support the school microsite and appear around the stories, alumni and fan behaviors the community already values.',type:'live',url:PLATFORM},
        {key:'local',label:'Local Value',title:'Support the program while earning local visibility.',copy:'The offer is stronger than buying another banner: fund a useful hometown platform and become part of the value it creates.',type:'panel',panel:'sponsorModel'},
        {key:'scale',label:'Scale',title:'The model can repeat school by school.',copy:'Thousands of high-school programs create a distributed network of hyper-local communities with common platform infrastructure.',type:'panel',panel:'scale'},
        {key:'invest',label:'Why Invest',title:'The value compounds when all four audiences participate.',copy:'Fans create attention, programs create distribution, athletes create stories, and partners provide monetization. The flywheel is the opportunity.',type:'panel',panel:'ecosystem'}
      ]
    }
  };

  const panelContent = {
    why:['THE PROBLEM','Graduation ends a roster spot. It should not end the relationship.','YAT?STATS reconnects the people who still care with the players, memories and program that created that connection.'],
    mike:['THE ORIGIN','“No more huntin’ & peckin’ to track my alumni.”','Mike Woods · Hamilton High School · 10 Arizona State Championships'],
    ecosystem:['ONE ECOSYSTEM','Four audiences. One reinforcing flywheel.','FANS → attention · PROGRAMS → community · ATHLETES → stories · PARTNERS → funding'],
    icons:['FAN FIELD GUIDE','Every icon will become a hands-on tour stop.','Search · Sort · Filter · Favorites · Account · Theme · Menu · Player cards · Profile · Golden Timeline'],
    fanLevels:['VISITOR → FAN → SUPER FAN','Visitor: browse. Fan: join a Home School and favorite its players. Super Fan: favorite globally.','Home School = the school community where the Fan joined.'],
    superfan:['SUPER FAN','Follow across school boundaries.','Favorite any player in the network and combine them into one personalized cross-school gallery.'],
    gallery:['MY FAVORITES','Your own cross-school flip-card deck.','A Yankees fan, Cubs fan or ASU fan can build a gallery around current-team interest instead of one high school.'],
    coachProblem:['THE PROGRAM PROBLEM','Your alumni network already exists — it is just unmanaged.','The opportunity is to turn disconnected alumni history into an active relationship system.'],
    arms:['ARMS','Alumni Relationship Management Solution','Identify → capture → tag → nurture → reconnect → activate alumni, families and supporters.'],
    engage:['RELATIONSHIP BEFORE ASK','Give alumni a reason to care before asking them to give.','Milestones · memories · player updates · reunion · recognition · mentorship'],
    fundraise:['FUNDRAISING','Turn stronger relationships into recurring program support.','The website attracts attention. ARMS turns attention into a relationship. The relationship creates fundraising opportunity.'],
    sponsorModel:['LOCAL PARTNERSHIP','Fund the platform. Support the program. Reach the community.','A more useful alignment than another static banner or one-time booster donation.'],
    athleteCommunity:['STAY CONNECTED','Your hometown still cares what happens next.','Coaches · former teammates · families · fans · alumni · younger players'],
    athleteOpportunity:['WHAT COMES NEXT','Visibility can create opportunities beyond statistics.','Mentorship · NIL · alumni business relationships · networking · post-playing identity'],
    legacy:['LEGACY','The uniform comes off. The story stays.','Remain part of the program history that future players and fans can discover.'],
    attention:['ATTENTION WITH CONTEXT','The audience is not random traffic.','They are people already emotionally connected to the school, players and hometown.'],
    nostalgia:['NOSTALGIA','Recognition creates attention. Memory creates emotion.','The platform turns old rosters and hometown names into something active again.'],
    scale:['LOCAL × THOUSANDS','A repeatable hometown model.','Shared technology and data infrastructure powering school-specific communities at national scale.']
  };

  const css = `
    main>section:not(.yat-prototype-shell){display:none!important}
    .footer{margin-top:0!important}
    .yat-prototype-shell{min-height:calc(100vh - 42px);background:#0c0c0c;color:#f2f2f2;padding:0 0 26px;font-family:Oswald,system-ui,sans-serif}
    .yat-story-rail{border-bottom:1px solid rgba(255,255,255,.1);background:#000;padding:10px 0 8px;position:sticky;top:42px;z-index:45}
    .yat-proto-inner{width:min(1400px,calc(100% - 28px));margin:auto}
    .yat-story-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:7px}.yat-story-label{font:400 13px/1 "Indigo","Bebas Neue",Oswald,sans-serif;letter-spacing:.04em;text-transform:uppercase}.yat-story-sub{color:#777;font:300 10px/1 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.08em}
    .yat-rail{display:flex;gap:1px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity}.yat-rail::-webkit-scrollbar{display:none}.yat-stop{position:relative;flex:0 0 132px;height:74px;border:0;border-right:1px solid rgba(255,255,255,.08);background:#111;color:#aaa;text-align:left;padding:9px 10px;cursor:pointer;scroll-snap-align:start}.yat-stop:hover{background:#171717;color:#fff}.yat-stop.active{background:#f3f3f3;color:#111}.yat-stop-num{display:block;font:300 8px/1 Oswald,sans-serif;letter-spacing:.13em;opacity:.58}.yat-stop-label{display:block;margin-top:15px;font:400 15px/1 "Bebas Neue",Oswald,sans-serif;text-transform:uppercase}.yat-stop.active:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:#c8a96e}
    .yat-stage-wrap{width:min(1400px,calc(100% - 28px));margin:12px auto 0}.yat-stage-head{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 12px;border:1px solid rgba(255,255,255,.1);border-bottom:0;background:#151515}.yat-yati-wrap{position:relative;width:66px;height:64px}.yat-yati{width:66px;height:64px;object-fit:contain;object-position:center bottom}.yat-hat{position:absolute;right:-5px;top:-6px;font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}.yat-guide-kicker{display:block;color:#c8a96e;font:500 9px/1 Oswald,sans-serif;letter-spacing:.12em;text-transform:uppercase}.yat-guide-title{margin:3px 0 2px;font:400 clamp(18px,2vw,28px)/1 "Bebas Neue",Oswald,sans-serif;text-transform:uppercase}.yat-guide-copy{margin:0;color:#a8a8a8;font:300 12px/1.35 Oswald,sans-serif;max-width:900px}.yat-stage-counter{font:300 9px/1 Oswald,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#777;white-space:nowrap}
    .yat-stage{height:min(62vh,650px);min-height:430px;border:1px solid rgba(255,255,255,.1);background:#fff;position:relative;overflow:hidden}.yat-stage iframe{width:100%;height:100%;border:0;background:#fff}.yat-panel-stage{height:100%;display:grid;place-items:center;padding:36px;background:linear-gradient(135deg,#111,#1b1b1b);color:#f2f2f2}.yat-panel-card{width:min(980px,92%);border-left:3px solid #c8a96e;padding:4px 0 4px 24px}.yat-panel-kicker{color:#c8a96e;font:500 10px/1 Oswald,sans-serif;letter-spacing:.16em;text-transform:uppercase}.yat-panel-title{margin:10px 0 10px;font:400 clamp(34px,5vw,70px)/.95 "Bebas Neue",Oswald,sans-serif;text-transform:uppercase}.yat-panel-copy{margin:0;color:#aaa;font:300 clamp(15px,1.6vw,21px)/1.45 Oswald,sans-serif}.yat-panel-detail{margin-top:18px;color:#ddd;font:400 13px/1.4 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.05em}
    .yat-audience-picker{width:min(1400px,calc(100% - 28px));margin:12px auto 0;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.1)}.yat-audience-btn{border:0;background:#111;color:#aaa;padding:12px 14px;text-align:left;cursor:pointer}.yat-audience-btn:hover{background:#181818;color:#fff}.yat-audience-btn.active{background:#f3f3f3;color:#111}.yat-audience-btn small{display:block;font:300 8px/1 Oswald,sans-serif;letter-spacing:.13em;text-transform:uppercase;opacity:.6}.yat-audience-btn strong{display:block;margin-top:5px;font:400 17px/1 "Bebas Neue",Oswald,sans-serif;text-transform:uppercase}.yat-tour-zone{width:min(1400px,calc(100% - 28px));margin:1px auto 0;border-top:1px solid rgba(255,255,255,.1);padding-top:8px}.yat-tour-zone .yat-rail{background:#000}.yat-tour-zone .yat-stop{height:68px;flex-basis:126px}
    .yat-tour-introline{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 1px}.yat-tour-introline h2{margin:0;font:400 20px/1 "Bebas Neue",Oswald,sans-serif;text-transform:uppercase}.yat-tour-introline p{margin:0;color:#777;font:300 10px/1 Oswald,sans-serif;text-transform:uppercase;letter-spacing:.06em}
    @media(max-width:800px){.yat-story-rail{top:38px}.yat-story-top{align-items:flex-start;flex-direction:column}.yat-stop{flex-basis:112px;height:68px}.yat-stage-head{grid-template-columns:56px minmax(0,1fr)}.yat-yati-wrap,.yat-yati{width:52px;height:54px}.yat-stage-counter{display:none}.yat-stage{height:58vh;min-height:420px}.yat-audience-picker{grid-template-columns:1fr 1fr}.yat-audience-btn{padding:10px}.yat-panel-stage{padding:20px}.yat-panel-card{width:100%;padding-left:16px}.yat-tour-introline{align-items:flex-start;flex-direction:column}}
  `;

  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  function railHtml(stops, prefix){return `<div class="yat-rail">${stops.map((s,i)=>`<button class="yat-stop ${i===0?'active':''}" data-rail="${prefix}" data-index="${i}"><span class="yat-stop-num">${String(i+1).padStart(2,'0')}</span><span class="yat-stop-label">${s.label}</span></button>`).join('')}</div>`;}
  function panelHtml(key){const p=panelContent[key]||['COMING INTO FOCUS','This tour stop is intentionally rough for the prototype.','The interaction and information architecture are what we are testing right now.'];return `<div class="yat-panel-stage"><div class="yat-panel-card"><span class="yat-panel-kicker">${p[0]}</span><h3 class="yat-panel-title">${p[1]}</h3><p class="yat-panel-copy">${p[2]}</p>${p[3]?`<div class="yat-panel-detail">${p[3]}</div>`:''}</div></div>`;}

  function init(){
    const main=document.querySelector('main'); if(!main)return;
    const shell=document.createElement('section'); shell.className='yat-prototype-shell'; shell.id='story';
    shell.innerHTML=`
      <div class="yat-story-rail"><div class="yat-proto-inner"><div class="yat-story-top"><span class="yat-story-label">The YAT?STATS Story</span><span class="yat-story-sub">Start here · then choose your perspective</span></div>${railHtml(story.stops,'story')}</div></div>
      <div class="yat-stage-wrap"><div class="yat-stage-head"><div class="yat-yati-wrap"><img class="yat-yati" src="${YATI}" alt="YaTi"><span class="yat-hat" id="yatHat">${story.hat}</span></div><div><span class="yat-guide-kicker" id="yatKicker">THE YAT?STATS STORY</span><h1 class="yat-guide-title" id="yatTitle"></h1><p class="yat-guide-copy" id="yatCopy"></p></div><span class="yat-stage-counter" id="yatCounter"></span></div><div class="yat-stage" id="yatStage"></div></div>
      <div class="yat-audience-picker" id="audiences">${Object.entries(tours).map(([key,t],i)=>`<button class="yat-audience-btn ${i===0?'active':''}" data-audience="${key}"><small>Choose your tour</small><strong>${t.hat} ${t.label}</strong></button>`).join('')}</div>
      <div class="yat-tour-zone"><div class="yat-tour-introline"><h2 id="tourHeading">${tours.fan.title}</h2><p>Scroll the timeline left ↔ right · click any stop</p></div><div id="audienceRail">${railHtml(tours.fan.stops,'audience')}</div></div>`;
    main.prepend(shell);

    const stage=document.getElementById('yatStage'), title=document.getElementById('yatTitle'), copy=document.getElementById('yatCopy'), kicker=document.getElementById('yatKicker'), counter=document.getElementById('yatCounter'), hat=document.getElementById('yatHat'), tourHeading=document.getElementById('tourHeading'), audienceRail=document.getElementById('audienceRail');
    let mode='story', audience='fan', current=0;

    function show(stop, index, total, context){
      title.textContent=stop.title; copy.textContent=stop.copy; counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
      if(stop.type==='live') stage.innerHTML=`<iframe src="${stop.url}" title="Live YAT?STATS preview" loading="eager" allow="fullscreen; autoplay; clipboard-write"></iframe>`; else stage.innerHTML=panelHtml(stop.panel);
      const rail=context==='story'?document.querySelector('.yat-story-rail .yat-rail'):audienceRail.querySelector('.yat-rail');
      rail?.querySelectorAll('.yat-stop').forEach((b,i)=>b.classList.toggle('active',i===index));
      rail?.querySelector(`.yat-stop[data-index="${index}"]`)?.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'nearest',inline:'center'});
    }

    function bindRail(container, context){container.querySelectorAll('.yat-stop').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.dataset.index||0); if(context==='story'){mode='story';current=i;hat.textContent=story.hat;kicker.textContent='THE YAT?STATS STORY';show(story.stops[i],i,story.stops.length,'story');} else {mode='audience';current=i;const t=tours[audience];hat.textContent=t.hat;kicker.textContent=t.eyebrow;show(t.stops[i],i,t.stops.length,'audience');}}));}

    bindRail(document.querySelector('.yat-story-rail .yat-rail'),'story'); bindRail(audienceRail,'audience');
    document.querySelectorAll('.yat-audience-btn').forEach(btn=>btn.addEventListener('click',()=>{audience=btn.dataset.audience;mode='audience';current=0;document.querySelectorAll('.yat-audience-btn').forEach(b=>b.classList.toggle('active',b===btn));const t=tours[audience];tourHeading.textContent=t.title;audienceRail.innerHTML=railHtml(t.stops,'audience');bindRail(audienceRail,'audience');hat.textContent=t.hat;kicker.textContent=t.eyebrow;show(t.stops[0],0,t.stops.length,'audience');document.querySelector('.yat-tour-zone')?.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'});}));

    show(story.stops[0],0,story.stops.length,'story');

    const nav=document.querySelector('.nav'); if(nav){nav.innerHTML=`<a href="#story">Our Story</a><a href="#audiences" data-jump="fan">For Fans</a><a href="#audiences" data-jump="coach">For Programs</a><a href="#audiences" data-jump="athlete">For Athletes</a><a href="#audiences" data-jump="partner">For Partners</a>`;nav.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',()=>{const key=a.dataset.jump;setTimeout(()=>document.querySelector(`.yat-audience-btn[data-audience="${key}"]`)?.click(),100);}));}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

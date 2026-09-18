(() => {
  if (window.__yatPlatformPreviewModal) return;
  window.__yatPlatformPreviewModal = true;

  const style = document.createElement('style');
  style.textContent = `
    .yat-preview-backdrop{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.78);backdrop-filter:blur(10px)}
    .yat-preview-backdrop.open{display:flex}
    .yat-preview-modal{width:min(1480px,96vw);height:min(92vh,980px);display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;border:1px solid #373a3e;border-radius:18px;background:#090a0b;box-shadow:0 40px 120px rgba(0,0,0,.72)}
    .yat-preview-bar{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:64px;padding:10px 12px 10px 18px;border-bottom:1px solid #272a2e;background:linear-gradient(180deg,#111315,#0b0d0e)}
    .yat-preview-heading{min-width:0;display:flex;align-items:center;gap:13px}
    .yat-preview-mark{flex:0 0 auto;display:grid;place-items:center;width:34px;height:34px;border:1px solid #5e4b21;border-radius:9px;background:rgba(239,185,54,.09);color:#efb936;font:900 11px/1 Inter,sans-serif}
    .yat-preview-title-wrap{min-width:0}
    .yat-preview-kicker{display:block;margin-bottom:2px;color:#efb936;font:800 9px/1 Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase}
    .yat-preview-title{display:block;max-width:760px;overflow:hidden;color:#f4f4f2;font:800 14px/1.2 Inter,sans-serif;text-overflow:ellipsis;white-space:nowrap}
    .yat-preview-host{display:block;max-width:760px;margin-top:3px;overflow:hidden;color:#747980;font:500 10px/1.2 Inter,sans-serif;text-overflow:ellipsis;white-space:nowrap}
    .yat-preview-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .yat-preview-open,.yat-preview-close{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:8px;font:800 11px/1 Inter,sans-serif;cursor:pointer;text-decoration:none}
    .yat-preview-open{padding:0 13px;border:1px solid #4a3d20;background:rgba(239,185,54,.08);color:#efc557}.yat-preview-open:hover{background:rgba(239,185,54,.14)}
    .yat-preview-close{width:38px;border:1px solid #30343a;background:#17191c;color:#fff;font-size:18px}.yat-preview-close:hover{background:#22252a}
    .yat-preview-stage{position:relative;min-height:0;background:#111}
    .yat-preview-loader{position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:#090a0b;color:#868b91;font:700 11px/1.4 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;transition:opacity .2s ease}
    .yat-preview-loader.hidden{opacity:0;pointer-events:none}
    .yat-preview-loader span:before{content:"";display:block;width:26px;height:26px;margin:0 auto 12px;border:2px solid #31353a;border-top-color:#efb936;border-radius:50%;animation:yatPreviewSpin .8s linear infinite}
    @keyframes yatPreviewSpin{to{transform:rotate(360deg)}}
    .yat-preview-frame{position:relative;z-index:2;width:100%;height:100%;border:0;background:#fff;opacity:0;transition:opacity .2s ease}.yat-preview-frame.loaded{opacity:1}
    .yat-preview-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;border-top:1px solid #25282c;background:#0c0e0f;color:#777c82;font:500 9px/1.35 Inter,sans-serif}
    .yat-preview-footer strong{color:#b8bbc0}.yat-preview-footer span:last-child{white-space:nowrap}
    body.yat-preview-lock{overflow:hidden}
    @media(max-width:760px){
      .yat-preview-backdrop{padding:0;background:#000;backdrop-filter:none}
      .yat-preview-modal{width:100vw;height:100dvh;max-height:none;border:0;border-radius:0}
      .yat-preview-bar{min-height:58px;padding:8px 8px 8px 12px;gap:8px}
      .yat-preview-mark{width:30px;height:30px;border-radius:7px;font-size:10px}
      .yat-preview-kicker{font-size:8px}.yat-preview-title{max-width:48vw;font-size:12px}.yat-preview-host{max-width:48vw;font-size:9px}
      .yat-preview-open{display:none}.yat-preview-close{width:40px;height:40px}
      .yat-preview-footer{padding:7px 11px;font-size:8px}.yat-preview-footer span:last-child{display:none}
    }
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'yat-preview-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML = `
    <section class="yat-preview-modal" role="dialog" aria-modal="true" aria-label="YAT?STATS platform preview">
      <header class="yat-preview-bar">
        <div class="yat-preview-heading">
          <div class="yat-preview-mark">YAT?</div>
          <div class="yat-preview-title-wrap">
            <span class="yat-preview-kicker">Live platform preview</span>
            <span class="yat-preview-title" id="yat-preview-title">YAT?STATS</span>
            <span class="yat-preview-host" id="yat-preview-host"></span>
          </div>
        </div>
        <div class="yat-preview-actions">
          <a class="yat-preview-open" id="yat-preview-open" href="#" target="_blank" rel="noopener">Open full site ↗</a>
          <button class="yat-preview-close" id="yat-preview-close" type="button" aria-label="Close preview">×</button>
        </div>
      </header>
      <div class="yat-preview-stage">
        <div class="yat-preview-loader" id="yat-preview-loader"><span>Loading live YAT?STATS experience</span></div>
        <iframe class="yat-preview-frame" id="yat-preview-frame" title="YAT?STATS live platform preview" allow="fullscreen; autoplay; clipboard-write"></iframe>
      </div>
      <footer class="yat-preview-footer"><span><strong>You are still on the YAT?STATS homepage.</strong> Browse this live school/player experience inside the preview.</span><span>Close anytime to return exactly where you were.</span></footer>
    </section>`;
  document.body.appendChild(backdrop);

  const frame = backdrop.querySelector('#yat-preview-frame');
  const loader = backdrop.querySelector('#yat-preview-loader');
  const title = backdrop.querySelector('#yat-preview-title');
  const host = backdrop.querySelector('#yat-preview-host');
  const openFull = backdrop.querySelector('#yat-preview-open');
  const closeButton = backdrop.querySelector('#yat-preview-close');
  let lastFocus = null;
  let historyArmed = false;

  function isYatPlatformUrl(raw) {
    try {
      const url = new URL(raw, window.location.href);
      return url.protocol.startsWith('http') && url.hostname !== 'yatstats.com' && url.hostname.endsWith('.yatstats.com');
    } catch {
      return false;
    }
  }

  function deriveTitle(anchor, url) {
    const explicit = anchor?.dataset?.previewTitle || anchor?.getAttribute('title') || '';
    if (explicit) return explicit.replace(/^Open\s+/i, '').replace(/\s+full player profile$/i, ' · Player Profile').replace(/\s+profile$/i, ' · Player Profile').replace(/\s+on\s+/i, ' · ');
    const strong = anchor?.querySelector?.('strong')?.textContent?.trim();
    if (strong) return strong;
    const text = anchor?.textContent?.replace(/\s+/g, ' ').trim();
    if (text && text.length < 90) return text;
    const school = url.hostname.split('.')[0].replace(/-/g, ' ');
    return school ? school.replace(/\b\w/g, c => c.toUpperCase()) : 'YAT?STATS Platform';
  }

  function actuallyClose() {
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('yat-preview-lock');
    frame.classList.remove('loaded');
    frame.src = 'about:blank';
    loader.classList.remove('hidden');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({preventScroll:true});
    lastFocus = null;
    historyArmed = false;
  }

  function requestClose() {
    if (!backdrop.classList.contains('open')) return;
    if (historyArmed && history.state?.yatPlatformPreview) {
      history.back();
    } else {
      actuallyClose();
    }
  }

  function openPreview(rawUrl, anchor) {
    const url = new URL(rawUrl, window.location.href);
    lastFocus = anchor || document.activeElement;
    title.textContent = deriveTitle(anchor, url);
    host.textContent = `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    openFull.href = url.href;
    loader.classList.remove('hidden');
    frame.classList.remove('loaded');
    frame.src = url.href;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('yat-preview-lock');
    closeButton.focus({preventScroll:true});
    if (!history.state?.yatPlatformPreview) {
      history.pushState({yatPlatformPreview:true}, '', window.location.href);
      historyArmed = true;
    } else {
      historyArmed = true;
    }
  }

  frame.addEventListener('load', () => {
    if (!backdrop.classList.contains('open')) return;
    loader.classList.add('hidden');
    frame.classList.add('loaded');
  });

  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !isYatPlatformUrl(href)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return;
    event.preventDefault();
    event.stopPropagation();
    openPreview(anchor.href, anchor);
  }, true);

  closeButton.addEventListener('click', requestClose);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) requestClose(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && backdrop.classList.contains('open')) requestClose(); });
  window.addEventListener('popstate', () => { if (backdrop.classList.contains('open')) actuallyClose(); });
})();

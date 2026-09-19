(() => {
  if (window.__yatDevicePreviewOverride) return;
  window.__yatDevicePreviewOverride = true;

  const PLATFORM_ORIGIN = 'https://hamilton.az.yatstats.com';
  const MAX_ZOOM = 3;
  const DEVICE_SIZES = {
    desktop: { w: 1500, h: 1400 },
    tablet: { w: 1024, h: 900 },
    mobile: { w: 390, h: 844 }
  };
  // Desktop's width floor, independent of the live-mutated
  // DEVICE_SIZES.desktop below: the real site's own CSS only turns on
  // side-by-side dual-drawer layout at min-width:780px
  // (SortFilterDrawerControls.tsx). A visitor on a phone selecting
  // "desktop mode" needs the iframe to actually render at a genuine
  // desktop-scale width -- scaled down to fit their small screen -- or
  // they will just see the site's narrow mobile layout (single drawer,
  // full-screen overlay) no matter which mode is picked.
  const DESKTOP_MIN_W = 1500;
  // Desktop's height floor for .device-area itself (chrome bar, padding and
  // border included) -- enough room for the roster strip/stat row plus a
  // full two rows of flip cards, so the desktop demo can actually show off
  // comparing several players at once instead of cutting the first row off
  // partway through. Tune this single number if real card rows come out
  // taller or shorter than estimated.
  const DESKTOP_MIN_AREA_H = 860;

  const style = document.createElement('style');
  style.id = 'yat-device-preview-style';
  style.textContent = `
    /* Turn the live preview into an actual device mockup instead of another page panel. */
    .live{
      border:0!important;
      background:transparent!important;
      overflow:visible!important;
      grid-template-rows:minmax(0,1fr) 28px!important;
      gap:4px!important;
    }
    .live > .bar{display:none!important}
    .device-area{
      position:relative;
      min-height:0;
      display:flex;
      align-items:flex-start;
      justify-content:center;
      overflow:hidden;
      padding:10px 8px 18px;
      background:radial-gradient(circle at 50% 24%,rgba(255,255,255,.045),transparent 40%);
    }
    .device-shell{
      --chrome-h:31px;
      position:relative;
      min-height:0;
      display:flex;
      flex-direction:column;
      align-items:stretch;
      background:#0a0b0c;
      transition:border-radius .25s ease,box-shadow .25s ease;
    }
    .browser-chrome{
      flex:0 0 var(--chrome-h);
      height:var(--chrome-h);
      display:flex;
      align-items:center;
      gap:8px;
      padding:4px 8px;
      border-bottom:1px solid #25292d;
      background:linear-gradient(#17191b,#101214);
      color:#8e949a;
      z-index:4;
    }
    .browser-lights{display:flex;gap:4px;flex:0 0 auto}.browser-lights i{width:7px;height:7px;border-radius:50%;background:#5a5e62}.browser-lights i:nth-child(1){background:#a74848}.browser-lights i:nth-child(2){background:#b58a38}.browser-lights i:nth-child(3){background:#4b875d}
    .browser-navicons{display:flex;gap:5px;color:#6f757a;font:500 11px/1 Oswald,sans-serif;flex:0 0 auto}.browser-navicons span{width:14px;text-align:center}
    .browser-address{
      min-width:0;
      flex:1;
      height:21px;
      display:flex;
      align-items:center;
      gap:4px;
      padding:0 8px;
      border:1px solid #292d31;
      border-radius:999px;
      background:#070809;
      overflow:hidden;
      color:#b9bdc1;
      font:400 8px/1 Oswald,sans-serif;
      white-space:nowrap;
    }
    .browser-lock{color:#9f8550;font-size:8px}
    .crumbs{min-width:0;display:flex;align-items:center;gap:3px;overflow:hidden;text-overflow:ellipsis}.crumb-host{color:#e3e5e6}.crumb-sep{color:#555b60}.crumb-path{color:#858b90;overflow:hidden;text-overflow:ellipsis}
    .browser-open{flex:0 0 auto;color:#8c9297;text-decoration:none;font:500 8px/1 Oswald,sans-serif;text-transform:uppercase}
    .browser-zoom-reset{
      display:none;
      flex:0 0 auto;
      height:20px;
      min-width:24px;
      padding:0 5px;
      border:1px solid #353a3e;
      border-radius:999px;
      background:#090a0b;
      color:#d8bd79;
      font:600 7px/1 Oswald,sans-serif;
      cursor:pointer;
    }
    .device-shell.zoomed .browser-zoom-reset{display:inline-flex;align-items:center;justify-content:center}

    .device-viewport{
      position:relative;
      flex:1;
      min-height:0;
      overflow:hidden;
      background:#020303;
      touch-action:none;
    }
    .device-viewport .wrap{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important}

    /* Desktop monitor / laptop silhouette */
    .device-shell.desktop{
      border:2px solid #3d4247;
      border-radius:10px 10px 6px 6px;
      box-shadow:0 14px 35px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.025) inset;
    }
    .device-shell.desktop:after{
      content:"";
      position:absolute;
      left:50%;
      bottom:-9px;
      width:18%;
      height:7px;
      transform:translateX(-50%);
      border-radius:0 0 8px 8px;
      background:linear-gradient(#3a3e42,#17191b);
      box-shadow:0 3px 7px rgba(0,0,0,.35);
    }

    /* Tablet bezel */
    .device-shell.tablet{
      border:7px solid #24282c;
      border-radius:16px;
      box-shadow:0 14px 35px rgba(0,0,0,.45);
    }
    .device-shell.tablet:before{
      content:"";
      position:absolute;z-index:8;left:50%;top:2px;transform:translateX(-50%);
      width:4px;height:4px;border-radius:50%;background:#565c61;
    }

    /* Phone bezel */
    .device-shell.mobile{
      border:7px solid #24282c;
      border-radius:24px;
      box-shadow:0 14px 35px rgba(0,0,0,.48);
    }
    .device-shell.mobile:before{
      content:"";
      position:absolute;z-index:8;left:50%;top:3px;transform:translateX(-50%);
      width:22%;height:3px;border-radius:999px;background:#555b60;
    }
    .device-shell.mobile .browser-lights,.device-shell.mobile .browser-navicons{display:none}
    .device-shell.mobile .browser-chrome{padding-inline:7px}

    /* Device choices belong with the device, not in the fake browser toolbar. */
    .live .foot{
      height:28px!important;
      min-height:28px!important;
      padding:2px 7px!important;
      border:0!important;
      background:transparent!important;
      display:flex!important;
      justify-content:center!important;
      gap:10px!important;
    }
    .live .foot > span{display:none!important}
    .device-switcher{display:flex;align-items:center;justify-content:center;gap:4px}
    .device-switcher button{
      min-width:auto!important;
      min-height:21px!important;
      height:21px!important;
      padding:0 7px!important;
      border:1px solid #30353a!important;
      border-radius:999px!important;
      background:#0e1012!important;
      color:#7d8388!important;
      font:500 7px/1 Oswald,sans-serif!important;
      letter-spacing:.04em!important;
      text-transform:uppercase!important;
    }
    .device-switcher button.active{border-color:#9e8248!important;color:#dfbf73!important;background:rgba(200,169,110,.08)!important}

    @media(max-width:900px){
      .device-area{padding:8px 3px 14px!important}
    }
    @media(max-width:620px){
      .live{min-height:calc(100dvh - var(--story))!important;grid-template-rows:minmax(0,1fr) 26px!important}
      .device-area{padding:6px 4px 8px!important}
      .device-shell{--chrome-h:27px}
      .device-shell.desktop{border-width:1px!important;border-radius:5px!important}
      .device-shell.desktop:after{display:none}
      .device-shell.tablet{border-width:5px!important;border-radius:12px!important}
      .device-shell.mobile{border-width:5px!important;border-radius:19px!important}
      .browser-chrome{gap:5px;padding:3px 5px!important}
      .browser-lights i{width:5px;height:5px}.browser-navicons{display:none}
      .browser-address{height:19px;font-size:6.7px;padding-inline:6px}.browser-open{font-size:6.5px}
      .browser-zoom-reset{height:18px;min-width:21px;font-size:6.3px;padding-inline:4px}
      .device-switcher button{height:19px!important;min-height:19px!important;padding-inline:6px!important;font-size:6.5px!important}
    }
  `;
  document.head.appendChild(style);

  function install(attempt = 0) {
    const live = document.querySelector('.live');
    const oldBar = live?.querySelector(':scope > .bar');
    const wrap = document.getElementById('wrap');
    const stage = document.getElementById('stage');
    const frame = document.getElementById('frame');
    const foot = live?.querySelector(':scope > .foot');
    const oldDevices = oldBar?.querySelector('.devices');
    const oldOpen = document.getElementById('open');
    if (!live || !oldBar || !wrap || !stage || !frame || !foot || !oldDevices || !oldOpen) {
      if (attempt < 180) setTimeout(() => install(attempt + 1), 40);
      return;
    }
    if (live.dataset.deviceMockup === '1') return;
    live.dataset.deviceMockup = '1';

    const area = document.createElement('div');
    area.className = 'device-area';
    const shell = document.createElement('div');
    shell.className = 'device-shell desktop';
    const chrome = document.createElement('div');
    chrome.className = 'browser-chrome';
    chrome.innerHTML = `
      <span class="browser-lights"><i></i><i></i><i></i></span>
      <span class="browser-navicons"><span>‹</span><span>›</span><span>↻</span></span>
      <div class="browser-address"><span class="browser-lock">●</span><span class="crumbs" id="actualCrumbs"></span></div>
      <button class="browser-zoom-reset" id="actualZoomReset" type="button" aria-label="Reset preview zoom" title="Reset preview zoom">1×</button>
      <a class="browser-open" id="actualOpen" target="_blank" rel="noopener">Open ↗</a>`;
    const viewport = document.createElement('div');
    viewport.className = 'device-viewport';

    live.insertBefore(area, oldBar);
    area.appendChild(shell);
    shell.appendChild(chrome);
    shell.appendChild(viewport);
    viewport.appendChild(wrap);

    const switcher = document.createElement('div');
    switcher.className = 'device-switcher';
    [...oldDevices.querySelectorAll('[data-device]')].forEach((button) => switcher.appendChild(button));
    foot.appendChild(switcher);

    const crumbs = document.getElementById('actualCrumbs');
    const actualOpen = document.getElementById('actualOpen');
    const zoomReset = document.getElementById('actualZoomReset');
    let currentUrl = PLATFORM_ORIGIN;
    let device = document.querySelector('[data-device].active')?.dataset.device || 'desktop';
    let fitScale = 1;
    let zoomScale = 1;
    let panX = 0;
    let panY = 0;
    let pinchStartZoom = 1;
    let pinchStartPanX = 0;
    let pinchStartPanY = 0;
    let panGestureStartX = 0;
    let panGestureStartY = 0;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function trustedMicrositeOrigin(origin) {
      try {
        const u = new URL(origin);
        if (u.protocol !== 'https:') return false;
        return (
          u.hostname === 'yatstats.com' ||
          u.hostname.endsWith('.yatstats.com') ||
          (u.hostname.startsWith('mike-crozite-template-') && u.hostname.endsWith('-arms-reach-digital-agency.vercel.app'))
        );
      } catch (_) {
        return false;
      }
    }

    function renderUrl(value) {
      try {
        const u = new URL(value || PLATFORM_ORIGIN);
        currentUrl = u.href;
        const path = `${u.pathname === '/' ? '' : u.pathname}${u.search}${u.hash}`;
        crumbs.innerHTML = `<span class="crumb-host">${u.hostname}</span>${path ? `<span class="crumb-sep">›</span><span class="crumb-path">${path.replace(/^\//,'')}</span>` : ''}`;
        actualOpen.href = currentUrl;
      } catch (_) {
        crumbs.textContent = String(value || 'hamilton.az.yatstats.com');
        actualOpen.href = PLATFORM_ORIGIN;
      }
    }

    function sendZoomState() {
      try {
        frame.contentWindow?.postMessage({
          source: 'yatstats-corporate-tour',
          type: 'YAT_EMBED_ZOOM_STATE',
          zoom: zoomScale
        }, '*');
      } catch (_) {}
    }

    function applyStageTransform() {
      const d = DEVICE_SIZES[device] || DEVICE_SIZES.desktop;
      const totalScale = fitScale * zoomScale;
      const availableW = Math.max(1, viewport.clientWidth);
      const availableH = Math.max(1, viewport.clientHeight);
      const scaledW = d.w * totalScale;
      const scaledH = d.h * totalScale;
      const overflowX = Math.max(0, (scaledW - availableW) / 2);
      const overflowY = Math.max(0, scaledH - availableH);

      panX = clamp(panX, -overflowX, overflowX);
      panY = clamp(panY, -overflowY, 0);

      // Explicit, rounded pixel positioning instead of left:50% + a
      // translateX(-50%) transform: that combo can land on a fractional
      // sub-pixel position once a non-round scale factor is involved,
      // leaving a hairline seam on one edge that exposes the viewport's
      // dark background -- reads as a faint blurry line against a
      // high-contrast photo. Computing and rounding the left edge directly
      // keeps the scaled layer pixel-aligned.
      const left = Math.round((availableW - scaledW) / 2 + panX);
      stage.style.width = d.w + 'px';
      stage.style.height = d.h + 'px';
      stage.style.top = Math.round(panY) + 'px';
      stage.style.left = left + 'px';
      stage.style.transformOrigin = 'top left';
      stage.style.transform = `scale(${totalScale})`;
      shell.classList.toggle('zoomed', zoomScale > 1.01);
      if (zoomReset) zoomReset.textContent = zoomScale > 1.01 ? `${zoomScale.toFixed(1)}×` : '1×';
    }

    function resetZoom() {
      zoomScale = 1;
      panX = 0;
      panY = 0;
      applyStageTransform();
      sendZoomState();
    }

    function fitDevice(reset = false) {
      device = document.querySelector('[data-device].active')?.dataset.device || device || 'desktop';
      shell.classList.remove('desktop','tablet','mobile');
      shell.classList.add(device);

      // Desktop mode renders at whatever height the page naturally gives it
      // (see below), so on a normal browser window that's often barely
      // enough for one row of cards before running out of room -- the whole
      // point of the demo is showing several players compared at once. Give
      // it a real floor and let the PAGE scroll to reach it (audience-site.js
      // switched .app/.live from a fixed height to a min-height for exactly
      // this) rather than squeezing the gallery into whatever's left after
      // the slideshow. Set before reading clientHeight below so the forced
      // reflow picks up the new value immediately. Tablet/mobile keep their
      // own natural fit -- clear this so it doesn't leak into those modes.
      area.style.minHeight = device === 'desktop' ? DESKTOP_MIN_AREA_H + 'px' : '';

      // Fit against the OUTER area's box, not the shell/viewport -- their
      // size is about to become an effect of this calculation (below), so
      // using them as the input here would be circular and would let a
      // stale size feed back into itself.
      const areaStyle = getComputedStyle(area);
      const areaPadX = parseFloat(areaStyle.paddingLeft) + parseFloat(areaStyle.paddingRight);
      const areaPadY = parseFloat(areaStyle.paddingTop) + parseFloat(areaStyle.paddingBottom);
      const chromeH = parseFloat(getComputedStyle(shell).getPropertyValue('--chrome-h')) || 31;
      const borderW = parseFloat(getComputedStyle(shell).borderLeftWidth) || 0;

      const availableW = Math.max(1, area.clientWidth - areaPadX - borderW * 2);
      const availableH = Math.max(1, area.clientHeight - areaPadY - chromeH - borderW * 2);

      // A phone is never wider than it is tall, so a fixed real-device ratio
      // makes sense for mobile/tablet. Desktop has no such constraint, and a
      // fixed "pretend browser" canvas smaller than the corporate page's own
      // width undersells the platform's actual wide-screen layout (both side
      // drawers open, a full card grid). So on an actually-wide viewer,
      // desktop renders at native 1:1 scale, exactly as wide and tall as the
      // corporate page gives it -- the same container the slideshow above it
      // already fills. But that same logic falls apart on a phone: never let
      // it shrink the desktop canvas below DESKTOP_MIN, or a mobile visitor
      // selecting "desktop mode" would just get an iframe rendered at their
      // own narrow phone width -- showing the real site's mobile layout, not
      // a desktop one, regardless of which mode they picked.
      if (device === 'desktop') {
        // Only width needs a floor: the real site's dual-drawer layout is
        // gated purely on min-width. Height has no such gate and should
        // just match whatever the container gives, or a perfectly normal
        // (not enormous) desktop browser window would get scaled down for
        // no reason.
        DEVICE_SIZES.desktop = { w: Math.max(availableW, DESKTOP_MIN_W), h: availableH };
      }
      const d = DEVICE_SIZES[device] || DEVICE_SIZES.desktop;
      fitScale = Math.min(availableW / d.w, availableH / d.h, 1);

      // The shell itself is sized to the real device aspect ratio (chrome
      // bar + scaled content), not stretched to fill whatever shape the
      // container happens to be -- that mismatch is what left a dead black
      // rectangle inside the fake browser instead of an actual monitor/
      // tablet/phone silhouette, and stretched mobile/tablet out of shape.
      shell.style.width = (d.w * fitScale + borderW * 2) + 'px';
      shell.style.height = (chromeH + d.h * fitScale + borderW * 2) + 'px';

      if (reset) {
        zoomScale = 1;
        panX = 0;
        panY = 0;
      }
      viewport.style.minHeight = '0';
      shell.style.setProperty('--viewport-scale', String(fitScale));
      applyStageTransform();
      sendZoomState();
    }

    /* Existing buttons continue to change the actual responsive viewport; this layer only changes the hardware shell + fit. */
    document.querySelectorAll('[data-device]').forEach((button) => {
      button.addEventListener('click', () => {
        device = button.dataset.device || 'desktop';
        zoomScale = 1;
        panX = 0;
        panY = 0;
        requestAnimationFrame(() => fitDevice(true));
        setTimeout(() => fitDevice(true), 30);
      });
    });

    zoomReset?.addEventListener('click', resetZoom);

    /*
      The microsite bridge reports the real cross-origin URL and relays pinch/pan
      gestures. The parent owns the visual magnification, so zoom never escapes
      the clipped fake-device viewport or changes the corporate page zoom.
    */
    let handshakeConfirmed = false;

    window.addEventListener('message', (event) => {
      if (event.source !== frame.contentWindow) return;
      if (!trustedMicrositeOrigin(event.origin)) return;
      const data = event.data || {};
      if (data.source !== 'yatstats-microsite') return;

      if (data.type === 'YAT_LOCATION' || data.type === 'YAT_TOUR_LOCATION') {
        handshakeConfirmed = true;
        if (typeof data.href === 'string' && /^https?:\/\//.test(data.href)) renderUrl(data.href);
        return;
      }

      if (data.type === 'YAT_EMBED_GESTURE') {
        if (data.phase === 'start') {
          pinchStartZoom = zoomScale;
          pinchStartPanX = panX;
          pinchStartPanY = panY;
          return;
        }
        if (data.phase === 'change') {
          const scaleDelta = Number(data.scale);
          if (!Number.isFinite(scaleDelta) || scaleDelta <= 0) return;
          const d = DEVICE_SIZES[device] || DEVICE_SIZES.desktop;
          const focalX = clamp(Number(data.centerX) || .5, 0, 1);
          const focalY = clamp(Number(data.centerY) || .5, 0, 1);
          const oldTotal = fitScale * pinchStartZoom;
          zoomScale = clamp(pinchStartZoom * scaleDelta, 1, MAX_ZOOM);
          const newTotal = fitScale * zoomScale;
          const logicalX = (focalX - .5) * d.w;
          const logicalY = focalY * d.h;

          /* Keep the point under the fingers approximately stationary while magnifying. */
          panX = pinchStartPanX - logicalX * (newTotal - oldTotal);
          panY = pinchStartPanY - logicalY * (newTotal - oldTotal);
          applyStageTransform();
          return;
        }
        if (data.phase === 'end') {
          applyStageTransform();
          sendZoomState();
        }
        return;
      }

      if (data.type === 'YAT_EMBED_PAN') {
        if (data.phase === 'start') {
          panGestureStartX = panX;
          panGestureStartY = panY;
          return;
        }
        if (data.phase === 'change' && zoomScale > 1.001) {
          const totalScale = fitScale * zoomScale;
          const dx = Number(data.deltaX) || 0;
          const dy = Number(data.deltaY) || 0;
          panX = panGestureStartX + dx * totalScale;
          panY = panGestureStartY + dy * totalScale;
          applyStageTransform();
        }
        return;
      }

      if (data.type === 'YAT_EMBED_ZOOM_RESET') {
        resetZoom();
      }
    });

    /* Known parent-directed destinations can update immediately without waiting for the iframe. */
    window.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.source === 'yatstats-corporate-tour' && data.type === 'YAT_PARENT_LOCATION' && typeof data.href === 'string') {
        renderUrl(data.href);
      }
    });

    // The framed page's own bridge script only starts listening once its
    // React app has hydrated, which is measurably later than the browser's
    // 'load' event -- especially right after a full cross-origin navigation
    // (e.g. Hamilton -> Basha via Global Search), which reloads the entire
    // app fresh. A single HELLO sent exactly on 'load' can arrive before
    // anything is listening for it and be silently dropped: the address bar
    // then just keeps showing whatever it last displayed, with no error and
    // no visible sign the handshake failed. Retrying for a few seconds costs
    // nothing once the real reply arrives (it just stops) and closes that gap
    // regardless of how long hydration actually takes.
    let handshakeRetryTimer = null;
    frame.addEventListener('load', () => {
      fitDevice(true);
      handshakeConfirmed = false;
      clearInterval(handshakeRetryTimer); // A prior in-flight retry loop must not keep running (or pile up) past this new load.
      const attemptHandshake = () => {
        try {
          frame.contentWindow?.postMessage({ source:'yatstats-corporate-tour', type:'YAT_TOUR_HELLO' }, '*');
          frame.contentWindow?.postMessage({ source:'yatstats-corporate-tour', type:'YAT_REQUEST_LOCATION' }, '*');
        } catch (_) {}
      };
      attemptHandshake();
      let attempts = 0;
      // 3.6s only covers React hydration lag. A school subdomain that hasn't
      // been visited recently can also hit a cold serverless start on top of
      // that -- several seconds of server-side rendering before any JS even
      // reaches the browser -- so this needs real margin, not just enough
      // for hydration. 30s/75 attempts costs nothing once it lands; it only
      // matters when the handshake would otherwise never complete at all.
      handshakeRetryTimer = setInterval(() => {
        attempts++;
        if (handshakeConfirmed || attempts >= 75) { clearInterval(handshakeRetryTimer); return; }
        attemptHandshake();
      }, 400);
    });

    if ('ResizeObserver' in window) {
      // Watch the independent container, not shell/viewport -- their size is
      // now a RESULT of fitDevice() itself, so observing them would just
      // chase their own output on every call.
      const ro = new ResizeObserver(() => requestAnimationFrame(() => fitDevice(false)));
      ro.observe(area);
    }
    window.addEventListener('resize', () => requestAnimationFrame(() => fitDevice(false)), { passive:true });

    renderUrl(currentUrl);
    fitDevice(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => install(), { once:true });
  else install();
})();

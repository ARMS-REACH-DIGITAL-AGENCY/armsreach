(() => {
  if (window.__yatLayeredStoryStrip) return;
  window.__yatLayeredStoryStrip = true;

  const style = document.createElement('style');
  style.id = 'yat-layered-story-strip-style';
  style.textContent = `
    :root{--story:208px!important}

    /* The story IS the timeline: one shallow, layered horizontal strip. */
    .story{
      position:relative!important;
      flex:0 0 var(--story)!important;
      height:var(--story)!important;
      min-height:var(--story)!important;
      overflow:hidden!important;
      background:#060708!important;
    }
    .track{
      position:relative!important;
      height:100%!important;
      display:flex!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      scroll-snap-type:none!important;
      scrollbar-width:none!important;
      cursor:grab!important;
      overscroll-behavior-x:contain!important;
      touch-action:pan-x!important;
      background:#060708!important;
    }
    .track:active{cursor:grabbing!important}
    .track::-webkit-scrollbar{display:none!important}

    /* Each timeline point stays on one plane. Nothing stacks at narrower widths. */
    .slide{
      position:relative!important;
      isolation:isolate!important;
      flex:0 0 100%!important;
      width:100%!important;
      min-width:100%!important;
      height:100%!important;
      display:block!important;
      overflow:hidden!important;
      scroll-snap-align:none!important;
      background:#060708!important;
    }

    /* LAYER 1 — the visual bed. It spans the whole story point. */
    .visual{
      position:absolute!important;
      z-index:1!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      border:0!important;
      overflow:hidden!important;
      background:#1b2522!important;
    }
    .bg{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      object-fit:cover!important;
      object-position:center 48%!important;
      filter:brightness(.72) saturate(.92)!important;
      transform:scale(1.015)!important;
    }
    .visual:before{
      content:"";
      position:absolute;
      z-index:2;
      inset:0;
      pointer-events:none;
      background:
        linear-gradient(90deg,rgba(0,0,0,.04) 0%,rgba(0,0,0,.10) 20%,rgba(4,5,6,.80) 43%,rgba(4,5,6,.97) 72%,#040506 100%),
        linear-gradient(180deg,rgba(0,0,0,.12),transparent 55%,rgba(0,0,0,.48));
    }
    .visual:after{
      content:"";
      position:absolute!important;
      z-index:3!important;
      left:0!important;
      right:0!important;
      bottom:0!important;
      top:auto!important;
      height:2px!important;
      background:linear-gradient(90deg,rgba(200,169,110,.25),#d3aa48 28%,#efd070 55%,rgba(200,169,110,.24))!important;
      box-shadow:0 0 16px rgba(211,170,72,.28)!important;
      pointer-events:none!important;
    }

    /* LAYER 2 — S3 player silhouette / YaTi. */
    .person,
    .person.yati{
      position:absolute!important;
      z-index:4!important;
      left:2.5%!important;
      bottom:-4%!important;
      width:clamp(126px,15vw,224px)!important;
      height:108%!important;
      max-width:none!important;
      object-fit:contain!important;
      object-position:left bottom!important;
      filter:drop-shadow(0 14px 22px rgba(0,0,0,.44))!important;
    }
    .person.yati{
      left:4%!important;
      bottom:-6%!important;
      width:clamp(112px,13vw,194px)!important;
      height:104%!important;
      object-position:center bottom!important;
    }

    /* LAYER 3 — story copy. Same layer at every breakpoint; it only scales. */
    .copy{
      position:absolute!important;
      z-index:6!important;
      inset:0!important;
      width:auto!important;
      height:100%!important;
      display:flex!important;
      flex-direction:column!important;
      justify-content:center!important;
      padding:16px 7.5% 30px clamp(230px,25vw,390px)!important;
      background:transparent!important;
      pointer-events:none!important;
    }
    .kick{
      margin:0 0 5px!important;
      color:#dfbf73!important;
      font:500 clamp(7px,.62vw,10px)/1 Oswald,sans-serif!important;
      letter-spacing:.13em!important;
      text-transform:uppercase!important;
    }
    .title{
      max-width:900px!important;
      margin:0 0 5px!important;
      color:#f3f3f1!important;
      font:400 clamp(25px,2.45vw,43px)/.94 'Bebas Neue',Oswald,sans-serif!important;
      letter-spacing:.005em!important;
      text-transform:uppercase!important;
      text-wrap:balance!important;
    }
    .bodycopy{
      max-width:860px!important;
      margin:0!important;
      color:#b0b3b6!important;
      font:300 clamp(9px,.70vw,12px)/1.35 Oswald,sans-serif!important;
    }
    .step{
      position:absolute!important;
      z-index:7!important;
      right:14px!important;
      top:13px!important;
      color:#72777c!important;
      font-size:8px!important;
    }
    .step b{font-size:12px!important}

    .aud{
      z-index:7!important;
      left:12px!important;
      top:10px!important;
      padding:4px 7px!important;
      font-size:7px!important;
    }
    .cap{
      z-index:7!important;
      left:12px!important;
      bottom:10px!important;
      font-size:7px!important;
    }

    /* The thin baseline is the timeline indicator; the story panels themselves are the timeline. */
    .progress{
      z-index:10!important;
      left:clamp(230px,25vw,390px)!important;
      right:78px!important;
      bottom:11px!important;
      gap:4px!important;
      pointer-events:auto!important;
    }
    .progress button{
      height:2px!important;
      min-width:26px!important;
      background:#3a3e42!important;
    }
    .progress button.active{background:#d4ae56!important}
    .arrows{
      z-index:10!important;
      right:12px!important;
      bottom:7px!important;
    }
    .arrows button{
      width:28px!important;
      height:25px!important;
      border-radius:4px!important;
      background:rgba(8,9,10,.76)!important;
    }

    /* More room below for the responsive live-site photograph. */
    .live{min-height:0!important}

    @media(max-width:900px){
      :root{--story:192px!important}
      .story{height:var(--story)!important;flex-basis:var(--story)!important;min-height:var(--story)!important}
      .slide{display:block!important;grid-template-columns:none!important}
      .visual{height:100%!important;border:0!important}
      .copy{
        position:absolute!important;
        inset:0!important;
        justify-content:center!important;
        padding:14px 6% 27px clamp(175px,30vw,270px)!important;
      }
      .person,.person.yati{width:clamp(108px,23vw,172px)!important;height:107%!important}
      .title{font-size:clamp(21px,4vw,32px)!important}
      .bodycopy{font-size:clamp(8.5px,1.45vw,10.5px)!important}
      .step{top:10px!important;right:11px!important}
      .progress{left:clamp(175px,30vw,270px)!important;right:72px!important}
      .live{height:calc(100dvh - var(--story))!important;min-height:430px!important}
    }

    @media(max-width:620px){
      :root{--story:184px!important}
      .story{height:var(--story)!important;flex-basis:var(--story)!important;min-height:var(--story)!important}
      .slide{display:block!important;grid-template-columns:none!important}
      .visual{height:100%!important;border:0!important}
      .bg{object-position:44% 50%!important}
      .visual:before{
        background:
          linear-gradient(90deg,rgba(0,0,0,.03) 0%,rgba(3,4,5,.28) 22%,rgba(3,4,5,.88) 47%,#030405 100%),
          linear-gradient(180deg,rgba(0,0,0,.10),transparent 55%,rgba(0,0,0,.50));
      }
      .person,.person.yati{
        left:1%!important;
        bottom:-3%!important;
        width:clamp(92px,27vw,128px)!important;
        height:104%!important;
      }
      .person.yati{left:3%!important;width:clamp(82px,24vw,116px)!important}
      .copy{
        position:absolute!important;
        inset:0!important;
        justify-content:center!important;
        padding:13px 12px 27px 31%!important;
      }
      .kick{font-size:6.5px!important;margin-bottom:4px!important}
      .title{font-size:clamp(18px,5.7vw,25px)!important;margin-bottom:4px!important}
      .bodycopy{
        max-width:100%!important;
        font-size:clamp(7.5px,2.25vw,9.2px)!important;
        line-height:1.28!important;
        display:-webkit-box!important;
        -webkit-line-clamp:3!important;
        -webkit-box-orient:vertical!important;
        overflow:hidden!important;
      }
      .aud{left:7px!important;top:7px!important;font-size:5.8px!important}
      .cap{left:7px!important;bottom:8px!important;font-size:5.8px!important}
      .step{top:8px!important;right:7px!important;font-size:6.5px!important}
      .step b{font-size:9px!important}
      .progress{left:31%!important;right:64px!important;bottom:8px!important;gap:3px!important}
      .progress button{min-width:14px!important}
      .arrows{right:6px!important;bottom:4px!important;gap:3px!important}
      .arrows button{width:25px!important;height:23px!important}
      .live{height:calc(100dvh - var(--story))!important;min-height:400px!important}
    }
  `;
  document.head.appendChild(style);

  function install(attempt = 0) {
    const track = document.getElementById('track');
    if (!track) {
      if (attempt < 160) window.setTimeout(() => install(attempt + 1), 40);
      return;
    }
    if (track.dataset.layeredDrag === '1') return;
    track.dataset.layeredDrag = '1';

    /* Mouse drag behaves like a physical timeline. Touch/trackpad keep native scrolling. */
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = null;

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = track.scrollLeft;
      pointerId = event.pointerId;
      try { track.setPointerCapture(pointerId); } catch {}
    });

    track.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startScroll - dx;
      if (moved) event.preventDefault();
    });

    const endDrag = (event) => {
      if (!dragging) return;
      dragging = false;
      try { if (pointerId !== null) track.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    /* Do not let the old full-slide snap behavior reassert itself after resize. */
    const keepFree = () => {
      track.style.setProperty('scroll-snap-type', 'none', 'important');
    };
    keepFree();
    window.addEventListener('resize', keepFree, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => install(), { once: true });
  } else {
    install();
  }
})();

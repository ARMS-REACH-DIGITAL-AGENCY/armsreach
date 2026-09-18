(() => {
  if (window.__yatLiveFrameFitOverride) return;
  window.__yatLiveFrameFitOverride = true;

  /*
    The live microsite is intentionally rendered at a fixed desktop viewport
    that stays above the 5-column breakpoint. The entire viewport is then
    scaled proportionally to fit the available stage, like a responsive image.
    This prevents the outer frame from shrinking while the site inside remains
    oversized/cropped.
  */
  const LOGICAL_WIDTH = 1500;
  const LOGICAL_HEIGHT = 760;

  const style = document.createElement('style');
  style.id = 'yat-live-frame-fit-styles';
  style.textContent = `
    /* Keep the story/tour in the compact player-profile-style top rows. */
    .yat-story-top{
      height:170px!important;
      grid-template-columns:clamp(290px,24vw,370px) minmax(0,1fr)!important;
    }
    .yat-story-top .yat-journey-canvas{
      height:170px!important;
    }
    .yat-story-narration{
      grid-template-columns:58px minmax(0,1fr) auto!important;
      gap:12px!important;
      padding:12px 15px!important;
    }
    .yat-story-yati{
      width:56px!important;
      height:74px!important;
    }
    .yat-story-copy h1{
      font-size:clamp(24px,2.15vw,34px)!important;
    }
    .yat-story-copy p{
      font-size:11px!important;
      line-height:1.35!important;
    }
    .yat-story-track-shell{
      height:54px!important;
    }
    .yat-story-stop{
      flex-basis:136px!important;
      padding:7px 9px!important;
    }
    .yat-story-label{
      margin-top:10px!important;
      font-size:14px!important;
    }

    /* Buy the live platform as much of the remaining viewport as possible. */
    .yat-live-platform{
      margin:5px 0 6px!important;
      grid-template-rows:32px minmax(0,1fr) 19px!important;
    }
    .yat-live-bar{
      min-height:32px!important;
      padding:4px 8px 4px 10px!important;
    }
    .yat-live-action{
      min-height:23px!important;
      padding:0 7px!important;
    }
    .yat-live-footer{
      min-height:19px!important;
      padding:3px 9px!important;
      font-size:7px!important;
    }
    .yat-live-frame-wrap{
      position:relative!important;
      display:block!important;
      overflow:hidden!important;
      background:#050505!important;
    }

    /* This is the image-like desktop viewport that scales as one unit. */
    .yat-live-photo-stage{
      position:absolute!important;
      left:50%!important;
      top:0;
      width:${LOGICAL_WIDTH}px!important;
      height:${LOGICAL_HEIGHT}px!important;
      transform-origin:top center!important;
      overflow:hidden!important;
      background:#050505;
      z-index:2;
    }
    .yat-live-photo-stage .yat-live-frame{
      position:absolute!important;
      inset:0!important;
      left:0!important;
      top:0!important;
      width:${LOGICAL_WIDTH}px!important;
      height:${LOGICAL_HEIGHT}px!important;
      max-width:none!important;
      max-height:none!important;
      transform:none!important;
      transform-origin:top left!important;
      border:0!important;
    }
    .yat-live-photo-stage .yat-live-callout{
      position:absolute!important;
    }

    @media (min-width:860px){
      body.yat-one-screen-home .yat-journey-hero{
        flex:0 0 224px!important;
      }
    }

    @media (max-width:1050px){
      .yat-story-top{
        grid-template-columns:280px minmax(0,1fr)!important;
      }
      .yat-story-narration{
        grid-template-columns:50px minmax(0,1fr) auto!important;
        padding:10px 12px!important;
      }
      .yat-story-yati{
        width:48px!important;
        height:66px!important;
      }
      .yat-story-copy p{
        font-size:10px!important;
      }
    }

    @media (max-width:859px){
      .yat-story-top{
        grid-template-columns:1fr!important;
        height:auto!important;
      }
      .yat-story-top .yat-journey-canvas{
        height:145px!important;
      }
      .yat-story-narration{
        min-height:116px!important;
      }
      .yat-live-platform{
        height:auto!important;
        min-height:0!important;
        grid-template-rows:30px auto 18px!important;
        margin:6px 8px 10px!important;
      }
      .yat-live-frame-wrap{
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        aspect-ratio:${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}!important;
      }
      .yat-live-footer{
        min-height:18px!important;
      }
    }
  `;
  document.head.appendChild(style);

  function waitForStage(attempt = 0) {
    const wrap = document.getElementById('yat-live-wrap');
    const frame = document.getElementById('yat-live-frame');
    const callout = document.getElementById('yat-live-callout');

    if (wrap && frame && callout) {
      install(wrap, frame, callout);
      return;
    }

    if (attempt < 160) window.setTimeout(() => waitForStage(attempt + 1), 50);
  }

  function install(wrap, frame, callout) {
    let stage = wrap.querySelector('.yat-live-photo-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'yat-live-photo-stage';
      wrap.appendChild(stage);
      stage.appendChild(frame);
      stage.appendChild(callout);
    }

    function fit() {
      const availableWidth = Math.max(1, wrap.clientWidth);
      const availableHeight = Math.max(1, wrap.clientHeight);
      const scale = Math.min(
        1,
        availableWidth / LOGICAL_WIDTH,
        availableHeight / LOGICAL_HEIGHT,
      );

      const renderedHeight = LOGICAL_HEIGHT * scale;
      const top = Math.max(0, (availableHeight - renderedHeight) / 2);

      stage.style.setProperty('width', `${LOGICAL_WIDTH}px`, 'important');
      stage.style.setProperty('height', `${LOGICAL_HEIGHT}px`, 'important');
      stage.style.setProperty('top', `${top}px`, 'important');
      stage.style.setProperty('transform', `translateX(-50%) scale(${scale})`, 'important');

      frame.style.setProperty('width', `${LOGICAL_WIDTH}px`, 'important');
      frame.style.setProperty('height', `${LOGICAL_HEIGHT}px`, 'important');
      frame.style.setProperty('left', '0', 'important');
      frame.style.setProperty('top', '0', 'important');
      frame.style.setProperty('transform', 'none', 'important');

      wrap.style.setProperty('--yat-preview-scale', String(scale));
    }

    const reapply = () => window.requestAnimationFrame(fit);

    frame.addEventListener('load', reapply);
    window.addEventListener('resize', reapply, { passive: true });
    document.getElementById('yat-live-expand')?.addEventListener('click', () => window.setTimeout(fit, 60));
    document.getElementById('yat-live-close')?.addEventListener('click', () => window.setTimeout(fit, 60));

    if ('ResizeObserver' in window) {
      new ResizeObserver(reapply).observe(wrap);
    }

    fit();
    window.setTimeout(fit, 100);
    window.setTimeout(fit, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForStage(), { once: true });
  } else {
    waitForStage();
  }
})();

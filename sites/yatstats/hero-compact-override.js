(() => {
  if (window.__yatCompactHeroOverride) return;
  window.__yatCompactHeroOverride = true;

  const style = document.createElement('style');
  style.id = 'yat-compact-hero-override';
  style.textContent = `
    /* Approved hero stays intact; only its vertical footprint is reduced. */
    .hero{padding-bottom:18px!important;}
    .yat-journey-canvas{
      height:clamp(125px,11.25vw,180px)!important;
      min-height:0!important;
    }
    .yat-journey-bg{
      object-position:center center!important;
    }
    .yat-journey-badge{
      left:16px!important;
      bottom:12px!important;
      padding:5px 8px!important;
      font-size:7px!important;
    }
    .yat-journey-scroll{
      right:16px!important;
      bottom:12px!important;
      font-size:7px!important;
    }

    @media (max-width:720px){
      .hero{padding-bottom:12px!important;}
      .yat-journey-canvas{
        height:clamp(105px,26vw,138px)!important;
      }
      .yat-journey-badge{
        left:9px!important;
        bottom:7px!important;
        gap:5px!important;
        padding:4px 6px!important;
        font-size:6px!important;
        letter-spacing:.08em!important;
      }
      .yat-journey-badge i{
        width:5px!important;
        height:5px!important;
      }
      .yat-journey-scroll{
        right:9px!important;
        bottom:7px!important;
        font-size:6px!important;
        letter-spacing:.08em!important;
      }
    }
  `;
  document.head.appendChild(style);
})();

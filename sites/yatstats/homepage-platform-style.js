(() => {
  if (window.__yatHomepagePlatformStyle) return;
  window.__yatHomepagePlatformStyle = true;

  const googleFonts = document.createElement('link');
  googleFonts.rel = 'stylesheet';
  googleFonts.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(googleFonts);

  const style = document.createElement('style');
  style.id = 'yat-homepage-platform-style';
  style.textContent = `
    @font-face{
      font-family:"Indigo";
      src:url("https://hamilton.az.yatstats.com/fonts/Indigo.otf") format("opentype");
      font-weight:400;
      font-style:normal;
      font-display:swap;
    }

    :root{
      --yat-home-bg:#0c0c0c;
      --yat-home-fg:#f2f2f2;
      --yat-home-muted:#c4c4c4;
      --yat-home-line:rgba(255,255,255,.10);
      --yat-home-surface:#171717;
      --yat-home-accent:#c8a96e;
    }

    /* The preview warning was useful once; it is now visual noise. */
    .testbar{display:none!important}

    html{scroll-padding-top:48px!important}
    body{
      font-family:Oswald,system-ui,sans-serif!important;
      -webkit-font-smoothing:antialiased;
    }

    /* Match the compact platform top bar rather than a SaaS-marketing header. */
    .header{
      background:rgba(0,0,0,.96)!important;
      border-bottom:1px solid var(--yat-home-line)!important;
    }
    .header-inner{
      min-height:42px!important;
      gap:18px!important;
    }
    .brand img{width:132px!important}
    .nav{gap:clamp(12px,1.25vw,26px)!important}
    .nav a{
      font-family:"Indigo","Bebas Neue",Oswald,sans-serif!important;
      font-size:clamp(9px,.72vw,13px)!important;
      font-weight:400!important;
      line-height:1!important;
      letter-spacing:.01em!important;
      text-transform:uppercase!important;
      color:var(--yat-home-fg)!important;
      opacity:.96;
    }
    .nav a:hover{opacity:.72;color:var(--yat-home-fg)!important}

    /* YAT?STATS uses compact outlined controls; remove the big yellow marketing pills. */
    .button,
    .button.secondary,
    .button.small{
      min-height:34px!important;
      padding:8px 12px!important;
      border:1px solid rgba(255,255,255,.28)!important;
      border-radius:6px!important;
      background:transparent!important;
      color:var(--yat-home-fg)!important;
      box-shadow:none!important;
      font:700 11px/1 Oswald,sans-serif!important;
      letter-spacing:.10em!important;
      text-transform:uppercase!important;
      transform:none!important;
    }
    .button:hover,
    .button.secondary:hover,
    .button.small:hover{
      border-color:var(--yat-home-accent)!important;
      color:var(--yat-home-accent)!important;
      background:rgba(200,169,110,.08)!important;
      box-shadow:none!important;
      transform:none!important;
    }

    .eyebrow{
      font-family:Oswald,sans-serif!important;
      font-weight:500!important;
      letter-spacing:.11em!important;
    }

    /* Keep display type visually related to the microsite's condensed baseball language. */
    .section-head h2,
    .cta-band h2,
    .aud-detail-copy h3,
    .memory-card h3,
    .blog-card h3{
      font-family:"Bebas Neue",Oswald,sans-serif!important;
      letter-spacing:.01em!important;
    }

    @media(max-width:680px){
      .header-inner{min-height:38px!important}
      .nav{top:38px!important}
      .brand img{width:118px!important}
    }
  `;
  document.head.appendChild(style);
})();

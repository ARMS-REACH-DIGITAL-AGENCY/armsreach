(() => {
  // Only this partners page loads the entry point. Shared guided tours stay unchanged.
  if (document.body.dataset.audience !== 'partners') return;
  const addLink = () => {
    const nav = document.getElementById('nav');
    if (!nav || nav.querySelector('[data-partner-dashboard]')) return Boolean(nav);
    const link = document.createElement('a');
    link.href = '/partners/dashboard/';
    link.textContent = 'Partner dashboard';
    link.className = 'nav-main';
    link.dataset.partnerDashboard = 'true';
    const group = document.createElement('div');
    group.className = 'nav-group';
    group.appendChild(link);
    nav.appendChild(group);
    return true;
  };
  if (!addLink()) {
    const observer = new MutationObserver(() => { if (addLink()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }
})();

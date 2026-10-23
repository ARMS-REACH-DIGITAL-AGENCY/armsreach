const API = '/api/partners';
const FIREBASE_VERSION = '12.10.0';
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone';
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const SPONSOR_ASSET_KINDS = ['logo', 'ad', 'card_front', 'card_banner', 'card_full'];
const CARD_BACK_TEMPLATES = [
  ['banner_text', 'Banner + message', 'A sponsor banner above one message in the FunZone.'],
  ['share_promotion', 'Community sharing', 'A prepared promotion inviting fans to share the school community.'],
  ['full_image', 'Full-size image', 'One image fills the back’s banner and message area.'],
];
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = {
  auth: null, authTools: null, firebaseUser: null, data: null, authEpoch: 0, dashboardRequestId: 0,
  section: 'overview', deskTab: 'notes', sponsorId: '', creativeId: '', cardId: '', noteId: '', placementId: '', cardPlacementId: '', membershipId: '', newBrand: false,
  schools: new Map(), searchTimers: new WeakMap(), searchControllers: new WeakMap(), cardDrafts: new WeakMap(), dirty: false,
  preview: { kind: 'edition', context: {}, format: 'html', device: 'desktop', html: '', text: '', card: null, origin: '', url: '', schoolId: '', cadence: 'weekly', requestId: 0 },
};

function safeUrl(value) {
  if (!value) return '';
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''; } catch { return ''; }
}
function list(key) { return Array.isArray(state.data?.[key]) ? state.data[key] : []; }
function isPublisher() { return Boolean(state.data?.user?.publisher); }
function sponsor() { return list('sponsors').find(item => String(item.id) === state.sponsorId); }
function activeCreative() { return list('creatives').find(item => String(item.id) === state.creativeId && String(item.sponsorId) === state.sponsorId); }
function activeCard() { return list('cards').find(item => String(item.id) === state.cardId && String(item.sponsorId) === state.sponsorId); }
function activeNote() { return list('notes').find(item => String(item.id) === state.noteId); }
function activePlacement(cards = false) { return list(cards ? 'cardPlacements' : 'placements').find(item => String(item.id) === (cards ? state.cardPlacementId : state.placementId)); }
function dateLabel(value, includeTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(d);
}
function inputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Choose a valid date and time.');
  return d.toISOString();
}
function periodLabel(item) {
  return `${item.startsAt ? dateLabel(item.startsAt) : 'No start limit'}${item.evergreen ? ' · Evergreen' : item.endsAt ? ` – ${dateLabel(item.endsAt)}` : ' · No end date'}`;
}
function statusBadge(status) {
  const key = String(status || 'draft').replace(/[^a-z-]/g, '');
  return `<span class="badge badge-${esc(key)}">${esc(String(status || 'draft').replace(/_/g, ' '))}</span>`;
}
function notify(message, error = false) {
  const node = $('#global-alert');
  node.hidden = false; node.textContent = message; node.classList.toggle('is-error', error);
  node.setAttribute('role', error ? 'alert' : 'status');
}
function showFormError(form, error) {
  $$('.field-error', form).forEach(node => node.remove());
  $$('[aria-invalid]', form).forEach(node => node.removeAttribute('aria-invalid'));
  let area = $('.form-error', form);
  if (!area) { area = document.createElement('p'); area.className = 'form-error'; area.setAttribute('role', 'alert'); form.prepend(area); }
  area.hidden = false; area.textContent = error.message || 'That change could not be saved. Please try again.';
  for (const [name, message] of Object.entries(error.fieldErrors || {})) {
    const field = form.elements.namedItem(name);
    const node = field instanceof Element ? field : field?.[0];
    if (!node) continue;
    node.setAttribute('aria-invalid', 'true');
    const detail = document.createElement('p'); detail.className = 'field-error'; detail.textContent = String(message);
    detail.id = `${form.getAttribute('id')}-${name.replace(/[^a-z0-9-]/gi, '-')}-error`;
    node.setAttribute('aria-describedby', detail.id); node.insertAdjacentElement('afterend', detail);
  }
  area.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
function clearFormError(form) {
  const area = $('.form-error', form); if (area) { area.hidden = true; area.textContent = ''; }
  $$('.field-error', form).forEach(node => node.remove());
  $$('[aria-invalid]', form).forEach(node => node.removeAttribute('aria-invalid'));
}
async function withForm(form, task) {
  if (form.dataset.busy === 'true') return;
  if (form.dataset.uploading === 'true') { showFormError(form, new Error('Wait for the image upload to finish, then save this form.')); return; }
  clearFormError(form); form.dataset.busy = 'true'; form.setAttribute('aria-busy', 'true');
  const buttons = $$('button[type=submit],button[data-save-action]', form); buttons.forEach(button => { button.disabled = true; });
  try { return await task(); } catch (error) { showFormError(form, error); }
  finally { delete form.dataset.busy; form.removeAttribute('aria-busy'); buttons.forEach(button => { button.disabled = false; }); }
}
async function request(path, options = {}, refresh = false) {
  if (!state.firebaseUser) throw new Error('Sign in to continue.');
  const token = await state.firebaseUser.getIdToken(refresh);
  const headers = { Authorization: `Bearer ${token}`, ...(options.body instanceof FormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store', credentials: 'same-origin' });
  if (response.status === 401 && !refresh) return request(path, options, true);
  let result;
  try { result = await response.json(); } catch { throw new Error('The workspace service returned an unreadable response. Please try again.'); }
  if (!response.ok) {
    const error = new Error(result.error || `The request could not be completed (${response.status}).`);
    error.fieldErrors = result.fieldErrors || {}; error.status = response.status; throw error;
  }
  return result;
}
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
function skeleton() {
  return '<div role="status" aria-label="Loading dashboard"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div><div class="stats-grid"><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></div><div class="panel"><div class="skeleton"></div><div class="skeleton skeleton-line"></div><div class="skeleton"></div></div></div>';
}
function rememberSchools() {
  for (const item of [...list('placements'), ...list('cardPlacements')]) if (item.hsid) state.schools.set(String(item.hsid), { hsid: String(item.hsid), name: item.schoolName || `School ${item.hsid}`, location: '' });
}
function clearWorkspace() {
  state.data = null; state.sponsorId = ''; state.creativeId = ''; state.cardId = ''; state.noteId = ''; state.placementId = ''; state.cardPlacementId = ''; state.membershipId = ''; state.newBrand = false;
  state.schools.clear(); closePreview(); state.preview.schoolId = '';
  $('#brand-select').innerHTML = '<option value="">No sponsor brand assigned</option>'; $('#brand-select').disabled = true;
  $('#sponsor-search-box').hidden = true; $('#sponsor-search').value = ''; $('#sponsor-search-results').innerHTML = ''; $('#workspace-nav').innerHTML = '';
  $('#account-email').textContent = ''; $('#account-role').textContent = ''; $('.topbar-title').textContent = 'Partner Dashboard';
  $('#preview-frame').srcdoc = ''; $('#preview-text').textContent = ''; $('#global-alert').hidden = true; $('#page-content').innerHTML = '';
}
async function loadDashboard({ loading = true } = {}) {
  const epoch = state.authEpoch, requestId = ++state.dashboardRequestId;
  if (loading) { $('#page-content').innerHTML = skeleton(); $('#page-content').setAttribute('aria-busy', 'true'); }
  try {
    const data = await request(`/dashboard${state.sponsorId ? `?sponsorId=${encodeURIComponent(state.sponsorId)}` : ''}`);
    if (epoch !== state.authEpoch || requestId !== state.dashboardRequestId) return;
    state.data = data; rememberSchools();
    if (data.selectedSponsorId != null) state.sponsorId = String(data.selectedSponsorId);
    if (!list('sponsors').some(item => String(item.id) === state.sponsorId)) state.sponsorId = String(list('sponsors')[0]?.id || '');
    renderWorkspace();
  } catch (error) {
    if (epoch !== state.authEpoch || requestId !== state.dashboardRequestId) return;
    const accessNeeded = error.status === 403;
    if (accessNeeded) clearWorkspace();
    $('#account-email').textContent = state.firebaseUser?.email || 'Signed-in account';
    $('#account-role').textContent = accessNeeded ? 'Access needed' : 'Signed in';
    $('#page-content').innerHTML = `<div class="page-heading"><div><p class="eyebrow">Partner dashboard</p><h1>${accessNeeded ? 'You’re signed in. Your access needs connecting.' : 'We couldn’t open this workspace.'}</h1><p>${esc(error.message)}</p></div></div>${accessNeeded ? `<section class="panel"><div class="panel-heading"><div><h2>Your verified account ID</h2><p>Share this ID with your YAT?STATS publisher so they can connect the correct account to a sponsor or publisher role.</p></div></div><label for="verified-account-id">Firebase account ID</label><input id="verified-account-id" type="text" readonly value="${esc(state.firebaseUser?.uid || '')}"><div class="form-actions"><button class="button" type="button" data-action="copy-account-id">Copy account ID</button><button class="button button-primary" type="button" data-action="retry-dashboard">Check access again</button></div><p class="help">This identifies the account you just signed in to. It does not grant access by itself.</p></section>` : '<button class="button button-primary" data-action="retry-dashboard" type="button">Try again</button>'}`;
    notify(error.message, true);
  } finally { if (epoch === state.authEpoch && requestId === state.dashboardRequestId) $('#page-content').setAttribute('aria-busy', 'false'); }
}
function pageHeading(eyebrow, title, description, actions = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}
function empty(title, body, action = '') { return `<div class="empty-state"><p>${esc(title)}</p><span>${esc(body)}</span>${action}</div>`; }
function button(label, action, extra = '', primary = false) { return `<button type="button" class="button${primary ? ' button-primary' : ''}" data-action="${esc(action)}" ${extra}>${esc(label)}</button>`; }
function field(prefix, name, label, value = '', options = {}) {
  const id = `${prefix}-${name}`;
  const attrs = `${options.required ? ' required' : ''}${options.readonly ? ' readonly' : ''}${options.max ? ` maxlength="${options.max}"` : ''}${options.min !== undefined ? ` min="${esc(options.min)}"` : ''}${options.step ? ` step="${esc(options.step)}"` : ''}${options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : ''}`;
  const control = options.textarea ? `<textarea id="${esc(id)}" name="${esc(name)}" rows="${options.rows || 4}"${attrs}>${esc(value)}</textarea>` : `<input id="${esc(id)}" name="${esc(name)}" type="${options.type || 'text'}" value="${esc(value)}"${attrs}>`;
  return `<div class="field${options.wide ? ' span-2' : ''}"><label for="${esc(id)}">${esc(label)}${options.optional ? ' <span class="muted">(optional)</span>' : ''}</label>${control}${options.help ? `<p class="help">${esc(options.help)}</p>` : ''}</div>`;
}
function selectField(prefix, name, label, value, choices, options = {}) {
  const id = `${prefix}-${name}`;
  return `<div class="field${options.wide ? ' span-2' : ''}"><label for="${esc(id)}">${esc(label)}</label><select id="${esc(id)}" name="${esc(name)}"${options.required ? ' required' : ''}>${choices.map(([key, text]) => `<option value="${esc(key)}"${String(value) === String(key) ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>${options.help ? `<p class="help">${esc(options.help)}</p>` : ''}</div>`;
}
function cadenceField(prefix, cadence = 'both') { return selectField(prefix, 'cadence', 'Edition frequency', cadence, [['both', 'Daily and weekly'], ['daily', 'Daily only'], ['weekly', 'Weekly only']]); }
function dates(prefix, item = {}, options = {}) {
  const startRequired = options.startRequired || (options.scheduled && !item.evergreen), endRequired = options.scheduled && !item.evergreen;
  return `<div class="form-grid">${field(prefix, 'startsAt', 'Start date and time', inputDate(item.startsAt), { type: 'datetime-local', optional: !options.startRequired && !options.scheduled, required: startRequired })}${field(prefix, 'endsAt', 'End date and time', inputDate(item.endsAt), { type: 'datetime-local', optional: !options.scheduled, required: endRequired })}</div><p class="help">Times shown in ${esc(TIME_ZONE)}. ${options.scheduled ? 'Scheduled offers need both dates. An evergreen ad has no end date.' : options.startRequired ? 'A start date is required. Leave the end date empty for an ongoing placement.' : 'Leave a date empty for no limit.'}</p>`;
}
function schoolName(id) { return state.schools.get(String(id))?.name || `School ${id}`; }
function schoolPicker(prefix, name, selected = [], single = false) {
  const ids = (Array.isArray(selected) ? selected : []).map(String);
  return `<div class="school-picker" data-school-picker data-single="${single ? 'true' : 'false'}"><input type="hidden" name="${esc(name)}" value="${esc(JSON.stringify(ids))}"><label for="${esc(prefix)}-school-search">${single ? 'School' : 'Choose schools'}</label><input id="${esc(prefix)}-school-search" type="search" data-school-search autocomplete="off" placeholder="Search by school name or location" aria-controls="${esc(prefix)}-school-results"><p class="school-result-status" role="status" aria-live="polite">Search at least two characters.</p><ul class="school-search-results" id="${esc(prefix)}-school-results"></ul><div class="school-chips">${ids.map(id => schoolChip(id)).join('')}</div></div>`;
}
function schoolChip(id) { return `<span class="school-chip">${esc(schoolName(id))}<button type="button" data-remove-school="${esc(id)}" aria-label="Remove ${esc(schoolName(id))}">×</button></span>`; }
function noteAudience(item = {}) {
  const existing = Boolean(item.id);
  const all = existing && !(item.schoolIds || []).length;
  return `<fieldset><legend>School audience</legend><label class="radio-line"><input type="radio" name="audienceMode" value="selected"${!all ? ' checked' : ''}>Selected schools</label><label class="radio-line"><input type="radio" name="audienceMode" value="all"${all ? ' checked' : ''}>All school editions</label><div data-selected-schools${all ? ' hidden' : ''}>${schoolPicker('note', 'schoolIds', item.schoolIds || [])}</div></fieldset>`;
}
function creativeAudience(item = {}) {
  const allowed = [...new Map(list('placements').filter(p => String(p.sponsorId) === state.sponsorId && p.status !== 'cancelled').map(p => [String(p.hsid), p])).values()];
  const selected = new Set((item.schoolIds || []).map(String));
  const all = !selected.size;
  return `<fieldset><legend>Placement audience</legend><label class="radio-line"><input type="radio" name="audienceMode" value="all"${all ? ' checked' : ''}>All eligible Tribune placements for this sponsor</label><label class="radio-line"><input type="radio" name="audienceMode" value="selected"${!all ? ' checked' : ''}>Selected booked schools</label><div class="check-list" data-selected-schools${all ? ' hidden' : ''}>${allowed.length ? allowed.map(p => `<label class="check-line"><input type="checkbox" name="schoolId" value="${esc(p.hsid)}"${selected.has(String(p.hsid)) ? ' checked' : ''}>${esc(p.schoolName || schoolName(p.hsid))}</label>`).join('') : '<p class="help">No school placements are assigned to this sponsor yet.</p>'}</div><p class="help">Your advertisement is eligible only for the sponsor’s authorized Tribune placements.</p></fieldset>`;
}
function assetPicker(prefix, kind, imageUrl = '', options = {}) {
  const name = options.name || 'imageUrl';
  const assetField = options.assetField || 'assetId';
  const image = safeUrl(imageUrl);
  return `<div class="field${options.wide ? ' span-2' : ''}"><label for="${prefix}-file">${esc(options.label || 'Advertisement image')}${options.required ? '' : ' <span class="muted">(optional)</span>'}</label><div class="asset-picker" data-asset-picker><input type="hidden" name="${esc(name)}" value="${esc(imageUrl)}"><input type="hidden" name="${esc(assetField)}" value="${esc(options.assetId || '')}"><div class="asset-preview">${image ? `<img src="${esc(image)}" alt="Current uploaded artwork"><button type="button" class="button button-small" data-action="remove-asset">Remove image</button>` : ''}</div><input id="${prefix}-file" type="file" accept="image/png,image/jpeg,image/webp" data-upload-kind="${esc(kind)}" data-url-field="${esc(name)}" data-asset-field="${esc(assetField)}"><p class="help">PNG, JPG or WebP · up to 3 MB.${options.help ? ` ${esc(options.help)}` : ''}</p><p class="asset-status" role="status" aria-live="polite"></p></div></div>`;
}
function renderWorkspace() {
  $('#account-email').textContent = state.data.user?.email || state.firebaseUser?.email || 'Signed-in account';
  $('#account-role').textContent = isPublisher() ? 'Administrator' : 'Partner';
  $('.topbar-title').textContent = isPublisher() ? 'Partner Program Admin' : 'Partner Program';
  const select = $('#brand-select');
  select.innerHTML = list('sponsors').length ? list('sponsors').map(item => `<option value="${esc(item.id)}"${String(item.id) === state.sponsorId ? ' selected' : ''}>${esc(item.name)}${item.isActive === false ? ' · inactive' : ''}</option>`).join('') : '<option value="">No Partner organization assigned</option>';
  select.disabled = !list('sponsors').length;
  $('#sponsor-search-box').hidden = !isPublisher();
  $('#sponsor-search-status').textContent = isPublisher() && state.data.hasMoreSponsors ? 'Recent Partners are listed above. Search to find any Partner organization.' : '';
  const nav = [
    ['overview', 'Partner Program', '◫'],
    ['program', 'Where You Show Up', '⌖'],
    ['ads', 'Creative Studio', '✎'],
    ['cards', 'Partner Card', '▣'],
    ['performance', 'Performance', '↗'],
    ['arms', 'Leads & ARMS', '◎'],
    ['brand', 'Brand Profile', '◇'],
    ['orders', 'Agreement & Billing', '▧'],
  ];
  if (isPublisher()) nav.push(['publisher', 'Publication Desk', '✦'], ['placements', 'Digest / Tribune Access', '⊞'], ['cardPlacements', 'Partner Card Access', '⊞'], ['access', 'Account Access', '⌘']);
  if (!nav.some(([key]) => key === state.section)) state.section = 'overview';
  $('#workspace-nav').innerHTML = nav.map(([key, label, mark]) => `<button class="nav-button" type="button" data-section="${key}"${state.section === key ? ' aria-current="page"' : ''}><span class="nav-mark" aria-hidden="true">${mark}</span>${label}</button>`).join('');
  renderPage();
}
function renderPage() {
  const views = { overview: renderOverview, program: renderProgram, cards: renderCards, ads: renderAds, performance: renderPerformance, arms: renderArms, brand: renderBrand, publisher: renderPublisher, placements: renderPlacements, cardPlacements: () => renderPlacements(true), access: renderAccess, orders: renderOrders };
  $('#page-content').innerHTML = (views[state.section] || renderOverview)();
  $('#page-content').setAttribute('aria-busy', 'false');
  const creativeForm = $('#creative-form');
  if (creativeForm) { syncCreativeTiming(creativeForm); syncCreativeImage(creativeForm); }
  const cardForm = $('#card-form');
  if (cardForm) { syncCardTemplate(cardForm); syncVarsityYears(cardForm); }
  state.dirty = false;
  document.title = `${({ overview: 'Partner Program', program: 'Where You Show Up', cards: 'Partner Card', ads: 'Creative Studio', performance: 'Performance', arms: 'Leads & ARMS', brand: 'Brand Profile', publisher: 'Publication Desk', placements: 'Digest / Tribune Access', cardPlacements: 'Partner Card Access', access: 'Account Access', orders: 'Agreement & Billing' })[state.section] || 'Partner Program'} | YAT?STATS`;
}
function scopedPlacements(cards = false) { return list(cards ? 'cardPlacements' : 'placements').filter(p => !state.sponsorId || String(p.sponsorId) === state.sponsorId); }
function renderOverview() {
  const brand = sponsor();
  const placements = scopedPlacements();
  const cardPlacements = scopedPlacements(true);
  const creatives = list('creatives').filter(c => !state.sponsorId || String(c.sponsorId) === state.sponsorId);
  const cards = list('cards').filter(c => !state.sponsorId || String(c.sponsorId) === state.sponsorId);
  const activePrograms = new Set([...placements, ...cardPlacements].filter(p => p.status === 'active').map(p => String(p.hsid))).size;
  const liveCreative = creatives.filter(c => c.status === 'published').length + cards.filter(c => c.status === 'published').length;
  const drafts = creatives.filter(c => ['draft','pending'].includes(c.status)).length + cards.filter(c => ['draft','pending'].includes(c.status)).length;
  const title = brand ? `${brand.name} Partner Program` : 'Your YAT?STATS Partner Program';
  return pageHeading('Partnership Arrangement', title, 'One control center for where your organization shows up, what fans see, and what the relationship produces.', `${button('Where we show up', 'go-program', '', true)}${button('Creative Studio', 'go-ads')}`) +
    (!brand && !isPublisher() ? empty('Your account is ready for a Partner connection.', 'A YAT?STATS administrator needs to assign your account to a Partner organization before you can manage a program.') : '') +
    `<div class="stats-grid"><div class="stat-card"><span>Active school programs</span><strong>${activePrograms}</strong><small>Across currently connected Partner placements</small></div><div class="stat-card"><span>Live creative versions</span><strong>${liveCreative}</strong><small>Published Partner cards and Digest / Tribune messages</small></div><div class="stat-card"><span>Drafts & review</span><strong>${drafts}</strong><small>Work you can continue, approve or publish</small></div></div>
    <section class="panel partner-story"><div class="panel-heading"><div><p class="eyebrow">Your Partnership Arrangement</p><h2>More than an ad.</h2><p>YAT?STATS gives a Partner multiple ways to participate in the baseball community without turning the experience into a wall of advertising.</p></div></div>
      <div class="capability-grid">
        ${capabilityCard('Splash screen', 'Entry-point recognition when a fan arrives at the school experience.', 'connection', 'Portal connection next')}
        ${capabilityCard('Active Alumni Partner Card', 'Interactive two-sided card inside the alumni gallery.', cardPlacements.length ? 'active' : 'ready', cardPlacements.length ? `${cardPlacements.length} program assignment${cardPlacements.length===1?'':'s'}` : 'Ready for assignment', 'go-cards')}
        ${capabilityCard('YAT?STATS Daily Digest', 'Compact stat-line email with Partner recognition and trackable calls to action.', placements.length ? 'active' : 'ready', placements.length ? 'Connected through publication access' : 'Ready for assignment', 'go-ads')}
        ${capabilityCard('The YAT-A-BOY Tribune', 'Weekly editorial recap with stories, stats and Partner messaging.', placements.length ? 'active' : 'ready', placements.length ? 'Connected through publication access' : 'Ready for assignment', 'go-ads')}
        ${capabilityCard('Community + news placements', 'Native placements around the content fans are already reading.', 'connection', 'Self-service connection next')}
        ${capabilityCard('Player profile placements', 'Lower-cost support around individual player pages and family-driven traffic.', 'connection', 'Self-service connection next')}
        ${capabilityCard('Tournament recognition', 'Partner presence around the 1,024-school fantasy bracket and fan acquisition experience.', 'connection', 'Program connection next')}
        ${capabilityCard('ARMS follow-up + landing pages', 'Turn clicks into trackable leads, funnels, appointments and automated follow-up.', 'connection', 'ARMS connection next', 'go-arms')}
      </div>
    </section>
    <div class="two-columns"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Control what fans see</p><h2>One message. Multiple touchpoints.</h2><p>The current working editor controls Daily Digest / Tribune creative; the Partner Card has its own interactive front and back.</p></div></div><div class="link-row"><div><strong>Creative Studio</strong><p>Build the offer, message, image and destination.</p></div>${button('Open', 'go-ads', '', true)}</div><div class="link-row"><div><strong>Partner Card</strong><p>Manage the interactive gallery card and its versions.</p></div>${button('Open', 'go-cards')}</div><div class="link-row"><div><strong>Brand Profile</strong><p>Keep the organization name, logo and destination consistent.</p></div>${button('Edit', 'go-brand')}</div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Prove the value</p><h2>From exposure to opportunity.</h2><p>The control center is designed to follow the path from a fan seeing the Partner to clicking, becoming a lead and entering ARMS.</p></div></div><div class="value-path"><span>Fan sees Partner</span><b>→</b><span>Clicks</span><b>→</b><span>Landing page</span><b>→</b><span>Lead</span><b>→</b><span>ARMS follow-up</span></div>${button('See performance', 'go-performance')}${button('Leads & ARMS', 'go-arms')}</section></div>`;
}
function capabilityCard(title, body, mode='connection', status='Connection next', action='') {
  const label = mode === 'active' ? 'ACTIVE' : mode === 'ready' ? 'READY' : 'NEXT';
  return `<article class="capability-card capability-${esc(mode)}"><div class="capability-status">${esc(label)}</div><h3>${esc(title)}</h3><p>${esc(body)}</p><small>${esc(status)}</small>${action ? `<button type="button" class="text-button" data-action="${esc(action)}">Manage →</button>` : ''}</article>`;
}
function renderProgram() {
  const placements = scopedPlacements();
  const cards = scopedPlacements(true);
  return pageHeading('Partner Program / Inventory', 'Where your organization can show up.', 'The Partner Program is a collection of native touchpoints, not a single newsletter advertisement.') +
    `<section class="panel"><div class="panel-heading"><div><p class="eyebrow">Connected now</p><h2>Working self-service placements</h2><p>These have real editors and entitlement checks in the current build.</p></div></div><div class="capability-grid">
      ${capabilityCard('Active Alumni Partner Card','Two-sided interactive card in the alumni gallery.',cards.length?'active':'ready',cards.length?`${cards.length} assigned program${cards.length===1?'':'s'}`:'Awaiting program assignment','go-cards')}
      ${capabilityCard('YAT?STATS Daily Digest','Daily stat-line email placement using the publication creative system.',placements.length?'active':'ready',placements.length?'Publication access connected':'Awaiting program assignment','go-ads')}
      ${capabilityCard('The YAT-A-BOY Tribune','Weekly editorial placement using the same versioned creative system.',placements.length?'active':'ready',placements.length?'Publication access connected':'Awaiting program assignment','go-ads')}
      ${capabilityCard('Brand identity','Shared Partner logo, name and destination across connected placements.',sponsor()?'active':'ready',sponsor()?'Brand profile connected':'Awaiting Partner organization','go-brand')}
    </div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Inventory being connected</p><h2>Built into the Partner Program story</h2><p>These are intentionally shown as not yet connected to self-service so nobody mistakes a mockup for a live entitlement.</p></div></div><div class="capability-grid">
      ${capabilityCard('School splash screen','Prominent arrival recognition on the school experience.')}
      ${capabilityCard('Community / news placements','Native presence around school and alumni stories.')}
      ${capabilityCard('Player profile placements','Affordable page-level support for individual player traffic.')}
      ${capabilityCard('Tournament recognition','Presence around bracket matchups, school advancement and contest traffic.')}
      ${capabilityCard('AI creative adaptation','Generate correctly sized variations from one campaign brief.')}
      ${capabilityCard('Landing pages & funnels','Optional ARMS REACH buildout when a Partner needs somewhere better to send a click.','connection','ARMS REACH service option','go-arms')}
    </div></section>`;
}
function renderPerformance() {
  return pageHeading('Partner Program / Performance', 'Know what the Partnership Arrangement is producing.', 'This is the reporting layer for exposure, engagement and conversion. Email and click attribution are the next data connections.') +
    `<div class="stats-grid"><div class="stat-card"><span>Impressions</span><strong>—</strong><small>Placement impression tracking connection next</small></div><div class="stat-card"><span>Clicks / CTR</span><strong>—</strong><small>First-party click attribution connection next</small></div><div class="stat-card"><span>Leads</span><strong>—</strong><small>ARMS lead attribution connection next</small></div></div>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">Reporting blueprint</p><h2>What this dashboard will measure</h2><p>Metrics remain blank until real traffic is connected; the portal will not manufacture performance data.</p></div></div><div class="metric-list"><span>Daily Digest delivered / opened / clicked / bounced</span><span>YAT-A-BOY Tribune delivered / opened / clicked / bounced</span><span>Partner Card impressions and interactions</span><span>Landing-page visits and conversions</span><span>School-by-school Partner performance</span><span>Creative-version performance</span></div></section>`;
}
function renderArms() {
  return pageHeading('Partner Program / Leads & ARMS', 'Turn attention into relationships.', 'YAT?STATS can become an acquisition channel for the Partner; ARMS handles the relationship after the click.') +
    `<div class="two-columns"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">ARMS connection</p><h2>From Partner click to follow-up.</h2><p>The intended flow is YAT?STATS → landing page / form → ARMS contact → automation → opportunity.</p></div></div><div class="value-path vertical"><span>Partner placement</span><b>↓</b><span>Tracked click</span><b>↓</b><span>Landing page / funnel</span><b>↓</b><span>ARMS contact</span><b>↓</b><span>Automated follow-up</span></div><p class="notice">The Partner portal is not yet writing these leads into ARMS from this preview. That connection is the next integration step.</p></section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Optional growth services</p><h2>Need somewhere better to send the click?</h2><p>ARMS REACH can provide the destination and follow-up system.</p></div></div><div class="metric-list"><span>Landing page / offer page</span><span>Lead form or appointment calendar</span><span>Sales funnel</span><span>Email / SMS nurture</span><span>HighLevel SaaS sub-account</span><span>Managed digital campaign</span></div></section></div>`;
}
function placementTable(items, editable, cards = false) {
  if (!items.length) return empty('No placements to show yet.', cards ? 'A publisher can assign an entitled title sponsorship to this sponsor’s school card.' : 'Your publisher can connect a sponsor to the appropriate school editions.');
  return `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">School</th><th scope="col">Status</th><th scope="col">Dates</th>${editable ? '<th scope="col">Manage</th>' : ''}</tr></thead><tbody>${items.map(item => `<tr><td><strong>${esc(item.schoolName || schoolName(item.hsid))}</strong>${editable ? `<small>${esc(list('sponsors').find(s => String(s.id) === String(item.sponsorId))?.name || 'Partner')}</small>` : ''}<small>${item.requiresApproval ? `${cards ? 'Card' : 'Advertisement'} review required` : 'Partner may submit updates directly'}</small></td><td>${statusBadge(item.status)}</td><td>${esc(periodLabel(item))}</td>${editable ? `<td><button type="button" class="button button-small" data-edit-${cards ? 'card-placement' : 'placement'}="${esc(item.id)}">Edit</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function renderAds() {
  const brand = sponsor();
  const heading = pageHeading('Partner Program / Creative Studio', 'Give fans a reason to connect.', 'Build a dated version, preview it in the Tribune, then submit it for your assigned placements.', button('New ad version', 'new-creative', '', true));
  if (!brand) return heading + empty('Choose a Partner organization first.', isPublisher() ? 'Create a Partner organization in Brand Profile, then add its placements.' : 'Ask a YAT?STATS administrator to assign a Partner organization to your account.');
  const item = activeCreative() || {};
  const versions = list('creatives').filter(c => String(c.sponsorId) === state.sponsorId).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const review = scopedPlacements().some(p => p.requiresApproval);
  return heading + `<div class="editor-columns"><section class="panel"><div class="panel-heading"><div><h2>Your versions</h2><p>${esc(brand.name)}</p></div></div><div class="version-list">${versions.length ? versions.map(v => `<button type="button" class="version-item${String(v.id) === state.creativeId ? ' is-selected' : ''}" data-edit-creative="${esc(v.id)}"><span class="version-status">${statusBadge(v.status)}<span>Rev. ${esc(v.revision)}</span></span><strong>${esc(v.headline || 'Untitled advertisement')}</strong><small>${esc(periodLabel(v))}</small><small>${v.cadence === 'daily' ? 'Daily editions' : v.cadence === 'weekly' ? 'Weekly editions' : 'Daily & weekly editions'}</small></button>`).join('') : empty('Your first message starts here.', 'Save a draft to begin its version history.')}</div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">${item.id ? `Advertisement · Revision ${esc(item.revision)}` : 'New advertisement'}</p><h2>${item.id ? 'Edit your message' : 'The next hometown connection'}</h2></div>${statusBadge(item.status || 'draft')}</div>${item.status === 'published' ? '<p class="notice">Editing this published advertisement creates a new draft. The published version stays intact until its replacement is made available.</p>' : ''}<form id="creative-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="revision" value="${esc(item.revision ?? '')}"><p class="form-error" role="alert" hidden></p>
    ${field('creative', 'headline', 'Headline', item.headline, { required: true, max: 120 })}${field('creative', 'body', 'Advertisement message', item.body, { textarea: true, rows: 4, required: true, max: 1200 })}${assetPicker('creative', 'ad', item.imageUrl, { help: 'Keep small text out of the image so the offer stays readable on phones.' })}${field('creative', 'imageAlt', 'Describe the image', item.imageAlt, { max: 240, help: 'Required when you upload an image. A brief description helps readers using a screen reader or viewing with images turned off.' })}
    <div class="form-grid">${field('creative', 'url', 'Destination website', item.url || brand.websiteUrl, { type: 'url', required: true, placeholder: 'https://', help: 'Where the advertisement’s button takes the fan.' })}${field('creative', 'cta', 'Button text', item.cta, { required: true, max: 50, placeholder: 'Explore our offer' })}</div>
    ${field('creative', 'acknowledgment', 'Partner acknowledgment in the recap', item.acknowledgment, { textarea: true, rows: 2, max: 500, optional: true, help: 'A short, approved acknowledgment of the support your organization provides.' })}
    <fieldset><legend>When this version is available</legend>${dates('creative', item, { scheduled: true })}<label class="check-line"><input type="checkbox" name="evergreen"${item.evergreen ? ' checked' : ''}>Evergreen: keep this version available without an end date.</label><div style="margin-top:17px">${cadenceField('creative', item.cadence)}</div></fieldset>${creativeAudience(item)}
    <div class="form-actions"><button class="button" type="submit" data-save-action="save">Save draft</button><button class="button" type="submit" data-save-action="preview">Save & preview</button><button class="button button-primary" type="submit" data-save-action="submit">${review ? 'Submit for review' : 'Submit to placements'}</button>${isPublisher() ? '<button class="button button-dark" type="submit" data-save-action="publish">Publish version</button>' : ''}${item.id && item.status !== 'archived' ? '<button class="button button-danger" type="submit" data-save-action="archive" formnovalidate>Archive</button>' : ''}</div><p class="help">Saving or previewing does not send an email. Availability follows the dates, placement scope and approval status.</p></form></section></div>`;
}
function sharePromotionDefaults() {
  const value = state.data?.cardDefaults?.sharePromotion;
  return value && typeof value === 'object' ? { headline: String(value.headline || ''), body: String(value.body || ''), ctaLabel: String(value.ctaLabel || ''), ctaUrl: String(value.ctaUrl || '') } : { headline: '', body: '', ctaLabel: '', ctaUrl: '' };
}
function cardYears(item = {}) {
  const current = new Date().getFullYear() + 1;
  return [...new Set([...Array.from({ length: Math.min(115, current - 1899) }, (_, i) => String(current - i)), item.gradClass, ...(item.varsityYears || [])].filter(year => /^(19|20|21)[0-9]{2}$/.test(String(year))))].map(String).sort((a, b) => Number(b) - Number(a));
}
function varsityYearPicker(item) {
  const selected = new Set((item.varsityYears || []).map(String));
  return `<div class="field"><span class="field-label" id="card-varsity-label">Years on high school varsity</span><details class="year-picker"><summary aria-labelledby="card-varsity-label card-varsity-summary"><span id="card-varsity-summary">${selected.size ? esc([...selected].sort().join(', ')) : 'Choose varsity years'}</span></summary><div class="year-options">${cardYears(item).map(year => `<label class="check-line" data-varsity-year="${year}"><input type="checkbox" name="varsityYears" value="${year}"${selected.has(year) ? ' checked' : ''}>${year}</label>`).join('')}</div></details><p class="help">Select up to eight years. These are the same personal history fields used on the contribution form.</p></div>`;
}
function cardAudience(item = {}) {
  const allowed = [...new Map(scopedPlacements(true).filter(p => p.status !== 'cancelled').map(p => [String(p.hsid), p])).values()];
  const selected = new Set((item.schoolIds || []).map(String));
  const all = !selected.size;
  return `<fieldset><legend>Title sponsorship audience</legend><label class="radio-line"><input type="radio" name="audienceMode" value="all"${all ? ' checked' : ''}>All eligible title-card placements for this sponsor</label><label class="radio-line"><input type="radio" name="audienceMode" value="selected"${!all ? ' checked' : ''}>Selected entitled schools</label><div class="check-list" data-selected-schools${all ? ' hidden' : ''}>${allowed.length ? allowed.map(p => `<label class="check-line"><input type="checkbox" name="schoolId" value="${esc(p.hsid)}"${selected.has(String(p.hsid)) ? ' checked' : ''}>${esc(p.schoolName || schoolName(p.hsid))}</label>`).join('') : '<p class="help">A publisher must assign a title-card placement before this card can be submitted or published for a school.</p>'}</div><p class="help">Title-card placements determine eligibility for the school gallery. Tribune advertisements have their own placements.</p></fieldset>`;
}
function renderCards() {
  const brand = sponsor();
  const heading = pageHeading('Partner Program / Partner Card', 'Your place in the hometown lineup.', 'Create the front and back of your title sponsor card. Save a new version whenever your message changes.', button('New card version', 'new-card', '', true));
  if (!brand) return heading + empty('Choose a Partner organization first.', isPublisher() ? 'Create a brand in Brand Profile, then assign its title-card placements.' : 'Your publisher can connect your account to the correct sponsor brand.');
  const item = activeCard() || {};
  const template = CARD_BACK_TEMPLATES.some(([key]) => key === item.backTemplate) ? item.backTemplate : 'banner_text';
  const defaults = template === 'share_promotion' ? sharePromotionDefaults() : {};
  const message = { headline: item.headline || defaults.headline || '', body: item.body || defaults.body || '', ctaLabel: item.ctaLabel || defaults.ctaLabel || '', ctaUrl: item.ctaUrl || defaults.ctaUrl || '' };
  const versions = list('cards').filter(c => String(c.sponsorId) === state.sponsorId).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const placements = scopedPlacements(true);
  const requiresReview = placements.some(p => p.status !== 'cancelled' && p.requiresApproval);
  const statuses = Array.isArray(state.data?.cardDefaults?.statusOptions) ? state.data.cardDefaults.statusOptions.map(String) : [];
  if (item.statusLabel && !statuses.includes(item.statusLabel)) statuses.unshift(item.statusLabel);
  return heading + `<div class="editor-columns"><aside class="panel"><div class="panel-heading"><div><h2>Card versions</h2><p>${esc(brand.name)}</p></div></div><div class="version-list">${versions.length ? versions.map(v => `<button type="button" class="version-item${String(v.id) === state.cardId ? ' is-selected' : ''}" data-edit-card="${esc(v.id)}"><span class="version-status">${statusBadge(v.status)}<span>Rev. ${esc(v.revision)}</span></span><strong>${esc(v.headline || [v.firstName, v.lastName].filter(Boolean).join(' ') || 'Partner card')}</strong><small>${esc(CARD_BACK_TEMPLATES.find(([key]) => key === v.backTemplate)?.[1] || 'Partner card')}</small><small>${esc(periodLabel(v))}</small></button>`).join('') : empty('Start your first card.', 'Saved drafts and published versions appear here.')}</div><div class="card-placement-note"><strong>${placements.length} title-card placement${placements.length === 1 ? '' : 's'}</strong><p>Only an entitled title sponsor can appear with a two-sided sponsor card.</p>${isPublisher() ? button('Manage title placements', 'go-cardPlacements') : ''}</div></aside>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">${item.id ? `Sponsor card · Revision ${esc(item.revision)}` : 'New sponsor card'}</p><h2>${item.id ? 'Update your card' : 'Make it your own.'}</h2><p>The preview uses the same stacked card frame as the school gallery.</p></div>${statusBadge(item.status || 'draft')}</div>${['published', 'archived'].includes(item.status) ? '<p class="notice">Saving changes creates a new version and preserves this earlier card.</p>' : ''}<form id="card-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="revision" value="${esc(item.revision ?? '')}"><p class="form-error" role="alert" hidden></p>
    <fieldset class="card-editor-section"><legend><span class="section-number">01</span>Front of the card</legend><p class="help">Use the familiar contribution fields for the person represented on this sponsor card.</p><div class="form-grid">${field('card', 'firstName', 'First name', item.firstName, { max: 80 })}${field('card', 'lastName', 'Last name', item.lastName, { max: 80 })}${selectField('card', 'gradClass', 'Graduation class', item.gradClass || '', [['', 'Choose a year'], ...cardYears(item).map(year => [year, year])])}${selectField('card', 'statusLabel', 'Status', item.statusLabel || '', [['', 'Choose status'], ...statuses.map(status => [status, status])])}</div>${varsityYearPicker(item)}<div class="form-grid">${field('card', 'currentTeam', 'Current or most recent team', item.currentTeam, { max: 160, optional: true })}${field('card', 'organization', 'Organization', item.organization ?? brand.name, { max: 160, optional: true })}</div><input type="hidden" name="level" value="SPONSOR"><div class="field"><span class="field-label">Card type</span><input type="text" value="Partner" readonly><p class="help">Partner is the customer-facing card type. The internal data code remains unchanged.</p></div>${assetPicker('card-front', 'card_front', item.frontImageUrl, { name: 'frontImageUrl', assetField: 'frontAssetId', label: 'Front image', required: true, help: 'Required before publication. Choose a portrait that works in the existing 5:7 card frame.' })}${field('card', 'frontImageAlt', 'Describe the front image', item.frontImageAlt, { max: 240, help: 'Required with the image before publication.' })}</fieldset>
    <fieldset class="card-editor-section"><legend><span class="section-number">02</span>Back of the card</legend><div class="template-options">${CARD_BACK_TEMPLATES.map(([key, title, description]) => `<label class="template-choice"><input type="radio" name="backTemplate" value="${key}"${template === key ? ' checked' : ''}><span><strong>${esc(title)}</strong><small>${esc(description)}</small></span></label>`).join('')}</div>
    <div data-card-template="banner_text">${assetPicker('card-banner', 'card_banner', item.bannerImageUrl, { name: 'bannerImageUrl', assetField: 'bannerAssetId', label: 'Top banner image', help: 'The banner contains sponsor artwork only. Personal card details stay on the front.' })}${field('card', 'bannerImageAlt', 'Describe the banner', item.bannerImageAlt, { max: 240, help: 'Required when a banner is uploaded.' })}</div>
    <div class="notice" data-card-template="share_promotion"><p>The prepared community promotion comes from the shared card template. You can edit its wording below.</p>${button('Restore prepared message', 'card-share-defaults')}<p class="help">With no link destination, this promotion uses the selected school’s Community Hub.</p></div>
    <div data-card-template="full_image">${assetPicker('card-full', 'card_full', item.fullImageUrl, { name: 'fullImageUrl', assetField: 'fullAssetId', label: 'Full-size back image', required: true, help: 'Required before publication. This replaces the top banner and FunZone message area.' })}${field('card', 'fullImageAlt', 'Describe the full-size image', item.fullImageAlt, { max: 240, help: 'Include the essential offer or message so readers can understand the image without seeing it.' })}</div>
    <div data-card-message>${field('card', 'headline', 'Message headline', message.headline, { max: 120 })}${field('card', 'body', 'FunZone message', message.body, { textarea: true, rows: 5, max: 1800, help: 'One message. Preview the card to check its fit and readability.' })}</div><div class="form-grid">${field('card', 'ctaLabel', 'Button text', message.ctaLabel, { max: 60, optional: true })}${field('card', 'ctaUrl', 'Button destination', message.ctaUrl, { type: 'url', optional: true, placeholder: 'https://', help: 'Use an HTTPS address. The community-sharing template can use the school’s hub automatically.' })}</div></fieldset>
    <fieldset><legend>Version availability</legend>${dates('card', item)}<p class="help">You can update the message daily. Saved versions, placement dates and approval status control which version is eligible.</p></fieldset>${cardAudience(item)}<div class="form-actions"><button class="button" type="submit" data-save-action="save">Save draft</button><button class="button" type="submit" data-save-action="preview">Save & preview</button><button class="button button-primary" type="submit" data-save-action="submit">${requiresReview ? 'Submit for review' : 'Submit to title placements'}</button>${isPublisher() ? '<button class="button button-dark" type="submit" data-save-action="publish">Publish card version</button>' : ''}${item.id && item.status !== 'archived' ? '<button class="button button-danger" type="submit" data-save-action="archive" formnovalidate>Archive</button>' : ''}</div><p class="help">Drafts and previews do not publish a card. Sponsor cards are managed independently of Tribune advertisements and billing.</p></form></section></div>`;
}
function syncVarsityYears(form) {
  const selected = [...new FormData(form).getAll('varsityYears')].map(String).sort();
  const summary = $('#card-varsity-summary', form); if (summary) summary.textContent = selected.length ? selected.join(', ') : 'Choose varsity years';
  const grad = Number(formValue(form, 'gradClass'));
  $$('[data-varsity-year]', form).forEach(label => { label.hidden = Boolean(grad && Number(label.dataset.varsityYear) > grad && !$('input', label).checked); });
}
function cardTextValues(form) {
  return Object.fromEntries(['headline', 'body', 'ctaLabel', 'ctaUrl'].map(name => [name, form.elements.namedItem(name)?.value || '']));
}
function syncCardTemplate(form) {
  const template = formValue(form, 'backTemplate') || 'banner_text';
  const previous = form.dataset.activeBackTemplate;
  const drafts = state.cardDrafts.get(form) || {};
  if (previous && previous !== template) {
    drafts[previous] = cardTextValues(form);
    const next = drafts[template] || (template === 'share_promotion' ? sharePromotionDefaults() : { headline: '', body: '', ctaLabel: '', ctaUrl: '' });
    for (const [name, value] of Object.entries(next)) form.elements.namedItem(name).value = value;
  }
  form.dataset.activeBackTemplate = template; state.cardDrafts.set(form, drafts);
  $$('[data-card-template]', form).forEach(panel => {
    const visible = panel.dataset.cardTemplate === template; panel.hidden = !visible;
    $$('input,textarea,select,button', panel).forEach(control => { control.disabled = !visible; });
  });
  const message = $('[data-card-message]', form); message.hidden = template === 'full_image';
  $$('input,textarea', message).forEach(control => { control.disabled = template === 'full_image'; });
}

function renderBrand() {
  const item = state.newBrand ? {} : sponsor() || {};
  const heading = pageHeading('Partner Program / Brand Profile', state.newBrand ? 'Welcome another hometown partner.' : 'The name behind the support.', 'Keep your brand identity consistent across the placements assigned to you.', isPublisher() ? button('Add a Partner organization', 'new-brand', '', true) : '');
  if (!item.id && !isPublisher()) return heading + empty('No Partner organization is assigned.', 'Your publisher can connect your account to the correct business.');
  const logo = safeUrl(item.logoUrl);
  return heading + `<div class="two-columns"><section class="panel"><div class="brand-preview">${logo ? `<img src="${esc(logo)}" alt="${esc(item.name || 'Partner')} logo">` : `<div class="brand-initials" aria-hidden="true">${esc((item.name || 'Y').slice(0, 1).toUpperCase())}</div>`}<div><p class="eyebrow">${item.id ? 'Partner profile' : 'New Partner'}</p><h2 style="margin:0;font:700 23px Georgia,serif">${esc(item.name || 'Your brand')}</h2></div></div><form id="brand-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><p class="form-error" role="alert" hidden></p>${field('brand', 'name', 'Business / Partner name', item.name, { required: true, max: 160 })}${field('brand', 'websiteUrl', 'Business website', item.websiteUrl, { type: 'url', optional: true, placeholder: 'https://' })}${assetPicker('brand', 'logo', item.logoUrl, { name: 'logoUrl', label: 'Brand logo', help: item.id ? 'Use a clean, easy-to-read logo.' : 'Save the brand first, then upload its logo.' })}<label class="check-line"><input type="checkbox" name="isActive"${item.isActive !== false ? ' checked' : ''}>Brand is active</label><p class="notice">Changes to this brand’s name, logo or active status apply to all of its school placements, including Tribune advertisements and sponsor cards.</p><div class="form-actions"><button class="button button-primary" type="submit">${item.id ? 'Save brand profile' : 'Create Partner organization'}</button></div></form></section><aside class="panel"><div class="panel-heading"><div><p class="eyebrow">One consistent identity</p><h2>Recognizable at every school.</h2><p>Your brand profile is shared across its authorized placements. School assignments and advertisement versions stay separate.</p></div></div><p class="help">Use Ad Studio to change the offer or message. A publisher manages the school placements and account access.</p>${item.id ? `<p class="code-note">Brand ID: ${esc(item.id)}</p>` : ''}</aside></div>`;
}
function renderPublisher() {
  if (!isPublisher()) return empty('Publisher access is required.', 'Your sponsor tools are available from the workspace navigation.');
  const heading = pageHeading('Publisher’s Desk', 'A personal touch. A shared publication.', 'Manage publisher notices and the Tribune’s identity without changing the school’s stats or layout.', button('Preview an edition', 'preview-edition'));
  const tabs = `<div class="segmented desk-tabs" aria-label="Publisher tools"><button type="button" data-desk-tab="notes" aria-pressed="${state.deskTab === 'notes'}">Publisher notices</button><button type="button" data-desk-tab="publication" aria-pressed="${state.deskTab === 'publication'}">Masthead & publication</button></div>`;
  return heading + tabs + (state.deskTab === 'publication' ? publicationForm() : notesForm());
}
function notesForm() {
  const item = activeNote() || {};
  const notes = [...list('notes')].sort((a, b) => Number(b.revision || 0) - Number(a.revision || 0));
  return `<div class="editor-columns"><section class="panel"><div class="panel-heading"><div><h2>Your notices</h2><p>Dated messages from the publisher.</p></div></div>${button('New publisher notice', 'new-note', 'style="width:100%;margin-bottom:15px"', true)}<div class="version-list">${notes.length ? notes.map(n => `<button type="button" class="version-item${String(n.id) === state.noteId ? ' is-selected' : ''}" data-edit-note="${esc(n.id)}"><span class="version-status">${statusBadge(n.status)}<span>Rev. ${esc(n.revision)}</span></span><strong>${esc(n.title || 'From the Publisher')}</strong><small>${n.issueDate ? `Issue: ${esc(n.issueDate)}` : esc(periodLabel(n))}</small><small>${(n.schoolIds || []).length ? `${n.schoolIds.length} selected schools` : 'All school editions'}</small></button>`).join('') : empty('A note worth sharing.', 'Write a welcome, an update or a timely message to your school communities.')}</div></section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">From the Publisher</p><h2>${item.id ? 'Edit this notice' : 'Write a new notice'}</h2><p>Your signature stays separate from YaTi’s sports column.</p></div>${statusBadge(item.status || 'draft')}</div><form id="note-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="revision" value="${esc(item.revision ?? '')}"><p class="form-error" role="alert" hidden></p>${field('note', 'title', 'Notice heading', item.title, { required: true, max: 120 })}${field('note', 'body', 'Your message', item.body, { required: true, textarea: true, rows: 6, max: 2400 })}${field('note', 'byline', 'Signature / byline', item.byline, { max: 120, optional: true, help: 'For example, your name and publisher title.' })}${assetPicker('note', 'notice', item.imageUrl, { label: 'Notice image' })}<div class="form-grid">${field('note', 'ctaLabel', 'Optional link text', item.ctaLabel, { max: 60, optional: true })}${field('note', 'ctaUrl', 'Optional link destination', item.ctaUrl, { type: 'url', optional: true, placeholder: 'https://' })}</div><fieldset><legend>Edition timing</legend><div class="form-grid">${cadenceField('note', item.cadence)}${field('note', 'issueDate', 'Specific publication date', item.issueDate?.slice(0, 10) || '', { type: 'date', optional: true, help: 'If selected, this note appears only in the edition published on this date in Arizona time.' })}</div>${dates('note', item)}</fieldset>${noteAudience(item)}<div class="form-actions"><button class="button" type="submit" data-save-action="save">Save draft</button><button class="button" type="submit" data-save-action="preview">Save & preview</button><button class="button button-primary" type="submit" data-save-action="publish">Publish notice</button>${item.id && item.status !== 'archived' ? '<button class="button button-danger" type="submit" data-save-action="archive" formnovalidate>Archive</button>' : ''}</div><p class="help">Publishing makes the notice available to matching editions. It does not send an email.</p></form></section></div>`;
}
function publicationForm() {
  const p = state.data.publication || {};
  return `<div class="two-columns"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Shared publication identity</p><h2>The Tribune, your way.</h2><p>One masthead serves every school. The school name, date and statistics stay dynamic.</p></div></div><form id="publication-form"><input type="hidden" name="revision" value="${esc(p.revision ?? '')}"><p class="form-error" role="alert" hidden></p>${assetPicker('publication', 'masthead', p.masthead?.imageUrl, { name: 'mastheadUrl', assetField: 'mastheadAssetId', assetId: p.masthead?.assetId, label: 'Tribune masthead graphic', help: 'A 1,440 × 360 px PNG is a good starting point. With no image, the existing text masthead is used.' })}${field('publication', 'mastheadAlt', 'Masthead image description', p.masthead?.alt || 'The YAT-A-BOY Tribune', { max: 240, help: 'The publication name remains available in the plain-text edition.' })}<label class="check-line"><input type="checkbox" name="includesTagline"${p.masthead?.includesTagline ? ' checked' : ''}>The uploaded graphic already includes the tagline.</label><fieldset><legend>Sweepstakes and sending details</legend>${field('publication', 'officialRulesUrl', 'Official sweepstakes rules URL', p.officialRulesUrl, { type: 'url', optional: true, placeholder: 'https://' })}${field('publication', 'sweepstakesReminder', 'Sweepstakes reminder', p.sweepstakesReminder, { textarea: true, rows: 4, max: 1200, optional: true })}${field('publication', 'postalAddress', 'Publisher mailing address', p.postalAddress, { textarea: true, rows: 3, max: 500, optional: true, help: 'Appears in the delivered newsletter footer.' })}</fieldset><div class="form-actions"><button class="button" type="submit" data-save-action="preview">Preview settings</button><button class="button button-primary" type="submit" data-save-action="save">Save publication settings</button></div><p class="help">Saving these settings does not change the newsletter’s delivery approval or schedule.</p></form></section><aside class="panel"><p class="eyebrow">A familiar front page</p><h2 style="font:700 24px Georgia,serif;margin:0 0 15px">The YAT-A-BOY Tribune</h2><p class="help">Keep the name and artwork in the masthead image. Leaving the tagline as live text helps it stay readable on phones.</p><p class="section-note">Dedicated to tell our fans, <strong>WHERE THEY YAT!</strong><br>Through <strong>STORIES & STATS!</strong></p><p class="help">Upload a new image for a new graphic version. Previously saved editions keep their original artwork.</p></aside></div>`;
}
function renderPlacements(cards = false) {
  if (!isPublisher()) return empty('Publisher access is required.', 'School placements are managed by your publisher.');
  const item = activePlacement(cards) || {};
  const prefix = cards ? 'card-placement' : 'placement';
  const brands = [['', 'Choose a sponsor'], ...list('sponsors').map(b => [b.id, b.name])];
  const orders = [['', 'No linked order'], ...list('orders').map(o => [o.id, `${schoolName(o.hsid)} · ${o.sponsorshipType || 'Sponsorship'} · ${o.status}`])];
  return pageHeading(`Publisher’s Desk / ${cards ? 'Title card placements' : 'Tribune placements'}`, cards ? 'A title sponsor’s place in the gallery.' : 'Put the right partner in the right edition.', cards ? 'Assign the explicit title sponsorship entitlement that allows a two-sided sponsor card at a school.' : 'School assignments control where sponsor advertisements are eligible to appear.', button(cards ? 'New title-card placement' : 'New placement', cards ? 'new-card-placement' : 'new-placement', '', true)) + `<section class="panel"><div class="panel-heading"><div><h2>${item.id ? 'Edit school placement' : 'Add a school placement'}</h2><p>New placements begin paused. Activate when the sponsor, dates and approval requirements are ready.</p></div></div>${cards ? '<p class="notice">Saving a title-card placement records that this sponsor is entitled to a front-and-back gallery card for the selected school. Confirm the title sponsorship arrangement before activating it. This does not create a Tribune ad placement or a payment.</p>' : ''}<form id="${prefix}-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><p class="form-error" role="alert" hidden></p><div class="form-grid">${selectField(prefix, 'sponsorId', 'Sponsor brand', item.sponsorId || state.sponsorId, brands, { required: true })}<div class="field">${schoolPicker(prefix, 'schoolIds', item.hsid ? [String(item.hsid)] : [], true)}</div>${selectField(prefix, 'status', 'Placement status', item.status || 'paused', [['paused', 'Paused'], ['active', 'Active'], ['cancelled', 'Cancelled']])}${field(prefix, 'priority', 'Placement priority', item.priority ?? 0, { type: 'number', step: '1', help: 'Used when more than one eligible placement is available.' })}</div><fieldset><legend>Placement dates</legend>${dates(prefix, item, { startRequired: true })}</fieldset><div style="margin-top:18px">${selectField(prefix, 'sponsorOrderId', 'Linked sponsorship order', item.sponsorOrderId || '', orders)}</div><label class="check-line"><input type="checkbox" name="requiresApproval"${item.requiresApproval !== false ? ' checked' : ''}>Require publisher approval for sponsor ${cards ? 'card' : 'advertisement'} updates.</label><div class="form-actions"><button class="button button-primary" type="submit">Save ${cards ? 'title-card ' : ''}placement</button></div></form></section><section class="panel"><div class="panel-heading"><div><h2>${cards ? 'Title sponsorship assignments' : 'School assignments'}</h2><p>Placements for the selected sponsor. Use the sponsor selector or search to open another brand.</p></div></div>${placementTable(list(cards ? 'cardPlacements' : 'placements'), true, cards)}</section>`;
}
function renderAccess() {
  if (!isPublisher()) return empty('Publisher access is required.', 'Your account’s sponsor access is managed by your publisher.');
  const item = list('memberships').find(m => String(m.id) === state.membershipId) || {};
  return pageHeading('Publisher’s Desk / Account access', 'The right access for the right account.', 'Connect an existing account to its sponsor brand, or grant publisher access.', button('New access assignment', 'new-membership', '', true)) + `<section class="panel"><div class="panel-heading"><div><h2>${item.id ? 'Update account access' : 'Assign account access'}</h2><p>Use the account’s verified Firebase UID. This form does not send an invitation.</p></div></div><form id="membership-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="revision" value="${esc(item.revision ?? '')}"><p class="form-error" role="alert" hidden></p><div class="form-grid">${field('membership', 'uid', 'Account UID', item.uid, { required: true, max: 128, help: 'Use the exact account identifier. Email addresses are not account identifiers here.' })}${selectField('membership', 'role', 'Access role', item.role || 'sponsor', [['sponsor', 'Sponsor'], ['publisher', 'Publisher']])}<div class="field" data-membership-sponsor${item.role === 'publisher' ? ' hidden' : ''}>${selectField('membership', 'sponsorId', 'Sponsor brand', item.sponsorId || state.sponsorId, [['', 'Choose a sponsor'], ...list('sponsors').map(s => [s.id, s.name])])}</div></div><label class="check-line"><input type="checkbox" name="isActive"${item.isActive !== false ? ' checked' : ''}>Access is active</label><div class="form-actions"><button class="button button-primary" type="submit">Save account access</button></div><p class="help">Your current account UID: <code>${esc(state.data.user?.uid || '')}</code></p></form></section><section class="panel"><div class="panel-heading"><div><h2>Current account assignments</h2></div></div>${list('memberships').length ? `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">Account UID</th><th scope="col">Role / brand</th><th scope="col">Status</th><th scope="col">Manage</th></tr></thead><tbody>${list('memberships').map(m => `<tr><td><code>${esc(m.uid)}</code></td><td>${esc(m.role)}<small>${esc(list('sponsors').find(s => String(s.id) === String(m.sponsorId))?.name || (m.role === 'publisher' ? 'Publication-wide access' : ''))}</small></td><td>${statusBadge(m.isActive ? 'active' : 'paused')}</td><td><button class="button button-small" type="button" data-edit-membership="${esc(m.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>` : empty('No account assignments returned.', 'Assignments appear here after they are saved.')}</section>`;
}
function renderOrders() {
  const billing = safeUrl(state.data.billingUrl);
  return pageHeading('Partner Program / Agreement & Billing', 'Your Partnership Arrangement, on record.', 'Review the Partnership Agreement and billing records connected to your account.', billing ? `<a class="button button-primary" href="${esc(billing)}" target="_blank" rel="noopener noreferrer">Open billing <span aria-hidden="true">↗</span></a>` : '') + `<section class="panel"><div class="panel-heading"><div><h2>Partnership records</h2><p>Order details are read-only in this workspace.</p></div></div>${list('orders').length ? `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">School / order</th><th scope="col">Arrangement</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead><tbody>${list('orders').map(o => `<tr><td><strong>${esc(schoolName(o.hsid))}</strong><small>${esc(o.id)}</small></td><td>${esc(o.sponsorshipType || 'Sponsorship')}</td><td>${statusBadge(o.status)}</td><td>${esc(dateLabel(o.createdAt))}</td></tr>`).join('')}</tbody></table></div>` : empty('No Partnership Agreement records are listed.', 'A YAT?STATS administrator can connect an existing order or answer questions about a Partnership Arrangement.')}</section>${!billing ? '<section class="panel"><div class="panel-heading"><div><h2>Need help with billing?</h2><p>Your publisher can help with payments or changes to a booked sponsorship. A billing link will appear here when one is available for your account.</p></div></div></section>' : ''}`;
}

function formValue(form, name) { return new FormData(form).get(name)?.toString().trim() || ''; }
function checked(form, name) { return form.elements.namedItem(name)?.checked === true; }
function selectedSchools(form, name = 'schoolIds') {
  try { const ids = JSON.parse(formValue(form, name) || '[]'); return Array.isArray(ids) ? [...new Set(ids.map(String))] : []; } catch { return []; }
}
function idRevision(form) {
  const id = formValue(form, 'id'), revision = formValue(form, 'revision');
  return { ...(id ? { id } : {}), ...(revision !== '' ? { revision: Number(revision) } : {}) };
}
function timing(form) {
  const startsAt = isoDate(formValue(form, 'startsAt'));
  const endsAt = checked(form, 'evergreen') ? null : isoDate(formValue(form, 'endsAt'));
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('The end date must be after the start date.');
  return { startsAt, endsAt };
}
function syncCreativeTiming(form) {
  const evergreen = checked(form, 'evergreen');
  const start = form.elements.namedItem('startsAt'), end = form.elements.namedItem('endsAt');
  if (start) start.required = !evergreen;
  if (end) { end.required = !evergreen; end.disabled = evergreen; }
}
function syncCreativeImage(form) {
  if (form.getAttribute('id') !== 'creative-form') return;
  const description = form.elements.namedItem('imageAlt');
  if (description) description.required = Boolean(formValue(form, 'imageUrl'));
}
function creativePayload(form, action) {
  if (!state.sponsorId) throw new Error('Choose a sponsor brand before saving.');
  if (action === 'archive') return { action, ...idRevision(form), sponsorId: state.sponsorId };
  const schoolIds = formValue(form, 'audienceMode') === 'selected' ? new FormData(form).getAll('schoolId').map(String) : [];
  if (action !== 'archive' && formValue(form, 'audienceMode') === 'selected' && !schoolIds.length) throw new Error('Choose at least one booked school, or select all eligible sponsor placements.');
  return { action, ...idRevision(form), sponsorId: state.sponsorId, headline: formValue(form, 'headline'), body: formValue(form, 'body'), imageUrl: formValue(form, 'imageUrl'), imageAlt: formValue(form, 'imageAlt'), url: formValue(form, 'url'), cta: formValue(form, 'cta'), acknowledgment: formValue(form, 'acknowledgment'), ...timing(form), evergreen: checked(form, 'evergreen'), schoolIds, cadence: formValue(form, 'cadence') || 'both' };
}
function cardPayload(form, action) {
  if (!state.sponsorId) throw new Error('Choose a sponsor brand before saving.');
  const record = idRevision(form);
  if (record.id && !Number.isInteger(record.revision)) throw new Error('Refresh the workspace before changing this card. Its current revision is missing.');
  if (action === 'archive') return { action, ...record, sponsorId: state.sponsorId };
  const schoolIds = formValue(form, 'audienceMode') === 'selected' ? new FormData(form).getAll('schoolId').map(String) : [];
  if (formValue(form, 'audienceMode') === 'selected' && !schoolIds.length) throw new Error('Choose at least one entitled school, or select all eligible title-card placements.');
  const varsityYears = [...new Set(new FormData(form).getAll('varsityYears').map(String))].sort();
  if (varsityYears.length > 8) throw new Error('Select no more than eight varsity years.');
  const backTemplate = formValue(form, 'backTemplate') || 'banner_text';
  const ctaLabel = formValue(form, 'ctaLabel'), ctaUrl = formValue(form, 'ctaUrl');
  if (backTemplate !== 'share_promotion' && Boolean(ctaLabel) !== Boolean(ctaUrl)) throw new Error('Add both the optional button text and its destination, or leave both empty.');
  return {
    action, ...record, sponsorId: state.sponsorId, schoolIds,
    firstName: formValue(form, 'firstName'), lastName: formValue(form, 'lastName'), currentTeam: formValue(form, 'currentTeam'), organization: formValue(form, 'organization'),
    level: 'SPONSOR', statusLabel: formValue(form, 'statusLabel'), gradClass: formValue(form, 'gradClass'), varsityYears,
    frontImageUrl: formValue(form, 'frontImageUrl'), frontImageAlt: formValue(form, 'frontImageAlt'), backTemplate,
    bannerImageUrl: backTemplate === 'banner_text' ? formValue(form, 'bannerImageUrl') : '', bannerImageAlt: backTemplate === 'banner_text' ? formValue(form, 'bannerImageAlt') : '',
    fullImageUrl: backTemplate === 'full_image' ? formValue(form, 'fullImageUrl') : '', fullImageAlt: backTemplate === 'full_image' ? formValue(form, 'fullImageAlt') : '',
    headline: backTemplate === 'full_image' ? '' : formValue(form, 'headline'), body: backTemplate === 'full_image' ? '' : formValue(form, 'body'), ctaLabel, ctaUrl, ...timing(form),
  };
}
function notePayload(form, action) {
  if (action === 'archive') return { action, ...idRevision(form) };
  const schoolIds = formValue(form, 'audienceMode') === 'all' ? [] : selectedSchools(form);
  if (action !== 'archive' && formValue(form, 'audienceMode') !== 'all' && !schoolIds.length) throw new Error('Choose at least one school, or explicitly select all school editions.');
  const ctaLabel = formValue(form, 'ctaLabel'), ctaUrl = formValue(form, 'ctaUrl');
  if (Boolean(ctaLabel) !== Boolean(ctaUrl)) throw new Error('Add both the optional link text and its destination, or leave both empty.');
  return { action, ...idRevision(form), title: formValue(form, 'title'), body: formValue(form, 'body'), byline: formValue(form, 'byline'), imageUrl: formValue(form, 'imageUrl'), ctaLabel, ctaUrl, ...timing(form), schoolIds, cadence: formValue(form, 'cadence') || 'both', issueDate: formValue(form, 'issueDate') || '' };
}
function publicationPayload(form) {
  const imageUrl = formValue(form, 'mastheadUrl');
  const assetId = formValue(form, 'mastheadAssetId');
  return { revision: Number(formValue(form, 'revision') || 0), masthead: imageUrl ? { imageUrl, alt: formValue(form, 'mastheadAlt'), includesTagline: checked(form, 'includesTagline'), ...(assetId ? { assetId } : {}) } : null, officialRulesUrl: formValue(form, 'officialRulesUrl'), sweepstakesReminder: formValue(form, 'sweepstakesReminder'), postalAddress: formValue(form, 'postalAddress') };
}
async function saveCreative(form, requestedAction) {
  const action = requestedAction === 'preview' ? 'save' : requestedAction;
  const payload = creativePayload(form, action);
  const result = await post('/creatives', payload);
  state.creativeId = String(result.creative?.id || result.id || payload.id || '');
  state.dirty = false; await loadDashboard({ loading: false });
  notify(action === 'archive' ? 'Advertisement version archived.' : action === 'submit' ? 'Advertisement submitted. Its current status is shown in version history.' : action === 'publish' ? 'Advertisement version published for its eligible placements and dates.' : 'Advertisement draft saved.');
  if (requestedAction === 'preview') {
    if (!state.creativeId) throw new Error('The draft was saved, but its version ID was not returned. Select it in version history to preview.');
    openPreview({ creativeId: state.creativeId });
  }
}
async function saveCard(form, requestedAction) {
  const action = requestedAction === 'preview' ? 'save' : requestedAction;
  const payload = cardPayload(form, action);
  const result = await post('/cards', payload);
  state.cardId = String(result.card?.id || result.id || payload.id || '');
  state.dirty = false; await loadDashboard({ loading: false });
  notify(action === 'archive' ? 'Card version archived.' : action === 'publish' ? 'Card version marked published. School entitlement, dates and approval determine where it is eligible to appear.' : action === 'submit' ? 'Card version submitted. Its current status is shown in version history.' : 'Sponsor card draft saved.');
  if (requestedAction === 'preview') {
    if (!state.cardId) throw new Error('The draft was saved, but its card version ID was not returned. Select it in version history to preview.');
    openPreview({ cardId: state.cardId });
  }
}
async function saveNote(form, requestedAction) {
  const action = requestedAction === 'preview' ? 'save' : requestedAction;
  const payload = notePayload(form, action);
  const result = await post('/notes', payload);
  state.noteId = String(result.note?.id || result.id || payload.id || '');
  state.dirty = false; await loadDashboard({ loading: false });
  notify(action === 'archive' ? 'Publisher notice archived.' : action === 'publish' ? 'Publisher notice published for its selected editions.' : 'Publisher notice draft saved.');
  if (requestedAction === 'preview') {
    if (!state.noteId) throw new Error('The draft was saved, but its notice ID was not returned. Select it in the notice list to preview.');
    openPreview({ noteId: state.noteId });
  }
}
async function saveBrand(form) {
  const id = formValue(form, 'id');
  const result = await post('/brands', { ...(id ? { id } : {}), name: formValue(form, 'name'), websiteUrl: formValue(form, 'websiteUrl'), logoUrl: formValue(form, 'logoUrl'), isActive: checked(form, 'isActive') });
  state.sponsorId = String(result.brand?.id || result.id || id || state.sponsorId); state.newBrand = false; state.dirty = false;
  await loadDashboard({ loading: false }); notify(id ? 'Brand profile saved.' : 'Sponsor brand created. You can now upload its logo and assign placements.');
}
async function savePlacement(form, cards = false) {
  const ids = selectedSchools(form);
  if (ids.length !== 1) throw new Error('Choose one school for this placement.');
  const id = formValue(form, 'id');
  const result = await post(cards ? '/card-placements' : '/placements', { ...(id ? { id } : {}), sponsorId: formValue(form, 'sponsorId'), hsid: ids[0], status: formValue(form, 'status'), priority: Number(formValue(form, 'priority') || 0), ...timing(form), requiresApproval: checked(form, 'requiresApproval'), sponsorOrderId: formValue(form, 'sponsorOrderId') || null });
  state[cards ? 'cardPlacementId' : 'placementId'] = String(result.cardPlacement?.id || result.placement?.id || result.id || id || ''); state.dirty = false;
  await loadDashboard({ loading: false }); notify(cards ? 'Title-card placement saved.' : 'School placement saved.');
}
async function saveMembership(form) {
  const role = formValue(form, 'role'), sponsorId = formValue(form, 'sponsorId');
  if (role === 'sponsor' && !sponsorId) throw new Error('Choose a sponsor brand for this account.');
  const record = idRevision(form);
  if (record.id && !Number.isInteger(record.revision)) throw new Error('Refresh the workspace before updating this account assignment. Its current revision is missing.');
  const result = await post('/memberships', { ...record, uid: formValue(form, 'uid'), role, sponsorId: role === 'sponsor' ? sponsorId : null, isActive: checked(form, 'isActive') });
  state.membershipId = String(result.membership?.id || ''); state.dirty = false;
  await loadDashboard({ loading: false }); notify('Account access saved.');
}
async function uploadAsset(input) {
  const file = input.files?.[0]; if (!file) return;
  const holder = input.closest('[data-asset-picker]'), form = input.form, status = $('.asset-status', holder);
  const kind = input.dataset.uploadKind;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { status.textContent = 'Choose a PNG, JPG or WebP image.'; input.value = ''; return; }
  if (file.size > MAX_UPLOAD_BYTES) { status.textContent = 'Choose an image no larger than 3 MB.'; input.value = ''; return; }
  const brandId = form?.getAttribute('id') === 'brand-form' ? formValue(form, 'id') : state.sponsorId;
  if (SPONSOR_ASSET_KINDS.includes(kind) && !brandId) { status.textContent = 'Save or choose the sponsor brand before uploading its image.'; input.value = ''; return; }
  if (form.dataset.uploading === 'true' || form.dataset.busy === 'true') { status.textContent = 'Wait for the current save or upload to finish.'; input.value = ''; return; }
  form.dataset.uploading = 'true'; status.textContent = 'Uploading and checking the image…';
  const controls = $$('input[type=file],input[name=backTemplate],button[type=submit],button[data-action=remove-asset]', form);
  const disabledBefore = controls.map(control => control.disabled); controls.forEach(control => { control.disabled = true; });
  try {
    const body = new FormData(); body.set('file', file); body.set('kind', kind); if (SPONSOR_ASSET_KINDS.includes(kind)) body.set('sponsorId', brandId);
    const result = await request('/upload', { method: 'POST', body });
    if (!result.asset?.url || !safeUrl(result.asset.url)) throw new Error('The image was not returned with a usable address.');
    form.elements.namedItem(input.dataset.urlField).value = result.asset.url;
    form.elements.namedItem(input.dataset.assetField).value = result.asset.id || '';
    syncCreativeImage(form);
    $('.asset-preview', holder).innerHTML = `<img src="${esc(result.asset.url)}" alt="Uploaded artwork preview"><button type="button" class="button button-small" data-action="remove-asset">Remove image</button>`;
    status.textContent = `Image uploaded${result.asset.width && result.asset.height ? ` · ${result.asset.width} × ${result.asset.height} px` : ''}. Save the form to use it.`;
    state.dirty = true;
  } catch (error) { status.textContent = error.message || 'The image could not be uploaded.'; }
  finally { input.value = ''; delete form.dataset.uploading; controls.forEach((control, index) => { control.disabled = disabledBefore[index]; }); }
}
async function searchSchools(input) {
  const picker = input.closest('[data-school-picker]'), query = input.value.trim();
  const results = $('.school-search-results', picker), status = $('.school-result-status', picker);
  state.searchControllers.get(input)?.abort();
  if (query.length < 2) { results.innerHTML = ''; status.textContent = 'Search at least two characters.'; return; }
  const controller = new AbortController(); state.searchControllers.set(input, controller); status.textContent = 'Searching schools…';
  try {
    const data = await request(`/schools?q=${encodeURIComponent(query.slice(0, 100))}`, { signal: controller.signal });
    if (input.value.trim() !== query) return;
    const schools = Array.isArray(data.schools) ? data.schools.slice(0, 20) : [];
    schools.forEach(s => state.schools.set(String(s.hsid), { ...s, hsid: String(s.hsid) }));
    results.innerHTML = schools.map(s => `<li><button type="button" data-pick-school="${esc(s.hsid)}"><strong>${esc(s.name)}</strong><small>${esc(s.location || '')}</small></button></li>`).join('');
    status.textContent = schools.length ? `${schools.length} school${schools.length === 1 ? '' : 's'} found. Choose one below.` : 'No schools found. Try a different name or location.';
  } catch (error) { if (error.name !== 'AbortError') { results.innerHTML = ''; status.textContent = error.message || 'School search is unavailable.'; } }
}
async function searchSponsors(input) {
  const query = input.value.trim(), results = $('#sponsor-search-results'), status = $('#sponsor-search-status');
  state.searchControllers.get(input)?.abort();
  if (!isPublisher() || query.length < 2) { results.innerHTML = ''; status.textContent = 'Search at least two characters.'; return; }
  const controller = new AbortController(); state.searchControllers.set(input, controller); status.textContent = 'Searching sponsor brands…';
  try {
    const data = await request(`/sponsors?q=${encodeURIComponent(query.slice(0, 100))}`, { signal: controller.signal });
    if (input.value.trim() !== query) return;
    const brands = Array.isArray(data.sponsors) ? data.sponsors.slice(0, 50) : [];
    results.innerHTML = brands.map(brand => `<li><button type="button" data-pick-sponsor="${esc(brand.id)}"><strong>${esc(brand.name)}</strong><small>${brand.isActive === false ? 'Inactive brand' : 'Sponsor brand'}</small></button></li>`).join('');
    status.textContent = brands.length ? `${brands.length} match${brands.length === 1 ? '' : 'es'}. Choose a brand to open its workspace.` : 'No matching sponsor brands.';
  } catch (error) { if (error.name !== 'AbortError') { results.innerHTML = ''; status.textContent = error.message || 'Sponsor search is unavailable.'; } }
}
async function chooseSponsor(id) {
  if (!leaveEdits()) { $('#brand-select').value = state.sponsorId; return; }
  closePreview();
  state.sponsorId = String(id); state.creativeId = ''; state.cardId = ''; state.placementId = ''; state.cardPlacementId = ''; state.membershipId = ''; state.newBrand = false; state.dirty = false;
  $('#sponsor-search').value = ''; $('#sponsor-search-results').innerHTML = ''; $('#global-alert').hidden = true;
  await loadDashboard();
}
function updateSchoolPicker(picker, ids) {
  const hidden = $('input[type=hidden]', picker); hidden.value = JSON.stringify(ids);
  $('.school-chips', picker).innerHTML = ids.map(id => schoolChip(id)).join('');
  $('.school-search-results', picker).innerHTML = '';
  const search = $('[data-school-search]', picker); search.value = ''; search.focus();
  $('.school-result-status', picker).textContent = ids.length ? `${ids.length} school${ids.length === 1 ? '' : 's'} selected.` : 'Search at least two characters.';
  if (!picker.closest('#preview-dialog')) state.dirty = true;
}
function previewSchoolOptions(cards = false) {
  return [...new Map(scopedPlacements(cards).filter(p => p.status !== 'cancelled').map(p => [String(p.hsid), p])).values()];
}
function clearPreviewContent() {
  state.preview.requestId++; state.preview.html = ''; state.preview.text = ''; state.preview.card = null; state.preview.origin = ''; state.preview.url = ''; state.preview.frameReady = false;
  clearTimeout(state.preview.timer);
  const frame = $('#preview-frame'); frame.removeAttribute('src'); frame.srcdoc = ''; frame.setAttribute('sandbox', ''); frame.hidden = true;
  $('#preview-text').textContent = ''; $('#preview-text').hidden = true;
}
function closePreview() {
  const dialog = $('#preview-dialog'); if (dialog.open) dialog.close();
  clearPreviewContent(); state.preview.context = {};
}
function openPreview(context = {}) {
  clearPreviewContent();
  const cards = Boolean(context.cardId);
  state.preview.kind = cards ? 'card' : 'edition'; state.preview.context = context; state.preview.format = 'html';
  const item = cards ? list('cards').find(c => String(c.id) === String(context.cardId)) : context.creativeId ? list('creatives').find(c => String(c.id) === String(context.creativeId)) : context.noteId ? list('notes').find(n => String(n.id) === String(context.noteId)) : null;
  const options = previewSchoolOptions(cards);
  const seed = String(item?.schoolIds?.[0] || options[0]?.hsid || state.preview.schoolId || '');
  if (['daily', 'weekly'].includes(item?.cadence)) state.preview.cadence = item.cadence;
  const allowedSeed = (!cards && isPublisher()) || options.some(o => String(o.hsid) === seed) ? seed : String(options[0]?.hsid || '');
  state.preview.schoolId = allowedSeed;
  const schoolControl = !cards && isPublisher() ? schoolPicker('preview', 'schoolIds', allowedSeed ? [allowedSeed] : [], true) : `<div class="field"><label for="preview-school">${cards ? 'Title-card placement' : 'School placement'}</label><select name="hsid" id="preview-school" required>${options.length ? options.map(p => `<option value="${esc(p.hsid)}"${String(p.hsid) === allowedSeed ? ' selected' : ''}>${esc(p.schoolName || schoolName(p.hsid))}</option>`).join('') : `<option value="">No ${cards ? 'title-card' : 'school'} placement available</option>`}</select></div>`;
  $('#preview-controls').innerHTML = `<form id="preview-form" class="preview-form">${schoolControl}${cards ? '' : `<div class="field cadence-field"><label for="preview-cadence">Edition</label><select name="cadence" id="preview-cadence"><option value="weekly"${state.preview.cadence === 'weekly' ? ' selected' : ''}>Weekly</option><option value="daily"${state.preview.cadence === 'daily' ? ' selected' : ''}>Daily</option></select></div>`}<button type="submit" class="button button-primary">Open preview</button><p class="help" style="flex-basis:100%">${cards ? 'This proof shows both sides using the school gallery’s shared card renderer. Previewing does not publish the card.' : `This preview uses a saved ad or notice version${context.publication ? ' and the publication settings currently in your form' : ''}. Previewing does not send an email.`}</p></form>`;
  $('#preview-title').textContent = cards ? 'Sponsor card preview' : 'Edition preview';
  $('.preview-heading .eyebrow').textContent = cards ? 'YAT?STATS · Front & back' : 'The YAT-A-BOY Tribune';
  $('#preview-frame').title = cards ? 'Sponsor card front and back proof' : 'Tribune HTML email preview';
  $('#preview-dialog').classList.toggle('is-card-preview', cards);
  $('#preview-error').hidden = true; $('#preview-warnings').hidden = true; $('#preview-warnings').textContent = ''; $('#preview-subject').textContent = '';
  $('#preview-empty').hidden = false;
  $('#preview-empty').innerHTML = cards ? '<p>Choose an entitled school, then open the card preview.</p><span>The preview shows a saved version. It does not publish the card.</span>' : '<p>Choose a school and edition, then open the preview.</p><span>Previewing does not send an email.</span>';
  updatePreviewDisplay();
  const dialog = $('#preview-dialog'); if (!dialog.open) dialog.showModal();
  if (allowedSeed) generatePreview($('#preview-form'));
}
async function generatePreview(form) {
  const cards = state.preview.kind === 'card';
  const hsid = !cards && isPublisher() ? selectedSchools(form)[0] : formValue(form, 'hsid');
  const error = $('#preview-error'); error.hidden = true;
  if (!hsid) { error.hidden = false; error.textContent = cards ? 'Choose an entitled title-card school to preview.' : 'Choose an eligible school to preview.'; return; }
  clearPreviewContent();
  const requestId = state.preview.requestId, epoch = state.authEpoch;
  const context = { ...state.preview.context };
  const submit = $('button[type=submit]', form); submit.disabled = true; submit.textContent = 'Building preview…';
  $('#preview-empty').hidden = false; $('#preview-empty').innerHTML = '<p>Building your preview…</p><span>Your saved content is unchanged.</span>';
  try {
    state.preview.schoolId = hsid; if (!cards) state.preview.cadence = formValue(form, 'cadence') || 'weekly';
    const result = await post(cards ? '/card-preview' : '/preview', cards ? { cardId: context.cardId, hsid } : { hsid, cadence: state.preview.cadence, ...context });
    if (requestId !== state.preview.requestId || epoch !== state.authEpoch || !$('#preview-dialog').open) return;
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    $('#preview-warnings').hidden = !warnings.length;
    $('#preview-warnings').innerHTML = warnings.length ? `<ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
    const frame = $('#preview-frame');
    if (cards) {
      let url;
      try { url = new URL(result.previewUrl); } catch { throw new Error('The shared card renderer address was not returned. Please try again.'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '') !== '/embed/sponsor-card/preview') throw new Error('The shared card renderer address could not be verified.');
      if (!result.card || typeof result.card !== 'object' || result.card.level !== 'SPONSOR' || String(result.card.id) !== String(context.cardId) || String(result.card.sponsorId) !== state.sponsorId) throw new Error('The card preview did not match the selected sponsor and version.');
      state.preview.card = result.card; state.preview.url = url.href; state.preview.origin = url.origin;
      frame.removeAttribute('srcdoc'); frame.setAttribute('sandbox', 'allow-scripts allow-same-origin'); frame.src = url.href;
      $('#preview-subject').textContent = `Saved card version · Revision ${result.card.revision}`;
      $('#preview-empty').innerHTML = '<p>Opening the shared card renderer…</p><span>Both the front and back will appear below.</span>';
      state.preview.timer = setTimeout(() => {
        if (requestId === state.preview.requestId && !state.preview.frameReady && $('#preview-dialog').open) { error.hidden = false; error.textContent = 'The shared card renderer has not responded. Try opening the preview again.'; }
      }, 20000);
    } else {
      if (typeof result.html !== 'string' || typeof result.text !== 'string') throw new Error('The preview did not contain both HTML and plain text. Please try again.');
      state.preview.html = result.html; state.preview.text = result.text;
      frame.srcdoc = result.html; $('#preview-text').textContent = result.text;
      $('#preview-subject').textContent = result.subject ? `Subject: ${result.subject}` : '';
      $('#preview-empty').hidden = true;
    }
    updatePreviewDisplay();
  } catch (reason) {
    if (requestId === state.preview.requestId && epoch === state.authEpoch && $('#preview-dialog').open) { error.hidden = false; error.textContent = reason.message || 'The preview could not be created.'; $('#preview-empty').hidden = true; }
  } finally { submit.disabled = false; submit.textContent = 'Open preview'; }
}
function updatePreviewDisplay() {
  const cards = state.preview.kind === 'card';
  const html = cards || state.preview.format === 'html', ready = cards ? Boolean(state.preview.card && state.preview.url) : Boolean(state.preview.html);
  $$('[data-preview-format]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.previewFormat === state.preview.format)));
  $$('[data-preview-device]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.previewDevice === state.preview.device)));
  $('#preview-format-controls').hidden = cards;
  $('#preview-frame').hidden = !ready || !html; $('#preview-text').hidden = !ready || html;
  $('#preview-device-controls').hidden = !html;
  $('#preview-stage').classList.toggle('is-mobile', state.preview.device === 'mobile');
}

function leaveEdits() {
  if ($('#page-content form[data-busy=true],#page-content form[data-uploading=true]')) { notify('Please wait for the current save or upload to finish.'); return false; }
  return !state.dirty || window.confirm('Leave these unsaved edits? Your saved versions will stay available.');
}
function navigate(section) {
  if (!leaveEdits()) return;
  state.section = section; state.newBrand = false; $('#global-alert').hidden = true;
  renderWorkspace(); $('#page-content').scrollIntoView({ block: 'start', behavior: 'auto' });
}
function loginError(error) {
  const code = error?.code || '';
  if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(code)) return 'The email or password could not be verified. Please check both and try again.';
  if (code === 'auth/too-many-requests') return 'There have been too many attempts. Please wait a little before trying again.';
  if (code === 'auth/network-request-failed') return 'We couldn’t connect to sign-in. Check your connection and try again.';
  if (code === 'auth/operation-not-allowed') return 'Email and password sign-in is not available for this workspace yet. Contact your publisher.';
  return error?.message || 'Sign-in is unavailable. Please try again.';
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const action = event.submitter?.dataset.saveAction || 'save';
  if (form.getAttribute('id') === 'sign-in-form') {
    withForm(form, async () => { $('#login-status').textContent = ''; try { await state.authTools.signInWithEmailAndPassword(state.auth, formValue(form, 'email'), form.elements.namedItem('password').value); } catch (error) { throw new Error(loginError(error)); } });
  } else if (form.getAttribute('id') === 'creative-form') withForm(form, () => saveCreative(form, action));
  else if (form.getAttribute('id') === 'card-form') withForm(form, () => saveCard(form, action));
  else if (form.getAttribute('id') === 'note-form') withForm(form, () => saveNote(form, action));
  else if (form.getAttribute('id') === 'brand-form') withForm(form, () => saveBrand(form));
  else if (form.getAttribute('id') === 'placement-form') withForm(form, () => savePlacement(form));
  else if (form.getAttribute('id') === 'card-placement-form') withForm(form, () => savePlacement(form, true));
  else if (form.getAttribute('id') === 'membership-form') withForm(form, () => saveMembership(form));
  else if (form.getAttribute('id') === 'publication-form') withForm(form, async () => {
    const payload = publicationPayload(form);
    if (action === 'preview') { openPreview({ publication: payload }); return; }
    await post('/publication', payload); state.dirty = false; await loadDashboard({ loading: false }); notify('Publication settings saved. Delivery approval and scheduling are unchanged.');
  });
  else if (form.getAttribute('id') === 'preview-form') generatePreview(form);
});
document.addEventListener('click', event => {
  const target = event.target.closest('button,a'); if (!target) return;
  if (target.dataset.section) { navigate(target.dataset.section); return; }
  if (target.dataset.pickSponsor) { chooseSponsor(target.dataset.pickSponsor); return; }
  if (target.dataset.deskTab) { if (!leaveEdits()) return; state.deskTab = target.dataset.deskTab; renderPage(); return; }
  for (const [key, stateKey] of [['editCreative', 'creativeId'], ['editCard', 'cardId'], ['editNote', 'noteId'], ['editPlacement', 'placementId'], ['editCardPlacement', 'cardPlacementId'], ['editMembership', 'membershipId']]) {
    if (target.dataset[key]) { if (!leaveEdits()) return; state[stateKey] = target.dataset[key]; renderPage(); return; }
  }
  if (target.dataset.pickSchool) {
    const picker = target.closest('[data-school-picker]');
    let ids; try { ids = JSON.parse($('input[type=hidden]', picker).value || '[]'); } catch { ids = []; }
    const value = String(target.dataset.pickSchool);
    updateSchoolPicker(picker, picker.dataset.single === 'true' ? [value] : [...new Set([...ids, value])]); return;
  }
  if (target.dataset.removeSchool) {
    const picker = target.closest('[data-school-picker]');
    const ids = JSON.parse($('input[type=hidden]', picker).value || '[]').filter(id => String(id) !== target.dataset.removeSchool);
    updateSchoolPicker(picker, ids); return;
  }
  if (target.dataset.previewFormat) { state.preview.format = target.dataset.previewFormat; updatePreviewDisplay(); return; }
  if (target.dataset.previewDevice) { state.preview.device = target.dataset.previewDevice; updatePreviewDisplay(); return; }
  const action = target.dataset.action;
  if (action === 'close-preview') closePreview();
  else if (action === 'copy-account-id') {
    const field = $('#verified-account-id');
    if (field) {
      field.select();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(field.value).then(() => notify('Account ID copied.')).catch(() => notify('Account ID selected. Copy it using your device’s copy command.'));
      else notify('Account ID selected. Copy it using your device’s copy command.');
    }
  }
  else if (action === 'retry-dashboard') loadDashboard();
  else if (action === 'preview-edition') openPreview();
  else if (action?.startsWith('go-')) navigate(action.slice(3));
  else if (action === 'new-creative') { if (!leaveEdits()) return; state.creativeId = ''; renderPage(); }
  else if (action === 'new-card') { if (!leaveEdits()) return; state.cardId = ''; renderPage(); }
  else if (action === 'new-note') { if (!leaveEdits()) return; state.noteId = ''; renderPage(); }
  else if (action === 'new-placement') { if (!leaveEdits()) return; state.placementId = ''; renderPage(); }
  else if (action === 'new-card-placement') { if (!leaveEdits()) return; state.cardPlacementId = ''; renderPage(); }
  else if (action === 'new-membership') { if (!leaveEdits()) return; state.membershipId = ''; renderPage(); }
  else if (action === 'new-brand') { if (!leaveEdits()) return; state.newBrand = true; renderPage(); }
  else if (action === 'card-share-defaults') {
    const form = target.closest('form');
    for (const [name, value] of Object.entries(sharePromotionDefaults())) form.elements.namedItem(name).value = value;
    state.dirty = true;
  }
  else if (action === 'remove-asset') {
    const holder = target.closest('[data-asset-picker]'), input = $('input[type=file]', holder);
    input.form.elements.namedItem(input.dataset.urlField).value = ''; input.form.elements.namedItem(input.dataset.assetField).value = '';
    syncCreativeImage(input.form);
    $('.asset-preview', holder).innerHTML = ''; $('.asset-status', holder).textContent = 'Image removed from this draft. Save the form to apply.'; state.dirty = true;
  }
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'sponsor-search') {
    clearTimeout(state.searchTimers.get(input)); state.searchTimers.set(input, setTimeout(() => searchSponsors(input), 300)); return;
  }
  if (input.matches('[data-school-search]')) {
    clearTimeout(state.searchTimers.get(input)); state.searchTimers.set(input, setTimeout(() => searchSchools(input), 300)); return;
  }
  if (input.closest('#page-content form')) state.dirty = true;
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'brand-select') {
    chooseSponsor(input.value); return;
  }
  if (input.matches('[data-upload-kind]')) { uploadAsset(input); return; }
  if (input.name === 'audienceMode') { $('[data-selected-schools]', input.form).hidden = input.value === 'all'; state.dirty = true; }
  if (input.name === 'role' && input.form?.getAttribute('id') === 'membership-form') $('[data-membership-sponsor]', input.form).hidden = input.value === 'publisher';
  if (input.name === 'evergreen' && input.form) {
    syncCreativeTiming(input.form);
  }
  if (input.form?.getAttribute('id') === 'card-form') {
    if (input.name === 'backTemplate') syncCardTemplate(input.form);
    if (['gradClass', 'varsityYears'].includes(input.name)) syncVarsityYears(input.form);
  }
  if (input.closest('#page-content form')) state.dirty = true;
});
document.addEventListener('keydown', event => {
  const input = event.target;
  if (input.matches('[data-school-search],#sponsor-search')) {
    const picker = input.closest('[data-school-picker]') || $('#sponsor-search-box'), results = $('.school-search-results', picker);
    if (event.key === 'ArrowDown') { const first = $('button', results); if (first) { event.preventDefault(); first.focus(); } }
    if (event.key === 'Escape') { results.innerHTML = ''; event.stopPropagation(); }
  } else if (input.matches('[data-pick-school],[data-pick-sponsor]')) {
    const buttons = $$('button', input.closest('.school-search-results')), index = buttons.indexOf(input);
    const picker = input.closest('[data-school-picker]') || $('#sponsor-search-box'), search = $('[data-school-search],#sponsor-search', picker);
    if (event.key === 'ArrowDown' && buttons[index + 1]) { event.preventDefault(); buttons[index + 1].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); if (buttons[index - 1]) buttons[index - 1].focus(); else search.focus(); }
    if (event.key === 'Escape') { $('.school-search-results', picker).innerHTML = ''; search.focus(); }
  }
});
window.addEventListener('message', event => {
  const frame = $('#preview-frame');
  if (state.preview.kind !== 'card' || !state.preview.card || !$('#preview-dialog').open || event.source !== frame.contentWindow || event.origin !== state.preview.origin || event.data?.type !== 'yatstats:sponsor-card-preview-ready') return;
  state.preview.frameReady = true; clearTimeout(state.preview.timer);
  $('#preview-empty').hidden = true; $('#preview-error').hidden = true;
  frame.contentWindow.postMessage({ type: 'yatstats:sponsor-card-preview', card: state.preview.card }, state.preview.origin);
});
$('#preview-dialog').addEventListener('click', event => { if (event.target === $('#preview-dialog')) closePreview(); });
$('#preview-dialog').addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
$('#preview-dialog').addEventListener('close', () => { clearPreviewContent(); state.preview.context = {}; });
$('#sign-out').addEventListener('click', async () => { if (!leaveEdits()) return; try { await state.authTools.signOut(state.auth); } catch (error) { notify(loginError(error), true); } });
$('#toggle-password').addEventListener('click', () => {
  const input = $('#login-password');
  const button = $('#toggle-password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.textContent = show ? 'Hide password' : 'Show password';
  button.setAttribute('aria-pressed', show ? 'true' : 'false');
  input.focus();
});
$('#reset-password').addEventListener('click', async () => {
  const input = $('#login-email'); if (!input.reportValidity()) return;
  const button = $('#reset-password'); button.disabled = true; $('#login-error').hidden = true;
  try { await state.authTools.sendPasswordResetEmail(state.auth, input.value.trim()); $('#login-status').textContent = 'If that account is eligible, password reset instructions will arrive by email.'; }
  catch (error) { $('#login-error').hidden = false; $('#login-error').textContent = loginError(error); }
  finally { button.disabled = false; }
});
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });

async function boot() {
  try {
    const response = await fetch(`${API}/config`, { cache: 'no-store', credentials: 'same-origin' });
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'The partner workspace is temporarily unavailable.');
    if (!config.enabled) throw new Error('The partner workspace is being prepared. Your publisher will let you know when access is ready.');
    if (!config.firebase?.apiKey || !config.firebase?.projectId) throw new Error('Sign-in is not configured for this workspace yet. Please contact your publisher.');
    const [appTools, authTools] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    ]);
    const app = appTools.initializeApp(config.firebase);
    state.authTools = authTools; state.auth = authTools.getAuth(app);
    await authTools.setPersistence(state.auth, authTools.browserSessionPersistence);
    authTools.onAuthStateChanged(state.auth, async user => {
      state.authEpoch++; state.firebaseUser = user; state.dirty = false;
      clearWorkspace();
      $('#boot').hidden = true; $('#sign-in-view').hidden = Boolean(user); $('#workspace').hidden = !user; $('#sign-out').hidden = !user;
      if ($('#preview-dialog').open) $('#preview-dialog').close();
      if (user) { $('#login-password').value = ''; await loadDashboard(); }
    });
  } catch (error) {
    $('#boot').hidden = true; $('#sign-in-view').hidden = false; $('#sign-in-form').hidden = true;
    const message = $('#login-unavailable'); message.hidden = false; message.textContent = error.message || 'The partner workspace could not be loaded. Please try again later.';
  }
}
boot();

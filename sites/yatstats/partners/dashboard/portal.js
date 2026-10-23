const API = '/api/partners';
const FIREBASE_VERSION = '12.10.0';
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone';
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = {
  auth: null, authTools: null, firebaseUser: null, data: null, authEpoch: 0, dashboardRequestId: 0,
  section: 'overview', deskTab: 'notes', sponsorId: '', creativeId: '', noteId: '', placementId: '', membershipId: '', newBrand: false,
  schools: new Map(), searchTimers: new WeakMap(), searchControllers: new WeakMap(), dirty: false,
  preview: { context: {}, format: 'html', device: 'desktop', html: '', text: '', schoolId: '', cadence: 'weekly', requestId: 0 },
};

function safeUrl(value) {
  if (!value) return '';
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''; } catch { return ''; }
}
function list(key) { return Array.isArray(state.data?.[key]) ? state.data[key] : []; }
function isPublisher() { return Boolean(state.data?.user?.publisher); }
function sponsor() { return list('sponsors').find(item => String(item.id) === state.sponsorId); }
function activeCreative() { return list('creatives').find(item => String(item.id) === state.creativeId && String(item.sponsorId) === state.sponsorId); }
function activeNote() { return list('notes').find(item => String(item.id) === state.noteId); }
function activePlacement() { return list('placements').find(item => String(item.id) === state.placementId); }
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
  for (const item of list('placements')) if (item.hsid) state.schools.set(String(item.hsid), { hsid: String(item.hsid), name: item.schoolName || `School ${item.hsid}`, location: '' });
}
function clearWorkspace() {
  state.data = null; state.sponsorId = ''; state.creativeId = ''; state.noteId = ''; state.placementId = ''; state.membershipId = ''; state.newBrand = false;
  state.schools.clear(); state.preview.context = {}; state.preview.html = ''; state.preview.text = ''; state.preview.schoolId = ''; state.preview.requestId++;
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
  const attrs = `${options.required ? ' required' : ''}${options.max ? ` maxlength="${options.max}"` : ''}${options.min !== undefined ? ` min="${esc(options.min)}"` : ''}${options.step ? ` step="${esc(options.step)}"` : ''}${options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : ''}`;
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
  return `<div class="field${options.wide ? ' span-2' : ''}"><label for="${prefix}-file">${esc(options.label || 'Advertisement image')} <span class="muted">(optional)</span></label><div class="asset-picker" data-asset-picker><input type="hidden" name="${esc(name)}" value="${esc(imageUrl)}"><input type="hidden" name="${esc(assetField)}" value="${esc(options.assetId || '')}"><div class="asset-preview">${image ? `<img src="${esc(image)}" alt="Current uploaded artwork"><button type="button" class="button button-small" data-action="remove-asset">Remove image</button>` : ''}</div><input id="${prefix}-file" type="file" accept="image/png,image/jpeg,image/webp" data-upload-kind="${esc(kind)}" data-url-field="${esc(name)}" data-asset-field="${esc(assetField)}"><p class="help">PNG, JPG or WebP · up to 3 MB.${options.help ? ` ${esc(options.help)}` : ''}</p><p class="asset-status" role="status" aria-live="polite"></p></div></div>`;
}
function renderWorkspace() {
  $('#account-email').textContent = state.data.user?.email || state.firebaseUser?.email || 'Signed-in account';
  $('#account-role').textContent = isPublisher() ? 'Publisher' : 'Sponsor';
  $('.topbar-title').textContent = isPublisher() ? 'Publisher’s Desk' : 'Partner Dashboard';
  const select = $('#brand-select');
  select.innerHTML = list('sponsors').length ? list('sponsors').map(item => `<option value="${esc(item.id)}"${String(item.id) === state.sponsorId ? ' selected' : ''}>${esc(item.name)}${item.isActive === false ? ' · inactive' : ''}</option>`).join('') : '<option value="">No sponsor brand assigned</option>';
  select.disabled = !list('sponsors').length;
  $('#sponsor-search-box').hidden = !isPublisher();
  $('#sponsor-search-status').textContent = isPublisher() && state.data.hasMoreSponsors ? 'Recent brands are listed above. Search to find any sponsor.' : '';
  const nav = [['overview', 'Overview', '◫'], ['ads', 'Ad studio', '▤'], ['brand', 'Brand profile', '◇'], ['orders', 'Orders & billing', '▧']];
  if (isPublisher()) nav.push(['publisher', 'Publisher’s Desk', '✦'], ['placements', 'Placements', '⊞'], ['access', 'Account access', '⌘']);
  if (!nav.some(([key]) => key === state.section)) state.section = 'overview';
  $('#workspace-nav').innerHTML = nav.map(([key, label, mark]) => `<button class="nav-button" type="button" data-section="${key}"${state.section === key ? ' aria-current="page"' : ''}><span class="nav-mark" aria-hidden="true">${mark}</span>${label}</button>`).join('');
  renderPage();
}
function renderPage() {
  const views = { overview: renderOverview, ads: renderAds, brand: renderBrand, publisher: renderPublisher, placements: renderPlacements, access: renderAccess, orders: renderOrders };
  $('#page-content').innerHTML = (views[state.section] || renderOverview)();
  $('#page-content').setAttribute('aria-busy', 'false');
  const creativeForm = $('#creative-form');
  if (creativeForm) { syncCreativeTiming(creativeForm); syncCreativeImage(creativeForm); }
  state.dirty = false;
  document.title = `${({ overview: 'Overview', ads: 'Ad Studio', brand: 'Brand Profile', publisher: 'Publisher’s Desk', placements: 'Placements', access: 'Account Access', orders: 'Orders & Billing' })[state.section] || 'Partner Dashboard'} | YAT?STATS`;
}
function scopedPlacements() { return list('placements').filter(p => !state.sponsorId || String(p.sponsorId) === state.sponsorId); }
function renderOverview() {
  const brand = sponsor();
  const placements = scopedPlacements();
  const creatives = list('creatives').filter(c => !state.sponsorId || String(c.sponsorId) === state.sponsorId);
  return pageHeading('Your partner workspace', brand ? `${brand.name}, in the community.` : 'Your hometown publishing workspace.', 'Manage the messages that connect local businesses with alumni, families and fans.', `${button('Preview an edition', 'preview-edition')}${isPublisher() ? button('Publisher’s Desk', 'go-publisher', '', true) : button('Open ad studio', 'go-ads', '', true)}`) +
    (!brand && !isPublisher() ? empty('Your account is ready for a sponsor connection.', 'A publisher needs to assign your account to a sponsor brand before you can edit its advertisements.') : '') +
    `<div class="stats-grid"><div class="stat-card"><span>School placements</span><strong>${placements.length}</strong><small>${placements.filter(p => p.status === 'active').length} marked active</small></div><div class="stat-card"><span>Published ad versions</span><strong>${creatives.filter(c => c.status === 'published').length}</strong><small>Kept with their dates and school audience</small></div><div class="stat-card"><span>Drafts & review</span><strong>${creatives.filter(c => ['draft', 'pending'].includes(c.status)).length}</strong><small>Continue editing or review the next message</small></div></div>
    <div class="two-columns"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">Your school connections</p><h2>Where your support shows up</h2><p>Placements and dates are assigned by your publisher.</p></div></div>${placementTable(placements, false)}</section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">A little hometown love</p><h2>Keep your message current.</h2><p>A new version preserves the advertisement that fans received before it.</p></div></div><div class="link-row"><div><strong>Create your next advertisement</strong><p>Update an offer, image or call to action.</p></div>${button('Open', 'go-ads', '', false)}</div><div class="link-row"><div><strong>Check your brand details</strong><p>Name, logo and destination website.</p></div>${button('Edit', 'go-brand')}</div><div class="section-note">Stories and stats bring fans back. Your support helps keep their hometown connection alive.</div></section></div>`;
}
function placementTable(items, editable) {
  if (!items.length) return empty('No placements to show yet.', 'Your publisher can connect a sponsor to the appropriate school editions.');
  return `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">School</th><th scope="col">Status</th><th scope="col">Dates</th>${editable ? '<th scope="col">Manage</th>' : ''}</tr></thead><tbody>${items.map(item => `<tr><td><strong>${esc(item.schoolName || schoolName(item.hsid))}</strong>${editable ? `<small>${esc(list('sponsors').find(s => String(s.id) === String(item.sponsorId))?.name || 'Sponsor')}</small>` : ''}<small>${item.requiresApproval ? 'Advertisement review required' : 'Sponsor may submit updates directly'}</small></td><td>${statusBadge(item.status)}</td><td>${esc(periodLabel(item))}</td>${editable ? `<td><button type="button" class="button button-small" data-edit-placement="${esc(item.id)}">Edit</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function renderAds() {
  const brand = sponsor();
  const heading = pageHeading('Sponsor dashboard / Ad studio', 'Give fans a reason to connect.', 'Build a dated version, preview it in the Tribune, then submit it for your assigned placements.', button('New ad version', 'new-creative', '', true));
  if (!brand) return heading + empty('Choose a sponsor brand first.', isPublisher() ? 'Create a brand in Brand Profile, then add its placements.' : 'Ask your publisher to assign a sponsor brand to your account.');
  const item = activeCreative() || {};
  const versions = list('creatives').filter(c => String(c.sponsorId) === state.sponsorId).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const review = scopedPlacements().some(p => p.requiresApproval);
  return heading + `<div class="editor-columns"><section class="panel"><div class="panel-heading"><div><h2>Your versions</h2><p>${esc(brand.name)}</p></div></div><div class="version-list">${versions.length ? versions.map(v => `<button type="button" class="version-item${String(v.id) === state.creativeId ? ' is-selected' : ''}" data-edit-creative="${esc(v.id)}"><span class="version-status">${statusBadge(v.status)}<span>Rev. ${esc(v.revision)}</span></span><strong>${esc(v.headline || 'Untitled advertisement')}</strong><small>${esc(periodLabel(v))}</small><small>${v.cadence === 'daily' ? 'Daily editions' : v.cadence === 'weekly' ? 'Weekly editions' : 'Daily & weekly editions'}</small></button>`).join('') : empty('Your first message starts here.', 'Save a draft to begin its version history.')}</div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">${item.id ? `Advertisement · Revision ${esc(item.revision)}` : 'New advertisement'}</p><h2>${item.id ? 'Edit your message' : 'The next hometown connection'}</h2></div>${statusBadge(item.status || 'draft')}</div>${item.status === 'published' ? '<p class="notice">Editing this published advertisement creates a new draft. The published version stays intact until its replacement is made available.</p>' : ''}<form id="creative-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><input type="hidden" name="revision" value="${esc(item.revision ?? '')}"><p class="form-error" role="alert" hidden></p>
    ${field('creative', 'headline', 'Headline', item.headline, { required: true, max: 120 })}${field('creative', 'body', 'Advertisement message', item.body, { textarea: true, rows: 4, required: true, max: 1200 })}${assetPicker('creative', 'ad', item.imageUrl, { help: 'Keep small text out of the image so the offer stays readable on phones.' })}${field('creative', 'imageAlt', 'Describe the image', item.imageAlt, { max: 240, help: 'Required when you upload an image. A brief description helps readers using a screen reader or viewing with images turned off.' })}
    <div class="form-grid">${field('creative', 'url', 'Destination website', item.url || brand.websiteUrl, { type: 'url', required: true, placeholder: 'https://', help: 'Where the advertisement’s button takes the fan.' })}${field('creative', 'cta', 'Button text', item.cta, { required: true, max: 50, placeholder: 'Explore our offer' })}</div>
    ${field('creative', 'acknowledgment', 'Sponsor acknowledgment in the recap', item.acknowledgment, { textarea: true, rows: 2, max: 500, optional: true, help: 'A short, approved acknowledgment of the support your business provides.' })}
    <fieldset><legend>When this version is available</legend>${dates('creative', item, { scheduled: true })}<label class="check-line"><input type="checkbox" name="evergreen"${item.evergreen ? ' checked' : ''}>Evergreen: keep this version available without an end date.</label><div style="margin-top:17px">${cadenceField('creative', item.cadence)}</div></fieldset>${creativeAudience(item)}
    <div class="form-actions"><button class="button" type="submit" data-save-action="save">Save draft</button><button class="button" type="submit" data-save-action="preview">Save & preview</button><button class="button button-primary" type="submit" data-save-action="submit">${review ? 'Submit for review' : 'Submit to placements'}</button>${isPublisher() ? '<button class="button button-dark" type="submit" data-save-action="publish">Publish version</button>' : ''}${item.id && item.status !== 'archived' ? '<button class="button button-danger" type="submit" data-save-action="archive" formnovalidate>Archive</button>' : ''}</div><p class="help">Saving or previewing does not send an email. Availability follows the dates, placement scope and approval status.</p></form></section></div>`;
}
function renderBrand() {
  const item = state.newBrand ? {} : sponsor() || {};
  const heading = pageHeading('Sponsor dashboard / Brand profile', state.newBrand ? 'Welcome another hometown partner.' : 'The name behind the support.', 'Keep your brand identity consistent across the placements assigned to you.', isPublisher() ? button('Add a sponsor brand', 'new-brand', '', true) : '');
  if (!item.id && !isPublisher()) return heading + empty('No sponsor brand is assigned.', 'Your publisher can connect your account to the correct business.');
  const logo = safeUrl(item.logoUrl);
  return heading + `<div class="two-columns"><section class="panel"><div class="brand-preview">${logo ? `<img src="${esc(logo)}" alt="${esc(item.name || 'Sponsor')} logo">` : `<div class="brand-initials" aria-hidden="true">${esc((item.name || 'Y').slice(0, 1).toUpperCase())}</div>`}<div><p class="eyebrow">${item.id ? 'Sponsor profile' : 'New sponsor'}</p><h2 style="margin:0;font:700 23px Georgia,serif">${esc(item.name || 'Your brand')}</h2></div></div><form id="brand-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><p class="form-error" role="alert" hidden></p>${field('brand', 'name', 'Business / sponsor name', item.name, { required: true, max: 160 })}${field('brand', 'websiteUrl', 'Business website', item.websiteUrl, { type: 'url', optional: true, placeholder: 'https://' })}${assetPicker('brand', 'logo', item.logoUrl, { name: 'logoUrl', label: 'Brand logo', help: item.id ? 'Use a clean, easy-to-read logo.' : 'Save the brand first, then upload its logo.' })}<label class="check-line"><input type="checkbox" name="isActive"${item.isActive !== false ? ' checked' : ''}>Brand is active</label><div class="form-actions"><button class="button button-primary" type="submit">${item.id ? 'Save brand profile' : 'Create sponsor brand'}</button></div></form></section><aside class="panel"><div class="panel-heading"><div><p class="eyebrow">One consistent identity</p><h2>Recognizable at every school.</h2><p>Your brand profile is shared across its authorized placements. School assignments and advertisement versions stay separate.</p></div></div><p class="help">Use Ad Studio to change the offer or message. A publisher manages the school placements and account access.</p>${item.id ? `<p class="code-note">Brand ID: ${esc(item.id)}</p>` : ''}</aside></div>`;
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
function renderPlacements() {
  if (!isPublisher()) return empty('Publisher access is required.', 'School placements are managed by your publisher.');
  const item = activePlacement() || {};
  const brands = [['', 'Choose a sponsor'], ...list('sponsors').map(b => [b.id, b.name])];
  const orders = [['', 'No linked order'], ...list('orders').map(o => [o.id, `${schoolName(o.hsid)} · ${o.sponsorshipType || 'Sponsorship'} · ${o.status}`])];
  return pageHeading('Publisher’s Desk / Placements', 'Put the right partner in the right edition.', 'School assignments control where sponsor advertisements are eligible to appear.', button('New placement', 'new-placement', '', true)) + `<section class="panel"><div class="panel-heading"><div><h2>${item.id ? 'Edit school placement' : 'Add a school placement'}</h2><p>New placements begin paused. Activate when the sponsor, dates and approval requirements are ready.</p></div></div><form id="placement-form"><input type="hidden" name="id" value="${esc(item.id || '')}"><p class="form-error" role="alert" hidden></p><div class="form-grid">${selectField('placement', 'sponsorId', 'Sponsor brand', item.sponsorId || state.sponsorId, brands, { required: true })}<div class="field">${schoolPicker('placement', 'schoolIds', item.hsid ? [String(item.hsid)] : [], true)}</div>${selectField('placement', 'status', 'Placement status', item.status || 'paused', [['paused', 'Paused'], ['active', 'Active'], ['cancelled', 'Cancelled']])}${field('placement', 'priority', 'Placement priority', item.priority ?? 0, { type: 'number', step: '1', help: 'Used when more than one eligible placement is available.' })}</div><fieldset><legend>Placement dates</legend>${dates('placement', item, { startRequired: true })}</fieldset><div style="margin-top:18px">${selectField('placement', 'sponsorOrderId', 'Linked sponsorship order', item.sponsorOrderId || '', orders)}</div><label class="check-line"><input type="checkbox" name="requiresApproval"${item.requiresApproval !== false ? ' checked' : ''}>Require publisher approval for sponsor advertisement updates.</label><div class="form-actions"><button class="button button-primary" type="submit">Save placement</button></div></form></section><section class="panel"><div class="panel-heading"><div><h2>School assignments</h2><p>Placements for the selected sponsor. Use the sponsor selector or search to open another brand.</p></div></div>${placementTable(list('placements'), true)}</section>`;
}
function renderAccess() {
  if (!isPublisher()) return empty('Publisher access is required.', 'Your account’s sponsor access is managed by your publisher.');
  const item = list('memberships').find(m => String(m.id) === state.membershipId) || {};
  return pageHeading('Publisher’s Desk / Account access', 'The right access for the right account.', 'Connect an existing account to its sponsor brand, or grant publisher access.', button('New access assignment', 'new-membership', '', true)) + `<section class="panel"><div class="panel-heading"><div><h2>${item.id ? 'Update account access' : 'Assign account access'}</h2><p>Use the account’s verified Firebase UID. This form does not send an invitation.</p></div></div><form id="membership-form"><p class="form-error" role="alert" hidden></p><div class="form-grid">${field('membership', 'uid', 'Account UID', item.uid, { required: true, max: 128, help: 'Use the exact account identifier. Email addresses are not account identifiers here.' })}${selectField('membership', 'role', 'Access role', item.role || 'sponsor', [['sponsor', 'Sponsor'], ['publisher', 'Publisher']])}<div class="field" data-membership-sponsor${item.role === 'publisher' ? ' hidden' : ''}>${selectField('membership', 'sponsorId', 'Sponsor brand', item.sponsorId || state.sponsorId, [['', 'Choose a sponsor'], ...list('sponsors').map(s => [s.id, s.name])])}</div></div><label class="check-line"><input type="checkbox" name="isActive"${item.isActive !== false ? ' checked' : ''}>Access is active</label><div class="form-actions"><button class="button button-primary" type="submit">Save account access</button></div><p class="help">Your current account UID: <code>${esc(state.data.user?.uid || '')}</code></p></form></section><section class="panel"><div class="panel-heading"><div><h2>Current account assignments</h2></div></div>${list('memberships').length ? `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">Account UID</th><th scope="col">Role / brand</th><th scope="col">Status</th><th scope="col">Manage</th></tr></thead><tbody>${list('memberships').map(m => `<tr><td><code>${esc(m.uid)}</code></td><td>${esc(m.role)}<small>${esc(list('sponsors').find(s => String(s.id) === String(m.sponsorId))?.name || (m.role === 'publisher' ? 'Publication-wide access' : ''))}</small></td><td>${statusBadge(m.isActive ? 'active' : 'paused')}</td><td><button class="button button-small" type="button" data-edit-membership="${esc(m.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>` : empty('No account assignments returned.', 'Assignments appear here after they are saved.')}</section>`;
}
function renderOrders() {
  const billing = safeUrl(state.data.billingUrl);
  return pageHeading('Sponsor dashboard / Orders & billing', 'Your sponsorship, on record.', 'Review the sponsorship orders connected to your account.', billing ? `<a class="button button-primary" href="${esc(billing)}" target="_blank" rel="noopener noreferrer">Open billing <span aria-hidden="true">↗</span></a>` : '') + `<section class="panel"><div class="panel-heading"><div><h2>Sponsorship orders</h2><p>Order details are read-only in this workspace.</p></div></div>${list('orders').length ? `<div class="data-scroll"><table class="data-table"><thead><tr><th scope="col">School / order</th><th scope="col">Sponsorship</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead><tbody>${list('orders').map(o => `<tr><td><strong>${esc(schoolName(o.hsid))}</strong><small>${esc(o.id)}</small></td><td>${esc(o.sponsorshipType || 'Sponsorship')}</td><td>${statusBadge(o.status)}</td><td>${esc(dateLabel(o.createdAt))}</td></tr>`).join('')}</tbody></table></div>` : empty('No sponsorship orders are listed.', 'Your publisher can help connect an existing order or answer questions about a school sponsorship.')}</section>${!billing ? '<section class="panel"><div class="panel-heading"><div><h2>Need help with billing?</h2><p>Your publisher can help with payments or changes to a booked sponsorship. A billing link will appear here when one is available for your account.</p></div></div></section>' : ''}`;
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
async function savePlacement(form) {
  const ids = selectedSchools(form);
  if (ids.length !== 1) throw new Error('Choose one school for this placement.');
  const id = formValue(form, 'id');
  const result = await post('/placements', { ...(id ? { id } : {}), sponsorId: formValue(form, 'sponsorId'), hsid: ids[0], status: formValue(form, 'status'), priority: Number(formValue(form, 'priority') || 0), ...timing(form), requiresApproval: checked(form, 'requiresApproval'), sponsorOrderId: formValue(form, 'sponsorOrderId') || null });
  state.placementId = String(result.placement?.id || result.id || id || ''); state.dirty = false;
  await loadDashboard({ loading: false }); notify('School placement saved.');
}
async function saveMembership(form) {
  const role = formValue(form, 'role'), sponsorId = formValue(form, 'sponsorId');
  if (role === 'sponsor' && !sponsorId) throw new Error('Choose a sponsor brand for this account.');
  const result = await post('/memberships', { uid: formValue(form, 'uid'), role, ...(role === 'sponsor' ? { sponsorId } : {}), isActive: checked(form, 'isActive') });
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
  if (['logo', 'ad'].includes(kind) && !brandId) { status.textContent = 'Save or choose the sponsor brand before uploading its image.'; input.value = ''; return; }
  input.disabled = true; form.dataset.uploading = 'true'; status.textContent = 'Uploading and checking the image…';
  const buttons = $$('button[type=submit],button[data-action=remove-asset]', form);
  const disabledBefore = buttons.map(button => button.disabled); buttons.forEach(button => { button.disabled = true; });
  try {
    const body = new FormData(); body.set('file', file); body.set('kind', kind); if (['logo', 'ad'].includes(kind)) body.set('sponsorId', brandId);
    const result = await request('/upload', { method: 'POST', body });
    if (!result.asset?.url || !safeUrl(result.asset.url)) throw new Error('The image was not returned with a usable address.');
    form.elements.namedItem(input.dataset.urlField).value = result.asset.url;
    form.elements.namedItem(input.dataset.assetField).value = result.asset.id || '';
    syncCreativeImage(form);
    $('.asset-preview', holder).innerHTML = `<img src="${esc(result.asset.url)}" alt="Uploaded artwork preview"><button type="button" class="button button-small" data-action="remove-asset">Remove image</button>`;
    status.textContent = `Image uploaded${result.asset.width && result.asset.height ? ` · ${result.asset.width} × ${result.asset.height} px` : ''}. Save the form to use it.`;
    state.dirty = true;
  } catch (error) { status.textContent = error.message || 'The image could not be uploaded.'; }
  finally { input.disabled = false; input.value = ''; delete form.dataset.uploading; buttons.forEach((button, index) => { button.disabled = disabledBefore[index]; }); }
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
  state.sponsorId = String(id); state.creativeId = ''; state.placementId = ''; state.membershipId = ''; state.newBrand = false; state.dirty = false;
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
function previewSchoolOptions() {
  return [...new Map(scopedPlacements().filter(p => p.status !== 'cancelled').map(p => [String(p.hsid), p])).values()];
}
function openPreview(context = {}) {
  state.preview.requestId++; state.preview.context = context; state.preview.html = ''; state.preview.text = ''; state.preview.format = 'html';
  const item = context.creativeId ? list('creatives').find(c => String(c.id) === String(context.creativeId)) : context.noteId ? list('notes').find(n => String(n.id) === String(context.noteId)) : null;
  const options = previewSchoolOptions();
  const seed = String(item?.schoolIds?.[0] || options[0]?.hsid || state.preview.schoolId || '');
  if (['daily', 'weekly'].includes(item?.cadence)) state.preview.cadence = item.cadence;
  const allowedSeed = isPublisher() || options.some(o => String(o.hsid) === seed) ? seed : String(options[0]?.hsid || '');
  state.preview.schoolId = allowedSeed;
  const schoolControl = isPublisher() ? schoolPicker('preview', 'schoolIds', allowedSeed ? [allowedSeed] : [], true) : `<div class="field"><label for="preview-school">School placement</label><select name="hsid" id="preview-school" required>${options.length ? options.map(p => `<option value="${esc(p.hsid)}"${String(p.hsid) === allowedSeed ? ' selected' : ''}>${esc(p.schoolName || schoolName(p.hsid))}</option>`).join('') : '<option value="">No school placement available</option>'}</select></div>`;
  $('#preview-controls').innerHTML = `<form id="preview-form" class="preview-form">${schoolControl}<div class="field cadence-field"><label for="preview-cadence">Edition</label><select name="cadence" id="preview-cadence"><option value="weekly"${state.preview.cadence === 'weekly' ? ' selected' : ''}>Weekly</option><option value="daily"${state.preview.cadence === 'daily' ? ' selected' : ''}>Daily</option></select></div><button type="submit" class="button button-primary">Open preview</button><p class="help" style="flex-basis:100%">This preview uses a saved ad or notice version${context.publication ? ' and the publication settings currently in your form' : ''}. Previewing does not send an email.</p></form>`;
  $('#preview-error').hidden = true; $('#preview-warnings').hidden = true; $('#preview-subject').textContent = '';
  $('#preview-empty').hidden = false; $('#preview-frame').hidden = true; $('#preview-frame').srcdoc = ''; $('#preview-text').hidden = true;
  updatePreviewDisplay();
  const dialog = $('#preview-dialog'); if (!dialog.open) dialog.showModal();
  if (allowedSeed) generatePreview($('#preview-form'));
}
async function generatePreview(form) {
  const hsid = isPublisher() ? selectedSchools(form)[0] : formValue(form, 'hsid');
  const error = $('#preview-error'); error.hidden = true;
  if (!hsid) { error.hidden = false; error.textContent = 'Choose an eligible school to preview.'; return; }
  const requestId = ++state.preview.requestId, epoch = state.authEpoch;
  const submit = $('button[type=submit]', form); submit.disabled = true; submit.textContent = 'Building preview…';
  try {
    state.preview.schoolId = hsid; state.preview.cadence = formValue(form, 'cadence') || 'weekly';
    const result = await post('/preview', { hsid, cadence: state.preview.cadence, ...state.preview.context });
    if (requestId !== state.preview.requestId || epoch !== state.authEpoch || !$('#preview-dialog').open) return;
    if (typeof result.html !== 'string' || typeof result.text !== 'string') throw new Error('The preview did not contain both HTML and plain text. Please try again.');
    state.preview.html = result.html; state.preview.text = result.text;
    $('#preview-frame').srcdoc = result.html; $('#preview-text').textContent = result.text;
    $('#preview-subject').textContent = result.subject ? `Subject: ${result.subject}` : '';
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    $('#preview-warnings').hidden = !warnings.length;
    $('#preview-warnings').innerHTML = warnings.length ? `<ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
    $('#preview-empty').hidden = true; updatePreviewDisplay();
  } catch (reason) { if (requestId === state.preview.requestId && epoch === state.authEpoch && $('#preview-dialog').open) { error.hidden = false; error.textContent = reason.message || 'The preview could not be created.'; } }
  finally { submit.disabled = false; submit.textContent = 'Open preview'; }
}
function updatePreviewDisplay() {
  const html = state.preview.format === 'html', ready = Boolean(state.preview.html);
  $$('[data-preview-format]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.previewFormat === state.preview.format)));
  $$('[data-preview-device]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.previewDevice === state.preview.device)));
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
  else if (form.getAttribute('id') === 'note-form') withForm(form, () => saveNote(form, action));
  else if (form.getAttribute('id') === 'brand-form') withForm(form, () => saveBrand(form));
  else if (form.getAttribute('id') === 'placement-form') withForm(form, () => savePlacement(form));
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
  for (const [key, stateKey] of [['editCreative', 'creativeId'], ['editNote', 'noteId'], ['editPlacement', 'placementId'], ['editMembership', 'membershipId']]) {
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
  if (action === 'close-preview') $('#preview-dialog').close();
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
  else if (action === 'new-note') { if (!leaveEdits()) return; state.noteId = ''; renderPage(); }
  else if (action === 'new-placement') { if (!leaveEdits()) return; state.placementId = ''; renderPage(); }
  else if (action === 'new-membership') { if (!leaveEdits()) return; state.membershipId = ''; renderPage(); }
  else if (action === 'new-brand') { if (!leaveEdits()) return; state.newBrand = true; renderPage(); }
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
$('#preview-dialog').addEventListener('click', event => { if (event.target === $('#preview-dialog')) $('#preview-dialog').close(); });
$('#sign-out').addEventListener('click', async () => { if (!leaveEdits()) return; try { await state.authTools.signOut(state.auth); } catch (error) { notify(loginError(error), true); } });
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

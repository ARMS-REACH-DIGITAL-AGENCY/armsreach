// api/pcmp-lead.js - lead capture for the PCMP landing page (/pcmp).
//
// The page posts the visitor's qualifying answers here; this creates (or
// updates) the contact in the AW Sales HighLevel sub-account with every
// answer saved in its own custom field, tags it, and adds a note. The
// HighLevel key never reaches the browser.
//
// Vercel environment variables (armsreach project):
//   AW_SALES_HL_TOKEN        AW Sales sub-account Private Integration token
//                            (AW_SALES_ARMS_TOKEN is accepted too; value starts pit-)
//                            (scopes: contacts.write, contacts.readonly,
//                            locations/customFields.write, locations/customFields.readonly)
//   AW_SALES_LOCATION_ID     optional, defaults to AW Sales' id below
//
// The SMS to Michael is a HighLevel workflow in AW Sales:
//   trigger "Contact Tag Added: pcmp-lead" -> internal SMS notification.

const API = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';
const DEFAULT_LOCATION = 'DrDp9hSlw7o5O2KANkh2'; // AW Sales

// One custom field per qualifying answer (created on first use).
const FIELDS = {
  employees: 'PCMP W-2 Employees',
  healthPlan: 'PCMP Has Healthcare Plan',
  role: 'PCMP Role',
  roster: 'PCMP Scoreboard Roster',
  estimate: 'PCMP Estimated Annual Savings',
  monthly: 'PCMP Estimated Monthly Savings',
  perPay: 'PCMP Estimated Savings Per Pay Period',
  share: 'PCMP Home Team Share',
  teamAmount: 'PCMP Home Team Amount',
  keeps: 'PCMP Business Keeps',
  school: 'PCMP High School Team',
};

// The How You Score Game Plan math: PCMP's figure of about $600 per
// participating W-2 employee per year (26 bi-weekly pay periods).
const PER_EMPLOYEE_YEAR = 600;
const PAY_PERIODS = 26;

const HEALTH = ['yes', 'no', 'not-sure'];
const ROLES = ['owner', 'cfo-finance', 'hr-benefits', 'other'];

const clean = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
const digits = (v) => String(v || '').replace(/\D/g, '');

let fieldCache = null; // { name -> id } for this server instance

async function hl(path, token, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) {
    const err = new Error(`HighLevel ${init.method || 'GET'} ${path} -> ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function fieldIds(token, locationId) {
  if (fieldCache) return fieldCache;
  const list = await hl(`/locations/${locationId}/customFields?model=contact`, token);
  const byName = new Map((list?.customFields || []).map((f) => [String(f.name).trim().toLowerCase(), f.id]));
  const ids = {};
  for (const [key, name] of Object.entries(FIELDS)) {
    let id = byName.get(name.toLowerCase());
    if (!id) {
      const made = await hl(`/locations/${locationId}/customFields`, token, {
        method: 'POST',
        body: JSON.stringify({ name, dataType: 'TEXT', model: 'contact' }),
      });
      id = made?.customField?.id || made?.id;
    }
    if (id) ids[key] = id;
  }
  fieldCache = ids;
  return ids;
}

function validate(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (clean(b.website)) return { spam: true }; // honeypot
  const lead = {
    name: clean(b.name, 120),
    company: clean(b.company, 160),
    phone: clean(b.phone, 40),
    email: clean(b.email, 200).toLowerCase(),
    employees: Math.max(0, Math.min(100000, Math.round(Number(b.employees) || 0))),
    healthPlan: clean(b.healthPlan, 10),
    role: clean(b.role, 20),
    roster: Math.max(0, Math.min(100000, Number(b.roster) || 0)),
    share: Math.max(0, Math.min(100, Number(b.share) || 0)),
    school: clean(b.school, 160),
    page: clean(b.page, 300),
  };
  if (!lead.name) return { error: 'Please add your name.' };
  if (!lead.company) return { error: 'Please add your business name.' };
  if (digits(lead.phone).length < 10) return { error: 'Please add a mobile number.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: 'Please add a valid email.' };
  // Qualifying answers come in a second request (after the contact is
  // saved); each is optional but must be a known value when present.
  if (lead.healthPlan && !HEALTH.includes(lead.healthPlan)) lead.healthPlan = '';
  if (lead.role && !ROLES.includes(lead.role)) lead.role = '';
  return { lead };
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

function buildContact(lead, ids, locationId) {
  const [firstName, ...rest] = lead.name.split(/\s+/);
  const answered = Boolean(lead.employees || lead.healthPlan || lead.role);
  // Their own employee count when they gave it, else the scoreboard roster.
  const count = lead.employees || lead.roster;
  const estimate = count * PER_EMPLOYEE_YEAR;
  const team = (estimate * lead.share) / 100;
  const values = {
    employees: lead.employees ? String(lead.employees) : '',
    healthPlan: lead.healthPlan,
    role: lead.role,
    roster: lead.roster ? String(lead.roster) : '',
    estimate: count ? money(estimate) : '',
    monthly: count ? money(estimate / 12) : '',
    perPay: count ? money(estimate / PAY_PERIODS) : '',
    share: answered ? `${lead.share}%` : '',
    teamAmount: answered && count ? money(team) : '',
    keeps: answered && count ? money(estimate - team) : '',
    school: lead.school,
  };
  const band = (n) => (n < 25 ? '1-24' : n < 100 ? '25-99' : n < 500 ? '100-499' : '500plus');
  // The game plan email goes out once we have their real employee count.
  const planReady = Boolean(lead.employees);
  const customFields = Object.entries(values)
    .filter(([k, v]) => ids[k] && v !== '')
    .map(([k, v]) => ({ id: ids[k], field_value: v }));
  const tags = [
    'pcmp-lead',
    'source-yatstats-founding-partner',
    ...(lead.employees ? [`pcmp-employees-${band(lead.employees)}`] : []),
    ...(lead.role ? [`pcmp-role-${lead.role}`] : []),
    ...(lead.healthPlan ? [lead.healthPlan === 'no' ? 'pcmp-needs-review' : 'pcmp-qualified'] : []),
    ...(lead.school ? ['pcmp-home-team-interest'] : []),
    ...(planReady ? ['pcmp-game-plan-ready'] : []),
  ];
  return {
    contact: {
      locationId,
      firstName,
      lastName: rest.join(' '),
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.company,
      source: 'PCMP landing page (YAT?STATS Founding Partner card)',
      tags,
      customFields,
    },
    note: [
      answered ? 'PCMP qualifying answers (How You Score Game Plan sent)' : 'PCMP free How You Score Game Plan requested',
      lead.employees ? `W-2 employees: ${lead.employees}` : '',
      lead.healthPlan ? `Healthcare plan: ${lead.healthPlan}` : '',
      lead.role ? `Role: ${lead.role}` : '',
      lead.roster ? `Scoreboard roster: ${lead.roster}` : '',
      count ? `Estimate: ${money(estimate)} / year, ${money(estimate / 12)} / month, ${money(estimate / PAY_PERIODS)} / pay period` : '',
      answered ? `Home team share: ${lead.share}% (${money(team)} to the team, ${money(estimate - team)} kept)` : '',
      lead.school ? `High school team: ${lead.school}` : '',
      lead.page ? `Page: ${lead.page}` : '',
    ].filter(Boolean).join('\n'),
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only.' });
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const checked = validate(body);
  if (checked.spam) return res.status(200).json({ ok: true });
  if (checked.error) return res.status(400).json({ error: checked.error });

  const token = process.env.AW_SALES_HL_TOKEN || process.env.AW_SALES_ARMS_TOKEN;
  const locationId = process.env.AW_SALES_LOCATION_ID || DEFAULT_LOCATION;
  if (!token) {
    console.error('[pcmp-lead] AW_SALES_HL_TOKEN / AW_SALES_ARMS_TOKEN is not set; lead not saved');
    return res.status(503).json({ error: 'not-configured' });
  }

  try {
    let ids = {};
    try { ids = await fieldIds(token, locationId); }
    catch (e) { console.error('[pcmp-lead] custom fields unavailable', e.status, JSON.stringify(e.body)); }
    const { contact, note } = buildContact(checked.lead, ids, locationId);
    const saved = await hl('/contacts/upsert', token, { method: 'POST', body: JSON.stringify(contact) });
    const contactId = saved?.contact?.id;
    if (contactId) {
      await hl(`/contacts/${contactId}/notes`, token, { method: 'POST', body: JSON.stringify({ body: note }) })
        .catch((e) => console.error('[pcmp-lead] note failed', e.status));
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[pcmp-lead] save failed', e.status, JSON.stringify(e.body));
    return res.status(502).json({ error: 'save-failed' });
  }
}

module.exports = handler;
module.exports._test = { validate, buildContact, resetCache: () => { fieldCache = null; } };

// ============================================================
// RAMON PACHECO ADVOCACIA - WhatsApp CRM v4
// MODO KANBAN HORIZONTAL - igual ao Waleads
// Transforma a tela do WhatsApp em colunas Kanban
// ============================================================

const SUPABASE_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';

const COLS = [
  { id: 'all',          label: 'Todas',     color: '#00a884', emoji: '💬' },
  { id: 'novo',         label: 'Leads',     color: '#3b82f6', emoji: '🔵' },
  { id: 'qualificando', label: 'Negociando',color: '#f59e0b', emoji: '🟡' },
  { id: 'proposta',     label: 'Proposta',  color: '#a855f7', emoji: '🟣' },
  { id: 'fechado',      label: 'Ganhou',    color: '#22c55e', emoji: '🟢' },
  { id: 'perdido',      label: 'Perdeu',    color: '#ef4444', emoji: '🔴' },
];

let crmData = {};      // id -> contact
let waContacts = [];   // [{name, time, unread, lastMsg, avatar, el}]
let activeCol = 'all'; // current tab
let kanbanMode = false; // true = kanban horizontal, false = single column
let injected = false;
let observer = null;

// ============================================================
// SUPABASE
// ============================================================
async function sbFetch(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1' + path, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(opts.method === 'POST' ? { 'Prefer': 'return=representation' } : {}),
      ...opts.headers,
    }
  });
  if (r.status === 204 || r.status === 200 && opts.method === 'DELETE') return null;
  try { return await r.json(); } catch { return null; }
}

async function loadCRM() {
  const rows = await sbFetch('/contacts?select=*&order=created_at.desc') || [];
  crmData = {};
  rows.forEach(c => { crmData[c.id] = c; });
}

async function patchContact(id, data) {
  await sbFetch('/contacts?id=eq.' + id, { method: 'PATCH', body: JSON.stringify(data) });
  if (crmData[id]) Object.assign(crmData[id], data);
}

async function createContact(data) {
  const rows = await sbFetch('/contacts', { method: 'POST', body: JSON.stringify(data) });
  if (rows?.[0]) crmData[rows[0].id] = rows[0];
  return rows?.[0];
}

async function deleteContact(id) {
  await sbFetch('/contacts?id=eq.' + id, { method: 'DELETE' });
  delete crmData[id];
}

// ============================================================
// EXTRACT WA CONTACTS FROM DOM
// ============================================================
function readWAContacts() {
  const out = [];
  document.querySelectorAll('[data-testid="cell-frame-container"]').forEach(el => {
    try {
      const nameEl = el.querySelector('span[dir="auto"]');
      const name = nameEl?.textContent?.trim() || '';
      if (!name) return;
      const timeEl = el.querySelector('[data-testid="cell-frame-meta"] span, ._3j7s9');
      const unreadEl = el.querySelector('[data-testid="icon-unread-count"] span');
      const msgEl = el.querySelectorAll('span[dir="ltr"]')[0] || el.querySelectorAll('span[dir="auto"]')[1];
      const img = el.querySelector('img[src]');
      out.push({
        name,
        time: timeEl?.textContent?.trim() || '',
        unread: parseInt(unreadEl?.textContent || 0) || 0,
        lastMsg: msgEl?.textContent?.trim() || '',
        avatar: img?.src || null,
        el,
      });
    } catch(e) {}
  });
  return out;
}

// ============================================================
// FIND CRM DATA FOR A WA CONTACT
// ============================================================
function findCRM(waName) {
  const n = (waName || '').toLowerCase().trim();
  return Object.values(crmData).find(c =>
    (c.name || '').toLowerCase().trim() === n ||
    (c.phone && waName.includes(c.phone.replace(/\D/g,'')))
  ) || null;
}

// ============================================================
// BUILD A SINGLE CONTACT CARD
// ============================================================
function makeCard(wa, crm) {
  const col = COLS.find(c => c.id === (crm?.status)) || null;
  const ini = (wa?.name || crm?.name || '?')[0].toUpperCase();
  const name = wa?.name || crm?.name || '';
  const time = wa?.time || '';
  const unread = wa?.unread || 0;
  const msg = crm?.service || wa?.lastMsg || '';
  const status = crm?.status || '';

  const div = document.createElement('div');
  div.className = 'wcrm-card';
  div.dataset.name = name;
  div.dataset.status = status;
  div.dataset.crmid = crm?.id || '';

  div.innerHTML = `
    <div class="wcrm-av" style="background:linear-gradient(135deg,${col ? col.color+'99' : '#005c4b'},${col ? col.color+'44' : '#00a884'})">
      ${ini}
      ${unread > 0 ? `<span class="wcrm-badge">${unread}</span>` : ''}
    </div>
    <div class="wcrm-body">
      <div class="wcrm-row1">
        <span class="wcrm-name">${name}</span>
        <span class="wcrm-time">${time}</span>
      </div>
      <div class="wcrm-row2">
        <span class="wcrm-msg">${msg}</span>
        ${col ? `<span class="wcrm-dot" style="background:${col.color}" title="${col.label}"></span>` : ''}
      </div>
      <div class="wcrm-row3">
        <select class="wcrm-sel" data-name="${name}" data-crmid="${crm?.id || ''}">
          <option value="">— Etapa —</option>
          ${COLS.filter(c=>c.id!=='all').map(c => `<option value="${c.id}" ${status===c.id?'selected':''}>${c.emoji} ${c.label}</option>`).join('')}
        </select>
        ${!crm ? `<button class="wcrm-add" data-name="${name}">+ Lead</button>` : ''}
        ${crm ? `<button class="wcrm-edit" data-id="${crm.id}">✏️</button>` : ''}
      </div>
    </div>
  `;

  // Click card → open WA chat
  div.addEventListener('click', e => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('select,button')) return;
    if (wa?.el) wa.el.click();
  });

  // Stage select
  div.querySelector('.wcrm-sel').addEventListener('change', async e => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (!newStatus) return;
    if (crm?.id) {
      await patchContact(crm.id, { status: newStatus });
    } else {
      const created = await createContact({ name, phone: '', status: newStatus });
      if (created) div.dataset.crmid = created.id;
    }
    refresh();
  });

  // Add as lead
  div.querySelector('.wcrm-add')?.addEventListener('click', e => {
    e.stopPropagation();
    showModal({ name: e.target.dataset.name, status: 'novo' });
  });

  // Edit
  div.querySelector('.wcrm-edit')?.addEventListener('click', e => {
    e.stopPropagation();
    showModal(crmData[e.target.dataset.id]);
  });

  return div;
}// ============================================================
// RAMON PACHECO ADVOCACIA - WhatsApp Web CRM v3
// Testado com WhatsApp Business Web
// Painel lateral flutuante - seletores confirmados
// ============================================================

const SUPABASE_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';

const COLS = [
  { id: 'novo',         label: 'Leads',      color: '#3b82f6' },
  { id: 'qualificando', label: 'Negociando', color: '#f59e0b' },
  { id: 'proposta',     label: 'Proposta',   color: '#a855f7' },
  { id: 'fechado',      label: 'Ganhou',     color: '#22c55e' },
  { id: 'perdido',      label: 'Perdeu',     color: '#ef4444' },
];

let crmData = {};
let isOpen = false;

// ============================================================
// SUPABASE
// ============================================================
async function sbGet(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  return r.ok ? r.json() : [];
}

async function sbPatch(path, body) {
  return fetch(SUPABASE_URL + '/rest/v1' + path, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function sbPost(path, body) {
  const r = await fetch(SUPABASE_URL + '/rest/v1' + path, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  return r.ok ? r.json() : null;
}

async function sbDelete(path) {
  return fetch(SUPABASE_URL + '/rest/v1' + path, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
}

async function loadCRM() {
  const rows = await sbGet('/contacts?select=*&order=created_at.desc');
  crmData = {};
  (rows || []).forEach(c => { crmData[c.id] = c; });
}

// ============================================================
// READ WA CONTACTS FROM DOM (confirmed selectors)
// ============================================================
function getWAContacts() {
  const out = [];
  document.querySelectorAll('[data-testid="cell-frame-container"]').forEach(el => {
    try {
      const spans = Array.from(el.querySelectorAll('span[dir="auto"]'));
      const name = spans[0]?.textContent?.trim() || spans[0]?.title || '';
      const timeEl = el.querySelector('[data-testid="cell-frame-meta"] span') ||
                     el.querySelector('span[class*="time"], span[class*="Time"]');
      const unreadEl = el.querySelector('[data-testid="icon-unread-count"] span');
      const msgSpans = el.querySelectorAll('span[dir="ltr"], span[dir="auto"]');
      const lastMsg = msgSpans[1]?.textContent?.trim() || msgSpans[2]?.textContent?.trim() || '';
      const img = el.querySelector('img[src]');
      const time = timeEl?.textContent?.trim() || '';
      const unread = parseInt(unreadEl?.textContent || '0') || 0;
      if (name && name.length > 0) {
        out.push({ name, time, unread, lastMsg, avatar: img?.src || null, el });
      }
    } catch(e) {}
  });
  return out;
        }// ============================================================
// RAMON PACHECO ADVOCACIA - WhatsApp Web CRM Extension v2
// Estratégia: Painel flutuante sobre o WhatsApp Web
// NÃO esconde conversas - injeta painel lateral sobre o WA
// ============================================================

const SUPABASE_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';

const COLUMNS = [
  { id: 'novo',         label: 'Leads',      color: '#3b82f6' },
  { id: 'qualificando', label: 'Negociando', color: '#f59e0b' },
  { id: 'proposta',     label: 'Proposta',   color: '#a855f7' },
  { id: 'fechado',      label: 'Ganhou',     color: '#22c55e' },
  { id: 'perdido',      label: 'Perdeu',     color: '#ef4444' },
];

let crmData = {};      // phone/name -> contact object
let isOpen = false;
let panelEl = null;

// ============================================================
// SUPABASE HELPERS
// ============================================================
async function sbFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1' + path, opts);
    if (res.status === 204) return null;
    return await res.json();
  } catch(e) {
    console.error('[CRM] Fetch error:', e);
    return null;
  }
}

async function loadCRMData() {
  const data = await sbFetch('/contacts?select=*&order=created_at.desc');
  crmData = {};
  (data || []).forEach(c => {
    const key = normalizeKey(c.phone || c.name || '');
    if (key) crmData[key] = c;
  });
  return Object.keys(crmData).length;
}

async function saveContact(name, phone, status, service, notes) {
  const key = normalizeKey(phone || name);
  const existing = crmData[key];
  if (existing?.id) {
    await sbFetch('/contacts?id=eq.' + existing.id, 'PATCH', { status, service, notes });
    crmData[key] = { ...existing, status, service, notes };
  } else {
    const created = await sbFetch('/contacts', 'POST', { name, phone: phone || '', status, service: service || '', notes: notes || '' });
    if (created?.[0]) {
      const c = created[0];
      crmData[normalizeKey(c.phone || c.name || '')] = c;
    }
  }
}

async function deleteContact(id) {
  await sbFetch('/contacts?id=eq.' + id, 'DELETE');
}

function normalizeKey(str) {
  return (str || '').replace(/\D/g, '') || (str || '').toLowerCase().trim().substring(0, 30);
}// ============================================================
// RAMON PACHECO ADVOCACIA - WhatsApp Web CRM Extension
// Transforma o WhatsApp Web em um CRM Kanban estilo Waleads
// ============================================================

const SUPABASE_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';

const COLUMNS = [
  { id: 'all',          label: 'Conversas', color: '#00a884', count: 0 },
  { id: 'novo',         label: 'Leads',     color: '#3b82f6', count: 0 },
  { id: 'qualificando', label: 'Negociando',color: '#f59e0b', count: 0 },
  { id: 'fechado',      label: 'Ganhou',    color: '#22c55e', count: 0 },
  { id: 'perdido',      label: 'Perdeu',    color: '#ef4444', count: 0 },
];

let crmData = {};          // phone -> { id, name, phone, status, service, notes }
let currentView = 'kanban'; // 'kanban' | 'chat'
let activeCol = 'all';
let waContacts = [];       // list of {name, phone, lastMsg, time, avatar, unread}
let isInjected = false;
let originalPane = null;

// ============================================================
// SUPABASE API
// ============================================================
async function sbFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + '/rest/v1' + path, opts);
  if (res.status === 204) return null;
  return res.json();
}

async function loadCRMData() {
  try {
    const data = await sbFetch('/contacts?select=*');
    crmData = {};
    (data || []).forEach(c => {
      const key = (c.phone || '').replace(/\D/g, '');
      if (key) crmData[key] = c;
    });
  } catch(e) { console.log('CRM load error', e); }
}

async function upsertContact(phone, name, status, extra = {}) {
  const cleanPhone = phone.replace(/\D/g, '');
  const existing = crmData[cleanPhone];
  try {
    if (existing?.id) {
      const updated = await sbFetch('/contacts?id=eq.' + existing.id, 'PATCH', { status, ...extra });
      crmData[cleanPhone] = { ...existing, status, ...extra };
    } else {
      const created = await sbFetch('/contacts', 'POST', { name, phone: cleanPhone, status, ...extra });
      if (created?.[0]) crmData[cleanPhone] = created[0];
    }
  } catch(e) { console.log('Upsert error', e); }
        }

// ============================================================
// EXTRACT CONTACTS FROM WHATSAPP WEB DOM
// ============================================================
function extractContacts() {
  const contacts = [];
  // WhatsApp Web conversation list items
  const items = document.querySelectorAll('[data-testid="cell-frame-container"], [data-testid="chat-list-item"]');
  
  items.forEach(item => {
    try {
      const nameEl = item.querySelector('[data-testid="cell-frame-title"] span, .zoWT4, ._21S-L span');
      const msgEl  = item.querySelector('[data-testid="last-msg-status"] ~ span, .Yt29v span, ._2Ts6i');
      const timeEl = item.querySelector('[data-testid="cell-frame-meta"] span, .Vistprakash, ._3j7s9');
      const unreadEl = item.querySelector('[data-testid="icon-unread-count"] span, .unread-count, ._3fs0K');
      const avatarEl = item.querySelector('img[src], [data-testid="default-user"]');

      const name = nameEl?.textContent?.trim() || 'Desconhecido';
      const lastMsg = msgEl?.textContent?.trim() || '';
      const time = timeEl?.textContent?.trim() || '';
      const unread = unreadEl?.textContent?.trim() || '0';
      const avatar = avatarEl?.src || null;

      // Try to get phone from various sources
      let phone = '';
      const titleAttr = item.querySelector('[title]');
      if (titleAttr) phone = titleAttr.getAttribute('title') || '';

      contacts.push({ name, phone, lastMsg, time, unread: parseInt(unread) || 0, avatar, el: item });
    } catch(e) {}
  });
  
  return contacts;
}

// ============================================================
// BUILD KANBAN UI
// ============================================================
function buildKanbanView(container) {
  container.innerHTML = '';
  
  // Update column counts
  COLUMNS.forEach(col => {
    if (col.id === 'all') {
      col.count = waContacts.length;
    } else {
      col.count = waContacts.filter(c => {
        const key = (c.phone || '').replace(/\D/g, '');
        return crmData[key]?.status === col.id;
      }).length;
    }
  });

  // Tab bar (like Waleads top bar)
  const tabBar = document.createElement('div');
  tabBar.id = 'crm-tabbar';
  tabBar.innerHTML = COLUMNS.map(col => `
    <div class="crm-tab ${activeCol === col.id ? 'active' : ''}" data-col="${col.id}" style="border-bottom: 3px solid ${activeCol === col.id ? col.color : 'transparent'}; color: ${activeCol === col.id ? col.color : '#8696a0'}">
      <span class="crm-tab-label">${col.label}</span>
      <span class="crm-tab-count" style="background:${col.color}22; color:${col.color}">${col.count}</span>
    </div>
  `).join('');
  container.appendChild(tabBar);

  // Tab click handlers
  tabBar.querySelectorAll('.crm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCol = tab.dataset.col;
      buildKanbanView(container);
    });
  });

  // Filter contacts for active column
  const filtered = activeCol === 'all'
    ? waContacts
    : waContacts.filter(c => {
        const key = (c.phone || '').replace(/\D/g, '');
        return crmData[key]?.status === activeCol;
      });

  // Contact cards grid
  const grid = document.createElement('div');
  grid.id = 'crm-grid';
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="crm-empty"><div style="font-size:32px;margin-bottom:8px">📭</div><div>Nenhum contato nesta coluna</div></div>`;
  } else {
    filtered.forEach(c => {
      const key = (c.phone || '').replace(/\D/g, '');
      const crm = crmData[key];
      const status = crm?.status || 'none';
      const col = COLUMNS.find(col => col.id === status);
      
      const card = document.createElement('div');
      card.className = 'crm-card';
      card.dataset.phone = c.phone;
      card.dataset.name = c.name;
      card.draggable = true;

      const avatarHtml = c.avatar
        ? `<img src="${c.avatar}" class="crm-avatar" />`
        : `<div class="crm-avatar-placeholder">${(c.name||'?')[0].toUpperCase()}</div>`;

      const statusDot = col ? `<span class="crm-status-dot" style="background:${col.color}"></span>` : '';
      const unreadBadge = c.unread > 0 ? `<span class="crm-unread">${c.unread}</span>` : '';

      card.innerHTML = `
        <div class="crm-card-left">
          <div class="crm-avatar-wrap">${avatarHtml}${unreadBadge}</div>
        </div>
        <div class="crm-card-body">
          <div class="crm-card-top">
            <span class="crm-card-name">${c.name}</span>
            <span class="crm-card-time">${c.time}</span>
          </div>
          <div class="crm-card-bottom">
            <span class="crm-card-msg">${c.lastMsg || ''}</span>
            ${statusDot}
          </div>
          <div class="crm-card-tags">
            <select class="crm-stage-select" data-phone="${c.phone}" data-name="${c.name}">
              <option value="">— Etapa —</option>
              ${COLUMNS.filter(cc => cc.id !== 'all').map(cc => `<option value="${cc.id}" ${status === cc.id ? 'selected' : ''}>${cc.label}</option>`).join('')}
            </select>
            ${crm?.service ? `<span class="crm-tag">${crm.service}</span>` : ''}
          </div>
        </div>
        <div class="crm-card-actions">
          <button class="crm-btn-chat" data-phone="${c.phone}" title="Abrir conversa">💬</button>
        </div>
      `;

      // Stage change
      card.querySelector('.crm-stage-select').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        if (!newStatus) return;
        await upsertContact(c.phone, c.name, newStatus);
        buildKanbanView(container);
      });

      // Open chat button
      card.querySelector('.crm-btn-chat').addEventListener('click', (e) => {
        e.stopPropagation();
        // Click the original WhatsApp conversation item
        if (c.el) c.el.click();
      });

      // Card click to open chat
      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('select') || e.target.closest('button')) return;
        if (c.el) c.el.click();
      });

      grid.appendChild(card);
    });
  }
  
  container.appendChild(grid);

  // Floating action button
  const fab = document.createElement('div');
  fab.id = 'crm-fab';
  fab.innerHTML = `
    <button id="crm-fab-refresh" title="Atualizar leads">↻</button>
    <button id="crm-fab-add" title="Novo lead">+</button>
  `;
  container.appendChild(fab);

  fab.querySelector('#crm-fab-refresh').addEventListener('click', async () => {
    await loadCRMData();
    waContacts = extractContacts();
    buildKanbanView(container);
  });

  fab.querySelector('#crm-fab-add').addEventListener('click', () => {
    showAddLeadModal(container);
  });
        }

// ============================================================
// ADD LEAD MODAL
// ============================================================
function showAddLeadModal(container) {
  const overlay = document.createElement('div');
  overlay.id = 'crm-modal-overlay';
  overlay.innerHTML = `
    <div id="crm-modal">
      <div class="crm-modal-header">
        <span>Novo Lead</span>
        <button id="crm-modal-close">✕</button>
      </div>
      <div class="crm-modal-body">
        <label>Nome *</label>
        <input id="crm-m-name" placeholder="Nome do contato" />
        <label>WhatsApp</label>
        <input id="crm-m-phone" placeholder="+55 11 99999-9999" />
        <label>Serviço / Assunto</label>
        <input id="crm-m-service" placeholder="Ex: Visto, Processo Criminal..." />
        <label>Etapa</label>
        <select id="crm-m-status">
          ${COLUMNS.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
        <label>Observações</label>
        <textarea id="crm-m-notes" placeholder="Detalhes importantes..."></textarea>
      </div>
      <div class="crm-modal-footer">
        <button id="crm-modal-cancel">Cancelar</button>
        <button id="crm-modal-save">Salvar Lead</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#crm-modal-close').onclick = () => overlay.remove();
  overlay.querySelector('#crm-modal-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#crm-modal-save').onclick = async () => {
    const name = overlay.querySelector('#crm-m-name').value.trim();
    const phone = overlay.querySelector('#crm-m-phone').value.trim();
    const service = overlay.querySelector('#crm-m-service').value.trim();
    const status = overlay.querySelector('#crm-m-status').value;
    const notes = overlay.querySelector('#crm-m-notes').value.trim();
    if (!name) { alert('Nome é obrigatório'); return; }
    await upsertContact(phone || name, name, status, { service, notes });
    overlay.remove();
    await loadCRMData();
    waContacts = extractContacts();
    buildKanbanView(document.getElementById('crm-panel'));
  };
}

// ============================================================
// INJECT KANBAN INTO WHATSAPP WEB
// ============================================================
function injectKanban() {
  if (isInjected) return;

  // Find the left pane (conversation list)
  const leftPane = document.querySelector('#pane-side') ||
                   document.querySelector('[data-testid="chat-list"]')?.parentElement?.parentElement ||
                   document.querySelector('div[style*="z-index: 100"]');
  
  if (!leftPane) return;

  isInjected = true;

  // Create our CRM panel to replace/overlay the conversation list
  const panel = document.createElement('div');
  panel.id = 'crm-panel';

  // Insert after the header area, before the conversation list
  const chatList = document.querySelector('[data-testid="chat-list"]') ||
                   document.querySelector('#pane-side [role="grid"]') ||
                   document.querySelector('[aria-label="Lista de conversas"]');

  if (chatList) {
    const parent = chatList.parentElement;
    originalPane = chatList;
    
    // Hide original list, show ours
    originalPane.style.display = 'none';
    parent.appendChild(panel);
  } else {
    // Fallback: insert at bottom of left pane
    leftPane.appendChild(panel);
  }

  // Load data and render
  loadCRMData().then(() => {
    waContacts = extractContacts();
    buildKanbanView(panel);
  });

  // Watch for WhatsApp loading more conversations
  const observer = new MutationObserver(() => {
    const newContacts = extractContacts();
    if (newContacts.length !== waContacts.length) {
      waContacts = newContacts;
      buildKanbanView(panel);
    }
  });

  if (chatList?.parentElement) {
    observer.observe(chatList.parentElement, { childList: true, subtree: true });
  }
}

// ============================================================
// TOGGLE: SHOW/HIDE KANBAN
// ============================================================
function toggleKanban() {
  const panel = document.getElementById('crm-panel');
  if (panel) {
    // Remove panel, restore original
    panel.remove();
    if (originalPane) originalPane.style.display = '';
    isInjected = false;
  } else {
    isInjected = false;
    injectKanban();
  }
}

// ============================================================
// MESSAGE LISTENER (from popup)
// ============================================================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'togglePanel') toggleKanban();
  if (msg.action === 'refreshLeads') {
    loadCRMData().then(() => {
      waContacts = extractContacts();
      const panel = document.getElementById('crm-panel');
      if (panel) buildKanbanView(panel);
    });
  }
});

// ============================================================
// WAIT FOR WHATSAPP TO LOAD, THEN AUTO-INJECT
// ============================================================
function waitAndInject() {
  const check = setInterval(() => {
    const ready = document.querySelector('[data-testid="chat-list"]') ||
                  document.querySelector('#pane-side') ||
                  document.querySelector('[aria-label="Lista de conversas"]');
    if (ready) {
      clearInterval(check);
      setTimeout(injectKanban, 1500);
    }
  }, 1000);
  setTimeout(() => clearInterval(check), 30000); // stop after 30s
}

waitAndInject();


// ============================================================
// EXTRACT WHATSAPP CONTACTS FROM DOM (multiple selector fallbacks)
// ============================================================
function extractWAContacts() {
  const contacts = [];
  
  // Try many different selectors used by WhatsApp Web & Business
  const selectors = [
    '[data-testid="cell-frame-container"]',
    '[data-testid="chat-list-item"]',
    '.zoWT4',
    'div[role="listitem"]',
    'li[data-id]',
    '._21S-L',  
  ];
  
  let items = [];
  for (const sel of selectors) {
    const found = document.querySelectorAll(sel);
    if (found.length > 0) { items = Array.from(found); break; }
  }

  items.forEach(item => {
    try {
      // Name: try multiple selectors
      const nameEl = item.querySelector(
        '[data-testid="cell-frame-title"] span[dir="auto"], ' +
        '.zoWT4 span[dir="auto"], ' +
        'span[dir="auto"][title], ' +
        '._21S-L span'
      );
      
      // Last message
      const msgEl = item.querySelector(
        '[data-testid="last-msg-status"] ~ span span, ' +
        '.Yt29v span, ._2Ts6i span, ' +
        'span[data-testid="last-msg-status"]'
      );
      
      // Time
      const timeEl = item.querySelector(
        '[data-testid="cell-frame-meta"] span, ' +
        '._3j7s9, .Vistprakash'
      );
      
      // Unread count
      const unreadEl = item.querySelector(
        '[data-testid="icon-unread-count"] span, ' +
        '.unread-count span, ._3fs0K'
      );
      
      // Avatar
      const avatarEl = item.querySelector('img[src*="blob"], img[src*="data:"]');

      const name = nameEl?.textContent?.trim() ||
                   nameEl?.getAttribute('title') ||
                   item.querySelector('span[title]')?.getAttribute('title') ||
                   '';
      
      if (!name) return; // skip empty
      
      const lastMsg = msgEl?.textContent?.trim() || '';
      const time = timeEl?.textContent?.trim() || '';
      const unread = parseInt(unreadEl?.textContent?.trim() || '0') || 0;
      const avatar = avatarEl?.src || null;
      
      // Phone: try to get from data attributes
      const phone = item.dataset?.id || item.dataset?.phone || '';

      contacts.push({ name, phone, lastMsg, time, unread, avatar, el: item });
    } catch(e) {}
  });
  
  return contacts;
}

// ============================================================
// BUILD THE KANBAN PANEL UI
// ============================================================
function buildPanel() {
  const contacts = extractWAContacts();
  
  // Count by status
  const counts = {};
  COLUMNS.forEach(col => {
    counts[col.id] = Object.values(crmData).filter(c => c.status === col.id).length;
  });
  const total = Object.values(crmData).length;

  let html = `
    <div id="crm-header">
      <div id="crm-header-left">
        <span id="crm-logo">⚖️</span>
        <div>
          <div id="crm-title">CRM Leads</div>
          <div id="crm-sub">${total} lead${total !== 1 ? 's' : ''} no sistema</div>
        </div>
      </div>
      <div id="crm-header-actions">
        <button id="crm-btn-refresh" title="Atualizar">↻</button>
        <button id="crm-btn-close" title="Fechar painel">✕</button>
      </div>
    </div>
    <div id="crm-tabs">
      <div class="crm-tab active" data-col="all" style="border-bottom-color:#00a884; color:#00a884">
        Todos <span class="crm-badge" style="background:#00a88422; color:#00a884">${total}</span>
      </div>
      ${COLUMNS.map(col => `
        <div class="crm-tab" data-col="${col.id}" style="">
          ${col.label} <span class="crm-badge" style="background:${col.color}22; color:${col.color}">${counts[col.id] || 0}</span>
        </div>
      `).join('')}
    </div>
    <div id="crm-search-bar">
      <input id="crm-search" placeholder="🔍 Buscar lead..." />
    </div>
    <div id="crm-cards">
  `;

  // Merge WA contacts with CRM data
  const allLeads = Object.values(crmData);
  
  // Also add WA contacts not yet in CRM (show as potential leads)
  const waOnlyContacts = contacts.filter(c => {
    if (!c.name) return false;
    const key = normalizeKey(c.phone || c.name);
    return !crmData[key];
  }).slice(0, 20); // limit to 20

  html += `<div id="crm-section-label" style="padding:8px 12px; font-size:10px; color:#8696a0; text-transform:uppercase; font-weight:700; letter-spacing:0.5px">
    Leads cadastrados (${allLeads.length})
  </div>`;
  
  if (allLeads.length === 0) {
    html += `<div class="crm-empty">
      <div style="font-size:28px;margin-bottom:8px">📋</div>
      <div>Nenhum lead ainda</div>
      <div style="font-size:11px;margin-top:4px">Clique em + para adicionar</div>
    </div>`;
  } else {
    allLeads.forEach(lead => {
      const col = COLUMNS.find(c => c.id === lead.status) || { color: '#8696a0', label: '' };
      const initials = (lead.name || '?')[0].toUpperCase();
      const waContact = contacts.find(c => {
        const k = normalizeKey(c.phone || c.name);
        const lk = normalizeKey(lead.phone || lead.name);
        return k === lk;
      });
      
      html += `<div class="crm-card" data-id="${lead.id}" data-status="${lead.status}">
        <div class="crm-card-avatar" style="background:linear-gradient(135deg, ${col.color}88, ${col.color}44)">
          ${initials}
          ${waContact?.unread > 0 ? `<span class="crm-unread">${waContact.unread}</span>` : ''}
        </div>
        <div class="crm-card-body">
          <div class="crm-card-row">
            <span class="crm-card-name">${lead.name}</span>
            <span class="crm-card-time">${waContact?.time || ''}</span>
          </div>
          <div class="crm-card-row">
            <span class="crm-card-msg">${lead.service || waContact?.lastMsg || ''}</span>
            <span class="crm-stage-dot" style="background:${col.color}" title="${col.label}"></span>
          </div>
          <div class="crm-card-actions-row">
            <select class="crm-select" data-id="${lead.id}" data-key="${normalizeKey(lead.phone || lead.name)}">
              ${COLUMNS.map(c => `<option value="${c.id}" ${lead.status === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
            ${lead.phone ? `<button class="crm-wa-btn" data-phone="${lead.phone}" title="WhatsApp">💬</button>` : ''}
            <button class="crm-edit-btn" data-id="${lead.id}" title="Editar">✏️</button>
          </div>
        </div>
      </div>`;
    });
  }

  // Show WA contacts not in CRM
  if (waOnlyContacts.length > 0) {
    html += `<div id="crm-section-label" style="padding:8px 12px; font-size:10px; color:#8696a0; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; border-top:1px solid #1e2d35; margin-top:8px">
      Conversas no WhatsApp (${waOnlyContacts.length})
    </div>`;
    
    waOnlyContacts.forEach(c => {
      const initials = (c.name || '?')[0].toUpperCase();
      html += `<div class="crm-card crm-wa-contact" data-name="${c.name}" data-phone="${c.phone || ''}">
        <div class="crm-card-avatar" style="background:linear-gradient(135deg,#005c4b,#00a884)">
          ${initials}
          ${c.unread > 0 ? `<span class="crm-unread">${c.unread}</span>` : ''}
        </div>
        <div class="crm-card-body">
          <div class="crm-card-row">
            <span class="crm-card-name">${c.name}</span>
            <span class="crm-card-time">${c.time}</span>
          </div>
          <div class="crm-card-row">
            <span class="crm-card-msg">${c.lastMsg}</span>
          </div>
          <div class="crm-card-actions-row">
            <button class="crm-add-lead-btn" data-name="${c.name}" data-phone="${c.phone || ''}">+ Adicionar como Lead</button>
          </div>
        </div>
      </div>`;
    });
  }

  html += `</div>
    <button id="crm-fab">+</button>
  `;

  return html;
        }

// ============================================================
// RENDER / ATTACH EVENT LISTENERS
// ============================================================
function attachEvents(panel) {
  // Tabs
  panel.querySelectorAll('.crm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.crm-tab').forEach(t => {
        t.classList.remove('active');
        t.style.borderBottomColor = 'transparent';
        t.style.color = '#8696a0';
      });
      const col = COLUMNS.find(c => c.id === tab.dataset.col);
      const color = col ? col.color : '#00a884';
      tab.classList.add('active');
      tab.style.borderBottomColor = color;
      tab.style.color = color;

      // Filter cards
      const colId = tab.dataset.col;
      panel.querySelectorAll('.crm-card').forEach(card => {
        if (colId === 'all') {
          card.style.display = 'flex';
        } else {
          card.style.display = card.dataset.status === colId ? 'flex' : 'none';
        }
      });
    });
  });

  // Search
  const searchInput = panel.querySelector('#crm-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      panel.querySelectorAll('.crm-card').forEach(card => {
        const name = card.querySelector('.crm-card-name')?.textContent?.toLowerCase() || '';
        card.style.display = name.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Close button
  panel.querySelector('#crm-btn-close')?.addEventListener('click', togglePanel);

  // Refresh button
  panel.querySelector('#crm-btn-refresh')?.addEventListener('click', async () => {
    const btn = panel.querySelector('#crm-btn-refresh');
    if (btn) btn.textContent = '...';
    await loadCRMData();
    refreshPanel();
    if (btn) btn.textContent = '↻';
  });

  // Status dropdowns
  panel.querySelectorAll('.crm-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = sel.dataset.id;
      const newStatus = e.target.value;
      const key = sel.dataset.key;
      if (crmData[key]) {
        await sbFetch('/contacts?id=eq.' + id, 'PATCH', { status: newStatus });
        crmData[key] = { ...crmData[key], status: newStatus };
        refreshPanel();
      }
    });
  });

  // WhatsApp buttons
  panel.querySelectorAll('.crm-wa-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const phone = btn.dataset.phone?.replace(/\D/g, '');
      if (phone) window.open('https://wa.me/' + phone, '_blank');
    });
  });

  // Edit buttons
  panel.querySelectorAll('.crm-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const lead = Object.values(crmData).find(c => c.id === id);
      if (lead) showLeadModal(lead);
    });
  });

  // "Add as Lead" buttons (for WA contacts)
  panel.querySelectorAll('.crm-add-lead-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLeadModal({ name: btn.dataset.name, phone: btn.dataset.phone, status: 'novo' });
    });
  });

  // FAB add button
  panel.querySelector('#crm-fab')?.addEventListener('click', () => {
    showLeadModal(null);
  });

  // Card click → open WA conversation
  panel.querySelectorAll('.crm-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' ||
          e.target.closest('select') || e.target.closest('button')) return;
      
      // Try to find and click the WA conversation
      const name = card.querySelector('.crm-card-name')?.textContent?.trim();
      if (name) {
        const waItems = document.querySelectorAll(
          '[data-testid="cell-frame-container"], [data-testid="chat-list-item"], div[role="listitem"]'
        );
        for (const item of waItems) {
          const itemName = item.querySelector('span[dir="auto"]')?.textContent?.trim() ||
                           item.querySelector('span[title]')?.getAttribute('title') || '';
          if (itemName.toLowerCase() === name.toLowerCase()) {
            item.click();
            return;
          }
        }
      }
    });
  });
}

// ============================================================
// MODAL PARA CRIAR/EDITAR LEAD
// ============================================================
function showLeadModal(lead) {
  const existing = document.getElementById('crm-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'crm-modal-overlay';
  overlay.innerHTML = `
    <div id="crm-modal">
      <div class="crm-modal-header">
        <span>${lead?.id ? 'Editar Lead' : 'Novo Lead'}</span>
        <button id="crm-modal-close">✕</button>
      </div>
      <div class="crm-modal-body">
        <label>Nome *</label>
        <input id="crm-m-name" value="${lead?.name || ''}" placeholder="Nome completo" />
        <label>WhatsApp</label>
        <input id="crm-m-phone" value="${lead?.phone || ''}" placeholder="+55 11 99999-9999" />
        <label>Serviço / Assunto</label>
        <input id="crm-m-service" value="${lead?.service || ''}" placeholder="Visto, Processo Criminal..." />
        <label>Etapa</label>
        <select id="crm-m-status">
          ${COLUMNS.map(c => `<option value="${c.id}" ${(lead?.status || 'novo') === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
        <label>Observações</label>
        <textarea id="crm-m-notes" placeholder="Detalhes do caso...">${lead?.notes || ''}</textarea>
      </div>
      <div class="crm-modal-footer">
        ${lead?.id ? '<button id="crm-modal-del">🗑 Excluir</button>' : ''}
        <button id="crm-modal-cancel">Cancelar</button>
        <button id="crm-modal-save">💾 Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#crm-modal-close').onclick = () => overlay.remove();
  overlay.querySelector('#crm-modal-cancel').onclick = () => overlay.remove();
  
  overlay.querySelector('#crm-modal-del')?.addEventListener('click', async () => {
    if (!confirm('Excluir este lead?')) return;
    await deleteContact(lead.id);
    await loadCRMData();
    overlay.remove();
    refreshPanel();
  });

  overlay.querySelector('#crm-modal-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#crm-m-name').value.trim();
    const phone = overlay.querySelector('#crm-m-phone').value.trim();
    const service = overlay.querySelector('#crm-m-service').value.trim();
    const status = overlay.querySelector('#crm-m-status').value;
    const notes = overlay.querySelector('#crm-m-notes').value.trim();
    if (!name) { alert('Nome é obrigatório!'); return; }
    
    const btn = overlay.querySelector('#crm-modal-save');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    
    await saveContact(name, phone, status, service, notes);
    await loadCRMData();
    overlay.remove();
    refreshPanel();
  });
}

// ============================================================
// TOGGLE & INJECT PANEL
// ============================================================
function refreshPanel() {
  if (!panelEl || !document.contains(panelEl)) return;
  panelEl.innerHTML = buildPanel();
  attachEvents(panelEl);
}

function createPanel() {
  panelEl = document.createElement('div');
  panelEl.id = 'crm-panel';
  panelEl.innerHTML = buildPanel();
  document.body.appendChild(panelEl);
  attachEvents(panelEl);
}

function togglePanel() {
  if (isOpen && panelEl && document.contains(panelEl)) {
    panelEl.remove();
    panelEl = null;
    isOpen = false;
  } else {
    loadCRMData().then(() => {
      createPanel();
      isOpen = true;
    });
  }
}

// ============================================================
// FLOATING TOGGLE BUTTON (always visible on WA Web)
// ============================================================
function injectToggleButton() {
  if (document.getElementById('crm-toggle-btn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'crm-toggle-btn';
  btn.title = 'Abrir CRM de Leads';
  btn.innerHTML = '⚖️';
  document.body.appendChild(btn);
  
  btn.addEventListener('click', togglePanel);
}

// ============================================================
// CHROME MESSAGE LISTENER
// ============================================================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'togglePanel') togglePanel();
  if (msg.action === 'refreshLeads') {
    loadCRMData().then(() => { if (isOpen) refreshPanel(); });
  }
});

// ============================================================
// INIT: Wait for WA to load, then inject toggle button
// ============================================================
function init() {
  const check = setInterval(() => {
    // WhatsApp Business Web has different indicators
    const ready = document.querySelector('[data-testid="intro-md-beta-logo-dark"]') ||
                  document.querySelector('[data-testid="default-user"]') ||
                  document.querySelector('#app .two') ||
                  document.querySelector('div[tabindex="-1"][class]') ||
                  document.body.querySelector('canvas') || // QR code page
                  (document.body.children.length > 2);
    
    if (ready) {
      clearInterval(check);
      setTimeout(() => {
        injectToggleButton();
      }, 2000);
    }
  }, 500);
  
  // Inject button regardless after 5s
  setTimeout(() => {
    clearInterval(check);
    injectToggleButton();
  }, 5000);
}

init();


// ============================================================
// BUILD PANEL HTML
// ============================================================
function buildPanel() {
  const leads = Object.values(crmData);
  const waContacts = getWAContacts();
  const counts = {};
  COLS.forEach(c => { counts[c.id] = leads.filter(l => l.status === c.id).length; });

  let html = `<div id="crm-header">
    <div id="crm-header-left">
      <span>⚖️</span>
      <div><div id="crm-title">CRM Leads</div><div id="crm-sub">${leads.length} lead${leads.length !== 1 ? 's' : ''}</div></div>
    </div>
    <div id="crm-hbtns">
      <button id="crm-refresh" title="Atualizar">↻</button>
      <button id="crm-close" title="Fechar">✕</button>
    </div>
  </div>
  <div id="crm-tabs">
    <div class="ct active" data-col="all" data-color="#00a884">Todos <span class="cb" style="background:#00a88422;color:#00a884">${leads.length}</span></div>
    ${COLS.map(c => `<div class="ct" data-col="${c.id}" data-color="${c.color}">${c.label} <span class="cb" style="background:${c.color}22;color:${c.color}">${counts[c.id]||0}</span></div>`).join('')}
  </div>
  <div id="crm-search-wrap"><input id="crm-search" placeholder="🔍 Buscar..." /></div>
  <div id="crm-list">`;

  // CRM leads
  if (leads.length === 0) {
    html += `<div class="crm-empty"><div style="font-size:28px">📋</div><div>Sem leads ainda</div><div style="font-size:11px;margin-top:4px;color:#5a6d78">Clique em + para adicionar</div></div>`;
  } else {
    leads.forEach(lead => {
      const col = COLS.find(c => c.id === lead.status) || { color: '#8696a0', label: '' };
      const ini = (lead.name || '?')[0].toUpperCase();
      const wa = waContacts.find(w => w.name.toLowerCase() === (lead.name || '').toLowerCase());
      html += `<div class="cc" data-id="${lead.id}" data-status="${lead.status}" data-name="${(lead.name||'').replace(/"/g,'')}" >
        <div class="cc-av" style="background:linear-gradient(135deg,${col.color}99,${col.color}44)">${ini}${wa&&wa.unread>0?`<span class="cc-badge">${wa.unread}</span>`:''}</div>
        <div class="cc-body">
          <div class="cc-r1"><span class="cc-name">${lead.name||''}</span><span class="cc-time">${wa?.time||''}</span></div>
          <div class="cc-r2"><span class="cc-msg">${lead.service||wa?.lastMsg||''}</span><span class="cc-dot" style="background:${col.color}"></span></div>
          <div class="cc-r3">
            <select class="cc-sel" data-id="${lead.id}">${COLS.map(c=>`<option value="${c.id}"${lead.status===c.id?' selected':''}>${c.label}</option>`).join('')}</select>
            ${lead.phone?`<button class="cc-wa" data-phone="${lead.phone}">💬</button>`:''}
            <button class="cc-edit" data-id="${lead.id}">✏️</button>
          </div>
        </div>
      </div>`;
    });
  }

  // WA-only contacts (not in CRM yet)
  const waOnly = waContacts.filter(w => !leads.some(l => l.name.toLowerCase() === w.name.toLowerCase())).slice(0,15);
  if (waOnly.length > 0) {
    html += `<div class="cs-label">WhatsApp (${waOnly.length})</div>`;
    waOnly.forEach(w => {
      const ini = (w.name||'?')[0].toUpperCase();
      html += `<div class="cc cc-wa-only" data-waname="${(w.name||'').replace(/"/g,'')}">
        <div class="cc-av" style="background:linear-gradient(135deg,#005c4b,#00a884)">${ini}${w.unread>0?`<span class="cc-badge">${w.unread}</span>`:''}</div>
        <div class="cc-body">
          <div class="cc-r1"><span class="cc-name">${w.name}</span><span class="cc-time">${w.time}</span></div>
          <div class="cc-r2"><span class="cc-msg">${w.lastMsg}</span></div>
          <div class="cc-r3"><button class="cc-addlead" data-name="${(w.name||'').replace(/"/g,'')}">+ Lead</button></div>
        </div>
      </div>`;
    });
  }

  html += `</div><button id="crm-fab">+</button>`;
  return html;
}

// ============================================================
// ATTACH EVENTS
// ============================================================
function attachEvents(panel) {
  // Tabs
  panel.querySelectorAll('.ct').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.ct').forEach(t => { t.classList.remove('active'); t.style.borderBottomColor='transparent'; t.style.color='#8696a0'; });
      tab.classList.add('active');
      tab.style.borderBottomColor = tab.dataset.color;
      tab.style.color = tab.dataset.color;
      const col = tab.dataset.col;
      panel.querySelectorAll('.cc').forEach(c => {
        c.style.display = (col === 'all' || c.dataset.status === col) ? 'flex' : 'none';
      });
    });
  });

  // Search
  panel.querySelector('#crm-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    panel.querySelectorAll('.cc').forEach(c => {
      const n = c.querySelector('.cc-name')?.textContent?.toLowerCase() || '';
      c.style.display = n.includes(q) ? 'flex' : 'none';
    });
  });

  // Close & Refresh
  panel.querySelector('#crm-close')?.addEventListener('click', togglePanel);
  panel.querySelector('#crm-refresh')?.addEventListener('click', async () => {
    const b = panel.querySelector('#crm-refresh');
    if(b) b.textContent='...';
    await loadCRM();
    rerender();
    if(b) b.textContent='↻';
  });

  // Status selects
  panel.querySelectorAll('.cc-sel').forEach(s => {
    s.addEventListener('change', async e => {
      e.stopPropagation();
      const id = s.dataset.id;
      const status = e.target.value;
      await sbPatch('/contacts?id=eq.' + id, { status });
      if (crmData[id]) crmData[id].status = status;
      rerender();
    });
  });

  // WA buttons
  panel.querySelectorAll('.cc-wa[data-phone]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      window.open('https://wa.me/' + b.dataset.phone.replace(/\D/g,''), '_blank');
    });
  });

  // Edit buttons
  panel.querySelectorAll('.cc-edit').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const id = b.dataset.id;
      showModal(crmData[id]);
    });
  });

  // Add lead from WA contact
  panel.querySelectorAll('.cc-addlead').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      showModal({ name: b.dataset.name, status: 'novo' });
    });
  });

  // FAB
  panel.querySelector('#crm-fab')?.addEventListener('click', () => showModal(null));

  // Card click → open WA chat
  panel.querySelectorAll('.cc').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('select') || e.target.closest('button')) return;
      const name = card.dataset.name || card.dataset.waname || '';
      if (!name) return;
      // Find and click WA conversation item
      document.querySelectorAll('[data-testid="cell-frame-container"]').forEach(item => {
        const itemName = item.querySelector('span[dir="auto"]')?.textContent?.trim() || '';
        if (itemName.toLowerCase() === name.toLowerCase()) item.click();
      });
    });
  });
}

// ============================================================
// MODAL
// ============================================================
function showModal(lead) {
  document.getElementById('crm-modal-overlay')?.remove();
  const ov = document.createElement('div');
  ov.id = 'crm-modal-overlay';
  ov.innerHTML = `<div id="crm-modal">
    <div class="cm-hd"><span>${lead?.id ? 'Editar Lead':'Novo Lead'}</span><button id="cm-x">✕</button></div>
    <div class="cm-bd">
      <label>Nome *</label><input id="cm-name" value="${lead?.name||''}" placeholder="Nome completo" />
      <label>WhatsApp</label><input id="cm-phone" value="${lead?.phone||''}" placeholder="+55 11 99999-9999" />
      <label>Serviço</label><input id="cm-service" value="${lead?.service||''}" placeholder="Ex: Visto, Imigração..." />
      <label>Etapa</label>
      <select id="cm-status">${COLS.map(c=>`<option value="${c.id}"${(lead?.status||'novo')===c.id?' selected':''}>${c.label}</option>`).join('')}</select>
      <label>Observações</label><textarea id="cm-notes">${lead?.notes||''}</textarea>
    </div>
    <div class="cm-ft">
      ${lead?.id?`<button id="cm-del">🗑</button>`:''}
      <button id="cm-cancel">Cancelar</button>
      <button id="cm-save">💾 Salvar</button>
    </div>
  </div>`;
  document.body.appendChild(ov);

  const get = id => ov.querySelector(id);
  get('#cm-x').onclick = get('#cm-cancel').onclick = () => ov.remove();

  get('#cm-del')?.addEventListener('click', async () => {
    if (!confirm('Excluir este lead?')) return;
    await sbDelete('/contacts?id=eq.' + lead.id);
    delete crmData[lead.id];
    ov.remove(); rerender();
  });

  get('#cm-save').addEventListener('click', async () => {
    const name = get('#cm-name').value.trim();
    if (!name) { alert('Nome obrigatório!'); return; }
    const phone = get('#cm-phone').value.trim();
    const service = get('#cm-service').value.trim();
    const status = get('#cm-status').value;
    const notes = get('#cm-notes').value.trim();
    const btn = get('#cm-save');
    btn.textContent = '...'; btn.disabled = true;
    if (lead?.id) {
      await sbPatch('/contacts?id=eq.' + lead.id, { name, phone, service, status, notes });
      crmData[lead.id] = { ...crmData[lead.id], name, phone, service, status, notes };
    } else {
      const rows = await sbPost('/contacts', { name, phone, service, status, notes });
      if (rows?.[0]) crmData[rows[0].id] = rows[0];
    }
    ov.remove(); rerender();
  });
}

// ============================================================
// RENDER / TOGGLE
// ============================================================
let panelEl = null;

function rerender() {
  if (!panelEl || !document.contains(panelEl)) return;
  panelEl.innerHTML = buildPanel();
  attachEvents(panelEl);
}

function openPanel() {
  if (panelEl && document.contains(panelEl)) return;
  panelEl = document.createElement('div');
  panelEl.id = 'crm-panel';
  panelEl.innerHTML = `<div style="padding:40px;color:#8696a0;text-align:center">Carregando...</div>`;
  document.body.appendChild(panelEl);
  loadCRM().then(() => { panelEl.innerHTML = buildPanel(); attachEvents(panelEl); });
  isOpen = true;
}

function closePanel() {
  panelEl?.remove(); panelEl = null; isOpen = false;
}

function togglePanel() {
  isOpen ? closePanel() : openPanel();
}

// ============================================================
// INJECT TOGGLE BUTTON
// ============================================================
function injectButton() {
  if (document.getElementById('crm-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'crm-toggle-btn';
  btn.title = 'Abrir CRM de Leads';
  btn.textContent = '⚖️';
  document.body.appendChild(btn);
  btn.addEventListener('click', togglePanel);
}

// ============================================================
// MESSAGE LISTENER
// ============================================================
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'togglePanel') togglePanel();
  if (msg.action === 'refreshLeads') loadCRM().then(() => { if(isOpen) rerender(); });
});

// ============================================================
// INIT: inject button as soon as possible
// ============================================================
// Try immediately
if (document.body) injectButton();

// Also try after short delays (WA loads dynamically)
setTimeout(injectButton, 1000);
setTimeout(injectButton, 3000);
setTimeout(injectButton, 6000);

// Watch for body to be ready
if (!document.body) {
  document.addEventListener('DOMContentLoaded', injectButton);
        }


// ============================================================
// BUILD KANBAN VIEW (horizontal columns)
// ============================================================
function buildKanban() {
  waContacts = readWAContacts();
  const leads = Object.values(crmData);

  // Map WA contacts to CRM
  const pairs = waContacts.map(wa => ({ wa, crm: findCRM(wa.name) }));

  // Also add CRM leads not in WA currently
  const waNames = waContacts.map(w => w.name.toLowerCase().trim());
  const crmOnly = leads.filter(c => !waNames.includes((c.name||'').toLowerCase().trim()));

  const container = document.getElementById('wcrm-kanban');
  if (!container) return;
  container.innerHTML = '';

  const cols = COLS.filter(c => c.id !== 'all');

  cols.forEach(col => {
    const colEl = document.createElement('div');
    colEl.className = 'wcrm-col';
    colEl.dataset.col = col.id;

    // Filter: WA contacts in this stage + CRM-only in this stage
    const colPairs = pairs.filter(p => (p.crm?.status || '') === col.id);
    const colCrmOnly = crmOnly.filter(c => c.status === col.id);
    const total = colPairs.length + colCrmOnly.length;

    colEl.innerHTML = `<div class="wcrm-col-hd" style="border-bottom-color:${col.color}">
      <span class="wcrm-col-dot" style="background:${col.color}"></span>
      <span class="wcrm-col-label">${col.label}</span>
      <span class="wcrm-col-count" style="background:${col.color}22;color:${col.color}">${total}</span>
    </div>
    <div class="wcrm-col-body"></div>`;

    const body = colEl.querySelector('.wcrm-col-body');
    colPairs.forEach(p => body.appendChild(makeCard(p.wa, p.crm)));
    colCrmOnly.forEach(c => body.appendChild(makeCard(null, c)));

    if (total === 0) {
      body.innerHTML = `<div class="wcrm-empty">Nenhum lead</div>`;
    }

    container.appendChild(colEl);
  });
}

// ============================================================
// BUILD SINGLE COLUMN VIEW (tab filter mode)
// ============================================================
function buildSingleCol() {
  waContacts = readWAContacts();
  const leads = Object.values(crmData);
  const pairs = waContacts.map(wa => ({ wa, crm: findCRM(wa.name) }));
  const waNames = waContacts.map(w => w.name.toLowerCase().trim());
  const crmOnly = leads.filter(c => !waNames.includes((c.name||'').toLowerCase().trim()));

  const list = document.getElementById('wcrm-list');
  if (!list) return;
  list.innerHTML = '';

  let shown = 0;

  pairs.forEach(p => {
    if (activeCol !== 'all' && (p.crm?.status || '') !== activeCol) return;
    list.appendChild(makeCard(p.wa, p.crm));
    shown++;
  });

  if (activeCol !== 'all') {
    crmOnly.filter(c => c.status === activeCol).forEach(c => {
      list.appendChild(makeCard(null, c));
      shown++;
    });
  }

  if (shown === 0) {
    list.innerHTML = `<div class="wcrm-empty-full"><div style="font-size:28px;margin-bottom:8px">📭</div><div>Nenhum contato nesta etapa</div></div>`;
  }
}

// ============================================================
// MAIN REFRESH
// ============================================================
function refresh() {
  updateTabCounts();
  if (kanbanMode) {
    buildKanban();
  } else {
    buildSingleCol();
  }
}

function updateTabCounts() {
  waContacts = readWAContacts();
  const leads = Object.values(crmData);
  const pairs = waContacts.map(wa => ({ wa, crm: findCRM(wa.name) }));
  const waNames = waContacts.map(w => w.name.toLowerCase().trim());
  const crmOnly = leads.filter(c => !waNames.includes((c.name||'').toLowerCase().trim()));

  COLS.forEach(col => {
    const tab = document.querySelector(`.wcrm-tab[data-col="${col.id}"]`);
    if (!tab) return;
    let count = 0;
    if (col.id === 'all') {
      count = waContacts.length;
    } else {
      count = pairs.filter(p => p.crm?.status === col.id).length +
              crmOnly.filter(c => c.status === col.id).length;
    }
    const badge = tab.querySelector('.wcrm-tab-badge');
    if (badge) { badge.textContent = count; badge.style.color = col.color; badge.style.background = col.color + '22'; }
  });
}

// ============================================================
// INJECT INTO WHATSAPP DOM
// ============================================================
function inject() {
  if (injected) return;
  if (document.getElementById('wcrm-root')) return;

  // Find pane-side (left panel)
  const paneEl = document.getElementById('pane-side');
  if (!paneEl) return;

  injected = true;

  // Create our root container inside pane-side
  const root = document.createElement('div');
  root.id = 'wcrm-root';

  // Tab bar
  root.innerHTML = `
    <div id="wcrm-topbar">
      <div id="wcrm-tabs">
        ${COLS.map(col => `
          <div class="wcrm-tab ${activeCol === col.id ? 'wcrm-tab-active' : ''}"
               data-col="${col.id}"
               style="${activeCol === col.id ? 'border-bottom:3px solid ' + col.color + ';color:' + col.color : ''}">
            ${col.label}
            <span class="wcrm-tab-badge">0</span>
          </div>
        `).join('')}
      </div>
      <div id="wcrm-topbtns">
        <button id="wcrm-toggle-mode" title="Alternar Kanban">⊞</button>
        <button id="wcrm-btn-add" title="Novo lead">+</button>
        <button id="wcrm-btn-refresh" title="Atualizar">↻</button>
      </div>
    </div>
    <div id="wcrm-search-wrap">
      <input id="wcrm-search" placeholder="🔍 Buscar contato..." />
    </div>
    <div id="wcrm-list"></div>
    <div id="wcrm-kanban" style="display:none"></div>
  `;

  // Insert at top of pane-side (before chat list)
  paneEl.insertBefore(root, paneEl.firstChild);

  // ---- TAB CLICKS ----
  root.querySelectorAll('.wcrm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCol = tab.dataset.col;
      root.querySelectorAll('.wcrm-tab').forEach(t => {
        t.classList.remove('wcrm-tab-active');
        t.style.borderBottom = 'none';
        const col = COLS.find(c => c.id === t.dataset.col);
        t.style.color = '#8696a0';
      });
      tab.classList.add('wcrm-tab-active');
      const col = COLS.find(c => c.id === activeCol);
      tab.style.borderBottom = '3px solid ' + (col?.color || '#00a884');
      tab.style.color = col?.color || '#00a884';
      
      // If kanban mode, switch to single column and exit kanban
      if (kanbanMode) {
        kanbanMode = false;
        document.getElementById('wcrm-kanban').style.display = 'none';
        document.getElementById('wcrm-list').style.display = 'block';
        document.getElementById('wcrm-toggle-mode').style.background = 'transparent';
      }
      refresh();
    });
  });

  // ---- KANBAN TOGGLE ----
  root.querySelector('#wcrm-toggle-mode').addEventListener('click', () => {
    kanbanMode = !kanbanMode;
    const kanbanEl = document.getElementById('wcrm-kanban');
    const listEl = document.getElementById('wcrm-list');
    const btn = document.getElementById('wcrm-toggle-mode');
    if (kanbanMode) {
      listEl.style.display = 'none';
      kanbanEl.style.display = 'flex';
      btn.style.background = '#00a88422';
      btn.style.color = '#00a884';
      // Expand pane for kanban
      paneEl.style.width = '100vw';
      paneEl.style.maxWidth = '100vw';
      document.getElementById('app').style.display = 'flex';
    } else {
      listEl.style.display = 'block';
      kanbanEl.style.display = 'none';
      btn.style.background = 'transparent';
      btn.style.color = '#8696a0';
      // Restore pane width
      paneEl.style.width = '';
      paneEl.style.maxWidth = '';
    }
    refresh();
  });

  // ---- ADD BUTTON ----
  root.querySelector('#wcrm-btn-add').addEventListener('click', () => showModal(null));

  // ---- REFRESH BUTTON ----
  root.querySelector('#wcrm-btn-refresh').addEventListener('click', async () => {
    const btn = root.querySelector('#wcrm-btn-refresh');
    btn.textContent = '...';
    await loadCRM();
    refresh();
    btn.textContent = '↻';
  });

  // ---- SEARCH ----
  root.querySelector('#wcrm-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.wcrm-card').forEach(c => {
      const n = c.dataset.name?.toLowerCase() || '';
      c.style.display = n.includes(q) ? 'flex' : 'none';
    });
  });

  // Observer to keep refreshing as WA loads more chats
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    waContacts = readWAContacts();
    updateTabCounts();
    if (!kanbanMode) buildSingleCol();
  });
  const chatList = paneEl.querySelector('[data-testid="chat-list"]');
  if (chatList) {
    observer.observe(chatList, { childList: true, subtree: false });
  }

  // Initial render
  loadCRM().then(() => refresh());
}

// ============================================================
// MODAL
// ============================================================
function showModal(lead) {
  document.getElementById('wcrm-modal-ov')?.remove();
  const ov = document.createElement('div');
  ov.id = 'wcrm-modal-ov';
  ov.innerHTML = `<div id="wcrm-modal">
    <div class="wm-hd"><b>${lead?.id ? 'Editar Lead' : 'Novo Lead'}</b><button id="wm-x">✕</button></div>
    <div class="wm-bd">
      <label>Nome *</label><input id="wm-name" value="${lead?.name||''}" placeholder="Nome completo" />
      <label>WhatsApp</label><input id="wm-phone" value="${lead?.phone||''}" placeholder="+55 11 99999-9999" />
      <label>Serviço / Assunto</label><input id="wm-svc" value="${lead?.service||''}" placeholder="Ex: Visto, Processo..." />
      <label>Etapa</label>
      <select id="wm-status">${COLS.filter(c=>c.id!=='all').map(c=>`<option value="${c.id}" ${(lead?.status||'novo')===c.id?'selected':''}>${c.emoji} ${c.label}</option>`).join('')}</select>
      <label>Observações</label>
      <textarea id="wm-notes">${lead?.notes||''}</textarea>
    </div>
    <div class="wm-ft">
      ${lead?.id ? `<button id="wm-del">🗑 Excluir</button>` : ''}
      <button id="wm-cancel">Cancelar</button>
      <button id="wm-save">💾 Salvar</button>
    </div>
  </div>`;
  document.body.appendChild(ov);

  const g = id => ov.querySelector(id);
  g('#wm-x').onclick = g('#wm-cancel').onclick = () => ov.remove();

  g('#wm-del')?.addEventListener('click', async () => {
    if (!confirm('Excluir?')) return;
    await deleteContact(lead.id);
    ov.remove(); refresh();
  });

  g('#wm-save').addEventListener('click', async () => {
    const name = g('#wm-name').value.trim();
    if (!name) { alert('Nome obrigatório'); return; }
    const data = { name, phone: g('#wm-phone').value.trim(), service: g('#wm-svc').value.trim(), status: g('#wm-status').value, notes: g('#wm-notes').value.trim() };
    const btn = g('#wm-save'); btn.textContent = '...'; btn.disabled = true;
    if (lead?.id) await patchContact(lead.id, data);
    else await createContact(data);
    ov.remove(); refresh();
  });
}

// ============================================================
// CHROME MESSAGES
// ============================================================
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'togglePanel') {
    const root = document.getElementById('wcrm-root');
    if (root) { injected = false; root.remove(); if(observer) observer.disconnect(); }
    else inject();
  }
  if (msg.action === 'refreshLeads') loadCRM().then(refresh);
});

// ============================================================
// INIT: inject when pane-side is ready
// ============================================================
function tryInject() {
  if (document.getElementById('pane-side')) {
    inject();
  }
}

// Try multiple times with increasing delays
[500, 1500, 3000, 5000, 8000].forEach(ms => setTimeout(tryInject, ms));

// Also watch for DOM changes
const initObs = new MutationObserver(() => {
  if (document.getElementById('pane-side') && !injected) {
    inject();
    initObs.disconnect();
  }
});
initObs.observe(document.body, { childList: true, subtree: true });

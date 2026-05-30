// ============================================================
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

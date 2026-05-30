// ============================================================
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

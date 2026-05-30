// ============================================================
// CRM Ramon Pacheco - Content Script para WhatsApp Web
// ============================================================

const SUPABASE_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';

const KANBAN_STAGES = [
  { id: 'novo', label: 'Lead Novo', color: '#3b82f6' },
  { id: 'qualificando', label: 'Em Analise', color: '#f59e0b' },
  { id: 'proposta', label: 'Proposta Enviada', color: '#8b5cf6' },
  { id: 'fechado', label: 'Cliente Ativo', color: '#10b981' },
  { id: 'perdido', label: 'Arquivado', color: '#6b7280' },
];

let currentContact = null;
let panelEl = null;
let lastPhone = null;

// ---- Supabase helpers ----
async function sbFetch(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || '',
      ...(opts.headers || {}),
    },
  });
  if (res.status === 204) return null;
  return res.json();
}

async function getContact(phone) {
  const clean = phone.replace(/\D/g, '');
  const data = await sbFetch('/rest/v1/contacts?phone=ilike.*' + clean + '*&limit=1');
  return data && data[0] ? data[0] : null;
}

async function createContact(phone, name) {
  const data = await sbFetch('/rest/v1/contacts', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      name: name || phone,
      phone: phone,
      status: 'novo',
      origin: 'WhatsApp Web',
    }),
  });
  return data && data[0] ? data[0] : null;
}

async function updateContact(id, updates) {
  return sbFetch('/rest/v1/contacts?id=eq.' + id, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify(updates),
  });
}

// ---- Extract current phone from WhatsApp Web ----
function getCurrentPhone() {
  // Try header with contact name/phone
  const header = document.querySelector('[data-testid="conversation-header"]') ||
    document.querySelector('header');
  if (!header) return null;

  // Try to get the phone from the title or span
  const spans = header.querySelectorAll('span');
  for (const span of spans) {
    const txt = span.textContent.trim();
    if (/^[+]?[\d\s\-().]{8,}$/.test(txt)) return txt.replace(/\s/g, '');
  }

  // Try URL hash
  const hash = window.location.hash;
  const match = hash.match(/phone=([\d+]+)/);
  if (match) return match[1];

  return null;
}

function getContactName() {
  const header = document.querySelector('[data-testid="conversation-header"]') ||
    document.querySelector('header');
  if (!header) return null;
  const spans = header.querySelectorAll('span[title]');
  for (const span of spans) {
    const txt = span.getAttribute('title') || span.textContent.trim();
    if (txt && txt.length > 1 && !/^[+\d\s\-().]+$/.test(txt)) return txt;
  }
  return null;
}

// ---- Build the side panel ----
function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'crm-panel';
  panel.innerHTML = `
    <div class="crm-header">
      <span class="crm-logo">⚖️</span>
      <span class="crm-title">CRM Advocacia</span>
      <button class="crm-close" id="crm-close-btn">✕</button>
    </div>
    <div class="crm-body" id="crm-body">
      <div class="crm-loading">Carregando...</div>
    </div>
  `;
  document.body.appendChild(panel);
  document.getElementById('crm-close-btn').onclick = togglePanel;
  return panel;
}

function togglePanel() {
  if (!panelEl) panelEl = createPanel();
  const visible = panelEl.style.display !== 'none';
  panelEl.style.display = visible ? 'none' : 'flex';
}

function renderLoading() {
  const body = document.getElementById('crm-body');
  if (body) body.innerHTML = '<div class="crm-loading">Buscando contato...</div>';
}

function renderContact(contact) {
  const body = document.getElementById('crm-body');
  if (!body) return;

  const stage = KANBAN_STAGES.find(s => s.id === contact.status) || KANBAN_STAGES[0];

  body.innerHTML = `
    <div class="crm-contact-card">
      <div class="crm-avatar">${(contact.name || '?')[0].toUpperCase()}</div>
      <div class="crm-contact-info">
        <div class="crm-contact-name">${contact.name || 'Sem nome'}</div>
        <div class="crm-contact-phone">${contact.phone || ''}</div>
      </div>
    </div>

    <div class="crm-stage-label">Status no Kanban</div>
    <div class="crm-stages" id="crm-stages">
      ${KANBAN_STAGES.map(s => `
        <button class="crm-stage-btn ${s.id === contact.status ? 'active' : ''}"
          data-stage="${s.id}"
          style="border-color: ${s.id === contact.status ? s.color : '#2d3748'}; color: ${s.id === contact.status ? s.color : '#94a3b8'}">
          ${s.label}
        </button>
      `).join('')}
    </div>

    <div class="crm-field">
      <label>Servico / Assunto</label>
      <input id="crm-service" value="${contact.service || ''}" placeholder="Ex: Visto, Criminal..." />
    </div>

    <div class="crm-field">
      <label>Origem</label>
      <input id="crm-origin" value="${contact.origin || 'WhatsApp Web'}" />
    </div>

    <div class="crm-field">
      <label>Observacoes</label>
      <textarea id="crm-notes" placeholder="Anotacoes...">${contact.notes || ''}</textarea>
    </div>

    <button class="crm-save-btn" id="crm-save-btn">Salvar alteracoes</button>

    <a class="crm-link" href="https://escritorio-ramon.vercel.app" target="_blank">
      Abrir sistema completo →
    </a>
  `;

  // Stage buttons
  document.querySelectorAll('.crm-stage-btn').forEach(btn => {
    btn.onclick = async () => {
      const newStage = btn.dataset.stage;
      await updateContact(contact.id, { status: newStage });
      contact.status = newStage;
      renderContact(contact);
    };
  });

  // Save button
  document.getElementById('crm-save-btn').onclick = async () => {
    const service = document.getElementById('crm-service').value;
    const origin = document.getElementById('crm-origin').value;
    const notes = document.getElementById('crm-notes').value;
    const btn = document.getElementById('crm-save-btn');
    btn.textContent = 'Salvando...';
    await updateContact(contact.id, { service, origin, notes });
    btn.textContent = 'Salvo!';
    setTimeout(() => { btn.textContent = 'Salvar alteracoes'; }, 2000);
    contact.service = service;
    contact.origin = origin;
    contact.notes = notes;
  };
}

function renderNewContact(phone, name) {
  const body = document.getElementById('crm-body');
  if (!body) return;

  body.innerHTML = `
    <div class="crm-new-badge">Contato novo</div>
    <div class="crm-contact-card">
      <div class="crm-avatar" style="background:#3b82f6">${(name || phone || '?')[0].toUpperCase()}</div>
      <div class="crm-contact-info">
        <div class="crm-contact-name">${name || 'Novo contato'}</div>
        <div class="crm-contact-phone">${phone || ''}</div>
      </div>
    </div>

    <div class="crm-field">
      <label>Nome</label>
      <input id="crm-new-name" value="${name || ''}" placeholder="Nome completo" />
    </div>
    <div class="crm-field">
      <label>Servico / Assunto</label>
      <input id="crm-new-service" placeholder="Ex: Visto, Criminal..." />
    </div>
    <div class="crm-field">
      <label>Observacoes</label>
      <textarea id="crm-new-notes" placeholder="Anotacoes iniciais..."></textarea>
    </div>

    <button class="crm-save-btn" id="crm-create-btn">+ Adicionar ao Kanban</button>
  `;

  document.getElementById('crm-create-btn').onclick = async () => {
    const btn = document.getElementById('crm-create-btn');
    btn.textContent = 'Criando...';
    const newName = document.getElementById('crm-new-name').value || name || phone;
    const service = document.getElementById('crm-new-service').value;
    const notes = document.getElementById('crm-new-notes').value;
    const contact = await createContact(phone, newName);
    if (contact) {
      if (service || notes) await updateContact(contact.id, { service, notes });
      contact.service = service;
      contact.notes = notes;
      currentContact = contact;
      renderContact(contact);
    } else {
      btn.textContent = 'Erro - tente novamente';
    }
  };
}

// ---- Watch for conversation changes ----
async function onConversationChange() {
  const phone = getCurrentPhone();
  const name = getContactName();

  if (!phone || phone === lastPhone) return;
  lastPhone = phone;

  if (!panelEl || panelEl.style.display === 'none') return;

  renderLoading();

  const contact = await getContact(phone);
  if (contact) {
    currentContact = contact;
    renderContact(contact);
  } else {
    currentContact = null;
    renderNewContact(phone, name);
  }
}

// ---- Inject FAB button ----
function injectFAB() {
  if (document.getElementById('crm-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'crm-fab';
  fab.innerHTML = '⚖️';
  fab.title = 'Abrir CRM';
  fab.onclick = async () => {
    togglePanel();
    if (panelEl && panelEl.style.display !== 'none') {
      await onConversationChange();
    }
  };
  document.body.appendChild(fab);
}

// ---- MutationObserver to detect conversation changes ----
function startObserver() {
  const observer = new MutationObserver(() => {content.js
    injectFAB();
    onConversationChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ---- Init ----
function init() {
  injectFAB();
  startObserver();
  console.log('[CRM Advocacia] Extensao carregada no WhatsApp Web');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 2000);
}

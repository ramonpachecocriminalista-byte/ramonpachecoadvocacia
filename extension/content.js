// CRM WALEADS-Style v3.0 - Ramon Pacheco Advocacia
// Layout: Sidebar fina esquerda + Topbar com abas de funil + WhatsApp intacto
(function() {
'use strict';

const STORAGE_KEY = 'crm_adv_v3';
let state = {
  columns: [
    {id:'col1', label:'Recentes', color:'#25D366', fixed:true},
    {id:'col2', label:'Backlog', color:'#8696a0'},
    {id:'col3', label:'Prioridade', color:'#FFC107'},
    {id:'col4', label:'Em Execução', color:'#2196F3'},
    {id:'col5', label:'Aguardando Terceiros', color:'#FF9800'},
    {id:'col6', label:'Revisão', color:'#9C27B0'},
    {id:'col7', label:'Concluído', color:'#4CAF50'}
  ],
  cards: {},
  automations: [],
  appointments: [],
  activeTab: 'col1',
  activeSidePanel: null
};

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); Object.assign(state, p); }
  } catch(e) {}
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
loadState();

// ==================== BUILD LAYOUT ====================
function buildLayout() {
  if (document.getElementById('crm-sidebar')) return;

  // 1. Sidebar esquerda fina
  const sidebar = document.createElement('div');
  sidebar.id = 'crm-sidebar';
  sidebar.innerHTML = `
    <div class="crm-sb-logo" title="CRM Advocacia">⚖️</div>
    <nav class="crm-sb-nav">
      <button class="crm-sb-btn active" data-panel="chats" title="Chats">
        <span class="crm-sb-icon">💬</span>
        <span class="crm-sb-label">Chats</span>
      </button>
      <button class="crm-sb-btn" data-panel="funnel" title="Funil">
        <span class="crm-sb-icon">📋</span>
        <span class="crm-sb-label">Funil</span>
      </button>
      <button class="crm-sb-btn" data-panel="agenda" title="Agenda">
        <span class="crm-sb-icon">📅</span>
        <span class="crm-sb-label">Agenda</span>
      </button>
      <button class="crm-sb-btn" data-panel="automation" title="Automação">
        <span class="crm-sb-icon">⚡</span>
        <span class="crm-sb-label">Automação</span>
      </button>
      <button class="crm-sb-btn" data-panel="reports" title="Relatórios">
        <span class="crm-sb-icon">📊</span>
        <span class="crm-sb-label">Relatórios</span>
      </button>
    </nav>
    <div class="crm-sb-bottom">
      <button class="crm-sb-btn" id="crm-sb-settings" title="Configurações">
        <span class="crm-sb-icon">⚙️</span>
      </button>
    </div>
  `;
  document.body.prepend(sidebar);

  // 2. Topbar com abas de funil (só aparece quando "Chats" está ativo)
  const topbar = document.createElement('div');
  topbar.id = 'crm-topbar';
  topbar.innerHTML = buildTopbarHTML();
  document.body.insertBefore(topbar, document.body.firstChild.nextSibling);

  // 3. Painel lateral flutuante (Funil, Agenda, etc.)
  const panel = document.createElement('div');
  panel.id = 'crm-side-panel';
  panel.innerHTML = '<div id="crm-panel-content"></div>';
  document.body.appendChild(panel);

  // Push WhatsApp content to the right
  pushWhatsAppContent();
  attachSidebarEvents();
  attachTopbarEvents();
}

function pushWhatsAppContent() {
  const waApp = document.getElementById('app') || document.querySelector('[data-testid="default-user"]')?.closest('div');
  // We use CSS to push everything via margin-left on #app
}

function buildTopbarHTML() {
  const cols = state.columns;
  const cards = Object.values(state.cards);
  let tabs = '';
  cols.forEach(col => {
    const count = cards.filter(c => c.colId === col.id).length;
    const isActive = state.activeTab === col.id;
    tabs += `<button class="crm-tab ${isActive?'active':''}" data-colid="${col.id}">
      ${col.fixed ? '' : ''}
      <span class="crm-tab-label">${col.label}</span>
      <span class="crm-tab-count ${count>0?'has-count':''}">${count}</span>
    </button>`;
  });
  return `
    <div class="crm-topbar-left">
      <div class="crm-funnel-selector">
        <select id="crm-funnel-select">
          <option>Padrão</option>
        </select>
      </div>
      <div class="crm-tabs-wrap">
        <div class="crm-tabs" id="crm-tabs">${tabs}</div>
      </div>
      <button class="crm-tab-add" id="crm-add-column" title="Nova Coluna">+</button>
    </div>
    <div class="crm-topbar-right">
      <button class="crm-btn-red" id="crm-upgrade-btn">🔔 Adquirir plano</button>
    </div>
  `;
}

// ==================== EVENTS ====================
function attachSidebarEvents() {
  document.querySelectorAll('.crm-sb-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      document.querySelectorAll('.crm-sb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (panel === 'chats') {
        // Hide side panel, show topbar — WhatsApp normal
        document.getElementById('crm-side-panel').classList.remove('open');
        document.getElementById('crm-topbar').style.display = 'flex';
        state.activeSidePanel = null;
      } else {
        // Show side panel with selected module
        document.getElementById('crm-topbar').style.display = 'flex';
        openSidePanel(panel);
        state.activeSidePanel = panel;
      }
    });
  });
}

function attachTopbarEvents() {
  document.getElementById('crm-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.crm-tab');
    if (!btn) return;
    state.activeTab = btn.dataset.colid;
    document.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    // If funnel panel is open, refresh it
    if (state.activeSidePanel === 'funnel') renderFunnelPanel();
  });

  document.getElementById('crm-add-column')?.addEventListener('click', openColumnModal);
}

// ==================== SIDE PANEL ====================
function openSidePanel(type) {
  const panel = document.getElementById('crm-side-panel');
  const content = document.getElementById('crm-panel-content');
  panel.classList.add('open');
  
  switch(type) {
    case 'funnel': renderFunnelPanel(); break;
    case 'agenda': renderAgendaPanel(); break;
    case 'automation': renderAutoPanel(); break;
    case 'reports': renderReportsPanel(); break;
  }
}

// ==================== FUNNEL PANEL ====================
function renderFunnelPanel() {
  const content = document.getElementById('crm-panel-content');
  const activeCol = state.columns.find(c => c.id === state.activeTab) || state.columns[0];
  const cards = Object.values(state.cards).filter(c => c.colId === (activeCol?.id));
  
  content.innerHTML = `
    <div class="crm-panel-header">
      <span class="crm-panel-title" style="border-left: 3px solid ${activeCol?.color||'#25D366'}; padding-left: 8px;">
        ${activeCol?.label || 'Funil'}
      </span>
      <div class="crm-panel-actions">
        <button class="crm-btn-primary" id="fp-add-card">+ Novo Lead</button>
        <button class="crm-panel-close" id="fp-close">✕</button>
      </div>
    </div>
    <div class="crm-panel-body">
      ${cards.length ? cards.map(c => renderCardHTML(c)).join('') : `
        <div class="crm-panel-empty">
          <div style="font-size:32px;margin-bottom:8px">📋</div>
          <p>Nenhum lead em <b>${activeCol?.label}</b></p>
          <button class="crm-btn-primary" id="fp-add-empty">+ Adicionar Lead</button>
        </div>
      `}
    </div>
  `;
  
  content.querySelector('#fp-close')?.addEventListener('click', () => {
    document.getElementById('crm-side-panel').classList.remove('open');
    // Return to chats
    document.querySelectorAll('.crm-sb-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.crm-sb-btn[data-panel="chats"]').classList.add('active');
    state.activeSidePanel = null;
  });
  content.querySelector('#fp-add-card')?.addEventListener('click', () => openCardModal(null, activeCol?.id));
  content.querySelector('#fp-add-empty')?.addEventListener('click', () => openCardModal(null, activeCol?.id));
  
  content.querySelectorAll('.crm-card-item').forEach(card => {
    card.querySelector('.crm-card-edit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      openCardModal(card.dataset.cardid);
    });
    card.querySelector('.crm-card-wa-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const phone = card.dataset.phone?.replace(/\D/g,'');
      if (phone) {
        // Click on WhatsApp search and open chat
        const searchInput = document.querySelector('[data-testid="chat-list-search"]');
        if (searchInput) {
          searchInput.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(searchInput, phone);
          searchInput.dispatchEvent(new Event('input', {bubbles:true}));
        }
      }
    });
  });
}

function renderCardHTML(card) {
  return `<div class="crm-card-item" data-cardid="${card.id}" data-phone="${card.phone||''}">
    <div class="crm-card-item-header">
      <span class="crm-card-item-name">${card.name}</span>
      <div class="crm-card-item-btns">
        ${card.phone ? `<button class="crm-card-wa-btn" title="Abrir no WhatsApp">💬</button>` : ''}
        <button class="crm-card-edit-btn" title="Editar">✏️</button>
      </div>
    </div>
    ${card.phone ? `<div class="crm-card-item-phone">📱 ${card.phone}</div>` : ''}
    ${card.value ? `<div class="crm-card-item-value">💰 R$ ${card.value}</div>` : ''}
    ${card.tag ? `<span class="crm-card-item-tag" style="background:${card.tagColor||'#25D366'}">${card.tag}</span>` : ''}
    <div class="crm-card-item-col">
      <label style="font-size:10px;color:#8696a0">Mover para:</label>
      <select class="crm-card-move-select" data-cardid="${card.id}">
        ${state.columns.map(c => `<option value="${c.id}" ${c.id===card.colId?'selected':''}>${c.label}</option>`).join('')}
      </select>
    </div>
    ${card.notes ? `<div class="crm-card-item-notes">${card.notes}</div>` : ''}
  </div>`;
}

// ==================== AGENDA PANEL ====================
function renderAgendaPanel() {
  const content = document.getElementById('crm-panel-content');
  const appts = [...state.appointments].sort((a,b) => new Date(a.datetime)-new Date(b.datetime));
  content.innerHTML = `
    <div class="crm-panel-header">
      <span class="crm-panel-title">📅 Agenda</span>
      <div class="crm-panel-actions">
        <button class="crm-btn-primary" id="ag-new">+ Compromisso</button>
        <button class="crm-panel-close" id="ag-close">✕</button>
      </div>
    </div>
    <div class="crm-panel-body">
      ${appts.length ? appts.map(a => `
        <div class="crm-appt-item">
          <div class="crm-appt-color" style="background:${a.color||'#25D366'}"></div>
          <div class="crm-appt-info">
            <div class="crm-appt-title">${a.title}</div>
            <div class="crm-appt-time">${new Date(a.datetime).toLocaleString('pt-BR')}</div>
            ${a.contact ? `<div class="crm-appt-contact">👤 ${a.contact}</div>` : ''}
          </div>
          <button class="crm-appt-del" data-id="${a.id}">✕</button>
        </div>
      `).join('') : '<div class="crm-panel-empty"><div style="font-size:32px">📅</div><p>Nenhum compromisso</p></div>'}
    </div>
  `;
  content.querySelector('#ag-close')?.addEventListener('click', closeSidePanel);
  content.querySelector('#ag-new')?.addEventListener('click', openAgendaModal);
  content.querySelectorAll('.crm-appt-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.appointments = state.appointments.filter(a => a.id !== btn.dataset.id);
      saveState(); renderAgendaPanel();
    });
  });
}

// ==================== AUTOMATION PANEL ====================
function renderAutoPanel() {
  const content = document.getElementById('crm-panel-content');
  content.innerHTML = `
    <div class="crm-panel-header">
      <span class="crm-panel-title">⚡ Automações</span>
      <div class="crm-panel-actions">
        <button class="crm-btn-primary" id="auto-new">+ Nova</button>
        <button class="crm-panel-close" id="auto-close">✕</button>
      </div>
    </div>
    <div class="crm-panel-body">
      ${state.automations.length ? state.automations.map(a => `
        <div class="crm-auto-row">
          <label class="crm-switch"><input type="checkbox" ${a.active?'checked':''} data-id="${a.id}"><span class="crm-slider"></span></label>
          <div class="crm-auto-info">
            <div class="crm-auto-name">${a.name}</div>
            <div class="crm-auto-rule">${a.trigger} → ${a.action}</div>
          </div>
          <button class="crm-auto-del" data-id="${a.id}">🗑️</button>
        </div>
      `).join('') : '<div class="crm-panel-empty"><div style="font-size:32px">⚡</div><p>Nenhuma automação</p></div>'}
    </div>
  `;
  content.querySelector('#auto-close')?.addEventListener('click', closeSidePanel);
  content.querySelector('#auto-new')?.addEventListener('click', openAutoModal);
  content.querySelectorAll('[data-id]').forEach(el => {
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        const a = state.automations.find(x => x.id === el.dataset.id);
        if (a) { a.active = el.checked; saveState(); }
      });
    } else if (el.classList.contains('crm-auto-del')) {
      el.addEventListener('click', () => {
        state.automations = state.automations.filter(x => x.id !== el.dataset.id);
        saveState(); renderAutoPanel();
      });
    }
  });
}

// ==================== REPORTS PANEL ====================
function renderReportsPanel() {
  const content = document.getElementById('crm-panel-content');
  const cards = Object.values(state.cards);
  const total = cards.length;
  const totalVal = cards.reduce((s,c) => s + (parseFloat((c.value||'0').replace(',','.')) || 0), 0);
  const byCol = {};
  state.columns.forEach(c => { byCol[c.id] = {label:c.label, count:0, value:0, color:c.color}; });
  cards.forEach(c => { if(byCol[c.colId]) { byCol[c.colId].count++; byCol[c.colId].value += parseFloat((c.value||'0').replace(',','.')) || 0; } });
  
  content.innerHTML = `
    <div class="crm-panel-header">
      <span class="crm-panel-title">📊 Relatórios</span>
      <div class="crm-panel-actions">
        <button class="crm-panel-close" id="rep-close">✕</button>
      </div>
    </div>
    <div class="crm-panel-body">
      <div class="crm-metrics-row">
        <div class="crm-metric"><div class="crm-metric-val">${total}</div><div class="crm-metric-lbl">Leads</div></div>
        <div class="crm-metric"><div class="crm-metric-val">R$ ${totalVal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div><div class="crm-metric-lbl">Valor Total</div></div>
        <div class="crm-metric"><div class="crm-metric-val">${state.appointments.length}</div><div class="crm-metric-lbl">Compromissos</div></div>
      </div>
      <div class="crm-report-bars">
        ${Object.values(byCol).map(c => `
          <div class="crm-rbar-row">
            <span class="crm-rbar-label">${c.label}</span>
            <div class="crm-rbar-wrap"><div class="crm-rbar-fill" style="width:${total?Math.round(c.count/total*100):0}%;background:${c.color}"></div></div>
            <span class="crm-rbar-num">${c.count}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  content.querySelector('#rep-close')?.addEventListener('click', closeSidePanel);
}

function closeSidePanel() {
  document.getElementById('crm-side-panel').classList.remove('open');
  document.querySelectorAll('.crm-sb-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.crm-sb-btn[data-panel="chats"]').classList.add('active');
  state.activeSidePanel = null;
}

// ==================== MODALS ====================
function createModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'crm-modal-overlay';
  overlay.innerHTML = `<div class="crm-modal">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.crm-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  return overlay;
}

function openCardModal(cardId, colId) {
  const card = cardId ? state.cards[cardId] : null;
  const modal = createModal(`
    <div class="crm-modal-hdr"><h3>${card?'Editar Lead':'Novo Lead'}</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-bdy">
      <label>Nome *</label><input id="cm-name" value="${card?.name||''}" placeholder="Nome do contato" />
      <label>Telefone</label><input id="cm-phone" value="${card?.phone||''}" placeholder="+55 11 99999-9999" />
      <label>Valor (R$)</label><input id="cm-value" value="${card?.value||''}" placeholder="0,00" />
      <label>Etiqueta</label><input id="cm-tag" value="${card?.tag||''}" placeholder="Ex: Urgente" />
      <label>Coluna</label>
      <select id="cm-col">${state.columns.map(c=>`<option value="${c.id}" ${(card?.colId||colId)===c.id?'selected':''}>${c.label}</option>`).join('')}</select>
      <label>Observações</label><textarea id="cm-notes">${card?.notes||''}</textarea>
    </div>
    <div class="crm-modal-ftr">
      ${card?`<button class="crm-btn-danger" id="cm-del">Excluir</button>`:''}
      <button class="crm-modal-close crm-btn-sec">Cancelar</button>
      <button class="crm-btn-primary" id="cm-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#cm-save').addEventListener('click', () => {
    const name = modal.querySelector('#cm-name').value.trim();
    if (!name) return alert('Nome obrigatório');
    const id = cardId || 'card_'+Date.now();
    state.cards[id] = { id, name,
      phone: modal.querySelector('#cm-phone').value.trim(),
      value: modal.querySelector('#cm-value').value.trim(),
      tag: modal.querySelector('#cm-tag').value.trim(),
      colId: modal.querySelector('#cm-col').value,
      notes: modal.querySelector('#cm-notes').value.trim(),
      tagColor: '#25D366', date: new Date().toLocaleDateString('pt-BR')
    };
    saveState(); modal.remove();
    updateTopbarCounts();
    if (state.activeSidePanel === 'funnel') renderFunnelPanel();
  });
  if (card) modal.querySelector('#cm-del')?.addEventListener('click', () => {
    if(confirm('Excluir este lead?')) { delete state.cards[cardId]; saveState(); modal.remove(); updateTopbarCounts(); if(state.activeSidePanel==='funnel') renderFunnelPanel(); }
  });
}

function openColumnModal() {
  const modal = createModal(`
    <div class="crm-modal-hdr"><h3>Nova Coluna</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-bdy">
      <label>Nome *</label><input id="col-name" placeholder="Ex: Em Negociação" />
      <label>Cor</label><input id="col-color" type="color" value="#25D366" />
    </div>
    <div class="crm-modal-ftr">
      <button class="crm-modal-close crm-btn-sec">Cancelar</button>
      <button class="crm-btn-primary" id="col-save">Criar</button>
    </div>
  `);
  modal.querySelector('#col-save').addEventListener('click', () => {
    const name = modal.querySelector('#col-name').value.trim();
    if (!name) return;
    state.columns.push({id:'col_'+Date.now(), label:name, color:modal.querySelector('#col-color').value, fixed:false});
    saveState(); modal.remove(); rebuildTopbar();
  });
}

function openAgendaModal() {
  const modal = createModal(`
    <div class="crm-modal-hdr"><h3>Novo Compromisso</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-bdy">
      <label>Título *</label><input id="ag-title" placeholder="Ex: Reunião" />
      <label>Data e Hora *</label><input id="ag-dt" type="datetime-local" />
      <label>Contato</label><input id="ag-contact" placeholder="Nome" />
      <label>Notas</label><textarea id="ag-notes"></textarea>
    </div>
    <div class="crm-modal-ftr">
      <button class="crm-modal-close crm-btn-sec">Cancelar</button>
      <button class="crm-btn-primary" id="ag-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#ag-save').addEventListener('click', () => {
    const title = modal.querySelector('#ag-title').value.trim();
    const dt = modal.querySelector('#ag-dt').value;
    if(!title||!dt) return alert('Preencha título e data');
    state.appointments.push({id:'appt_'+Date.now(), title, datetime:dt,
      contact:modal.querySelector('#ag-contact').value.trim(),
      notes:modal.querySelector('#ag-notes').value.trim(), color:'#25D366'});
    saveState(); modal.remove(); renderAgendaPanel();
  });
}

function openAutoModal() {
  const modal = createModal(`
    <div class="crm-modal-hdr"><h3>Nova Automação</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-bdy">
      <label>Nome *</label><input id="auto-name" placeholder="Ex: Alerta de prioridade" />
      <label>Gatilho</label>
      <select id="auto-trig">
        <option>Card movido para coluna</option>
        <option>Novo card criado</option>
      </select>
      <label>Coluna alvo</label>
      <select id="auto-col">${state.columns.map(c=>`<option>${c.label}</option>`).join('')}</select>
      <label>Ação</label>
      <select id="auto-act">
        <option>Mostrar notificação</option>
        <option>Marcar como urgente</option>
      </select>
    </div>
    <div class="crm-modal-ftr">
      <button class="crm-modal-close crm-btn-sec">Cancelar</button>
      <button class="crm-btn-primary" id="auto-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#auto-save').addEventListener('click', () => {
    const name = modal.querySelector('#auto-name').value.trim();
    if(!name) return;
    state.automations.push({id:'auto_'+Date.now(), name, active:true,
      trigger:modal.querySelector('#auto-trig').value+': '+modal.querySelector('#auto-col').value,
      action:modal.querySelector('#auto-act').value});
    saveState(); modal.remove(); renderAutoPanel();
  });
}

function updateTopbarCounts() {
  const tabs = document.getElementById('crm-tabs');
  if (!tabs) return;
  const cards = Object.values(state.cards);
  tabs.querySelectorAll('.crm-tab').forEach(tab => {
    const count = cards.filter(c => c.colId === tab.dataset.colid).length;
    const countEl = tab.querySelector('.crm-tab-count');
    if (countEl) { countEl.textContent = count; countEl.className = 'crm-tab-count' + (count>0?' has-count':''); }
  });
}

function rebuildTopbar() {
  const topbar = document.getElementById('crm-topbar');
  if (topbar) { topbar.innerHTML = buildTopbarHTML(); attachTopbarEvents(); }
}

// Add event delegation for card move select
document.addEventListener('change', e => {
  if (e.target.classList.contains('crm-card-move-select')) {
    const cardId = e.target.dataset.cardid;
    if (state.cards[cardId]) {
      state.cards[cardId].colId = e.target.value;
      saveState();
      updateTopbarCounts();
      state.activeTab = e.target.value;
      document.querySelectorAll('.crm-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.colid === e.target.value);
      });
      if (state.activeSidePanel === 'funnel') renderFunnelPanel();
    }
  }
});

// ==================== INIT ====================
function init() {
  if (document.getElementById('crm-sidebar')) return;
  buildLayout();
}

function waitForWA() {
  if (document.body) {
    setTimeout(init, 1500);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  }
}

waitForWA();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'navigate' && msg.view) {
    const btn = document.querySelector(`.crm-sb-btn[data-panel="${msg.view}"]`);
    if (btn) btn.click();
  }
});

})();

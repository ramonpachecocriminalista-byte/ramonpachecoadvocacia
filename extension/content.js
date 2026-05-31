// CRM WALEADS-Style - Ramon Pacheco Advocacia v2.0
(function() {
'use strict';

// ============ STATE ============
const STORAGE_KEY = 'crm_advocacia_v2';
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
  currentView: 'funnel',
  sidebarOpen: true
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const p = JSON.parse(saved); state = Object.assign(state, p); }
  } catch(e) {}
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

loadState();

// ============ MAIN UI ============
let panel = null;

function createPanel() {
  if (document.getElementById('crm-panel')) return;
  panel = document.createElement('div');
  panel.id = 'crm-panel';
  panel.innerHTML = getPanelHTML();
  document.body.appendChild(panel);
  attachEvents();
  renderView();
}

function getPanelHTML() {
  return `
  <div id="crm-sidebar">
    <div class="crm-logo">⚖️ <span>CRM</span></div>
    <nav class="crm-nav">
      <button class="crm-nav-btn active" data-view="funnel" title="Funil">
        <span class="nav-icon">📋</span><span class="nav-label">Funil</span>
      </button>
      <button class="crm-nav-btn" data-view="chats" title="Chats">
        <span class="nav-icon">💬</span><span class="nav-label">Chats</span>
      </button>
      <button class="crm-nav-btn" data-view="agenda" title="Agenda">
        <span class="nav-icon">📅</span><span class="nav-label">Agenda</span>
      </button>
      <button class="crm-nav-btn" data-view="automation" title="Automação">
        <span class="nav-icon">⚡</span><span class="nav-label">Automação</span>
      </button>
      <button class="crm-nav-btn" data-view="reports" title="Relatórios">
        <span class="nav-icon">📊</span><span class="nav-label">Relatórios</span>
      </button>
    </nav>
    <div class="crm-nav-bottom">
      <button class="crm-nav-btn" id="crm-hide-btn" title="Minimizar">
        <span class="nav-icon">◀</span>
      </button>
    </div>
  </div>
  <div id="crm-main">
    <div id="crm-topbar">
      <div id="crm-topbar-left">
        <span id="crm-view-title">Funil</span>
      </div>
      <div id="crm-topbar-right">
        <button class="crm-btn-primary" id="crm-add-btn">+ Criar</button>
        <input type="text" id="crm-search" placeholder="🔍 Buscar..." />
      </div>
    </div>
    <div id="crm-content"></div>
  </div>
  `;
}

// ============ VIEWS ============
function renderView() {
  const content = document.getElementById('crm-content');
  const title = document.getElementById('crm-view-title');
  if (!content) return;
  const views = {funnel:'Funil', chats:'Chats', agenda:'Agenda', automation:'Automação', reports:'Relatórios'};
  if (title) title.textContent = views[state.currentView] || 'CRM';
  switch(state.currentView) {
    case 'funnel': renderFunnel(content); break;
    case 'chats': renderChats(content); break;
    case 'agenda': renderAgenda(content); break;
    case 'automation': renderAutomation(content); break;
    case 'reports': renderReports(content); break;
  }
}

// ============ FUNNEL ============
function renderFunnel(container) {
  container.innerHTML = '';
  container.className = 'crm-funnel-view';
  state.columns.forEach(col => {
    const cards = Object.values(state.cards).filter(c => c.colId === col.id);
    const colEl = document.createElement('div');
    colEl.className = 'crm-column';
    colEl.dataset.colId = col.id;
    colEl.innerHTML = `
      <div class="crm-col-header" style="border-top:3px solid ${col.color}">
        <div class="crm-col-title">
          ${col.fixed ? '<span class="col-fixed-badge">FIXA</span>' : ''}
          <span class="col-name">${col.label}</span>
          <span class="crm-col-count">${cards.length}</span>
        </div>
        <div class="crm-col-actions">
          ${!col.fixed ? '<button class="crm-col-menu" data-colid="'+col.id+'">⋯</button>' : ''}
        </div>
      </div>
      <div class="crm-col-body" data-colid="${col.id}">
        ${cards.map(c => renderCard(c)).join('')}
      </div>
      <button class="crm-add-card" data-colid="${col.id}">+ Adicionar</button>
    `;
    container.appendChild(colEl);
  });
  // Add column button
  const addColBtn = document.createElement('div');
  addColBtn.className = 'crm-add-column';
  addColBtn.innerHTML = '<button id="crm-new-column">+ Nova Coluna</button>';
  container.appendChild(addColBtn);
  attachFunnelEvents();
}

function renderCard(card) {
  return `<div class="crm-card" data-cardid="${card.id}" draggable="true">
    <div class="crm-card-name">${card.name}</div>
    ${card.phone ? `<div class="crm-card-phone">📱 ${card.phone}</div>` : ''}
    ${card.value ? `<div class="crm-card-value">💰 R$ ${card.value}</div>` : ''}
    ${card.tag ? `<span class="crm-card-tag" style="background:${card.tagColor||'#25D366'}">${card.tag}</span>` : ''}
    <div class="crm-card-footer">
      <span class="crm-card-date">${card.date||''}</span>
      <button class="crm-card-edit" data-cardid="${card.id}">✏️</button>
      <button class="crm-card-open" data-phone="${card.phone||''}" title="Abrir no WhatsApp">💬</button>
    </div>
  </div>`;
}

function attachFunnelEvents() {
  // Add card buttons
  document.querySelectorAll('.crm-add-card').forEach(btn => {
    btn.addEventListener('click', () => openCardModal(null, btn.dataset.colid));
  });
  // Card edit
  document.querySelectorAll('.crm-card-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openCardModal(btn.dataset.cardid);
    });
  });
  // Card open whatsapp
  document.querySelectorAll('.crm-card-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const phone = btn.dataset.phone.replace(/\D/g,'');
      if (phone) window.open('https://web.whatsapp.com/send?phone='+phone,'_blank');
    });
  });
  // New column
  const ncBtn = document.getElementById('crm-new-column');
  if (ncBtn) ncBtn.addEventListener('click', openColumnModal);
  // Column menu
  document.querySelectorAll('.crm-col-menu').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openColumnMenu(btn.dataset.colid, btn);
    });
  });
  // Drag and drop
  document.querySelectorAll('.crm-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('cardId', card.dataset.cardid);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('.crm-col-body').forEach(body => {
    body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('drag-over'); });
    body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
    body.addEventListener('drop', e => {
      e.preventDefault();
      body.classList.remove('drag-over');
      const cardId = e.dataTransfer.getData('cardId');
      if (cardId && state.cards[cardId]) {
        state.cards[cardId].colId = body.dataset.colid;
        saveState();
        runAutomations('move', {cardId, colId: body.dataset.colid});
        renderView();
      }
    });
  });
}

// ============ CARD MODAL ============
function openCardModal(cardId, colId) {
  const card = cardId ? state.cards[cardId] : null;
  const modal = createModal('card-modal', `
    <div class="crm-modal-header">
      <h3>${card ? 'Editar Card' : 'Novo Card'}</h3>
      <button class="crm-modal-close">✕</button>
    </div>
    <div class="crm-modal-body">
      <label>Nome / Contato *</label>
      <input id="cm-name" type="text" value="${card?.name||''}" placeholder="Nome do lead..." />
      <label>Telefone</label>
      <input id="cm-phone" type="text" value="${card?.phone||''}" placeholder="+55 11 99999-9999" />
      <label>Valor (R$)</label>
      <input id="cm-value" type="text" value="${card?.value||''}" placeholder="0,00" />
      <label>Etiqueta</label>
      <input id="cm-tag" type="text" value="${card?.tag||''}" placeholder="Ex: Urgente" />
      <label>Coluna</label>
      <select id="cm-col">
        ${state.columns.map(c => `<option value="${c.id}" ${(card?.colId||colId)===c.id?'selected':''}>${c.label}</option>`).join('')}
      </select>
      <label>Observações</label>
      <textarea id="cm-notes" placeholder="Anotações...">${card?.notes||''}</textarea>
    </div>
    <div class="crm-modal-footer">
      ${card ? '<button class="crm-btn-danger" id="cm-delete">Excluir</button>' : ''}
      <button class="crm-btn-secondary crm-modal-close-btn">Cancelar</button>
      <button class="crm-btn-primary" id="cm-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#cm-save').addEventListener('click', () => {
    const name = modal.querySelector('#cm-name').value.trim();
    if (!name) { alert('Nome obrigatório'); return; }
    const id = cardId || 'card_'+Date.now();
    state.cards[id] = {
      id, name,
      phone: modal.querySelector('#cm-phone').value.trim(),
      value: modal.querySelector('#cm-value').value.trim(),
      tag: modal.querySelector('#cm-tag').value.trim(),
      colId: modal.querySelector('#cm-col').value,
      notes: modal.querySelector('#cm-notes').value.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      tagColor: '#25D366'
    };
    saveState();
    closeModal(modal);
    renderView();
  });
  if (card) {
    modal.querySelector('#cm-delete').addEventListener('click', () => {
      if (confirm('Excluir este card?')) {
        delete state.cards[cardId];
        saveState();
        closeModal(modal);
        renderView();
      }
    });
  }
}

// ============ COLUMN MODAL ============
function openColumnModal(existingId) {
  const col = existingId ? state.columns.find(c => c.id === existingId) : null;
  const modal = createModal('col-modal', `
    <div class="crm-modal-header">
      <h3>${col ? 'Editar Coluna' : 'Nova Coluna'}</h3>
      <button class="crm-modal-close">✕</button>
    </div>
    <div class="crm-modal-body">
      <label>Nome da Coluna *</label>
      <input id="colm-name" type="text" value="${col?.label||''}" placeholder="Ex: Em Negociação" />
      <label>Cor</label>
      <input id="colm-color" type="color" value="${col?.color||'#25D366'}" />
    </div>
    <div class="crm-modal-footer">
      ${col && !col.fixed ? '<button class="crm-btn-danger" id="colm-delete">Excluir Coluna</button>' : ''}
      <button class="crm-btn-secondary crm-modal-close-btn">Cancelar</button>
      <button class="crm-btn-primary" id="colm-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#colm-save').addEventListener('click', () => {
    const name = modal.querySelector('#colm-name').value.trim();
    const color = modal.querySelector('#colm-color').value;
    if (!name) return;
    if (col) {
      col.label = name; col.color = color;
    } else {
      state.columns.push({id:'col_'+Date.now(), label:name, color, fixed:false});
    }
    saveState();
    closeModal(modal);
    renderView();
  });
  if (col && !col.fixed) {
    modal.querySelector('#colm-delete').addEventListener('click', () => {
      if (confirm('Excluir coluna? Os cards serão movidos para Backlog.')) {
        Object.values(state.cards).forEach(c => { if(c.colId===col.id) c.colId='col2'; });
        state.columns = state.columns.filter(c => c.id !== col.id);
        saveState();
        closeModal(modal);
        renderView();
      }
    });
  }
}

function openColumnMenu(colId, btn) {
  const existing = document.getElementById('crm-col-menu-popup');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.id = 'crm-col-menu-popup';
  menu.className = 'crm-dropdown-menu';
  menu.innerHTML = `
    <button data-action="edit">✏️ Editar coluna</button>
    <button data-action="delete" style="color:#f44336">🗑️ Excluir coluna</button>
  `;
  const rect = btn.getBoundingClientRect();
  menu.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;z-index:99999;`;
  document.body.appendChild(menu);
  menu.querySelector('[data-action=edit]').addEventListener('click', () => { menu.remove(); openColumnModal(colId); });
  menu.querySelector('[data-action=delete]').addEventListener('click', () => { menu.remove(); openColumnModal(colId); });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), {once:true}), 100);
}

// ============ CHATS VIEW ============
function renderChats(container) {
  container.className = 'crm-chats-view';
  const waChats = document.querySelectorAll('[data-testid="cell-frame-container"]');
  let chatList = '<div class="crm-chat-list">';
  if (waChats.length > 0) {
    waChats.forEach(chat => {
      const name = chat.querySelector('[data-testid="cell-frame-title"]')?.textContent || '—';
      const msg = chat.querySelector('[data-testid="last-msg"]')?.textContent || '';
      const time = chat.querySelector('.x1rg5ohu')?.textContent || '';
      chatList += `<div class="crm-chat-item" onclick="document.querySelectorAll('[data-testid=cell-frame-container]').forEach((c,i)=>{if(i==${Array.from(waChats).indexOf(chat)})c.click()})">
        <div class="crm-chat-avatar">💬</div>
        <div class="crm-chat-info"><div class="crm-chat-name">${name}</div><div class="crm-chat-msg">${msg.substring(0,50)}</div></div>
        <div class="crm-chat-time">${time}</div>
      </div>`;
    });
  } else {
    chatList += '<div class="crm-empty">Abra o WhatsApp Web para ver os chats aqui</div>';
  }
  chatList += '</div>';
  container.innerHTML = `<div class="crm-section-header"><h4>💬 Conversas Recentes (${waChats.length})</h4></div>${chatList}`;
}

// ============ AGENDA VIEW ============
function renderAgenda(container) {
  container.className = 'crm-agenda-view';
  const today = new Date();
  const appts = state.appointments.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  container.innerHTML = `
    <div class="crm-section-header">
      <h4>📅 Agenda</h4>
      <button class="crm-btn-primary" id="agenda-new">+ Novo Compromisso</button>
    </div>
    <div class="crm-agenda-list">
      ${appts.length ? appts.map(a => `
        <div class="crm-appt-item">
          <div class="crm-appt-dot" style="background:${a.color||'#25D366'}"></div>
          <div class="crm-appt-info">
            <div class="crm-appt-title">${a.title}</div>
            <div class="crm-appt-time">📅 ${new Date(a.datetime).toLocaleString('pt-BR')}</div>
            ${a.contact ? `<div class="crm-appt-contact">👤 ${a.contact}</div>` : ''}
          </div>
          <button class="crm-appt-delete" data-id="${a.id}">✕</button>
        </div>
      `).join('') : '<div class="crm-empty">Nenhum compromisso agendado</div>'}
    </div>
  `;
  container.querySelector('#agenda-new')?.addEventListener('click', openAgendaModal);
  container.querySelectorAll('.crm-appt-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      state.appointments = state.appointments.filter(a => a.id !== btn.dataset.id);
      saveState();
      renderView();
    });
  });
}

function openAgendaModal() {
  const modal = createModal('agenda-modal', `
    <div class="crm-modal-header"><h3>Novo Compromisso</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-body">
      <label>Título *</label>
      <input id="ag-title" type="text" placeholder="Ex: Reunião com cliente" />
      <label>Data e Hora *</label>
      <input id="ag-datetime" type="datetime-local" />
      <label>Contato</label>
      <input id="ag-contact" type="text" placeholder="Nome do cliente" />
      <label>Observação</label>
      <textarea id="ag-notes" placeholder="Detalhes..."></textarea>
    </div>
    <div class="crm-modal-footer">
      <button class="crm-btn-secondary crm-modal-close-btn">Cancelar</button>
      <button class="crm-btn-primary" id="ag-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#ag-save').addEventListener('click', () => {
    const title = modal.querySelector('#ag-title').value.trim();
    const dt = modal.querySelector('#ag-datetime').value;
    if (!title || !dt) { alert('Título e data obrigatórios'); return; }
    state.appointments.push({
      id: 'appt_'+Date.now(), title, datetime: dt,
      contact: modal.querySelector('#ag-contact').value.trim(),
      notes: modal.querySelector('#ag-notes').value.trim(),
      color: '#25D366'
    });
    saveState();
    closeModal(modal);
    renderView();
  });
}

// ============ AUTOMATION VIEW ============
function renderAutomation(container) {
  container.className = 'crm-automation-view';
  container.innerHTML = `
    <div class="crm-section-header">
      <h4>⚡ Automações</h4>
      <button class="crm-btn-primary" id="auto-new">+ Nova Automação</button>
    </div>
    <div class="crm-auto-list">
      ${state.automations.length ? state.automations.map(a => `
        <div class="crm-auto-item ${a.active?'active':'inactive'}">
          <div class="crm-auto-toggle">
            <label class="crm-switch">
              <input type="checkbox" ${a.active?'checked':''} data-autoid="${a.id}">
              <span class="crm-slider"></span>
            </label>
          </div>
          <div class="crm-auto-info">
            <div class="crm-auto-title">${a.name}</div>
            <div class="crm-auto-desc">Quando <b>${a.trigger}</b> → <b>${a.action}</b></div>
          </div>
          <button class="crm-auto-delete" data-autoid="${a.id}">🗑️</button>
        </div>
      `).join('') : `
        <div class="crm-auto-empty">
          <div class="crm-empty-icon">⚡</div>
          <p>Nenhuma automação criada</p>
          <p style="font-size:12px;color:#8696a0">Crie regras automáticas para organizar seus leads</p>
        </div>
      `}
    </div>
  `;
  container.querySelector('#auto-new')?.addEventListener('click', openAutoModal);
  container.querySelectorAll('[data-autoid]').forEach(el => {
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        const auto = state.automations.find(a => a.id === el.dataset.autoid);
        if (auto) { auto.active = el.checked; saveState(); }
      });
    } else {
      el.addEventListener('click', () => {
        state.automations = state.automations.filter(a => a.id !== el.dataset.autoid);
        saveState(); renderView();
      });
    }
  });
}

function openAutoModal() {
  const modal = createModal('auto-modal', `
    <div class="crm-modal-header"><h3>Nova Automação</h3><button class="crm-modal-close">✕</button></div>
    <div class="crm-modal-body">
      <label>Nome da automação *</label>
      <input id="auto-name" type="text" placeholder="Ex: Mover para Concluído" />
      <label>Gatilho (Quando...)</label>
      <select id="auto-trigger">
        <option value="Card movido para coluna">Card movido para coluna</option>
        <option value="Novo card criado">Novo card criado</option>
        <option value="Card com etiqueta">Card com etiqueta</option>
      </select>
      <label>Coluna Alvo</label>
      <select id="auto-trigcol">
        ${state.columns.map(c => `<option value="${c.label}">${c.label}</option>`).join('')}
      </select>
      <label>Ação (Fazer...)</label>
      <select id="auto-action">
        <option value="Notificar via alert">Notificar via alert</option>
        <option value="Marcar como prioridade">Marcar como prioridade</option>
        <option value="Adicionar etiqueta">Adicionar etiqueta</option>
      </select>
    </div>
    <div class="crm-modal-footer">
      <button class="crm-btn-secondary crm-modal-close-btn">Cancelar</button>
      <button class="crm-btn-primary" id="auto-save">Salvar</button>
    </div>
  `);
  modal.querySelector('#auto-save').addEventListener('click', () => {
    const name = modal.querySelector('#auto-name').value.trim();
    if (!name) return;
    state.automations.push({
      id: 'auto_'+Date.now(), name, active: true,
      trigger: modal.querySelector('#auto-trigger').value + ': ' + modal.querySelector('#auto-trigcol').value,
      action: modal.querySelector('#auto-action').value
    });
    saveState(); closeModal(modal); renderView();
  });
}

function runAutomations(event, data) {
  state.automations.filter(a => a.active).forEach(a => {
    if (event === 'move' && a.trigger.includes('movido')) {
      const col = state.columns.find(c => c.id === data.colId);
      if (col && a.trigger.includes(col.label)) {
        if (a.action.includes('Notificar')) alert(`Automação: "${a.name}" ativada!`);
      }
    }
  });
}

// ============ REPORTS VIEW ============
function renderReports(container) {
  container.className = 'crm-reports-view';
  const total = Object.keys(state.cards).length;
  const byCol = {};
  state.columns.forEach(c => { byCol[c.id] = {label:c.label, count:0, value:0, color:c.color}; });
  Object.values(state.cards).forEach(card => {
    if (byCol[card.colId]) {
      byCol[card.colId].count++;
      byCol[card.colId].value += parseFloat((card.value||'0').replace(',','.')) || 0;
    }
  });
  const totalValue = Object.values(byCol).reduce((s,c) => s+c.value, 0);
  container.innerHTML = `
    <div class="crm-section-header"><h4>📊 Relatórios e Métricas</h4></div>
    <div class="crm-metrics-grid">
      <div class="crm-metric-card">
        <div class="crm-metric-value">${total}</div>
        <div class="crm-metric-label">Total de Leads</div>
      </div>
      <div class="crm-metric-card">
        <div class="crm-metric-value">R$ ${totalValue.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        <div class="crm-metric-label">Valor Total</div>
      </div>
      <div class="crm-metric-card">
        <div class="crm-metric-value">${state.automations.filter(a=>a.active).length}</div>
        <div class="crm-metric-label">Automações Ativas</div>
      </div>
      <div class="crm-metric-card">
        <div class="crm-metric-value">${state.appointments.length}</div>
        <div class="crm-metric-label">Compromissos</div>
      </div>
    </div>
    <div class="crm-funnel-report">
      <h4>Distribuição por Coluna</h4>
      ${Object.values(byCol).map(c => `
        <div class="crm-report-row">
          <span class="crm-report-col" style="border-left:3px solid ${c.color}">${c.label}</span>
          <div class="crm-report-bar-wrap">
            <div class="crm-report-bar" style="width:${total?Math.round(c.count/total*100):0}%;background:${c.color}"></div>
          </div>
          <span class="crm-report-num">${c.count} leads</span>
          <span class="crm-report-val">R$ ${c.value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ============ MODAL HELPERS ============
function createModal(id, html) {
  const overlay = document.createElement('div');
  overlay.className = 'crm-modal-overlay';
  overlay.id = id;
  overlay.innerHTML = `<div class="crm-modal">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.crm-modal-close, .crm-modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal(overlay));
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
  return overlay;
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) overlay.remove();
}

// ============ EVENT ATTACHMENT ============
function attachEvents() {
  // Nav buttons
  document.querySelectorAll('.crm-nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.crm-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;
      renderView();
    });
  });
  // Add button
  document.getElementById('crm-add-btn')?.addEventListener('click', () => {
    if (state.currentView === 'funnel') openCardModal(null, state.columns[0]?.id);
    else if (state.currentView === 'agenda') openAgendaModal();
    else if (state.currentView === 'automation') openAutoModal();
  });
  // Search
  document.getElementById('crm-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.crm-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
  // Hide sidebar
  document.getElementById('crm-hide-btn')?.addEventListener('click', () => {
    panel.classList.toggle('sidebar-collapsed');
  });
}

// ============ INIT ============
function init() {
  if (document.getElementById('crm-panel')) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    setTimeout(createPanel, 2000);
  }
}

// Listen for popup messages
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'togglePanel') {
    const p = document.getElementById('crm-panel');
    if (p) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
  }
});

init();
})();

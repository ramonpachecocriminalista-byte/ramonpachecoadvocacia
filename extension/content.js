// CRM Funil - Ramon Pacheco Advocacia v4.0
// Apenas: Chat WhatsApp + Funil Kanban funcional
(function() {
'use strict';

const STORAGE_KEY = 'crm_funil_v4';

let state = {
  columns: [
    {id:'col1', label:'Backlog', color:'#8696a0'},
    {id:'col2', label:'Prioridade', color:'#FFC107'},
    {id:'col3', label:'Em Andamento', color:'#2196F3'},
    {id:'col4', label:'Aguardando', color:'#FF9800'},
    {id:'col5', label:'Concluido', color:'#4CAF50'}
  ],
  cards: {}
};

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
}

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.columns) state.columns = parsed.columns;
      if (parsed.cards) state.cards = parsed.cards;
    }
  } catch(e){}
}

function genId() {
  return 'c' + Date.now() + Math.random().toString(36).substr(2,5);
}

function createPanel() {
  if (document.getElementById('crm-funil-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'crm-funil-panel';
  panel.innerHTML = `
    <div id="crm-header">
      <span id="crm-logo">⚖️</span>
      <span id="crm-title">CRM Advocacia</span>
      <div id="crm-header-btns">
        <button id="crm-btn-chat" class="crm-tab-btn active" title="Conversas">💬</button>
        <button id="crm-btn-funil" class="crm-tab-btn" title="Funil Kanban">📋</button>
      </div>
    </div>
    <div id="crm-body">
      <div id="crm-view-chat" class="crm-view active"></div>
      <div id="crm-view-funil" class="crm-view"></div>
    </div>
  `;
  document.body.appendChild(panel);
  document.getElementById('crm-btn-chat').addEventListener('click', () => switchView('chat'));
  document.getElementById('crm-btn-funil').addEventListener('click', () => switchView('funil'));
  buildChatView();
  buildFunilView();
}

function switchView(view) {
  document.querySelectorAll('.crm-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.crm-tab-btn').forEach(b => b.classList.remove('active'));
  if (view === 'chat') {
    document.getElementById('crm-view-chat').classList.add('active');
    document.getElementById('crm-btn-chat').classList.add('active');
  } else {
    document.getElementById('crm-view-funil').classList.add('active');
    document.getElementById('crm-btn-funil').classList.add('active');
    renderFunil();
  }
}

function buildChatView() {
  const chatView = document.getElementById('crm-view-chat');
  chatView.innerHTML = `
    <div id="crm-chat-search">
      <input id="crm-search-input" type="text" placeholder="Buscar conversa..." />
    </div>
    <div id="crm-contacts-list"></div>
  `;
  document.getElementById('crm-search-input').addEventListener('input', function() {
    filterContacts(this.value.toLowerCase());
  });
  loadContacts();
}

function loadContacts() {
  const list = document.getElementById('crm-contacts-list');
  if (!list) return;
  const waContacts = document.querySelectorAll('[data-testid="cell-frame-container"]');
  const contacts = [];
  waContacts.forEach(el => {
    const nameEl = el.querySelector('[data-testid="cell-frame-title"] span, ._ao3e');
    const msgEl = el.querySelector('[data-testid="last-msg-status"] ~ span, .lhggkp3q');
    const timeEl = el.querySelector('[data-testid="cell-frame-secondary-detail"] span');
    const badgeEl = el.querySelector('[data-testid="icon-unread-count"]');
    if (!nameEl) return;
    const name = (nameEl.innerText || nameEl.textContent || '').trim();
    if (!name) return;
    const msg = msgEl ? (msgEl.innerText || msgEl.textContent || '') : '';
    const time = timeEl ? (timeEl.innerText || timeEl.textContent || '') : '';
    const unread = badgeEl ? parseInt(badgeEl.innerText || '0') : 0;
    const card = state.cards[name];
    const col = card ? state.columns.find(c => c.id === card.column) : null;
    contacts.push({ name, msg, time, unread, el, col, note: card ? card.note : '' });
  });
  list.innerHTML = '';
  if (contacts.length === 0) {
    list.innerHTML = '<div class="crm-empty">Abra o WhatsApp Web para ver conversas</div>';
    return;
  }
  contacts.forEach(c => {
    const item = document.createElement('div');
    item.className = 'crm-contact-item';
    item.dataset.name = c.name.toLowerCase();
    const colBadge = c.col ? `<span class="crm-col-badge" style="background:${c.col.color}">${c.col.label}</span>` : '';
    const unreadBadge = c.unread > 0 ? `<span class="crm-unread-badge">${c.unread}</span>` : '';
    item.innerHTML = `
      <div class="crm-contact-avatar">${c.name.charAt(0).toUpperCase()}</div>
      <div class="crm-contact-info">
        <div class="crm-contact-top">
          <span class="crm-contact-name">${c.name}</span>
          <span class="crm-contact-time">${c.time}</span>
        </div>
        <div class="crm-contact-bottom">
          <span class="crm-contact-msg">${c.msg.substring(0,40)}${c.msg.length>40?'...':''}</span>
          ${unreadBadge}
        </div>
        <div class="crm-contact-tags">
          ${colBadge}
          <button class="crm-btn-assign" data-key="${c.name}" title="Mover para coluna do funil">📌 Funil</button>
        </div>
      </div>
    `;
    item.addEventListener('click', function(e) {
      if (e.target.closest('.crm-btn-assign')) return;
      c.el.click();
    });
    item.querySelector('.crm-btn-assign').addEventListener('click', function(e) {
      e.stopPropagation();
      openAssignModal(c.name);
    });
    list.appendChild(item);
  });
}

function filterContacts(query) {
  document.querySelectorAll('.crm-contact-item').forEach(item => {
    item.style.display = (item.dataset.name || '').includes(query) ? '' : 'none';
  });
}

function openAssignModal(cardKey) {
  let modal = document.getElementById('crm-assign-modal');
  if (modal) modal.remove();
  const card = state.cards[cardKey] || {};
  const colOptions = state.columns.map(c =>
    `<label class="crm-col-option${card.column === c.id ? ' selected' : ''}" data-col="${c.id}">
      <span class="crm-col-dot" style="background:${c.color}"></span>
      <span>${c.label}</span>
      ${card.column === c.id ? '<span class="crm-check">✓</span>' : ''}
    </label>`
  ).join('');
  modal = document.createElement('div');
  modal.id = 'crm-assign-modal';
  modal.innerHTML = `
    <div id="crm-modal-overlay"></div>
    <div id="crm-modal-box">
      <div id="crm-modal-header">
        <strong>📌 Classificar: ${cardKey}</strong>
        <button id="crm-modal-close">✕</button>
      </div>
      <div id="crm-modal-cols">${colOptions}</div>
      <div id="crm-modal-note-area">
        <textarea id="crm-modal-note" placeholder="Observação / motivo (opcional)...">${card.note || ''}</textarea>
      </div>
      <div id="crm-modal-footer">
        <button id="crm-modal-clear" class="crm-btn-secondary">🗑️ Remover do funil</button>
        <button id="crm-modal-save" class="crm-btn-primary">💾 Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  let selectedCol = card.column || null;
  modal.querySelectorAll('.crm-col-option').forEach(opt => {
    opt.addEventListener('click', function() {
      modal.querySelectorAll('.crm-col-option').forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      selectedCol = this.dataset.col;
    });
  });
  document.getElementById('crm-modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('crm-modal-overlay').addEventListener('click', () => modal.remove());
  document.getElementById('crm-modal-clear').addEventListener('click', function() {
    delete state.cards[cardKey];
    saveState();
    modal.remove();
    loadContacts();
  });
  document.getElementById('crm-modal-save').addEventListener('click', function() {
    const note = document.getElementById('crm-modal-note').value.trim();
    if (!selectedCol) { alert('Selecione uma coluna do funil'); return; }
    state.cards[cardKey] = {
      column: selectedCol,
      note: note,
      name: cardKey,
      updatedAt: new Date().toLocaleString('pt-BR')
    };
    saveState();
    modal.remove();
    loadContacts();
  });
}

function buildFunilView() {
  const funilView = document.getElementById('crm-view-funil');
  funilView.innerHTML = `
    <div id="crm-funil-toolbar">
      <span id="crm-funil-title">📋 Funil de Leads</span>
      <button id="crm-btn-new-col">+ Coluna</button>
      <button id="crm-btn-refresh-funil">↻</button>
    </div>
    <div id="crm-kanban-board"></div>
  `;
  document.getElementById('crm-btn-new-col').addEventListener('click', () => openColumnModal(null));
  document.getElementById('crm-btn-refresh-funil').addEventListener('click', () => { loadContacts(); renderFunil(); });
  renderFunil();
}

function renderFunil() {
  const board = document.getElementById('crm-kanban-board');
  if (!board) return;
  board.innerHTML = '';
  state.columns.forEach(col => {
    const cardsInCol = Object.entries(state.cards).filter(([k,v]) => v.column === col.id);
    const colEl = document.createElement('div');
    colEl.className = 'crm-kanban-col';
    colEl.dataset.colId = col.id;
    colEl.innerHTML = `
      <div class="crm-kanban-col-header" style="border-top:3px solid ${col.color}">
        <div class="crm-kanban-col-title">
          <span class="crm-kanban-col-dot" style="background:${col.color}"></span>
          <span class="crm-kanban-col-label">${col.label}</span>
          <span class="crm-kanban-col-count">${cardsInCol.length}</span>
        </div>
        <div class="crm-kanban-col-actions">
          <button class="crm-col-edit-btn" data-col="${col.id}">✏️</button>
          <button class="crm-col-del-btn" data-col="${col.id}">🗑️</button>
        </div>
      </div>
      <div class="crm-kanban-cards" data-col="${col.id}"></div>
    `;
    const cardsContainer = colEl.querySelector('.crm-kanban-cards');
    cardsInCol.forEach(([cardKey, cardData]) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'crm-kanban-card';
      cardEl.draggable = true;
      cardEl.dataset.card = cardKey;
      const initials = cardKey.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
      cardEl.innerHTML = `
        <div class="crm-card-top">
          <div class="crm-card-avatar" style="background:${col.color}33;color:${col.color}">${initials}</div>
          <div class="crm-card-info">
            <div class="crm-card-name">${cardKey}</div>
            <div class="crm-card-time">${cardData.updatedAt || ''}</div>
          </div>
          <button class="crm-card-menu-btn" data-card="${cardKey}">✏️</button>
        </div>
        ${cardData.note ? `<div class="crm-card-note">${cardData.note}</div>` : ''}
      `;
      cardEl.addEventListener('dragstart', function(e) {
        dragCard = this.dataset.card;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      cardEl.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.crm-kanban-col.drag-over').forEach(c => c.classList.remove('drag-over'));
      });
      cardEl.querySelector('.crm-card-menu-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        openAssignModal(cardKey);
      });
      cardEl.addEventListener('click', function(e) {
        if (e.target.closest('.crm-card-menu-btn')) return;
        const wa = findWAContact(cardKey);
        if (wa) { wa.click(); switchView('chat'); }
      });
      cardsContainer.appendChild(cardEl);
    });
    if (cardsInCol.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'crm-kanban-empty';
      empty.textContent = 'Nenhum lead aqui';
      cardsContainer.appendChild(empty);
    }
    cardsContainer.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.closest('.crm-kanban-col').classList.add('drag-over');
    });
    cardsContainer.addEventListener('dragleave', function() {
      this.closest('.crm-kanban-col').classList.remove('drag-over');
    });
    cardsContainer.addEventListener('drop', function(e) {
      e.preventDefault();
      const colId = this.dataset.col;
      this.closest('.crm-kanban-col').classList.remove('drag-over');
      if (!dragCard || !colId) return;
      if (state.cards[dragCard]) {
        state.cards[dragCard].column = colId;
        state.cards[dragCard].updatedAt = new Date().toLocaleString('pt-BR');
        saveState();
        renderFunil();
      }
    });
    colEl.querySelector('.crm-col-edit-btn').addEventListener('click', function() {
      const c = state.columns.find(x => x.id === col.id);
      if (c) openColumnModal(c);
    });
    colEl.querySelector('.crm-col-del-btn').addEventListener('click', function() {
      const cardsCount = Object.values(state.cards).filter(c => c.column === col.id).length;
      const msg = cardsCount > 0
        ? `Excluir "${col.label}"? Os ${cardsCount} lead(s) tambem serao removidos.`
        : `Excluir a coluna "${col.label}"?`;
      if (!confirm(msg)) return;
      state.columns = state.columns.filter(c => c.id !== col.id);
      Object.keys(state.cards).forEach(k => {
        if (state.cards[k].column === col.id) delete state.cards[k];
      });
      saveState();
      renderFunil();
    });
    board.appendChild(colEl);
  });
}

let dragCard = null;

function findWAContact(name) {
  for (let el of document.querySelectorAll('[data-testid="cell-frame-container"]')) {
    const nameEl = el.querySelector('[data-testid="cell-frame-title"] span, ._ao3e');
    if (nameEl && (nameEl.innerText || nameEl.textContent || '').trim() === name) return el;
  }
  return null;
}

function openColumnModal(col) {
  let modal = document.getElementById('crm-col-modal');
  if (modal) modal.remove();
  const isEdit = !!col;
  const colors = ['#8696a0','#FFC107','#2196F3','#FF9800','#4CAF50','#E91E63','#9C27B0','#F44336','#00BCD4','#795548'];
  modal = document.createElement('div');
  modal.id = 'crm-col-modal';
  modal.innerHTML = `
    <div id="crm-modal-overlay"></div>
    <div id="crm-modal-box">
      <div id="crm-modal-header">
        <strong>${isEdit ? 'Editar Coluna' : 'Nova Coluna'}</strong>
        <button id="crm-col-modal-close">✕</button>
      </div>
      <div style="padding:16px">
        <label class="crm-form-label">Nome da coluna</label>
        <input id="crm-col-name" type="text" placeholder="Ex: Proposta Enviada" value="${isEdit ? col.label : ''}" class="crm-form-input" />
        <label class="crm-form-label" style="margin-top:12px">Cor</label>
        <div id="crm-col-colors" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          ${colors.map(c => `<div class="crm-color-pick${isEdit && col.color===c?' active':''}" data-color="${c}" style="background:${c};width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid ${isEdit && col.color===c?'#fff':'transparent'}"></div>`).join('')}
        </div>
      </div>
      <div id="crm-modal-footer">
        <button id="crm-col-modal-cancel" class="crm-btn-secondary">Cancelar</button>
        <button id="crm-col-modal-save" class="crm-btn-primary">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  let selectedColor = isEdit ? col.color : colors[0];
  modal.querySelectorAll('.crm-color-pick').forEach(cp => {
    cp.addEventListener('click', function() {
      modal.querySelectorAll('.crm-color-pick').forEach(x => x.style.border='2px solid transparent');
      this.style.border = '2px solid #fff';
      selectedColor = this.dataset.color;
    });
  });
  document.getElementById('crm-col-modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('crm-col-modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('crm-modal-overlay').addEventListener('click', () => modal.remove());
  document.getElementById('crm-col-modal-save').addEventListener('click', function() {
    const name = document.getElementById('crm-col-name').value.trim();
    if (!name) { alert('Digite o nome da coluna'); return; }
    if (isEdit) {
      col.label = name;
      col.color = selectedColor;
    } else {
      state.columns.push({ id: genId(), label: name, color: selectedColor });
    }
    saveState();
    modal.remove();
    renderFunil();
  });
}

function injectBadgesOnWA() {
  document.querySelectorAll('[data-testid="cell-frame-container"]').forEach(el => {
    const nameEl = el.querySelector('[data-testid="cell-frame-title"] span, ._ao3e');
    if (!nameEl) return;
    const name = (nameEl.innerText || nameEl.textContent || '').trim();
    if (!name) return;
    const card = state.cards[name];
    const existing = el.querySelector('.crm-wa-badge');
    if (card) {
      const c = state.columns.find(x => x.id === card.column);
      if (c) {
        if (existing) {
          existing.textContent = c.label;
          existing.style.background = c.color;
        } else {
          const badge = document.createElement('span');
          badge.className = 'crm-wa-badge';
          badge.textContent = c.label;
          badge.style.cssText = `background:${c.color};color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:6px;vertical-align:middle;font-family:sans-serif;pointer-events:none`;
          if (nameEl.parentNode) nameEl.parentNode.appendChild(badge);
        }
      }
    } else if (existing) {
      existing.remove();
    }
  });
}

function init() {
  loadState();
  createPanel();
  injectBadgesOnWA();
  const observer = new MutationObserver(() => {
    injectBadgesOnWA();
    const chatView = document.getElementById('crm-view-chat');
    if (chatView && chatView.classList.contains('active')) loadContacts();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(injectBadgesOnWA, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 1500);
}

})();

// WA CRM - v5 FINAL - Ramon Pacheco Advocacia
(function() {
  'use strict';
  const SB_URL = 'https://dgtoadxfwvkbefaacjfo.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndG9hZHhmd3ZrYmVmYWFjamZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQ4MzAsImV4cCI6MjA1ODAwMDgzMH0.lHDmS9Z7v_9yrtqgGELRN6HKjL8YSoHZJoqBlE9yXbM';
  const STAGES = [
    {id:'all', label:'Todas', color:'#aaa'},
    {id:'lead', label:'Lead Novo', color:'#25D366'},
    {id:'analysis', label:'Em Analise', color:'#FFC107'},
    {id:'proposal', label:'Proposta', color:'#9C27B0'},
    {id:'won', label:'Ganhou', color:'#2196F3'},
    {id:'lost', label:'Perdeu', color:'#F44336'}
  ];
  let contacts = {};
  let curStage = 'all';
  let kanbanMode = false;

  function norm(p){ return (p+'').replace(/\D/g,''); }

  async function sbReq(path, opts){
    opts = opts || {};
    const r = await fetch(SB_URL+path, Object.assign({}, opts, {
      headers: Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=representation'}, opts.headers||{})
    }));
    if(!r.ok) return null;
    return r.json();
  }

  async function loadContacts(){
    const d = await sbReq('/rest/v1/contacts?select=id,name,phone,stage&limit=1000');
    if(d){ contacts={}; d.forEach(function(c){ if(c.phone) contacts[norm(c.phone)]=c; }); }
  }

  async function saveContact(phone, name, stage){
    const k = norm(phone||name);
    const ex = contacts[k];
    if(ex){
      const u = await sbReq('/rest/v1/contacts?id=eq.'+ex.id, {method:'PATCH', body:JSON.stringify({stage:stage, name:name||ex.name})});
      if(u&&u[0]) contacts[k] = Object.assign({}, ex, {stage:stage, name:name||ex.name});
    } else {
      const cr = await sbReq('/rest/v1/contacts', {method:'POST', body:JSON.stringify({phone:k, name:name||phone, stage:stage, source:'whatsapp'})});
      if(cr&&cr[0]) contacts[k]=cr[0];
    }
    render();
  }

  function getConvs(){
    const items = document.querySelectorAll('[data-testid="cell-frame-container"]');
    const res = [];
    items.forEach(function(item){
      try {
        const nameEl = item.querySelector('span[data-testid="cell-frame-title"]') || item.querySelector('span[title]');
        const name = nameEl ? (nameEl.getAttribute('title')||nameEl.textContent||'').trim() : '';
        if(!name) return;
        const timeEl = item.querySelector('[data-testid="cell-frame-time"]');
        const msgEl = item.querySelector('._9sL0o span') || item.querySelector('.ItVgJ');
        const badgeEl = item.querySelector('[data-testid="icon-unread-count"]');
        const k = norm(name);
        const c = contacts[k];
        res.push({
          key:k, name:name,
          time: timeEl ? timeEl.textContent.trim() : '',
          msg: msgEl ? msgEl.textContent.trim() : '',
          unread: badgeEl ? (parseInt(badgeEl.textContent)||0) : 0,
          stage: c ? c.stage : 'lead',
          el: item
        });
      } catch(e){}
    });
    return res;
  }

  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function buildUI(){
    if(document.getElementById('wcrm-root')) return;
    const pane = document.querySelector('#pane-side');
    if(!pane) return;

    // Inject styles
    if(!document.getElementById('wcrm-css')){
      const st = document.createElement('style');
      st.id = 'wcrm-css';
      st.textContent = '#wcrm-root{background:#111b21;font-family:-apple-system,sans-serif;position:relative;z-index:10;flex-shrink:0}' +
        '#wcrm-tabs{display:flex;align-items:center;padding:4px 6px 0;gap:2px;overflow-x:auto;scrollbar-width:none}' +
        '#wcrm-tabs::-webkit-scrollbar{display:none}' +
        '.wt{display:flex;align-items:center;gap:3px;padding:5px 8px;border-radius:6px 6px 0 0;cursor:pointer;font-size:11.5px;font-weight:500;color:#8696a0;background:transparent;border:none;outline:none;white-space:nowrap;border-bottom:2px solid transparent}' +
        '.wt:hover{color:#e9edef;background:#1e2e35}' +
        '.wt.act{color:#00a884;background:#1e2e35;border-bottom-color:#00a884}' +
        '.wb{background:#00a884;color:#fff;border-radius:10px;padding:0 5px;font-size:10px;font-weight:700;min-width:16px;text-align:center;display:inline-block}' +
        '.wb.z{background:#2a3942;color:#5c6e78}' +
        '#wcrm-bar{padding:3px 8px 4px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2a3942;font-size:11px;color:#8696a0}' +
        '#wcrm-toggle{background:#1e2e35;border:1px solid #2a3942;color:#8696a0;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:11px}' +
        '#wcrm-toggle:hover{color:#00a884;border-color:#00a884}' +
        '#wcrm-kanban{display:none;padding:6px;gap:6px;overflow-x:auto;min-height:60px;scrollbar-width:thin;scrollbar-color:#2a3942 transparent}' +
        '#wcrm-kanban.vis{display:flex}' +
        '.wkcol{min-width:160px;max-width:160px;background:#1e2e35;border-radius:6px;padding:6px;flex-shrink:0;border-top:3px solid #2a3942}' +
        '.wkth{font-size:10px;font-weight:700;color:#8696a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:flex;justify-content:space-between}' +
        '.wkcard{background:#2a3942;border-radius:5px;padding:7px;margin-bottom:5px;cursor:pointer;border-left:3px solid transparent;transition:background .15s}' +
        '.wkcard:hover{background:#3b4a54}' +
        '.wkcn{font-size:12px;font-weight:600;color:#e9edef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.wkcm{font-size:10.5px;color:#8696a0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}' +
        '.wkct{font-size:9px;color:#5c6e78;text-align:right;margin-top:2px}';
      document.head.appendChild(st);
    }

    const root = document.createElement('div');
    root.id = 'wcrm-root';

    // Build tabs HTML
    let tabsHtml = '<div id="wcrm-tabs">';
    STAGES.forEach(function(s){
      const act = curStage===s.id ? ' act' : '';
      tabsHtml += '<button class="wt'+act+'" data-stage="'+s.id+'">'+esc(s.label)+' <span class="wb z" data-badge="'+s.id+'">0</span></button>';
    });
    tabsHtml += '</div>';

    root.innerHTML = tabsHtml +
      '<div id="wcrm-bar"><span id="wcrm-info">Carregando...</span><button id="wcrm-toggle">&#8862; Kanban</button></div>' +
      '<div id="wcrm-kanban"></div>';

    // Insert as FIRST child of pane-side
    pane.insertBefore(root, pane.firstChild);

    // Tab click events
    root.querySelectorAll('.wt').forEach(function(btn){
      btn.addEventListener('click', function(){
        curStage = btn.dataset.stage;
        root.querySelectorAll('.wt').forEach(function(b){ b.classList.toggle('act', b.dataset.stage===curStage); });
        render();
      });
    });

    // Toggle kanban
    document.getElementById('wcrm-toggle').addEventListener('click', function(){
      kanbanMode = !kanbanMode;
      const k = document.getElementById('wcrm-kanban');
      k.classList.toggle('vis', kanbanMode);
      this.textContent = kanbanMode ? '⊠ Lista' : '⊢ Kanban';
    });

    render();
  }

  function render(){
    const root = document.getElementById('wcrm-root');
    if(!root) return;
    const convs = getConvs();

    // Update badges
    STAGES.forEach(function(s){
      const badge = root.querySelector('[data-badge="'+s.id+'"]');
      if(!badge) return;
      const cnt = s.id==='all' ? convs.length : convs.filter(function(c){ return c.stage===s.id; }).length;
      badge.textContent = cnt;
      badge.className = 'wb' + (cnt===0?' z':'');
    });

    // Update info bar
    const info = document.getElementById('wcrm-info');
    if(info){
      if(curStage==='all'){ info.textContent = convs.length+' conversas'; }
      else {
        const filtered = convs.filter(function(c){ return c.stage===curStage; });
        const sLabel = (STAGES.find(function(s){ return s.id===curStage; })||{}).label||curStage;
        info.textContent = sLabel+': '+filtered.length+' contatos';
      }
    }

    // Filter list view
    const items = document.querySelectorAll('[data-testid="cell-frame-container"]');
    if(curStage==='all'){
      items.forEach(function(item){ item.style.display=''; });
    } else {
      const mapped = {};
      convs.forEach(function(c){ if(c.el) mapped[c.key]=c; });
      convs.forEach(function(c){ if(c.el) c.el.style.display=(c.stage===curStage?'':'none'); });
      items.forEach(function(item){
        const nEl = item.querySelector('span[data-testid="cell-frame-title"]')||item.querySelector('span[title]');
        const n = nEl?(nEl.getAttribute('title')||nEl.textContent||'').trim():'';
        if(!mapped[norm(n)]) item.style.display='';
      });
    }

    // Kanban
    const kanban = document.getElementById('wcrm-kanban');
    if(!kanban) return;
    kanban.innerHTML = '';
    STAGES.filter(function(s){ return s.id!=='all'; }).forEach(function(s){
      const sc = convs.filter(function(c){ return c.stage===s.id; });
      const col = document.createElement('div');
      col.className = 'wkcol';
      col.style.borderTopColor = s.color;
      let cards = '';
      sc.forEach(function(conv){
        cards += '<div class="wkcard" data-key="'+esc(conv.key)+'" style="border-left-color:'+s.color+'"><div class="wkcn">'+esc(conv.name)+'</div><div class="wkcm">'+esc(conv.msg||'...')+'</div><div class="wkct">'+esc(conv.time)+'</div></div>';
      });
      if(!sc.length) cards = '<div style="color:#3b4a54;font-size:11px;text-align:center;padding:8px">Vazio</div>';
      col.innerHTML = '<div class="wkth"><span>'+esc(s.label)+'</span><span class="wb'+(sc.length===0?' z':'')+'">'+sc.length+'</span></div>'+cards;
      col.querySelectorAll('.wkcard').forEach(function(card, i){
        card.addEventListener('click', function(){ if(sc[i]&&sc[i].el) sc[i].el.click(); });
      });
      kanban.appendChild(col);
    });
  }

  // Watch for new conversations
  function watchNewContacts(){
    const list = document.querySelector('[data-testid="chat-list"]');
    if(!list) return;
    const obs = new MutationObserver(function(muts){
      let changed = false;
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(n.nodeType===1 && n.querySelector && n.querySelector('[data-testid="cell-frame-container"]')){
            changed = true;
            const item = n.querySelector('[data-testid="cell-frame-container"]');
            const nEl = item ? (item.querySelector('span[data-testid="cell-frame-title"]')||item.querySelector('span[title]')) : null;
            const name = nEl ? (nEl.getAttribute('title')||nEl.textContent||'').trim() : '';
            if(name && !contacts[norm(name)]){
              saveContact(name, name, 'lead');
            }
          }
        });
      });
      if(changed) render();
    });
    obs.observe(list, {childList:true, subtree:true});
  }

  function init(){
    if(document.getElementById('wcrm-root')) return;
    loadContacts().then(function(){
      buildUI();
      watchNewContacts();
    });
  }

  // Multiple attempts to ensure injection
  function tryInit(){
    if(document.querySelector('#pane-side')){
      init();
    }
  }

  [500, 1500, 3000, 5000, 8000].forEach(function(t){
    setTimeout(tryInit, t);
  });

  // MutationObserver on body for SPA navigation
  const bodyObs = new MutationObserver(function(){
    if(!document.getElementById('wcrm-root') && document.querySelector('#pane-side')){
      init();
    }
  });
  bodyObs.observe(document.body, {childList:true, subtree:false});

})();

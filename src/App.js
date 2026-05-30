import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ============================================================
// DESIGN SYSTEM - CORES E ESTILOS
// ============================================================
const C = {
  bg: '#0a0b0f',
  surface: '#13151f',
  surfaceHover: '#1a1d2e',
  border: '#1e2235',
  borderHover: '#2d3456',
  accent: '#6366f1',
  accentHover: '#5558e8',
  accentGlow: 'rgba(99,102,241,0.15)',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textSub: '#94a3b8',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#10b981',
  gray: '#6b7280',
};

const S = {
  app: { fontFamily: "'Inter', 'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', color: C.text },
  sidebar: { width: 240, background: C.surface, height: '100vh', position: 'fixed', left: 0, top: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid ' + C.border, zIndex: 100 },
  mainContent: { marginLeft: 240, padding: '28px 32px', minHeight: '100vh' },
  card: { background: C.surface, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 },
  input: { background: '#0d0e16', border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' },
  label: { fontSize: 12, color: C.textMuted, marginBottom: 6, display: 'block', fontWeight: 500, letterSpacing: 0.3 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
  modalBox: { background: C.surface, border: '1px solid ' + C.borderHover, borderRadius: 18, padding: 32, width: 500, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' },
};

const btn = (variant = 'primary', extra = {}) => ({
  padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: variant === 'primary' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : variant === 'danger' ? C.danger : variant === 'success' ? C.green : variant === 'outline' ? 'transparent' : '#1e2235',
  color: variant === 'outline' ? C.textSub : '#fff',
  border: variant === 'outline' ? '1px solid ' + C.border : 'none',
  transition: 'all 0.2s', ...extra
});

const badge = (color, text) => (
  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color: color, letterSpacing: 0.3 }}>{text}</span>
);

const KANBAN_COLS = [
  { id: 'novo', label: 'Lead Novo', color: C.blue, dot: '#3b82f6' },
  { id: 'qualificando', label: 'Em Análise', color: C.warning, dot: '#f59e0b' },
  { id: 'proposta', label: 'Proposta', color: C.purple, dot: '#a855f7' },
  { id: 'fechado', label: 'Cliente Ativo', color: C.green, dot: '#10b981' },
  { id: 'perdido', label: 'Arquivado', color: C.gray, dot: '#6b7280' },
];

// ============================================================
// LOGIN
// ============================================================
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email ou senha incorretos');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)' }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>⚖️</div>
          <h1 style={{ color: C.text, margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>O Advogado do Brasileiro</h1>
          <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>Acesse o painel interno</p>
        </div>
        <div style={{ ...S.card, borderRadius: 18 }}>
          {error && <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 18 }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Senha</label>
              <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button style={{ ...btn('primary'), width: '100%', padding: '12px', fontSize: 14, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }} type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KANBAN CARD
// ============================================================
function KanbanCard({ contact, onEdit }) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const col = KANBAN_COLS.find(c => c.id === contact.status);

  return (
    <div
      draggable
      onDragStart={(e) => { setDragging(true); e.dataTransfer.setData('contactId', contact.id); e.dataTransfer.setData('fromStatus', contact.status); }}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(contact)}
      style={{
        background: hover ? C.surfaceHover : '#0d0e16',
        border: '1px solid ' + (hover ? C.borderHover : C.border),
        borderRadius: 12, padding: '14px 16px', marginBottom: 10,
        cursor: 'pointer', opacity: dragging ? 0.4 : 1,
        transition: 'all 0.18s', boxShadow: hover ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        transform: hover ? 'translateY(-1px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: C.text, lineHeight: 1.4, flex: 1 }}>{contact.name}</div>
        {contact.phone && (
          <button
            style={{ ...btn('outline', { padding: '3px 8px', fontSize: 11, marginLeft: 8, flexShrink: 0 }) }}
            onClick={(e) => { e.stopPropagation(); window.open('https://wa.me/' + contact.phone.replace(/\D/g, ''), '_blank'); }}
            title="Abrir WhatsApp"
          >💬</button>
        )}
      </div>
      {contact.service && (
        <div style={{ fontSize: 12, color: C.accent, marginBottom: 8, background: C.accentGlow, borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>
          {contact.service}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {contact.phone && <div style={{ fontSize: 11, color: C.textMuted }}>📱 {contact.phone}</div>}
        <div style={{ fontSize: 10, color: C.textMuted, marginLeft: 'auto' }}>{new Date(contact.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      {contact.origin && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>📌 {contact.origin}</div>}
    </div>
  );
}

// ============================================================
// KANBAN PAGE
// ============================================================
function KanbanPage({ profile }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [search, setSearch] = useState('');

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleDrop = async (e, toStatus) => {
    e.preventDefault();
    setDragOver(null);
    const contactId = e.dataTransfer.getData('contactId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    if (fromStatus === toStatus) return;
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status: toStatus } : c));
    await supabase.from('contacts').update({ status: toStatus }).eq('id', contactId);
  };

  const filtered = contacts.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.service?.toLowerCase().includes(search.toLowerCase())
  );
  const getByStatus = (status) => filtered.filter(c => c.status === status);
  const total = contacts.length;
  const ativos = contacts.filter(c => c.status === 'fechado').length;
  const novos = contacts.filter(c => c.status === 'novo').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>CRM de Leads</h1>
          <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>Gerencie seus clientes e oportunidades</p>
        </div>
        <button style={{ ...btn('primary'), boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }} onClick={() => { setEditContact(null); setShowModal(true); }}>
          + Novo Lead
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total de Leads', value: total, color: C.accent, icon: '👥' },
          { label: 'Novos Leads', value: novos, color: C.blue, icon: '🔵' },
          { label: 'Clientes Ativos', value: ativos, color: C.green, icon: '✅' },
          { label: 'Conversão', value: total > 0 ? Math.round((ativos/total)*100) + '%' : '0%', color: C.purple, icon: '📈' },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        style={{ ...S.input, maxWidth: 360, marginBottom: 20 }}
        placeholder="🔍 Buscar lead, telefone, serviço..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
        {KANBAN_COLS.map(col => (
          <div
            key={col.id}
            style={{
              minWidth: 250, flex: '0 0 250px',
              background: dragOver === col.id ? col.color + '11' : C.surface,
              border: '1px solid ' + (dragOver === col.id ? col.color + '66' : C.border),
              borderRadius: 14, padding: '16px 14px', transition: 'all 0.2s'
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text, flex: 1 }}>{col.label}</span>
              <span style={{ background: col.color + '22', color: col.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{getByStatus(col.id).length}</span>
            </div>
            {loading && <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 20 }}>Carregando...</div>}
            {getByStatus(col.id).map(contact => (
              <KanbanCard key={contact.id} contact={contact} onEdit={(c) => { setEditContact(c); setShowModal(true); }} />
            ))}
            {!loading && getByStatus(col.id).length === 0 && (
              <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: '24px 0', borderRadius: 10, border: '2px dashed ' + C.border }}>
                Nenhum lead
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <ContactModal contact={editContact} profile={profile} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchContacts(); }} />
      )}
    </div>
  );
            }

// ============================================================
// CONTACT MODAL
// ============================================================
function ContactModal({ contact, profile, onClose, onSave }) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    service: contact?.service || '',
    status: contact?.status || 'novo',
    origin: contact?.origin || '',
    notes: contact?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (contact?.id) {
      await supabase.from('contacts').update(form).eq('id', contact.id);
    } else {
      await supabase.from('contacts').insert({ ...form, created_by: profile.id });
    }
    setSaving(false);
    onSave();
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este lead permanentemente?')) return;
    await supabase.from('contacts').delete().eq('id', contact.id);
    onSave();
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 2px', color: C.text, fontSize: 18 }}>{contact ? 'Editar Lead' : 'Novo Lead'}</h3>
            <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>{contact ? 'Atualize as informações' : 'Adicione um novo lead ao CRM'}</p>
          </div>
          <button style={btn('outline', { padding: '6px 12px' })} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div><label style={S.label}>Nome completo *</label><input style={S.input} value={form.name} onChange={f('name')} placeholder="Ex: João da Silva" /></div>
          <div><label style={S.label}>WhatsApp</label><input style={S.input} value={form.phone} onChange={f('phone')} placeholder="+55 11 99999-9999" /></div>
          <div><label style={S.label}>Serviço / Assunto</label><input style={S.input} value={form.service} onChange={f('service')} placeholder="Ex: Visto Americano, Processo Criminal..." /></div>
          <div>
            <label style={S.label}>Status no Funil</label>
            <select style={S.input} value={form.status} onChange={f('status')}>
              {KANBAN_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Origem</label><input style={S.input} value={form.origin} onChange={f('origin')} placeholder="Ex: WhatsApp, Instagram, Indicação..." /></div>
          <div><label style={S.label}>Observações</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical' }} value={form.notes} onChange={f('notes')} placeholder="Detalhes importantes sobre o caso..." /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          {contact && <button style={btn('danger')} onClick={handleDelete}>Excluir</button>}
          {contact?.phone && (
            <button style={btn('success')} onClick={() => window.open('https://wa.me/' + contact.phone.replace(/\D/g, ''), '_blank')}>
              💬 WhatsApp
            </button>
          )}
          <button style={btn('outline')} onClick={onClose}>Cancelar</button>
          <button style={{ ...btn('primary'), boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }} onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Salvando...' : contact ? 'Salvar Alterações' : 'Criar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROCESSOS PAGE
// ============================================================
function ProcessosPage({ profile }) {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProcesso, setEditProcesso] = useState(null);
  const [search, setSearch] = useState('');

  const fetchProcessos = useCallback(async () => {
    const { data } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
    setProcessos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProcessos(); }, [fetchProcessos]);

  const filtered = processos.filter(p =>
    !search || p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.process_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig = {
    ativo: { color: C.green, label: 'Ativo' },
    aguardando: { color: C.warning, label: 'Aguardando' },
    urgente: { color: C.danger, label: 'Urgente' },
    encerrado: { color: C.gray, label: 'Encerrado' },
  };

  const counts = Object.keys(statusConfig).reduce((acc, s) => { acc[s] = processos.filter(p => p.status === s).length; return acc; }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Processos</h1>
          <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>{processos.length} processos cadastrados</p>
        </div>
        <button style={{ ...btn('primary'), boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }} onClick={() => { setEditProcesso(null); setShowModal(true); }}>
          + Novo Processo
        </button>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {Object.entries(statusConfig).map(([s, cfg]) => (
          <div key={s} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{counts[s]}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{cfg.label}</div>
            </div>
          </div>
        ))}
      </div>

      <input style={{ ...S.input, maxWidth: 380, marginBottom: 20 }} placeholder="🔍 Buscar por cliente, número, tipo..." value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div style={{ color: C.textMuted }}>Carregando...</div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(p => {
            const cfg = statusConfig[p.status] || { color: C.gray, label: p.status };
            const isUrgent = p.status === 'urgente';
            const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'encerrado';
            return (
              <div
                key={p.id}
                onClick={() => { setEditProcesso(p); setShowModal(true); }}
                style={{
                  ...S.card,
                  display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                  borderLeft: '3px solid ' + cfg.color,
                  transition: 'all 0.18s',
                  background: isUrgent ? '#ef444408' : S.card.background,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.text, marginBottom: 3, fontSize: 14 }}>{p.client_name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {p.process_number && <span style={{ marginRight: 12 }}>📋 {p.process_number}</span>}
                    {p.type && <span>⚖️ {p.type}</span>}
                  </div>
                </div>
                {p.deadline && (
                  <div style={{ fontSize: 12, color: isOverdue ? C.danger : C.warning, background: (isOverdue ? C.danger : C.warning) + '15', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>
                    📅 {new Date(p.deadline).toLocaleDateString('pt-BR')}
                    {isOverdue && ' ⚠️'}
                  </div>
                )}
                {badge(cfg.color, cfg.label)}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div>Nenhum processo encontrado</div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ProcessoModal processo={editProcesso} profile={profile} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchProcessos(); }} />
      )}
    </div>
  );
}

function ProcessoModal({ processo, profile, onClose, onSave }) {
  const [form, setForm] = useState({
    client_name: processo?.client_name || '',
    process_number: processo?.process_number || '',
    type: processo?.type || '',
    status: processo?.status || 'ativo',
    deadline: processo?.deadline || '',
    notes: processo?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    if (processo?.id) {
      await supabase.from('processes').update(form).eq('id', processo.id);
    } else {
      await supabase.from('processes').insert({ ...form, created_by: profile.id });
    }
    setSaving(false);
    onSave();
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este processo?')) return;
    await supabase.from('processes').delete().eq('id', processo.id);
    onSave();
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>{processo ? 'Editar Processo' : 'Novo Processo'}</h3>
          <button style={btn('outline', { padding: '6px 12px' })} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div><label style={S.label}>Nome do Cliente *</label><input style={S.input} value={form.client_name} onChange={f('client_name')} placeholder="Nome completo" /></div>
          <div><label style={S.label}>Número do Processo</label><input style={S.input} value={form.process_number} onChange={f('process_number')} placeholder="0000000-00.0000.0.00.0000" /></div>
          <div><label style={S.label}>Tipo de Processo</label><input style={S.input} value={form.type} onChange={f('type')} placeholder="Criminal, Imigração, Civil, Trabalhista..." /></div>
          <div>
            <label style={S.label}>Status</label>
            <select style={S.input} value={form.status} onChange={f('status')}>
              <option value="ativo">Ativo</option>
              <option value="aguardando">Aguardando</option>
              <option value="urgente">Urgente</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
          <div><label style={S.label}>Prazo / Data Limite</label><input style={S.input} type="date" value={form.deadline} onChange={f('deadline')} /></div>
          <div><label style={S.label}>Observações</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical' }} value={form.notes} onChange={f('notes')} placeholder="Detalhes do processo, andamentos..." /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          {processo && <button style={btn('danger')} onClick={handleDelete}>Excluir</button>}
          <button style={btn('outline')} onClick={onClose}>Cancelar</button>
          <button style={{ ...btn('primary'), boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }} onClick={handleSave} disabled={saving || !form.client_name}>
            {saving ? 'Salvando...' : processo ? 'Salvar' : 'Criar Processo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RELATORIOS PAGE
// ============================================================
function RelatoriosPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: contacts }, { data: processes }] = await Promise.all([
        supabase.from('contacts').select('status, created_at, origin'),
        supabase.from('processes').select('status, created_at, type'),
      ]);
      const cByStatus = (contacts || []).reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
      const pByStatus = (processes || []).reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
      const origins = (contacts || []).reduce((a, c) => { if (c.origin) a[c.origin] = (a[c.origin] || 0) + 1; return a; }, {});
      setStats({ contacts: cByStatus, processes: pByStatus, totalC: contacts?.length || 0, totalP: processes?.length || 0, origins });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div style={{ color: C.textMuted, padding: 40 }}>Carregando relatórios...</div>;

  const kpiData = [
    { label: 'Total de Leads', value: stats.totalC, color: C.accent, icon: '👥' },
    { label: 'Clientes Ativos', value: stats.contacts.fechado || 0, color: C.green, icon: '✅' },
    { label: 'Taxa de Conversão', value: stats.totalC > 0 ? Math.round(((stats.contacts.fechado||0)/stats.totalC)*100) + '%' : '0%', color: C.purple, icon: '📈' },
    { label: 'Total Processos', value: stats.totalP, color: C.blue, icon: '⚖️' },
    { label: 'Processos Ativos', value: stats.processes.ativo || 0, color: C.green, icon: '📋' },
    { label: 'Urgentes', value: stats.processes.urgente || 0, color: C.danger, icon: '🚨' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Relatórios</h1>
        <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>Visão geral do escritório</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {kpiData.map((k, i) => (
          <div key={i} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, ' + C.surface + ', ' + k.color + '08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: k.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Funil de Leads */}
        <div style={S.card}>
          <h3 style={{ color: C.text, margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>📊 Funil de Leads</h3>
          {KANBAN_COLS.map(col => {
            const count = stats.contacts[col.id] || 0;
            const pct = stats.totalC ? Math.round((count / stats.totalC) * 100) : 0;
            return (
              <div key={col.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.textSub }}>{col.label}</span>
                  <span style={{ fontSize: 13, color: col.color, fontWeight: 700 }}>{count} <span style={{ color: C.textMuted, fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ background: '#0d0e16', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', background: 'linear-gradient(90deg, ' + col.color + ', ' + col.color + '88)', height: 8, borderRadius: 6, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Processos */}
        <div style={S.card}>
          <h3 style={{ color: C.text, margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>⚖️ Status dos Processos</h3>
          {[['ativo', C.green, '✅ Ativo'], ['aguardando', C.warning, '⏳ Aguardando'], ['urgente', C.danger, '🚨 Urgente'], ['encerrado', C.gray, '📁 Encerrado']].map(([s, c, label]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid ' + C.border }}>
              <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
              <span style={{ background: c + '22', color: c, padding: '3px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>{stats.processes[s] || 0}</span>
            </div>
          ))}
        </div>

        {/* Origens */}
        {Object.keys(stats.origins).length > 0 && (
          <div style={{ ...S.card, gridColumn: '1 / -1' }}>
            <h3 style={{ color: C.text, margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>📌 Origem dos Leads</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(stats.origins).sort((a, b) => b[1] - a[1]).map(([origin, count]) => (
                <div key={origin} style={{ background: C.surfaceHover, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{origin}</span>
                  <span style={{ background: C.accent + '22', color: C.accent, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
                      }

// ============================================================
// EQUIPE PAGE
// ============================================================
function EquipePage() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data || []));
  }, []);

  const roleColors = { admin: C.purple, attorney: C.blue, staff: C.green };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Equipe</h1>
        <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>Usuários com acesso ao sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {profiles.map(p => {
          const initials = (p.name || p.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
          const roleColor = roleColors[p.role] || C.accent;
          return (
            <div key={p.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.name || 'Sem nome'}</div>
                <div style={{ fontSize: 12, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
              </div>
              {badge(roleColor, p.role || 'user')}
            </div>
          );
        })}
      </div>

      <div style={{ ...S.card, background: C.accentGlow, border: '1px solid ' + C.accent + '33' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22 }}>💡</div>
          <div>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>Como adicionar novos usuários?</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Acesse o painel do Supabase → Authentication → Users → Add user. Após criar, a pessoa pode fazer login com o email e senha definidos.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar({ activePage, setActivePage, profile, onLogout }) {
  const navItems = [
    { id: 'kanban', label: 'CRM / Leads', icon: '🎯' },
    { id: 'processos', label: 'Processos', icon: '⚖️' },
    { id: 'relatorios', label: 'Relatórios', icon: '📊' },
    { id: 'equipe', label: 'Equipe', icon: '👥' },
  ];

  return (
    <div style={S.sidebar}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚖️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.5 }}>ESCRITÓRIO</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Ramon Pacheco</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px 0' }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: active ? 'linear-gradient(135deg, #6366f133, #8b5cf622)' : 'transparent',
                color: active ? '#a5b4fc' : C.textMuted,
                fontWeight: active ? 600 : 400, fontSize: 13.5,
                border: active ? '1px solid #6366f133' : '1px solid transparent',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, marginLeft: 'auto' }} />}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 16px 20px', borderTop: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(profile?.name || profile?.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Usuário'}</div>
            <div style={{ fontSize: 11, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</div>
          </div>
        </div>
        <button style={{ ...btn('outline', { width: '100%', textAlign: 'center', padding: '8px' }) }} onClick={onLogout}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activePage, setActivePage] = useState('kanban');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || { id: userId });
    setLoading(false);
  };

  if (loading) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>Carregando...</div>
      </div>
    </div>
  );

  if (!session) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'kanban': return <KanbanPage profile={profile} />;
      case 'processos': return <ProcessosPage profile={profile} />;
      case 'relatorios': return <RelatoriosPage />;
      case 'equipe': return <EquipePage />;
      default: return <KanbanPage profile={profile} />;
    }
  };

  return (
    <div style={S.app}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} profile={profile} onLogout={() => supabase.auth.signOut()} />
      <div style={S.mainContent}>{renderPage()}</div>
    </div>
  );
                                                                             }

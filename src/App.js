import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ============================================================
// ESTILOS GLOBAIS
// ============================================================
const styles = {
  app: { fontFamily: "'Segoe UI', sans-serif", background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
  sidebar: { width: 220, background: '#1a1d2e', height: '100vh', position: 'fixed', left: 0, top: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #2d3748', zIndex: 100 },
  sidebarLogo: { padding: '24px 20px 16px', borderBottom: '1px solid #2d3748' },
  logoTitle: { fontSize: 14, fontWeight: 700, color: '#7c3aed', letterSpacing: 1 },
  logoSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', background: active ? '#7c3aed22' : 'transparent', color: active ? '#a78bfa' : '#94a3b8', borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.2s' }),
  mainContent: { marginLeft: 220, padding: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 },
  pageSub: { fontSize: 13, color: '#718096', marginBottom: 24 },
  card: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: 12, padding: 20, marginBottom: 16 },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: variant === 'primary' ? '#7c3aed' : variant === 'danger' ? '#dc2626' : variant === 'success' ? '#059669' : '#2d3748',
    color: variant === 'ghost' ? '#94a3b8' : '#fff', transition: 'all 0.2s'
  }),
  input: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' },
  label: { fontSize: 12, color: '#718096', marginBottom: 4, display: 'block', fontWeight: 500 },
  badge: (color) => ({ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '22', color: color }),
  modal: { position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBox: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
};

// ============================================================
// STATUS CONFIG
// ============================================================
const KANBAN_COLUMNS = [
  { id: 'novo', label: 'Lead Novo', color: '#3b82f6', emoji: '🔵' },
  { id: 'qualificando', label: 'Em Análise', color: '#f59e0b', emoji: '🟡' },
  { id: 'proposta', label: 'Proposta Enviada', color: '#8b5cf6', emoji: '🟣' },
  { id: 'fechado', label: 'Cliente Ativo', color: '#10b981', emoji: '🟢' },
  { id: 'perdido', label: 'Arquivado', color: '#6b7280', emoji: '⚫' },
];

const statusColor = { novo: '#3b82f6', qualificando: '#f59e0b', proposta: '#8b5cf6', fechado: '#10b981', perdido: '#6b7280' };

// ============================================================
// LOGIN
// ============================================================
function LoginPage({ onLogin }) {
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
    else onLogin();
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: 16, padding: 40, width: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
        <h2 style={{ color: '#e2e8f0', margin: '0 0 4px', fontSize: 20 }}>O Advogado do Brasileiro</h2>
        <p style={{ color: '#718096', fontSize: 13, marginBottom: 28 }}>Sistema Interno</p>
        {error && <div style={{ background: '#dc262622', border: '1px solid #dc2626', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14, textAlign: 'left' }}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={styles.label}>Senha</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button style={{ ...styles.btn('primary'), width: '100%', padding: '10px' }} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// KANBAN CARD
// ============================================================
function KanbanCard({ contact, onEdit, onMove, columns }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => { setDragging(true); e.dataTransfer.setData('contactId', contact.id); e.dataTransfer.setData('fromStatus', contact.status); }}
      onDragEnd={() => setDragging(false)}
      style={{
        background: dragging ? '#2d3748' : '#0f1117',
        border: '1px solid #2d3748',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: 'grab',
        opacity: dragging ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
      onClick={() => onEdit(contact)}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>{contact.name}</div>
      {contact.phone && <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>📱 {contact.phone}</div>}
      {contact.service && <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 6 }}>💼 {contact.service}</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, color: '#4b5563' }}>{new Date(contact.created_at).toLocaleDateString('pt-BR')}</div>
        <button
          style={{ ...styles.btn('ghost'), padding: '2px 8px', fontSize: 11 }}
          onClick={(e) => { e.stopPropagation(); window.open('https://wa.me/' + contact.phone?.replace(/\D/g, ''), '_blank'); }}
        >💬</button>
      </div>
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

  const getByStatus = (status) => contacts.filter(c => c.status === status);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={styles.pageTitle}>Kanban CRM</h1>
          <p style={styles.pageSub}>Arraste os cards entre as colunas para atualizar o status</p>
        </div>
        <button style={styles.btn('primary')} onClick={() => { setEditContact(null); setShowModal(true); }}>+ Novo Lead</button>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
        {KANBAN_COLUMNS.map(col => (
          <div
            key={col.id}
            style={{
              minWidth: 240, flex: '0 0 240px',
              background: dragOver === col.id ? '#2d374844' : '#1a1d2e',
              border: '1px solid ' + (dragOver === col.id ? col.color : '#2d3748'),
              borderRadius: 12, padding: 14,
              transition: 'all 0.2s'
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span>{col.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{col.label}</span>
              <span style={{ ...styles.badge(col.color), marginLeft: 'auto' }}>{getByStatus(col.id).length}</span>
            </div>
            {loading ? <div style={{ color: '#4b5563', fontSize: 12 }}>Carregando...</div> : null}
            {getByStatus(col.id).map(contact => (
              <KanbanCard key={contact.id} contact={contact} onEdit={(c) => { setEditContact(c); setShowModal(true); }} columns={KANBAN_COLUMNS} />
            ))}
          </div>
        ))}
      </div>

      {showModal && (
        <ContactModal
          contact={editContact}
          profile={profile}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchContacts(); }}
        />
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
    if (!window.confirm('Excluir este lead?')) return;
    await supabase.from('contacts').delete().eq('id', contact.id);
    onSave();
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0' }}>{contact ? 'Editar Lead' : 'Novo Lead'}</h3>
          <button style={styles.btn('ghost')} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={styles.label}>Nome *</label><input style={styles.input} value={form.name} onChange={f('name')} placeholder="Nome completo" /></div>
          <div><label style={styles.label}>WhatsApp</label><input style={styles.input} value={form.phone} onChange={f('phone')} placeholder="+55 11 99999-9999" /></div>
          <div><label style={styles.label}>Serviço / Assunto</label><input style={styles.input} value={form.service} onChange={f('service')} placeholder="Ex: Visto, Processo Criminal..." /></div>
          <div>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={form.status} onChange={f('status')}>
              {KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div><label style={styles.label}>Origem</label><input style={styles.input} value={form.origin} onChange={f('origin')} placeholder="Ex: WhatsApp, Indicação, Instagram..." /></div>
          <div><label style={styles.label}>Observações</label><textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={f('notes')} placeholder="Anotações sobre o lead..." /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          {contact && <button style={styles.btn('danger')} onClick={handleDelete}>Excluir</button>}
          {contact?.phone && (
            <button style={styles.btn('success')} onClick={() => window.open('https://wa.me/' + contact.phone.replace(/\D/g, ''), '_blank')}>
              💬 WhatsApp
            </button>
          )}
          <button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button>
          <button style={styles.btn('primary')} onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Salvando...' : 'Salvar'}
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
    p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.process_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = { 'ativo': '#10b981', 'aguardando': '#f59e0b', 'encerrado': '#6b7280', 'urgente': '#ef4444' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={styles.pageTitle}>Processos</h1>
          <p style={styles.pageSub}>{processos.length} processos no total</p>
        </div>
        <button style={styles.btn('primary')} onClick={() => { setEditProcesso(null); setShowModal(true); }}>+ Novo Processo</button>
      </div>
      <input style={{ ...styles.input, marginBottom: 20, maxWidth: 400 }} placeholder="🔍 Buscar por cliente, número..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <div style={{ color: '#718096' }}>Carregando...</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => { setEditProcesso(p); setShowModal(true); }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{p.client_name}</div>
                <div style={{ fontSize: 12, color: '#718096' }}>{p.process_number} · {p.type}</div>
              </div>
              {p.deadline && <div style={{ fontSize: 12, color: '#f59e0b' }}>📅 {new Date(p.deadline).toLocaleDateString('pt-BR')}</div>}
              <span style={styles.badge(statusColors[p.status] || '#718096')}>{p.status}</span>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: '#718096', textAlign: 'center', padding: 40 }}>Nenhum processo encontrado</div>}
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
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0' }}>{processo ? 'Editar Processo' : 'Novo Processo'}</h3>
          <button style={styles.btn('ghost')} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={styles.label}>Cliente *</label><input style={styles.input} value={form.client_name} onChange={f('client_name')} /></div>
          <div><label style={styles.label}>Número do Processo</label><input style={styles.input} value={form.process_number} onChange={f('process_number')} /></div>
          <div><label style={styles.label}>Tipo</label><input style={styles.input} value={form.type} onChange={f('type')} placeholder="Criminal, Imigração, Civil..." /></div>
          <div>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={form.status} onChange={f('status')}>
              <option value="ativo">Ativo</option>
              <option value="aguardando">Aguardando</option>
              <option value="urgente">Urgente</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
          <div><label style={styles.label}>Prazo</label><input style={{ ...styles.input }} type="date" value={form.deadline} onChange={f('deadline')} /></div>
          <div><label style={styles.label}>Observações</label><textarea style={{ ...styles.input, minHeight: 80 }} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          {processo && <button style={styles.btn('danger')} onClick={handleDelete}>Excluir</button>}
          <button style={styles.btn('ghost')} onClick={onClose}>Cancelar</button>
          <button style={styles.btn('primary')} onClick={handleSave} disabled={saving || !form.client_name}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RELATORIOS PAGE
// ============================================================
function RelatoriosPage() {
  const [stats, setStats] = useState({ contacts: {}, processes: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: contacts }, { data: processes }] = await Promise.all([
        supabase.from('contacts').select('status, created_at'),
        supabase.from('processes').select('status, created_at'),
      ]);
      const contactsByStatus = (contacts || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
      const processesByStatus = (processes || []).reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
      setStats({ contacts: contactsByStatus, processes: processesByStatus, totalContacts: contacts?.length || 0, totalProcesses: processes?.length || 0 });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const StatCard = ({ label, value, color, icon }) => (
    <div style={{ ...styles.card, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#718096' }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ color: '#718096' }}>Carregando relatórios...</div>;

  return (
    <div>
      <h1 style={styles.pageTitle}>Relatórios</h1>
      <p style={styles.pageSub}>Visão geral do escritório</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total de Leads" value={stats.totalContacts} color="#3b82f6" icon="👥" />
        <StatCard label="Leads Novos" value={stats.contacts.novo || 0} color="#3b82f6" icon="🔵" />
        <StatCard label="Em Análise" value={stats.contacts.qualificando || 0} color="#f59e0b" icon="🟡" />
        <StatCard label="Clientes Ativos" value={stats.contacts.fechado || 0} color="#10b981" icon="🟢" />
        <StatCard label="Total Processos" value={stats.totalProcesses} color="#a78bfa" icon="⚖️" />
        <StatCard label="Processos Ativos" value={stats.processes.ativo || 0} color="#10b981" icon="✅" />
        <StatCard label="Urgentes" value={stats.processes.urgente || 0} color="#ef4444" icon="🚨" />
        <StatCard label="Encerrados" value={stats.processes.encerrado || 0} color="#6b7280" icon="📁" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={styles.card}>
          <h3 style={{ color: '#e2e8f0', margin: '0 0 16px', fontSize: 15 }}>Funil de Leads</h3>
          {KANBAN_COLUMNS.map(col => {
            const count = stats.contacts[col.id] || 0;
            const pct = stats.totalContacts ? (count / stats.totalContacts) * 100 : 0;
            return (
              <div key={col.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{col.emoji} {col.label}</span>
                  <span style={{ fontSize: 12, color: col.color, fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ background: '#0f1117', borderRadius: 4, height: 6 }}>
                  <div style={{ width: pct + '%', background: col.color, height: 6, borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={styles.card}>
          <h3 style={{ color: '#e2e8f0', margin: '0 0 16px', fontSize: 15 }}>Status dos Processos</h3>
          {[['ativo', '#10b981', '✅'], ['aguardando', '#f59e0b', '⏳'], ['urgente', '#ef4444', '🚨'], ['encerrado', '#6b7280', '📁']].map(([s, c, e]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2d3748' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{e} {s.charAt(0).toUpperCase() + s.slice(1)}</span>
              <span style={{ ...styles.badge(c) }}>{stats.processes[s] || 0}</span>
            </div>
          ))}
        </div>
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

  return (
    <div>
      <h1 style={styles.pageTitle}>Equipe</h1>
      <p style={styles.pageSub}>Usuários com acesso ao sistema</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {profiles.map(p => (
          <div key={p.id} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {p.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#718096' }}>{p.email}</div>
            </div>
            <span style={{ ...styles.badge(p.role === 'admin' ? '#7c3aed' : '#3b82f6'), marginLeft: 'auto' }}>{p.role}</span>
          </div>
        ))}
      </div>
      <div style={{ ...styles.card, marginTop: 20, background: '#7c3aed11', border: '1px solid #7c3aed44' }}>
        <p style={{ color: '#a78bfa', fontSize: 13, margin: 0 }}>
          💡 Para adicionar novos usuários, acesse o painel do Supabase → Authentication → Users → Add user
        </p>
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
    setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div style={{ ...styles.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#718096' }}>Carregando...</div>
    </div>
  );

  if (!session) return <LoginPage onLogin={() => {}} />;

  const navItems = [
    { id: 'kanban', label: 'Kanban CRM', icon: '📋' },
    { id: 'processos', label: 'Processos', icon: '⚖️' },
    { id: 'relatorios', label: 'Relatórios', icon: '📊' },
    { id: 'equipe', label: 'Equipe', icon: '👥' },
  ];

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
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>⚖️</div>
          <div style={styles.logoTitle}>ESCRITÓRIO</div>
          <div style={styles.logoSub}>Ramon Pacheco Advocacia</div>
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {navItems.map(item => (
            <div key={item.id} style={styles.navItem(activePage === item.id)} onClick={() => setActivePage(item.id)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #2d3748' }}>
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>{profile?.name || profile?.email}</div>
          <button style={{ ...styles.btn('ghost'), width: '100%', textAlign: 'left' }} onClick={handleLogout}>🚪 Sair</button>
        </div>
      </div>
      <div style={styles.mainContent}>{renderPage()}</div>
    </div>
  );
}

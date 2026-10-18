import React, { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { supabase, supabaseConfigured } from './supabase.js';

const photos = {
  hero: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=88',
  living: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85',
  bedroom: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1000&q=85',
  work: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
  details: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
};

const rooms = ['Sala', 'Quarto', 'Canto de trabalho', 'A casa toda'];
const defaultHeroDescription = 'Espaços com ideias grandes, feitos com o que já tens e o que podes gastar.';
const defaultContactEmail = 'ola@martashome.pt';
const leadStatuses = [
  { id: 'new', label: 'Novo pedido' },
  { id: 'contacted', label: 'Em contacto' },
  { id: 'proposal', label: 'Proposta enviada' },
  { id: 'completed', label: 'Concluído' },
  { id: 'archived', label: 'Arquivado' },
];
const moods = [
  { name: 'Terra & caos', color: '#a86f53' },
  { name: 'Verde sem juízo', color: '#71806a' },
  { name: 'Rosa inesperado', color: '#b98782' },
  { name: 'Surpreende-me', color: '#8e82a0' },
];
const roomPhotos = {
  Sala: photos.living,
  Quarto: photos.bedroom,
  'Canto de trabalho': photos.work,
  'A casa toda': photos.hero,
};

function mapLead(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    room: row.room,
    mood: row.mood,
    budget: row.budget,
    notes: row.notes,
    status: row.status,
    internalNotes: row.internal_notes,
  };
}

function Arrow({ diagonal = false }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? '↗' : '→'}</span>;
}

function Reveal({ children, className = '', delay = 0, ...props }) {
  return <div className={`reveal ${className}`} style={{ '--delay': `${delay}ms` }} {...props}>{children}</div>;
}

function Metric({ label, value, note }) {
  return <article className="admin-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function AdminLeadList({ leads, onOpen, onViewAll }) {
  return (
    <section className="admin-lead-list">
      <header><div><h2>Pedidos recentes</h2><p>Um bom projeto começa por ouvir.</p></div>{onViewAll && <button onClick={onViewAll}>Ver todos <Arrow diagonal /></button>}</header>
      {leads.length === 0 ? <div className="admin-empty"><span>✳</span><h3>Ainda não há pedidos.</h3><p>Quando alguém enviar um pedido de proposta, aparece aqui.</p></div> : (
        <div className="admin-table-wrap"><table><thead><tr><th>CLIENTE</th><th>DIVISÃO / ESTILO</th><th>ORÇAMENTO</th><th>ESTADO</th><th /></tr></thead>
          <tbody>{leads.map((lead) => <tr key={lead.id} onClick={() => onOpen(lead.id)}><td><b>{lead.name}</b><small>{lead.email}</small></td><td><b>{lead.room}</b><small>{lead.mood}</small></td><td>{lead.budget}</td><td><span className={`status-pill status-${lead.status}`}>{leadStatuses.find((item) => item.id === lead.status)?.label || lead.status}</span></td><td><span className="table-arrow">↗</span></td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}

function LeadDetails({ lead, onBack, onSave, onDelete }) {
  const [status, setStatus] = useState(lead.status);
  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      location: String(data.get('location') || '').trim(),
      status,
      internalNotes: String(data.get('internalNotes') || '').trim(),
    });
  };

  return (
    <div className="lead-details">
      <button className="back-button" onClick={onBack}>← Voltar aos pedidos</button>
      <div className="lead-details-heading"><div><span className="admin-breadcrumb">PEDIDO RECEBIDO · {new Date(lead.createdAt).toLocaleDateString('pt-PT')}</span><h2>{lead.name}</h2><p>{lead.room} · {lead.mood} · {lead.budget}</p></div><button className="danger-button" onClick={onDelete}>Eliminar pedido</button></div>
      <form className="lead-edit-form" onSubmit={handleSubmit}>
        <div className="lead-fields">
          <label>Nome<input name="name" defaultValue={lead.name} required /></label>
          <label>Email<input name="email" type="email" defaultValue={lead.email} required /></label>
          <label>Telefone<input name="phone" defaultValue={lead.phone} /></label>
          <label>Localidade<input name="location" defaultValue={lead.location} /></label>
          <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}>{leadStatuses.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label>Pedido do cliente<textarea value={`${lead.room} · ${lead.mood} · ${lead.budget}\n\n${lead.notes || 'Sem mensagem adicional.'}`} readOnly rows="4" /></label>
          <label className="lead-internal-notes">Notas internas<textarea name="internalNotes" defaultValue={lead.internalNotes || ''} rows="5" placeholder="Apontamentos para a equipa — não aparecem ao cliente." /></label>
        </div>
        <button className="settings-save" type="submit">Guardar alterações</button>
      </form>
    </div>
  );
}

function App() {
  const [room, setRoom] = useState(rooms[0]);
  const [mood, setMood] = useState(moods[0]);
  const [budget, setBudget] = useState('Até 500€');
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [heroDescription, setHeroDescription] = useState(defaultHeroDescription);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [leads, setLeads] = useState([]);
  const [adminView, setAdminView] = useState('overview');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadFilter, setLeadFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadConfirmation, setLeadConfirmation] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');

  const signOutAdmin = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setSaveError(`Não foi possível terminar a sessão: ${error.message}`);
    setAdminAuthenticated(false);
    setLeads([]);
  };

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase
      .from('site_settings')
      .select('hero_description, contact_email')
      .eq('id', true)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setSaveError(`Não foi possível carregar as definições: ${error.message}`);
          return;
        }
        setHeroDescription(data.hero_description);
        setContactEmail(data.contact_email);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
    const updateScrollEffects = ({ scroll, limit }) => {
      const progress = limit > 0 ? scroll / limit : 0;
      document.querySelector('.scroll-progress')?.style.setProperty('transform', `scaleX(${progress})`);
      const viewportCenter = window.innerHeight * 0.52;
      parallaxItems.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const speed = Number(element.getAttribute('data-parallax')) || 0;
        const offset = Math.max(-90, Math.min(90, (viewportCenter - (bounds.top + bounds.height / 2)) * speed));
        element.style.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
      });
    };

    const lenis = prefersReducedMotion ? null : new Lenis({
      autoRaf: true,
      anchors: { offset: -72 },
      lerp: 0.04,
      wheelMultiplier: 0.48,
      touchMultiplier: 1.15,
      smoothWheel: true,
    });
    if (lenis) {
      const updateFromWindowScroll = () => {
        const limit = document.documentElement.scrollHeight - window.innerHeight;
        updateScrollEffects({ scroll: window.scrollY, limit });
      };
      window.addEventListener('scroll', updateFromWindowScroll, { passive: true });
      updateFromWindowScroll();
      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', updateFromWindowScroll);
        lenis.destroy();
      };
    } else {
      parallaxItems.forEach((element) => element.style.setProperty('--parallax-y', '0px'));
      const updateNativeScroll = () => {
        const limit = document.documentElement.scrollHeight - window.innerHeight;
        updateScrollEffects({ scroll: window.scrollY, limit });
      };
      window.addEventListener('scroll', updateNativeScroll, { passive: true });
      updateNativeScroll();
      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', updateNativeScroll);
      };
    }

    return () => {
      observer.disconnect();
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!adminOpen && !leadFormOpen && !leadConfirmation) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [adminOpen, leadFormOpen, leadConfirmation]);

  useEffect(() => {
    const handleAdminShortcut = (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'Digit6') {
        event.preventDefault();
        setAdminOpen((open) => {
          if (!open) {
            setAdminView('overview');
            setSelectedLeadId(null);
            setAdminAuthenticated(false);
            setAdminEmailInput('');
            setAdminPasswordInput('');
            setAdminPasswordError('');
          }
          if (open) {
            void signOutAdmin();
          }
          return !open;
        });
      }

      if (event.key === 'Escape') {
        setAdminOpen(false);
        void signOutAdmin();
        setLeadFormOpen(false);
        setSelectedLeadId(null);
      }
    };

    window.addEventListener('keydown', handleAdminShortcut);
    return () => window.removeEventListener('keydown', handleAdminShortcut);
  }, []);

  const saveSiteSettings = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextDescription = String(form.get('description') || '').trim();
    const nextEmail = String(form.get('email') || '').trim();
    if (!nextDescription || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return;
    if (!supabase) {
      setSaveError('Configura o Supabase neste ambiente antes de guardar definições.');
      return;
    }
    void (async () => {
      const { error } = await supabase
        .from('site_settings')
        .update({ hero_description: nextDescription, contact_email: nextEmail, updated_at: new Date().toISOString() })
        .eq('id', true);
      if (error) {
        setSaveError(`Não foi possível guardar as definições: ${error.message}`);
        return;
      }
      setSaveError('');
      setHeroDescription(nextDescription);
      setContactEmail(nextEmail);
      showToast('Definições guardadas.');
    })();
  };

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const createLead = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setSaveError('O formulário está temporariamente indisponível. Tenta novamente mais tarde.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const lead = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      location: String(formData.get('location') || '').trim(),
      room,
      mood: mood.name,
      budget,
      notes: String(formData.get('notes') || '').trim(),
    };
    const { error } = await supabase.from('leads').insert(lead);
    if (error) {
      setSaveError(`Não foi possível enviar o pedido: ${error.message}`);
      return;
    }
    setSaveError('');
    setLeadFormOpen(false);
    setLeadConfirmation(true);
    event.currentTarget.reset();
  };

  const updateLead = async (leadId, changes) => {
    if (!supabase) return false;
    const databaseChanges = {
      ...('name' in changes && { name: changes.name }),
      ...('email' in changes && { email: changes.email }),
      ...('phone' in changes && { phone: changes.phone }),
      ...('location' in changes && { location: changes.location }),
      ...('status' in changes && { status: changes.status }),
      ...('internalNotes' in changes && { internal_notes: changes.internalNotes }),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('leads').update(databaseChanges).eq('id', leadId);
    if (error) {
      setSaveError(`Não foi possível atualizar o pedido: ${error.message}`);
      return false;
    }
    setSaveError('');
    setLeads((current) => current.map((lead) => lead.id === leadId
      ? { ...lead, ...changes, updatedAt: databaseChanges.updated_at }
      : lead));
    return true;
  };

  const deleteLead = async (leadId) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || !window.confirm(`Eliminar o pedido de ${lead.name}? Esta ação não pode ser anulada.`)) return;
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
      setSaveError(`Não foi possível eliminar o pedido: ${error.message}`);
      return;
    }
    setSaveError('');
    setLeads((current) => current.filter((item) => item.id !== leadId));
    setSelectedLeadId(null);
    showToast('Pedido eliminado.');
  };

  const exportLeads = () => {
    const columns = ['Data', 'Cliente', 'Email', 'Telefone', 'Localidade', 'Divisao', 'Estilo', 'Orcamento', 'Estado', 'Notas'];
    const rows = leads.map((lead) => [
      new Date(lead.createdAt).toLocaleString('pt-PT'),
      lead.name, lead.email, lead.phone, lead.location, lead.room, lead.mood, lead.budget,
      leadStatuses.find((status) => status.id === lead.status)?.label || lead.status,
      lead.notes,
    ]);
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `martas-home-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const unlockAdmin = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setAdminPasswordError('A autenticação ainda não está configurada neste site.');
      return;
    }
    setAdminBusy(true);
    setAdminPasswordError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmailInput.trim(),
      password: adminPasswordInput,
    });
    if (loginError) {
      setAdminPasswordError('Email ou palavra-passe inválidos.');
      setAdminPasswordInput('');
      setAdminBusy(false);
      return;
    }
    const { data: isAdmin, error: permissionError } = await supabase.rpc('is_admin');
    if (permissionError || isAdmin !== true) {
      await supabase.auth.signOut();
      setAdminPasswordError('Esta conta não tem permissões de administração.');
      setAdminPasswordInput('');
      setAdminBusy(false);
      return;
    }
    const { data: rows, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (leadsError) {
      await supabase.auth.signOut();
      setAdminPasswordError(`Não foi possível carregar os pedidos: ${leadsError.message}`);
      setAdminPasswordInput('');
      setAdminBusy(false);
      return;
    }
    setLeads(rows.map(mapLead));
    setAdminPasswordError('');
    setAdminPasswordInput('');
    setAdminAuthenticated(true);
    setAdminBusy(false);
  };

  return (
    <>
      <div className="scroll-progress" />
      <header className="site-header">
        <a className="wordmark" href="#inicio" aria-label="Marta's Home — início">
          <span className="wordmark-icon">m<span>✳</span></span>
          <span>MARTA’S<br />HOME</span>
        </a>
        <nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Navegação principal">
          <a href="#ideia" onClick={() => setMenuOpen(false)}>A ideia</a>
          <a href="#inspiracao" onClick={() => setMenuOpen(false)}>Inspiração</a>
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
        </nav>
        <a className="header-cta" href="#imagina">Imagina a tua casa <Arrow diagonal /></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen}>
          <span /><span />
        </button>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> INTERIORES COM PERSONALIDADE</p>
            <h1>A tua casa.<br />As tuas <em>regras.</em></h1>
            <p className="hero-description">{heroDescription}</p>
            <a className="round-link" href="#imagina">
              <span>Começa a<br />imaginar</span><Arrow diagonal />
            </a>
            <div className="hero-note"><span>01 / 03</span><i /> Não é mais do mesmo.</div>
          </div>
          <div className="hero-art">
            <img className="hero-image" data-parallax="0.12" src={photos.hero} alt="Sala de estar criativa com cores quentes e mobiliário eclético" />
            <div className="hero-image-tint" />
            <div className="hero-stamp" data-parallax="-0.09"><span>CASAS<br />COM<br /><em>ATITUDE</em></span><b>✳</b></div>
            <div className="hero-caption"><span>01 — SALA DE ESTAR</span><span>Lisboa, Portugal</span></div>
            <div className="hero-side-note">BOM GOSTO<br />NÃO TEM<br />PREÇO FIXO</div>
          </div>
          <div className="hero-bottom"><span>DESCE, TEMOS IDEIAS</span><span className="down-mark">↓</span><span>38°43' N&nbsp; 9°08' W</span></div>
        </section>

        <section className="manifesto section-pad" id="ideia">
          <Reveal className="manifesto-label"><span className="eyebrow">A IDEIA É SIMPLES</span><span className="asterisk">✳</span></Reveal>
          <Reveal className="manifesto-content" delay={100}>
            <h2>Não precisas de uma casa maior.<br />Precisas de uma casa mais <em>tua.</em></h2>
            <p>A Marta’s Home transforma divisões esquecidas em lugares onde apetece mesmo estar. Primeiro, desenhamos contigo. Depois, uma especialista põe as mãos à obra — sem dramas, sem orçamento de celebridade.</p>
            <a className="text-link" href="#como-funciona">Conhece o nosso jeito <Arrow diagonal /></a>
          </Reveal>
          <div className="manifesto-scribble" data-parallax="-0.08" aria-hidden="true">o teu espaço<br />merece mais <span>♡</span></div>
        </section>

        <section className="gallery section-pad" id="inspiracao">
          <div className="section-heading">
            <Reveal><p className="eyebrow">INSPIRAÇÃO SEM MANUAL</p><h2>Estranho? <em>Perfeito.</em></h2></Reveal>
            <Reveal delay={120}><p>Peças com história, cores sem pedir licença e soluções espertas que não custam uma renda.</p></Reveal>
          </div>
          <div className="gallery-grid">
            <Reveal className="gallery-card gallery-card-large">
              <img data-parallax="0.1" src={photos.living} alt="Sala de estar com design maximalista e elementos artesanais" />
              <span className="image-number">01</span>
              <div className="gallery-card-caption"><span>O CAOS BEM PENSADO</span><span>Uma sala, mil histórias <Arrow diagonal /></span></div>
            </Reveal>
            <Reveal className="gallery-card gallery-card-small" delay={180}>
              <img data-parallax="0.14" src={photos.bedroom} alt="Quarto acolhedor com uma composição de cores expressiva" />
              <span className="image-number">02</span>
              <div className="gallery-card-caption"><span>DESCANSO COM PERSONALIDADE</span><span>Quarto fora do catálogo <Arrow diagonal /></span></div>
            </Reveal>
            <Reveal className="gallery-note" data-parallax="-0.08" delay={100}>
              <span className="note-star">✳</span>
              <p>Não vendemos casas de revista.<br /><em>Desenhamos casas vividas.</em></p>
              <span className="note-signature">— Marta</span>
            </Reveal>
          </div>
        </section>

        <section className="how section-pad" id="como-funciona">
          <div className="how-image-wrap">
            <Reveal className="how-image"><img data-parallax="0.12" src={photos.details} alt="Detalhe de decoração e materiais de uma casa" /></Reveal>
            <div className="how-image-sticker" data-parallax="-0.1">POUCO<br />DINHEIRO.<br /><em>GRANDE<br />IDEIA.</em></div>
          </div>
          <div className="how-content">
            <Reveal><p className="eyebrow">SEM COMPLICAR A VIDA</p><h2>Da ideia à<br /><em>vida real.</em></h2></Reveal>
            <div className="steps">
              <Reveal className="step" delay={80}><span className="step-number">01</span><div><h3>Conta-nos o teu caos</h3><p>Escolhe a divisão, as cores e quanto queres gastar. Podes enviar fotos — os segredos ficam connosco.</p></div><span className="step-symbol">↘</span></Reveal>
              <Reveal className="step" delay={160}><span className="step-number">02</span><div><h3>Criamos o teu plano</h3><p>Uma especialista prepara uma proposta à tua medida, com escolhas inteligentes e sem compras absurdas.</p></div><span className="step-symbol">↘</span></Reveal>
              <Reveal className="step" delay={240}><span className="step-number">03</span><div><h3>Chega a magia (e a Marta)</h3><p>Se quiseres, vamos até tua casa e tratamos de transformar o plano num espaço mesmo teu.</p></div><span className="step-symbol">✳</span></Reveal>
            </div>
          </div>
        </section>

        <section className="manifesto-band">
          <div className="band-marquee" aria-hidden="true"><span>MENOS PERFEITO&nbsp;✳&nbsp;MAIS TEU&nbsp;✳&nbsp;MENOS PERFEITO&nbsp;✳&nbsp;MAIS TEU&nbsp;✳&nbsp;</span></div>
          <p>A tua casa não precisa de impressionar ninguém.<br /><em>Só precisa de te fazer sentir em casa.</em></p>
          <span className="band-spark" data-parallax="0.11">✳</span>
        </section>

        <section className="imagina section-pad" id="imagina">
          <div className="imagina-heading">
            <Reveal><p className="eyebrow">VAMOS BRINCAR AOS INTERIORES</p><h2>Imagina. Nós<br /><em>desenhamos.</em></h2></Reveal>
            <Reveal delay={120}><p>Escolhe o teu ponto de partida. Não é uma proposta final — é o primeiro rabisco de uma casa com mais personalidade.</p></Reveal>
          </div>
          <div className="configurator">
            <Reveal className="configurator-steps">
              <div className="config-group">
                <p className="config-label"><span>01</span> QUE DIVISÃO MERECE AMOR?</p>
                <div className="choice-list">
                  {rooms.map((item) => <button key={item} className={room === item ? 'choice active' : 'choice'} onClick={() => setRoom(item)}>{item}<span>{room === item ? '✳' : '+'}</span></button>)}
                </div>
              </div>
              <div className="config-group">
                <p className="config-label"><span>02</span> QUE ENERGIA TEMOS?</p>
                <div className="mood-list">
                  {moods.map((item) => <button key={item.name} className={mood.name === item.name ? 'mood active' : 'mood'} onClick={() => setMood(item)}><i style={{ backgroundColor: item.color }} />{item.name}</button>)}
                </div>
              </div>
              <div className="config-group">
                <p className="config-label"><span>03</span> QUAL É O PLANO?</p>
                <div className="budget-list">
                  {['Até 500€', '500€ — 1.500€', 'Quero conversar'].map((item) => <button key={item} className={budget === item ? 'budget active' : 'budget'} onClick={() => setBudget(item)}>{item}</button>)}
                </div>
              </div>
            </Reveal>
            <Reveal className="preview-card" delay={160}>
              <img data-parallax="0.08" src={roomPhotos[room]} alt={`Inspiração de interiores para ${room.toLowerCase()}`} />
              <div className="preview-overlay" style={{ '--mood-tint': mood.color }} />
              <div className="preview-top"><span>A TUA PRIMEIRA IDEIA</span><span>MH — 001</span></div>
              <div className="preview-info">
                <span>UM ESTUDO DE INTERIORES PARA</span>
                <h3>{room}</h3>
                <p><i style={{ backgroundColor: mood.color }} /> {mood.name} <span>·</span> {budget}</p>
                <small className="preview-personal-note">Pensado para a tua casa. Ajustado ao teu orçamento.</small>
              </div>
              <button className="preview-cta" type="button" onClick={() => setLeadFormOpen(true)}>Pedir uma proposta <Arrow diagonal /></button>
            </Reveal>
          </div>
        </section>

        <section className="final-cta">
          <Reveal><p className="eyebrow">O TEU PRÓXIMO CAPÍTULO COMEÇA EM CASA</p><h2>Pronta para<br />fazer <em>as pazes</em><br />com a tua sala?</h2><button className="final-button" type="button" onClick={() => { setLeadConfirmation(false); setLeadFormOpen(true); }}>Pedir uma proposta <Arrow diagonal /></button></Reveal>
          <span className="final-spark final-spark-one" data-parallax="-0.1">✳</span><span className="final-spark final-spark-two" data-parallax="0.12">✳</span>
        </section>
      </main>

      <footer className="footer">
        <a className="wordmark footer-wordmark" href="#inicio"><span className="wordmark-icon">m<span>✳</span></span><span>MARTA’S<br />HOME</span></a>
        <span className="footer-thought">Feito com imaginação, em Portugal.</span>
        <div className="footer-links"><a href={`mailto:${contactEmail}`}>Fala connosco <Arrow diagonal /></a><a href="#inicio">Voltar ao início ↑</a></div>
        <span className="copyright">© 2026 MARTA’S HOME</span>
      </footer>
      {leadFormOpen && (
        <div className="request-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLeadFormOpen(false);
        }}>
          <section className="request-dialog" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="request-title">
            <button className="request-close" type="button" onClick={() => setLeadFormOpen(false)} aria-label="Fechar formulário">×</button>
            <p className="eyebrow">A PRIMEIRA CONVERSA É POR NOSSA CONTA</p>
            <h2 id="request-title">Vamos dar forma<br />à <em>tua ideia.</em></h2>
            <div className="request-summary"><span>{room}</span><span>{mood.name}</span><span>{budget}</span></div>
            <form className="request-form" onSubmit={createLead}>
              <label>O teu nome<input name="name" autoComplete="name" required maxLength="100" /></label>
              <label>Email<input type="email" name="email" autoComplete="email" required maxLength="160" /></label>
              <label>Telefone <span>(opcional)</span><input type="tel" name="phone" autoComplete="tel" maxLength="40" /></label>
              <label>Localidade<input name="location" autoComplete="address-level2" required maxLength="100" /></label>
              <label className="request-notes">O que gostavas de mudar?<textarea name="notes" rows="3" maxLength="1200" placeholder="Conta-nos um bocadinho sobre o espaço…" /></label>
              <label className="consent-field"><input type="checkbox" name="consent" required /> Autorizo a Marta’s Home a contactar-me sobre este pedido.</label>
              {saveError && <p className="storage-error" role="alert">{saveError}</p>}
              <button className="request-submit" type="submit">Enviar pedido <Arrow diagonal /></button>
            </form>
          </section>
        </div>
      )}
      {leadConfirmation && (
        <div className="request-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLeadConfirmation(false);
        }}>
          <section className="request-dialog request-success" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="request-success-title">
            <button className="request-close" type="button" onClick={() => setLeadConfirmation(false)} aria-label="Fechar confirmação">×</button>
            <span className="success-mark">✓</span>
            <p className="eyebrow">PEDIDO REGISTADO</p>
            <h2 id="request-success-title">A tua ideia já<br />está <em>connosco.</em></h2>
            <p className="success-copy">O pedido foi enviado à equipa da Marta’s Home. Podes acompanhar o seu estado na área de administração.</p>
            <button className="request-submit" type="button" onClick={() => setLeadConfirmation(false)}>Voltar à loja</button>
          </section>
        </div>
      )}
      {adminOpen && (
        !adminAuthenticated ? (
          <div className="admin-gate" role="dialog" aria-modal="true" aria-labelledby="admin-gate-title">
            <form className="admin-gate-card" onSubmit={unlockAdmin}>
              <button className="admin-gate-close" type="button" onClick={() => setAdminOpen(false)} aria-label="Fechar">×</button>
              <span className="admin-gate-mark">m.</span>
              <p className="admin-gate-kicker">MARTA’S HOME · ÁREA PRIVADA</p>
              <h2 id="admin-gate-title">Olá, Marta.</h2>
              <p className="admin-gate-copy">Inicia sessão com a conta de administração da Marta’s Home.</p>
              <label htmlFor="admin-email">EMAIL</label>
              <input id="admin-email" type="email" autoComplete="username" autoFocus required value={adminEmailInput} onChange={(event) => setAdminEmailInput(event.target.value)} aria-invalid={Boolean(adminPasswordError)} aria-describedby={adminPasswordError ? 'admin-password-error' : undefined} />
              <label htmlFor="admin-password">PALAVRA-PASSE</label>
              <input id="admin-password" type="password" autoComplete="current-password" required value={adminPasswordInput} onChange={(event) => setAdminPasswordInput(event.target.value)} aria-invalid={Boolean(adminPasswordError)} aria-describedby={adminPasswordError ? 'admin-password-error' : undefined} />
              {adminPasswordError && <span className="admin-gate-error" id="admin-password-error" role="alert">{adminPasswordError}</span>}
              <button className="admin-gate-submit" type="submit" disabled={adminBusy}>{adminBusy ? 'A autenticar…' : 'Entrar no painel'} <Arrow diagonal /></button>
              <span className="admin-gate-footnote">ATALHO PRIVADO · CTRL + SHIFT + 6</span>
            </form>
          </div>
        ) : (
        <div className="admin-shell" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Painel de administração">
          <aside className="admin-sidebar">
            <a className="admin-brand" href="#inicio" onClick={() => setAdminOpen(false)}><span className="admin-brand-mark">m.</span><span>MARTA’S<br />HOME</span></a>
            <span className="admin-side-label">ESPAÇO DE TRABALHO</span>
            <button className={adminView === 'overview' ? 'admin-nav-item current' : 'admin-nav-item'} onClick={() => { setAdminView('overview'); setSelectedLeadId(null); }}><span>◫</span> Visão geral</button>
            <button className={adminView === 'requests' ? 'admin-nav-item current' : 'admin-nav-item'} onClick={() => { setAdminView('requests'); setSelectedLeadId(null); }}><span>▤</span> Pedidos <b>{leads.filter((lead) => lead.status === 'new').length}</b></button>
            <button className={adminView === 'settings' ? 'admin-nav-item current' : 'admin-nav-item'} onClick={() => { setAdminView('settings'); setSelectedLeadId(null); }}><span>⚙</span> Definições</button>
            <div className="admin-sidebar-bottom"><span className="admin-avatar">M</span><span><b>Marta</b><small>Gestora da loja</small></span></div>
          </aside>
          <section className="admin-main">
            <header className="admin-header">
              <div><span className="admin-breadcrumb">MARTA’S HOME <span>/</span> {selectedLeadId ? 'PEDIDO' : adminView === 'overview' ? 'VISÃO GERAL' : adminView === 'requests' ? 'PEDIDOS' : 'DEFINIÇÕES'}</span><h1>{selectedLeadId ? 'Detalhe do pedido' : adminView === 'overview' ? 'Bom dia, Marta' : adminView === 'requests' ? 'Pedidos de projeto' : 'Definições da loja'}</h1></div>
              <div className="admin-header-actions"><span className="local-status"><i /> Sincronizado com Supabase</span><button className="admin-close" onClick={() => { setAdminOpen(false); void signOutAdmin(); }} aria-label="Terminar sessão e fechar painel">Sair <kbd>ESC</kbd></button></div>
            </header>
            <div className="admin-content">
              {saveError && <p className="storage-error admin-storage-error" role="alert">{saveError}</p>}
              {selectedLeadId && (() => {
                const lead = leads.find((item) => item.id === selectedLeadId);
                if (!lead) return <div className="admin-empty"><h2>Pedido já não existe</h2><button onClick={() => setSelectedLeadId(null)}>Voltar aos pedidos</button></div>;
                return <LeadDetails lead={lead} onBack={() => setSelectedLeadId(null)} onSave={async (changes) => { if (await updateLead(lead.id, changes)) showToast('Pedido atualizado.'); }} onDelete={() => deleteLead(lead.id)} />;
              })()}
              {!selectedLeadId && adminView === 'overview' && (
                <div className="admin-overview">
                  <div className="admin-welcome"><div><span>O TEU ESTÚDIO, NUM SÓ SÍTIO</span><h2>Ideias que chegam.<br /><em>Projetos que começam.</em></h2></div><span className="admin-welcome-icon">✳</span></div>
                  <div className="metric-grid">
                    <Metric label="PEDIDOS RECEBIDOS" value={leads.length} note="Todos os pedidos registados" />
                    <Metric label="NOVOS PEDIDOS" value={leads.filter((lead) => lead.status === 'new').length} note="Aguardam primeiro contacto" />
                    <Metric label="EM PROPOSTA" value={leads.filter((lead) => lead.status === 'proposal').length} note="Propostas por acompanhar" />
                    <Metric label="PROJETOS CONCLUÍDOS" value={leads.filter((lead) => lead.status === 'completed').length} note="Ideias já concretizadas" />
                  </div>
                  <AdminLeadList leads={leads.slice(0, 5)} onOpen={(id) => setSelectedLeadId(id)} onViewAll={() => setAdminView('requests')} />
                </div>
              )}
              {!selectedLeadId && adminView === 'requests' && (
                <div className="admin-requests">
                  <div className="request-toolbar"><div><h2>Os teus pedidos</h2><p>Segue cada ideia desde a primeira mensagem até à divisão pronta.</p></div><button className="export-button" onClick={exportLeads}>↓ Exportar CSV</button></div>
                  <div className="request-controls"><input aria-label="Pesquisar pedidos" placeholder="Pesquisar por nome, email ou divisão…" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} /><select aria-label="Filtrar por estado" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}><option value="all">Todos os estados</option>{leadStatuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></div>
                  <AdminLeadList leads={leads.filter((lead) => (leadFilter === 'all' || lead.status === leadFilter) && `${lead.name} ${lead.email} ${lead.room}`.toLowerCase().includes(leadSearch.toLowerCase()))} onOpen={(id) => setSelectedLeadId(id)} />
                </div>
              )}
              {!selectedLeadId && adminView === 'settings' && (
                <div className="admin-settings">
                  <div className="request-toolbar"><div><h2>Personaliza a montra</h2><p>Atualiza as mensagens e o contacto que aparecem no site.</p></div></div>
                  <form className="settings-form" onSubmit={saveSiteSettings}>
                    <label>Frase principal<textarea name="description" defaultValue={heroDescription} required maxLength="180" rows="3" /></label>
                    <label>Email de contacto<input name="email" type="email" defaultValue={contactEmail} required /></label>
                    <p>Os pedidos e estas definições ficam guardados na base de dados partilhada.</p>
                    {saveError && <p className="storage-error" role="alert">{saveError}</p>}
                    <button className="settings-save" type="submit">Guardar definições</button>
                  </form>
                  <div className="data-tools"><div><b>Exportar pedidos</b><span>Descarrega uma cópia CSV para guardar ou abrir numa folha de cálculo.</span></div><button className="export-button" onClick={exportLeads}>↓ Exportar CSV</button></div>
                </div>
              )}
            </div>
          </section>
          {toast && <div className="admin-toast" role="status">{toast}</div>}
        </div>
        )
      )}
    </>
  );
}

export default App;

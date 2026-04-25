// shell.jsx — SimplePractice-style window chrome, sidebar, topbar
// Used by EHR Buddy redesign

const { useState, useEffect, useRef } = React;

// ── Color tokens ──────────────────────────────────────────────
const T = {
  // Soothing dusty-blue: cool oyster canvas, soft slate sidebar, muted periwinkle accent
  ink:        '#1E2230',  // deepest text — cool near-black
  ink2:       '#2D3242',
  body:       '#4B5267',
  muted:      '#7A8095',
  faint:      '#A8AEC0',
  hairline:   '#E2E4EC',
  divider:    '#ECEEF4',
  surface:    '#FFFFFF',
  canvas:     '#F2F3F7',  // cool oyster canvas
  canvas2:    '#F8F9FC',
  sidebar:    '#2A2F3D',  // soft cool slate sidebar (not pure dark)
  sidebarInk: '#E4E6EE',
  sidebarMuted:'#8E94A6',
  sidebarHover:'#3A4054',
  primary:    '#7A89B8',  // muted dusty periwinkle accent
  primaryDk:  '#5E6E9D',
  primarySoft:'#E5E9F4',
  accent:     '#8C7AA8',  // dusty mauve for highlights
  danger:     '#B5524F',
  dangerSoft: '#F5E2E0',
  warn:       '#A88044',
  warnSoft:   '#F2E8D5',
  success:    '#6B8E7E',
  successSoft:'#E2EDE7',
};

// ── Density tokens ────────────────────────────────────────────
const DENSITY = {
  cozy:    { rowH: 56, cellPad: '14px 16px', gap: 16, bodyFs: 14, titleFs: 22 },
  comfy:   { rowH: 48, cellPad: '11px 14px', gap: 12, bodyFs: 13.5, titleFs: 21 },
  compact: { rowH: 40, cellPad: '8px 12px',  gap: 10, bodyFs: 13, titleFs: 20 },
};

// ── Type pairing ──────────────────────────────────────────────
const TYPE_PAIRINGS = {
  'Sans (system)': {
    body: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    head: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  },
  'Serif headings': {
    body: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    head: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
  },
  'Slab headings': {
    body: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    head: '"Roboto Slab", "Source Serif 4", Georgia, serif',
  },
  'Humanist': {
    body: '"Source Sans 3", "Source Sans Pro", -apple-system, sans-serif',
    head: '"Source Sans 3", "Source Sans Pro", -apple-system, sans-serif',
  },
};

// ── Icons (inline SVG, 1.5px stroke, lucide-style) ────────────
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.75 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'calendar': return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>;
    case 'users': return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'user': return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'clipboard': return <svg {...p}><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/></svg>;
    case 'dollar': return <svg {...p}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'chart': return <svg {...p}><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/></svg>;
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'home': return <svg {...p}><path d="M3 12L12 3l9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>;
    case 'plus': return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case 'bell': return <svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    case 'help': return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>;
    case 'chevR': return <svg {...p}><path d="m9 18 6-6-6-6"/></svg>;
    case 'chevL': return <svg {...p}><path d="m15 18-6-6 6-6"/></svg>;
    case 'chevD': return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case 'check': return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    case 'lock': return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'phone': return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case 'mail': return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>;
    case 'doc': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>;
    case 'pdf': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><text x="7" y="18" fontSize="6" fontWeight="700" fill={color} stroke="none">PDF</text></svg>;
    case 'inbox': return <svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
    case 'shield': return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'edit': return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>;
    case 'paperclip': return <svg {...p}><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
    case 'video': return <svg {...p}><path d="M22 8 16 12l6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>;
    case 'arrowR': return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'circle': return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
    case 'dot': return <svg {...p}><circle cx="12" cy="12" r="4" fill={color} stroke="none"/></svg>;
    default: return null;
  }
};

// ── Window frame ──────────────────────────────────────────────
function WindowFrame({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #D6D9E0 0%, #C2C6D2 100%)',
      padding: 24, boxSizing: 'border-box', minHeight: '100vh',
    }}>
      <div style={{
        width: '100%', maxWidth: 1440, height: 'min(900px, calc(100vh - 48px))',
        borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: T.canvas,
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.18), 0 30px 80px rgba(40,30,20,0.35), 0 8px 20px rgba(40,30,20,0.18)',
      }}>
        {/* Title bar */}
        <div style={{
          height: 32, display: 'flex', alignItems: 'center', padding: '0 14px',
          background: 'linear-gradient(180deg, #ECEEF4 0%, #DFE2EB 100%)',
          borderBottom: `0.5px solid ${T.hairline}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', border: '0.5px solid rgba(0,0,0,0.08)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', border: '0.5px solid rgba(0,0,0,0.08)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', border: '0.5px solid rgba(0,0,0,0.08)' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 500, color: T.muted, letterSpacing: 0.2 }}>
            EHR Buddy
          </div>
          <div style={{ width: 56 }} />
        </div>
        {/* App body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ current, onNav, layout }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'clients',   label: 'Clients',   icon: 'users' },
    { id: 'calendar',  label: 'Calendar',  icon: 'calendar' },
    { id: 'billing',   label: 'Billing',   icon: 'dollar' },
    { id: 'reports',   label: 'Reports',   icon: 'chart' },
    { id: 'documents', label: 'Documents', icon: 'inbox' },
    { id: 'activity',  label: 'Activity',  icon: 'shield' },
    { id: 'settings',  label: 'Settings',  icon: 'settings' },
  ];

  if (layout === 'hidden') return null;
  const collapsed = layout === 'icon';
  const width = collapsed ? 60 : 224;

  return (
    <div style={{
      width, flexShrink: 0, background: T.sidebar, color: T.sidebarInk,
      display: 'flex', flexDirection: 'column',
      borderRight: '0.5px solid rgba(0,0,0,0.2)',
      transition: 'width 0.18s ease',
    }}>
      {/* Brand */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '0' : '0 18px', justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: T.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>EB</div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>EHR Buddy</span>
            <span style={{ fontSize: 11, color: T.sidebarMuted }}>Solo practice</span>
          </div>
        )}
      </div>

      {/* Create button */}
      <div style={{ padding: collapsed ? '14px 8px' : '14px 14px' }}>
        <button onClick={() => onNav('newSession')} style={{
          width: '100%', height: 36, border: 0, borderRadius: 8,
          background: T.primary, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontWeight: 600, fontSize: 13,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.2)',
        }}>
          <Icon name="plus" size={16} />
          {!collapsed && <span>Create</span>}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: collapsed ? '0 6px' : '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((it) => {
          const active = current === it.id;
          return (
            <button key={it.id} onClick={() => onNav(it.id)} title={collapsed ? it.label : undefined} style={{
              width: '100%', height: 36, border: 0, cursor: 'pointer',
              background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: active ? '#fff' : T.sidebarInk,
              borderRadius: 7, padding: collapsed ? '0' : '0 10px',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, fontSize: 13, fontWeight: active ? 600 : 500,
              textAlign: 'left', position: 'relative',
            }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {active && <span style={{ position: 'absolute', left: collapsed ? -6 : 0, top: 7, bottom: 7, width: 3, borderRadius: 2, background: T.accent }} />}
              <Icon name={it.icon} size={18} color={active ? '#fff' : T.sidebarMuted} />
              {!collapsed && <span>{it.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div style={{
        padding: collapsed ? '14px 8px' : '14px',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: '#9CA4B8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.ink, fontSize: 12, fontWeight: 600,
        }}>DR</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr. Robin Hale</div>
            <div style={{ fontSize: 11, color: T.sidebarMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>LCSW · NPI 1234567890</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Top bar (search, breadcrumbs, action) ─────────────────────
function TopBar({ title, breadcrumbs, right, onSearch }) {
  return (
    <div style={{
      height: 56, flexShrink: 0, padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      background: T.surface,
      borderBottom: `0.5px solid ${T.hairline}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {breadcrumbs && (
          <div style={{ fontSize: 11.5, color: T.muted, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 1 }}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="chevR" size={11} color={T.faint} />}
                <span style={{ color: i === breadcrumbs.length - 1 ? T.body : T.muted }}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: -0.2 }}>{title}</h1>
      </div>

      <div style={{ flex: 1 }} />

      {/* Global search */}
      <div style={{
        width: 280, height: 34, borderRadius: 7,
        background: T.canvas2, border: `0.5px solid ${T.hairline}`,
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
      }}>
        <Icon name="search" size={15} color={T.muted} />
        <input
          placeholder="Search clients, notes, files…"
          onChange={(e) => onSearch && onSearch(e.target.value)}
          style={{
            flex: 1, border: 0, background: 'transparent', outline: 'none',
            fontSize: 13, color: T.ink, fontFamily: 'inherit',
          }}
        />
        <kbd style={{
          fontSize: 10.5, color: T.muted, padding: '1px 5px',
          border: `0.5px solid ${T.hairline}`, borderRadius: 4, background: '#fff',
        }}>⌘K</kbd>
      </div>

      {/* Action icons */}
      <button title="Help" style={iconBtn}><Icon name="help" size={18} color={T.muted} /></button>
      <button title="Notifications" style={{...iconBtn, position: 'relative'}}>
        <Icon name="bell" size={18} color={T.muted} />
        <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: T.danger, border: '1.5px solid #fff' }} />
      </button>

      {right}
    </div>
  );
}

const iconBtn = {
  width: 34, height: 34, borderRadius: 7, border: 0,
  background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── Button ────────────────────────────────────────────────────
function Btn({ variant = 'primary', size = 'md', icon, children, onClick, disabled, style = {} }) {
  const variants = {
    primary:  { bg: T.primary, color: '#fff', border: T.primary, hover: T.primaryDk },
    secondary:{ bg: '#fff',    color: T.ink,  border: T.hairline, hover: T.canvas2 },
    ghost:    { bg: 'transparent', color: T.body, border: 'transparent', hover: T.canvas2 },
    danger:   { bg: '#fff', color: T.danger, border: T.dangerSoft, hover: T.dangerSoft },
  };
  const v = variants[variant];
  const sz = size === 'sm'
    ? { height: 28, padding: '0 10px', fs: 12 }
    : size === 'lg'
    ? { height: 40, padding: '0 18px', fs: 14 }
    : { height: 34, padding: '0 14px', fs: 13 };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sz.height, padding: sz.padding, fontSize: sz.fs, fontWeight: 600,
      background: v.bg, color: v.color, border: `0.5px solid ${v.border}`,
      borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
      whiteSpace: 'nowrap', flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
      boxShadow: variant === 'primary' ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
      ...style,
    }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ initials, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || '#9CA4B8',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
      boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.08)',
    }}>{initials}</div>
  );
}

// ── Pill / Badge ──────────────────────────────────────────────
function Pill({ tone = 'neutral', children, soft = true }) {
  const tones = {
    neutral: { bg: '#E2E5EE', color: T.body },
    primary: { bg: T.primarySoft, color: T.primaryDk },
    success: { bg: T.successSoft, color: T.success },
    warn:    { bg: T.warnSoft, color: T.warn },
    danger:  { bg: T.dangerSoft, color: T.danger },
    accent:  { bg: '#E5DEEC', color: '#5C4D75' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 20, padding: '0 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
      background: t.bg, color: t.color, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ── Card ──────────────────────────────────────────────────────
function Card({ children, padding = 20, style = {} }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 10,
      border: `0.5px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(40,30,20,0.04)',
      padding, ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  T, DENSITY, TYPE_PAIRINGS, Icon, WindowFrame, Sidebar, TopBar, Btn, Avatar, Pill, Card, iconBtn,
});

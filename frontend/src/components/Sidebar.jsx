import { Building2, Settings, LayoutDashboard, Plus, Circle } from 'lucide-react'

const styles = {
  sidebar: {
    width: 240,
    minWidth: 240,
    background: '#0d1117',
    borderRight: '1px solid #1e2a3a',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  logo: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid #1e2a3a',
  },
  logoTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#60a5fa',
    textTransform: 'uppercase',
  },
  logoSub: { fontSize: 11, color: '#475569', marginTop: 2 },
  section: { padding: '12px 0 4px' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#475569',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '0 16px',
    marginBottom: 4,
  },
  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 16px',
    cursor: 'pointer',
    borderRadius: 0,
    background: active ? '#1e2a3a' : 'transparent',
    color: active ? '#e2e8f0' : '#94a3b8',
    fontSize: 13,
    transition: 'all 0.15s',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
  }),
  dot: (status) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: status === 'success' ? '#22c55e' : status === 'error' ? '#ef4444' : '#64748b',
    flexShrink: 0,
    marginLeft: 'auto',
  }),
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid #1e2a3a',
    padding: 8,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '7px 12px',
    background: 'transparent',
    border: '1px dashed #334155',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 12,
    cursor: 'pointer',
  },
}

export default function Sidebar({ competitors, results, activeView, onNavigate, onAddCompetitor }) {
  const getStatus = (id) => {
    const r = results[id]
    return r?.status || null
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoTitle}>CompIntel</div>
        <div style={styles.logoSub}>Competitive Intelligence</div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Overview</div>
        <button style={styles.navItem(activeView === 'dashboard')} onClick={() => onNavigate('dashboard')}>
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        <button style={styles.navItem(activeView === 'settings')} onClick={() => onNavigate('settings')}>
          <Settings size={14} />
          Settings
        </button>
      </div>

      <div style={{ ...styles.section, flex: 1, overflowY: 'auto' }}>
        <div style={styles.sectionLabel}>Competitors</div>
        {competitors.map((c) => (
          <button
            key={c.id}
            style={styles.navItem(activeView === `competitor:${c.id}`)}
            onClick={() => onNavigate(`competitor:${c.id}`)}
          >
            <Building2 size={14} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </span>
            <span style={styles.dot(getStatus(c.id))} />
          </button>
        ))}
      </div>

      <div style={styles.footer}>
        <button style={styles.addBtn} onClick={onAddCompetitor}>
          <Plus size={12} />
          Add competitor
        </button>
      </div>
    </div>
  )
}

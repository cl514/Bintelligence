import { Play, RefreshCw, AlertCircle, CheckCircle, Clock, Globe, Newspaper } from 'lucide-react'

const s = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 600, color: '#f1f5f9' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  runBtn: (loading) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', background: loading ? '#1e3a5f' : '#2563eb',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500,
    opacity: loading ? 0.7 : 1, transition: 'background 0.15s',
  }),
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  statCard: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 10, padding: '16px 20px',
  },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginTop: 6 },
  statSub: { fontSize: 12, color: '#475569', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  card: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 10,
    padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  cardUrl: { fontSize: 11, color: '#475569', marginTop: 2 },
  badge: (status) => ({
    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 12,
    background: status === 'success' ? '#14532d' : status === 'error' ? '#450a0a' : '#1e2a3a',
    color: status === 'success' ? '#4ade80' : status === 'error' ? '#f87171' : '#64748b',
  }),
  summary: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 8 },
  meta: { display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e2a3a' },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' },
  empty: { textAlign: 'center', padding: '60px 0', color: '#475569' },
  emptyIcon: { marginBottom: 12, opacity: 0.3 },
  spin: { animation: 'spin 1s linear infinite' },
}

function timeAgo(ts) {
  if (!ts) return 'Never'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Dashboard({ competitors, results, systemStatus, onRunAll, onRunOne, running, onSelectCompetitor }) {
  const active = competitors.filter(c => c.active !== false)
  const successCount = Object.values(results).filter(r => r.status === 'success').length
  const changesTotal = Object.values(results).reduce((n, r) => n + (r.changes_detected || 0), 0)
  const articlesTotal = Object.values(results).reduce((n, r) => n + (r.news_articles?.length || 0), 0)

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={s.header}>
        <div>
          <div style={s.title}>Intelligence Dashboard</div>
          <div style={s.subtitle}>
            {systemStatus?.next_scheduled_run
              ? `Next scan: ${timeAgo(systemStatus.next_scheduled_run)}`
              : 'Monitoring your competitors'}
          </div>
        </div>
        <button style={s.runBtn(running)} onClick={onRunAll} disabled={running}>
          {running
            ? <><RefreshCw size={14} style={s.spin} /> Running…</>
            : <><Play size={14} /> Run All Now</>
          }
        </button>
      </div>

      <div style={s.stats}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Competitors</div>
          <div style={s.statValue}>{active.length}</div>
          <div style={s.statSub}>being monitored</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Scanned</div>
          <div style={s.statValue}>{successCount}</div>
          <div style={s.statSub}>successful scans</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Changes</div>
          <div style={{ ...s.statValue, color: changesTotal > 0 ? '#f59e0b' : '#e2e8f0' }}>{changesTotal}</div>
          <div style={s.statSub}>detected this cycle</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>News Items</div>
          <div style={s.statValue}>{articlesTotal}</div>
          <div style={s.statSub}>articles found</div>
        </div>
      </div>

      {active.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}><Globe size={48} /></div>
          <div style={{ fontSize: 15 }}>No competitors added yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Use the sidebar to add competitors to monitor</div>
        </div>
      ) : (
        <div style={s.grid}>
          {active.map(comp => {
            const result = results[comp.id]
            return (
              <div
                key={comp.id}
                style={s.card}
                onClick={() => onSelectCompetitor(comp.id)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a3a'}
              >
                <div style={s.cardHeader}>
                  <div>
                    <div style={s.cardName}>{comp.name}</div>
                    <div style={s.cardUrl}>{comp.website}</div>
                  </div>
                  <span style={s.badge(result?.status)}>
                    {result?.status || 'Not scanned'}
                  </span>
                </div>

                {result?.ai_summary && (
                  <div style={s.summary}>
                    {result.ai_summary.slice(0, 180)}{result.ai_summary.length > 180 ? '…' : ''}
                  </div>
                )}

                <div style={s.meta}>
                  <div style={s.metaItem}>
                    <Globe size={11} />
                    {result?.pages_scanned || 0} pages
                  </div>
                  <div style={s.metaItem}>
                    <AlertCircle size={11} />
                    {result?.changes_detected || 0} changes
                  </div>
                  <div style={s.metaItem}>
                    <Newspaper size={11} />
                    {result?.news_articles?.length || 0} articles
                  </div>
                  <div style={{ ...s.metaItem, marginLeft: 'auto' }}>
                    <Clock size={11} />
                    {timeAgo(result?.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

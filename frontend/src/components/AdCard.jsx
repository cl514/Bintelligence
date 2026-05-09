import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'

const styles = {
  card: {
    background: '#131b27',
    border: '1px solid #1e2a3a',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.15s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
  },
  thumb: {
    width: '100%',
    minHeight: 180,
    background: '#0d1117',
    objectFit: 'cover',
  },
  body: {
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 14, fontWeight: 700, color: '#f8fafc' },
  badge: { fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '4px 10px' },
  platform: { background: '#1e293b', color: '#60a5fa' },
  impressions: { color: '#94a3b8', fontSize: 11 },
  hook: { color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 },
  cta: { color: '#c7d2fe', fontSize: 12 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { fontSize: 11, color: '#64748b' },
  arrow: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#60a5fa', fontSize: 12 },
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdCard({ ad, competitorName, onSelect }) {
  const screenshotUrl = ad.screenshot_filename ? `/uploads/ads/${ad.screenshot_filename}` : null
  return (
    <button
      type="button"
      style={styles.card}
      onClick={() => onSelect(ad)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2a3a'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {screenshotUrl ? (
        <img src={screenshotUrl} alt="Ad screenshot" style={styles.thumb} />
      ) : (
        <div style={{ ...styles.thumb, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>
          No screenshot
        </div>
      )}
      <div style={styles.body}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>{competitorName || ad.competitor_id}</div>
            <div style={styles.impressions}>{ad.impressions ? `${ad.impressions} impressions` : 'Impressions unknown'}</div>
          </div>
          <span style={{ ...styles.badge, ...styles.platform }}>{ad.platform || 'Unknown'}</span>
        </div>

        <div style={styles.hook}>{ad.analysis?.hook || 'No hook extracted yet'}</div>
        <div style={styles.cta}>{ad.analysis?.cta ? `CTA: ${ad.analysis.cta}` : 'CTA not available'}</div>

        <div style={styles.footer}>
          <span style={styles.date}>{formatDate(ad.created_at)}</span>
          <span style={styles.arrow}><ArrowRight size={12} /> View</span>
        </div>
      </div>
    </button>
  )
}

import { useState } from 'react'
import { X, Trash2, Pencil, Sparkles } from 'lucide-react'

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    width: 420, maxWidth: '100%', height: '100%', background: '#0b1220', padding: 24,
    display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', borderLeft: '1px solid #1e2a3a',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, fontWeight: 700, color: '#f8fafc' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  screenshot: { width: '100%', borderRadius: 12, background: '#131b27', minHeight: 200, objectFit: 'cover' },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldValue: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: { background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#cbd5e1' },
  highlight: { background: '#111827', border: '1px solid #334155', borderRadius: 12, padding: 16, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 },
  notes: {
    width: '100%', minHeight: 120, background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12,
    color: '#e2e8f0', padding: 14, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
  },
  buttonRow: { display: 'flex', gap: 10, marginTop: 12 },
  button: (variant) => ({
    flex: variant === 'danger' ? '0 0 auto' : '1',
    padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: '#fff',
    background: variant === 'danger' ? '#7f1d1d' : variant === 'save' ? '#1f2937' : '#2563eb',
  }),
  badge: { alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 999, fontSize: 11, color: '#e2e8f0', background: '#1f2937' },
}

function firstLine(text = '') {
  return text.split('\n').find(line => line.trim()) || ''
}

function lengthLabel(text = '') {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words >= 120) return 'Long'
  if (words >= 60) return 'Medium'
  return 'Short'
}

export default function AdDetailPanel({ ad, competitorName, onClose, onDelete, onNotesSave }) {
  const [notes, setNotes] = useState(ad.notes || '')

  const headline = firstLine(ad.landing_page_text)
  const tone = ad.analysis?.tone || 'N/A'
  const format = ad.analysis?.format || 'N/A'
  const structure = ad.analysis?.landing_page_structure || 'N/A'
  const hook = ad.analysis?.hook || 'No hook available'
  const cta = ad.analysis?.cta || 'No CTA available'
  const painPoints = ad.analysis?.pain_points || []
  const insights = ad.analysis?.key_insights || []

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>{competitorName || ad.competitor_id}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Ad details</div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {ad.screenshot_filename ? (
          <img src={`/uploads/ads/${ad.screenshot_filename}`} alt="Ad screenshot" style={styles.screenshot} />
        ) : (
          <div style={{ ...styles.screenshot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            No screenshot uploaded
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.label}>Hook</div>
          <div style={styles.fieldValue}>{hook}</div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Pain points</div>
          <div style={styles.tagRow}>
            {painPoints.length > 0 ? painPoints.map((point, idx) => (
              <span key={idx} style={styles.tag}>{point}</span>
            )) : <span style={styles.tag}>None identified</span>}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>CTA</div>
          <div style={styles.fieldValue}>{cta}</div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Tone & format</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={styles.badge}>{tone}</span>
            <span style={styles.badge}>{format}</span>
            <span style={styles.badge}>{lengthLabel(ad.landing_page_text)}</span>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Landing page headline</div>
          <div style={styles.fieldValue}>{headline || 'Not available'}</div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Landing page structure</div>
          <div style={styles.fieldValue}>{structure}</div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Key insights</div>
          <div style={styles.highlight}>
            {insights.length > 0 ? insights.map((item, idx) => (
              <div key={idx} style={{ marginBottom: idx < insights.length - 1 ? 10 : 0 }}>
                <Sparkles size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {item}
              </div>
            )) : 'No insights available.'}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Notes</div>
          <textarea
            style={styles.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your own observations"
          />
          <div style={styles.buttonRow}>
            <button type="button" style={styles.button('save')} onClick={() => onNotesSave(notes)}>
              <Pencil size={14} /> Save notes
            </button>
            <button type="button" style={styles.button('danger')} onClick={() => onDelete(ad)}>
              <Trash2 size={14} /> Delete ad
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

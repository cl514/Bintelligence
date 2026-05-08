import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal = {
  background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 12,
  padding: 24, width: 440, maxWidth: '90vw',
}
const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 600, color: '#f1f5f9' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: {
    width: '100%', padding: '9px 12px', background: '#0d1117',
    border: '1px solid #1e2a3a', borderRadius: 7, color: '#e2e8f0',
    fontSize: 13, outline: 'none',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  checkLabel: { fontSize: 13, color: '#94a3b8' },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
    background: variant === 'primary' ? '#2563eb' : '#1e2a3a',
    color: '#e2e8f0',
  }),
}

export default function CompetitorModal({ competitor, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', website: '', active: true })
  const editing = !!competitor?.id

  useEffect(() => {
    if (competitor) setForm({ name: competitor.name, website: competitor.website, active: competitor.active !== false })
  }, [competitor])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.website.trim()) return
    const website = form.website.startsWith('http') ? form.website : `https://${form.website}`
    onSave({ ...form, website })
  }

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={s.header}>
          <div style={s.title}>{editing ? 'Edit Competitor' : 'Add Competitor'}</div>
          <button style={s.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Company Name</label>
            <input style={s.input} value={form.name} onChange={set('name')} placeholder="e.g. Deloitte" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Website URL</label>
            <input style={s.input} value={form.website} onChange={set('website')} placeholder="https://..." required />
          </div>
          <div style={s.checkRow}>
            <input
              type="checkbox" id="active"
              checked={form.active}
              onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            <label htmlFor="active" style={s.checkLabel}>Active (include in scans)</label>
          </div>
          <div style={s.actions}>
            <button type="button" style={s.btn('secondary')} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.btn('primary')}>{editing ? 'Save Changes' : 'Add Competitor'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

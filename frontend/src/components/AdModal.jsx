import { useState } from 'react'
import { X, ImagePlus, ArrowRight } from 'lucide-react'
import { api } from '../api'

const PLATFORMS = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Other']

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal = {
  background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 14,
  padding: 28, width: 520, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
}
const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 18, fontWeight: 700, color: '#f8fafc' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  field: { marginBottom: 18 },
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #1e2a3a',
    background: '#0d1117', color: '#e2e8f0', fontSize: 13, outline: 'none',
  },
  textarea: {
    width: '100%', minHeight: 140, padding: '12px 14px', borderRadius: 10,
    border: '1px solid #1e2a3a', background: '#0d1117', color: '#e2e8f0', fontSize: 13,
    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  button: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
    borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
    fontWeight: 600, background: '#2563eb', color: '#fff',
  },
  hint: { fontSize: 11, color: '#64748b', marginTop: 6 },
}

export default function AdModal({ onSave, onClose, competitors }) {
  const [form, setForm] = useState({
    competitor: '',
    platform: 'Meta',
    impressions: '',
    ad_copy: '',
    landing_page_url: '',
    screenshot: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (event) => {
    const value = event.target.type === 'file'
      ? event.target.files[0]
      : event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.competitor.trim() || !form.ad_copy.trim() || !form.landing_page_url.trim()) {
      setError('Please fill competitor, ad copy and landing page URL.')
      return
    }

    setSubmitting(true)
    try {
      const analysisResponse = await api.analyzeAd({
        ad_copy: form.ad_copy,
        landing_page_url: form.landing_page_url,
      })

      const formData = new FormData()
      formData.append('competitor_id', form.competitor)
      formData.append('ad_copy', form.ad_copy)
      formData.append('landing_page_url', form.landing_page_url)
      formData.append('platform', form.platform)
      if (form.impressions) formData.append('impressions', form.impressions)
      if (form.screenshot) formData.append('screenshot', form.screenshot)

      const savedAd = await api.createAd(formData)
      onSave({
        ...savedAd,
        platform: form.platform,
        impressions: form.impressions,
        analysis: analysisResponse.analysis,
        landing_page_text: analysisResponse.landing_page_text,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to analyze and save ad.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={s.title}>Add Ad</div>
            <div style={s.hint}>Capture the ad details, analyze the landing page, and save it in one step.</div>
          </div>
          <button type="button" style={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Competitor</label>
            <input
              style={s.input}
              value={form.competitor}
              onChange={update('competitor')}
              placeholder="Company or brand name"
            />
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Platform</label>
              <select style={s.input} value={form.platform} onChange={update('platform')}>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Impressions (optional)</label>
              <input
                type="number"
                style={s.input}
                value={form.impressions}
                onChange={update('impressions')}
                placeholder="e.g. 12000"
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Ad copy</label>
            <textarea
              style={s.textarea}
              value={form.ad_copy}
              onChange={update('ad_copy')}
              placeholder="Paste the ad copy text"
            />
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Landing page URL</label>
              <input
                style={s.input}
                value={form.landing_page_url}
                onChange={update('landing_page_url')}
                placeholder="https://..."
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Screenshot</label>
              <input type="file" accept="image/*" style={s.input} onChange={update('screenshot')} />
            </div>
          </div>

          {error && <div style={{ color: '#f87171', marginBottom: 14 }}>{error}</div>}

          <button type="submit" style={s.button} disabled={submitting}>
            {submitting ? 'Analyzing…' : 'Analyze & Save'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

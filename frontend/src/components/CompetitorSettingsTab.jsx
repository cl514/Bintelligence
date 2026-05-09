import { useState } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { api } from '../api'

const s = {
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8,
    borderBottom: '1px solid #1e2a3a',
  },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  hint: { fontSize: 11, color: '#475569', marginTop: 4 },
  select: {
    padding: '8px 12px', background: '#0d1117', border: '1px solid #1e2a3a',
    borderRadius: 7, color: '#e2e8f0', fontSize: 13, outline: 'none',
  },
  textarea: {
    width: '100%', padding: '9px 12px', background: '#0d1117',
    border: '1px solid #1e2a3a', borderRadius: 7, color: '#e2e8f0',
    fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 72,
    fontFamily: 'inherit',
  },
  checkRow: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' },
  colorDot: (color) => ({
    width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block',
  }),
  saveBtn: (saved) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', background: saved ? '#14532d' : '#2563eb',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }),
}

export default function CompetitorSettingsTab({ competitor, priorityLabels, categoryLabels, onSettingsSaved }) {
  const [form, setForm] = useState({
    priority_label_id: competitor.priority_label_id || '',
    category_label_ids: competitor.category_label_ids || [],
    max_pages_sitemap: competitor.max_pages_sitemap || 10,
    relevant_topics: competitor.relevant_topics || '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Keep in sync if competitor prop changes (switching competitor)
  const key = competitor.id
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setForm({
      priority_label_id: competitor.priority_label_id || '',
      category_label_ids: competitor.category_label_ids || [],
      max_pages_sitemap: competitor.max_pages_sitemap || 10,
      relevant_topics: competitor.relevant_topics || '',
    })
  }

  const toggleCategory = (id) => {
    setForm(f => ({
      ...f,
      category_label_ids: f.category_label_ids.includes(id)
        ? f.category_label_ids.filter(x => x !== id)
        : [...f.category_label_ids, id],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        priority_label_id: form.priority_label_id || null,
        category_label_ids: form.category_label_ids,
        max_pages_sitemap: Number(form.max_pages_sitemap),
        relevant_topics: form.relevant_topics,
      }
      await api.updateCompetitor(competitor.id, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSettingsSaved && onSettingsSaved()
    } finally {
      setSaving(false)
    }
  }

  const selectedLabel = priorityLabels.find(l => l.id === form.priority_label_id)
  const assignedLabelExists = !form.priority_label_id || !!selectedLabel

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Priority Label */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Prioritäts-Label</div>
        <div style={s.field}>
          <label style={s.label}>Label</label>
          <select
            style={s.select}
            value={form.priority_label_id}
            onChange={e => setForm(f => ({ ...f, priority_label_id: e.target.value }))}
          >
            <option value="">— Keines —</option>
            {priorityLabels.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
            {!assignedLabelExists && (
              <option value={form.priority_label_id}>{form.priority_label_id} (gelöscht)</option>
            )}
          </select>
          {selectedLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={s.colorDot(selectedLabel.color)} />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Crawl: {selectedLabel.crawl_frequency} · News: {selectedLabel.news_frequency} · Slack: {selectedLabel.slack_notifications ? 'ja' : 'nein'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Labels */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Kategorien</div>
        <div style={s.field}>
          {categoryLabels.length === 0 ? (
            <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>Keine Kategorien definiert.</div>
          ) : (
            <div style={s.checkRow}>
              {categoryLabels.map(l => {
                const checked = form.category_label_ids.includes(l.id)
                return (
                  <label key={l.id} style={s.checkLabel}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(l.id)}
                      style={{ accentColor: l.color }}
                    />
                    <span style={s.colorDot(l.color)} />
                    {l.name}
                  </label>
                )
              })}
            </div>
          )}
          {/* Show deleted category ids that are still assigned */}
          {form.category_label_ids.filter(id => !categoryLabels.find(l => l.id === id)).map(id => (
            <div key={id} style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>{id} (gelöscht)</div>
          ))}
        </div>
      </div>

      {/* Max Pages Sitemap */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Sitemap Crawl</div>
        <div style={s.field}>
          <label style={s.label}>Max. Seiten</label>
          <select
            style={s.select}
            value={form.max_pages_sitemap}
            onChange={e => setForm(f => ({ ...f, max_pages_sitemap: e.target.value }))}
          >
            {[10, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <div style={s.hint}>Maximale Seitenanzahl für den Sitemap-Crawl dieses Wettbewerbers</div>
        </div>
      </div>

      {/* Relevant Topics */}
      <div style={s.section}>
        <div style={s.sectionTitle}>KI-Kontext</div>
        <div style={s.field}>
          <label style={s.label}>Relevante Themen</label>
          <textarea
            style={s.textarea}
            value={form.relevant_topics}
            onChange={e => setForm(f => ({ ...f, relevant_topics: e.target.value }))}
            placeholder="z.B. KMU-Buchhaltungssoftware, Cloud-Buchhaltung, Steuerberatung"
          />
          <div style={s.hint}>Diese Angaben helfen der KI, relevante Informationen in Zusammenfassungen hervorzuheben</div>
        </div>
      </div>

      <button style={s.saveBtn(saved)} onClick={handleSave} disabled={saving}>
        {saved ? <><CheckCircle size={14} /> Gespeichert</> : <><Save size={14} /> Einstellungen speichern</>}
      </button>
    </div>
  )
}

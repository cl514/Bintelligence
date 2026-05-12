import { useState, useEffect } from 'react'
import { Save, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'on-demand', label: 'Auf Anfrage' },
  { value: 'never', label: 'Nie' },
]

const FREQ_OPTIONS_NO_NEVER = FREQ_OPTIONS.filter(o => o.value !== 'never')

const s = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1, maxWidth: 760 },
  title: { fontSize: 22, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8,
    borderBottom: '1px solid #1e2a3a',
  },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: {
    width: '100%', padding: '9px 12px', background: '#0d1117',
    border: '1px solid #1e2a3a', borderRadius: 7, color: '#e2e8f0',
    fontSize: 13, outline: 'none',
  },
  hint: { fontSize: 11, color: '#475569', marginTop: 4 },
  saveBtn: (saved) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 18px', background: saved ? '#14532d' : '#2563eb',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }),
  statusGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  statusCard: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 8, padding: '12px 16px',
  },
  statusLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statusValue: { fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginTop: 4 },
  // Label editor styles
  labelRow: {
    background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8,
    padding: '14px 16px', marginBottom: 10,
  },
  labelGrid: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 120px 120px 120px 80px 28px',
    gap: 8, alignItems: 'center',
  },
  labelInput: {
    padding: '6px 10px', background: '#131b27', border: '1px solid #1e2a3a',
    borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%',
  },
  freqSelect: {
    padding: '6px 8px', background: '#131b27', border: '1px solid #1e2a3a',
    borderRadius: 6, color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%',
  },
  smallBtn: (variant) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
    background: variant === 'danger' ? '#450a0a' : variant === 'save' ? '#14532d' : '#1e2a3a',
    color: variant === 'danger' ? '#f87171' : variant === 'save' ? '#4ade80' : '#94a3b8',
  }),
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: 'transparent',
    border: '1px dashed #334155', borderRadius: 6, color: '#64748b',
    fontSize: 12, cursor: 'pointer', marginTop: 4,
  },
  catRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#0d1117', border: '1px solid #1e2a3a',
    borderRadius: 8, padding: '10px 14px', marginBottom: 8,
  },
}

function PriorityLabelEditor({ labels, onChange }) {
  const update = (id, field, value) => {
    onChange(labels.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const save = async (lbl) => {
    if (lbl._new) {
      const { _new, id, ...data } = lbl
      const created = await api.createPriorityLabel(data)
      onChange(labels.map(l => l.id === id ? created : l))
    } else {
      await api.updatePriorityLabel(lbl.id, {
        name: lbl.name, color: lbl.color,
        crawl_frequency: lbl.crawl_frequency,
        news_frequency: lbl.news_frequency,
        homepage_frequency: lbl.homepage_frequency,
        slack_notifications: lbl.slack_notifications,
      })
    }
  }

  const del = async (lbl) => {
    if (!window.confirm(`Label "${lbl.name}" wirklich löschen?`)) return
    if (!lbl._new) await api.deletePriorityLabel(lbl.id)
    onChange(labels.filter(l => l.id !== lbl.id))
  }

  const addNew = () => {
    const tempId = `_new_${Date.now()}`
    onChange([...labels, {
      id: tempId, _new: true, name: 'Neues Label', color: '#64748b',
      crawl_frequency: 'weekly', news_frequency: 'weekly',
      homepage_frequency: 'weekly', slack_notifications: true,
    }])
  }

  return (
    <div>
      {labels.map(lbl => (
        <div key={lbl.id} style={s.labelRow}>
          <div style={{ ...s.labelGrid, gridTemplateColumns: '28px 1fr 28px 120px 120px 120px 80px 80px 28px' }}>
            <input
              type="color" value={lbl.color}
              onChange={e => update(lbl.id, 'color', e.target.value)}
              style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            />
            <input
              style={s.labelInput} value={lbl.name}
              onChange={e => update(lbl.id, 'name', e.target.value)}
            />
            <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap' }}>Crawl</span>
            <select style={s.freqSelect} value={lbl.crawl_frequency}
              onChange={e => update(lbl.id, 'crawl_frequency', e.target.value)}>
              {FREQ_OPTIONS_NO_NEVER.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select style={s.freqSelect} value={lbl.news_frequency}
              onChange={e => update(lbl.id, 'news_frequency', e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} (News)</option>)}
            </select>
            <select style={s.freqSelect} value={lbl.homepage_frequency}
              onChange={e => update(lbl.id, 'homepage_frequency', e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} (HP)</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={lbl.slack_notifications}
                onChange={e => update(lbl.id, 'slack_notifications', e.target.checked)} />
              Slack
            </label>
            <button style={s.smallBtn('save')} onClick={() => save(lbl)}>
              <Save size={12} />
            </button>
            <button style={s.smallBtn('danger')} onClick={() => del(lbl)}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      <button style={s.addBtn} onClick={addNew}>
        <Plus size={12} /> Neues Label
      </button>
    </div>
  )
}

function CategoryLabelEditor({ labels, onChange }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#64748b')

  const updateName = async (lbl, name) => {
    await api.updateCategoryLabel(lbl.id, { name })
    onChange(labels.map(l => l.id === lbl.id ? { ...l, name } : l))
  }

  const updateColor = async (lbl, color) => {
    await api.updateCategoryLabel(lbl.id, { color })
    onChange(labels.map(l => l.id === lbl.id ? { ...l, color } : l))
  }

  const del = async (lbl) => {
    if (!window.confirm(`Kategorie "${lbl.name}" wirklich löschen?`)) return
    await api.deleteCategoryLabel(lbl.id)
    onChange(labels.filter(l => l.id !== lbl.id))
  }

  const add = async () => {
    if (!newName.trim()) return
    const created = await api.createCategoryLabel({ name: newName.trim(), color: newColor })
    onChange([...labels, created])
    setNewName('')
    setNewColor('#64748b')
  }

  return (
    <div>
      {labels.map(lbl => (
        <EditableCategoryRow key={lbl.id} lbl={lbl} onSaveName={updateName} onSaveColor={updateColor} onDelete={del} />
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <input
          type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
          style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
        />
        <input
          style={{ ...s.labelInput, flex: 1, maxWidth: 220 }}
          value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Neue Kategorie…"
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button style={{ ...s.smallBtn('save'), padding: '6px 14px' }} onClick={add}>
          <Plus size={12} /> Hinzufügen
        </button>
      </div>
    </div>
  )
}

function EditableCategoryRow({ lbl, onSaveName, onSaveColor, onDelete }) {
  const [name, setName] = useState(lbl.name)

  return (
    <div style={s.catRow}>
      <input
        type="color" value={lbl.color}
        onChange={e => onSaveColor(lbl, e.target.value)}
        style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
      />
      <input
        style={{ ...s.labelInput, flex: 1 }}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => name !== lbl.name && onSaveName(lbl, name)}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
      />
      <button style={s.smallBtn('danger')} onClick={() => onDelete(lbl)}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export default function Settings({ systemStatus, priorityLabels, categoryLabels, onLabelsChanged }) {
  const [form, setForm] = useState({
    openai_api_key: '',
    slack_webhook_url: '',
    scan_frequency_hours: 24,
    max_pages_per_site: 5,
    news_lookback_days: 7,
    llm_system_prompt: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Local copies for optimistic UI; parent reloads from server on change
  const [localPriority, setLocalPriority] = useState(priorityLabels || [])
  const [localCategory, setLocalCategory] = useState(categoryLabels || [])

  useEffect(() => { setLocalPriority(priorityLabels || []) }, [priorityLabels])
  useEffect(() => { setLocalCategory(categoryLabels || []) }, [categoryLabels])

  useEffect(() => {
    api.getConfig().then(cfg => {
      setForm(f => ({
        ...f,
        openai_api_key: cfg.openai_api_key || '',
        slack_webhook_url: cfg.slack_webhook_url || '',
        scan_frequency_hours: cfg.scan_frequency_hours || 24,
        max_pages_per_site: cfg.max_pages_per_site || 5,
        news_lookback_days: cfg.news_lookback_days || 7,
      }))
    })

    api.getComplianceSettings().then(settings => {
      setForm(f => ({ ...f, llm_system_prompt: settings.llm_system_prompt || '' }))
    }).catch(() => {
      // ignore; compliance settings may not exist yet
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const configPayload = {
        openai_api_key: form.openai_api_key,
        slack_webhook_url: form.slack_webhook_url,
        scan_frequency_hours: form.scan_frequency_hours,
        max_pages_per_site: form.max_pages_per_site,
        news_lookback_days: form.news_lookback_days,
      }
      await api.updateConfig(configPayload)
      await api.updateComplianceSettings({ llm_system_prompt: form.llm_system_prompt })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handlePriorityChange = (updated) => {
    setLocalPriority(updated)
    onLabelsChanged && onLabelsChanged()
  }

  const handleCategoryChange = (updated) => {
    setLocalCategory(updated)
    onLabelsChanged && onLabelsChanged()
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Settings</div>
      <div style={s.subtitle}>Configure API keys, Slack integration, scan behavior, and labels.</div>

      <div style={s.section}>
        <div style={s.sectionTitle}>API Keys</div>
        <div style={s.field}>
          <label style={s.label}>OpenAI API Key</label>
          <input
            type="password"
            style={s.input}
            value={form.openai_api_key}
            onChange={set('openai_api_key')}
            placeholder="sk-..."
          />
          <div style={s.hint}>Used for AI-powered summaries (gpt-4o-mini). Get yours at platform.openai.com</div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Slack Integration</div>
        <div style={s.field}>
          <label style={s.label}>Webhook URL</label>
          <input
            style={s.input}
            value={form.slack_webhook_url}
            onChange={set('slack_webhook_url')}
            placeholder="https://hooks.slack.com/services/..."
          />
          <div style={s.hint}>Posts daily digests to #competition. Create at api.slack.com/apps</div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Scan Settings</div>
        <div style={s.field}>
          <label style={s.label}>Scan Frequency (hours)</label>
          <input
            type="number" min="1" max="168"
            style={{ ...s.input, width: 120 }}
            value={form.scan_frequency_hours}
            onChange={set('scan_frequency_hours')}
          />
          <div style={s.hint}>Scheduler interval — per-label frequency further controls which competitors run each cycle</div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Max Pages per Site</label>
          <input
            type="number" min="1" max="50"
            style={{ ...s.input, width: 120 }}
            value={form.max_pages_per_site}
            onChange={set('max_pages_per_site')}
          />
          <div style={s.hint}>Default maximum pages to scrape per competitor (overridable per competitor)</div>
        </div>
        <div style={s.field}>
          <label style={s.label}>News Lookback (days)</label>
          <input
            type="number" min="1" max="90"
            style={{ ...s.input, width: 120 }}
            value={form.news_lookback_days}
            onChange={set('news_lookback_days')}
          />
          <div style={s.hint}>How many days back to search for news articles</div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Compliance Prompt</div>
        <div style={s.field}>
          <label style={s.label}>LLM System Prompt</label>
          <textarea
            style={{ ...s.input, minHeight: 220, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
            value={form.llm_system_prompt}
            onChange={set('llm_system_prompt')}
            placeholder="Gib hier deinen Compliance-System-Prompt ein..."
          />
          <div style={s.hint}>
            Der Prompt wird für die Compliance-Analyse verwendet. Unterstützte Platzhalter: <code>{'{url}'}</code>, <code>{'{site_text}'}</code>.
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#450a0a', borderRadius: 6 }}>
          {error}
        </div>
      )}
      <button style={s.saveBtn(saved)} onClick={handleSave} disabled={loading}>
        {saved ? <><CheckCircle size={14} /> Saved</> : <><Save size={14} /> Save Settings</>}
      </button>

      {/* Priority Labels */}
      <div style={{ ...s.section, marginTop: 40 }}>
        <div style={s.sectionTitle}>Prioritäts-Labels</div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
          Jeder Wettbewerber erhält genau ein Prioritäts-Label. Das Label steuert Crawl-Frequenz und Slack-Benachrichtigungen.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 680 }}>
            <PriorityLabelEditor labels={localPriority} onChange={handlePriorityChange} />
          </div>
        </div>
      </div>

      {/* Category Labels */}
      <div style={{ ...s.section, marginTop: 8 }}>
        <div style={s.sectionTitle}>Kategorien</div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
          Kategorien dienen der Gruppierung und Filterung. Mehrfachzuweisung pro Wettbewerber möglich.
        </div>
        <CategoryLabelEditor labels={localCategory} onChange={handleCategoryChange} />
      </div>

      {systemStatus && (
        <div style={{ ...s.section, marginTop: 8 }}>
          <div style={s.sectionTitle}>System Status</div>
          <div style={s.statusGrid}>
            <div style={s.statusCard}>
              <div style={s.statusLabel}>Scheduler</div>
              <div style={s.statusValue}>{systemStatus.scheduler_running ? '✓ Running' : '✗ Stopped'}</div>
            </div>
            <div style={s.statusCard}>
              <div style={s.statusLabel}>Next Run</div>
              <div style={s.statusValue}>
                {systemStatus.next_scheduled_run
                  ? new Date(systemStatus.next_scheduled_run).toLocaleString()
                  : 'Not scheduled'}
              </div>
            </div>
            <div style={s.statusCard}>
              <div style={s.statusLabel}>AI (GPT-4o mini)</div>
              <div style={{ ...s.statusValue, color: systemStatus.ai_configured ? '#4ade80' : '#f87171' }}>
                {systemStatus.ai_configured ? '✓ Configured' : '✗ Not set'}
              </div>
            </div>
            <div style={s.statusCard}>
              <div style={s.statusLabel}>Slack</div>
              <div style={{ ...s.statusValue, color: systemStatus.slack_configured ? '#4ade80' : '#f87171' }}>
                {systemStatus.slack_configured ? '✓ Configured' : '✗ Not set'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

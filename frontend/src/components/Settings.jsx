import { useState, useEffect } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { api } from '../api'

const s = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1, maxWidth: 640 },
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
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500,
  }),
  statusGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  statusCard: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 8, padding: '12px 16px',
  },
  statusLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statusValue: { fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginTop: 4 },
}

export default function Settings({ systemStatus }) {
  const [form, setForm] = useState({
    openai_api_key: '',
    slack_webhook_url: '',
    scan_frequency_hours: 24,
    max_pages_per_site: 5,
    news_lookback_days: 7,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await api.updateConfig(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div style={s.page}>
      <div style={s.title}>Settings</div>
      <div style={s.subtitle}>Configure API keys, Slack integration, and scan behavior.</div>

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
          <div style={s.hint}>How often to automatically scan all competitors</div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Max Pages per Site</label>
          <input
            type="number" min="1" max="50"
            style={{ ...s.input, width: 120 }}
            value={form.max_pages_per_site}
            onChange={set('max_pages_per_site')}
          />
          <div style={s.hint}>Maximum pages to scrape per competitor website</div>
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

      {error && (
        <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#450a0a', borderRadius: 6 }}>
          {error}
        </div>
      )}
      <button style={s.saveBtn(saved)} onClick={handleSave} disabled={loading}>
        {saved ? <><CheckCircle size={14} /> Saved</> : <><Save size={14} /> Save Settings</>}
      </button>

      {systemStatus && (
        <div style={{ ...s.section, marginTop: 40 }}>
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

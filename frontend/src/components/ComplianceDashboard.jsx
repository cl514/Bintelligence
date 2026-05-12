import { useEffect, useState } from 'react'
import { ShieldCheck, List, Loader2 } from 'lucide-react'
import { api } from '../api'

const styles = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: '#f8fafc' },
  subtitle: { fontSize: 13, color: '#94a3b8' },
  section: { marginBottom: 26 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 },
  card: { background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 14, padding: 20 },
  pre: { marginTop: 12, padding: 16, background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1e2a3a' },
  listLabel: { fontSize: 13, color: '#e2e8f0' },
  badge: { marginLeft: 'auto', fontSize: 12, color: '#94a3b8' },
}

export default function ComplianceDashboard() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [brands, setBrands] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsData, brandsData] = await Promise.all([
          api.getComplianceSettings(),
          api.getComplianceBrands(),
        ])
        setSettings(settingsData)
        setBrands(brandsData)
      } catch (err) {
        setError(err.message || 'Failed to load compliance data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Compliance Dashboard</div>
          <div style={styles.subtitle}>
            Übersicht über Compliance-Brand-Scans und den aktiven LLM-Prompt.
          </div>
        </div>
        <ShieldCheck size={32} color="#60a5fa" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Laden...
        </div>
      ) : error ? (
        <div style={{ padding: 18, background: '#450a0a', color: '#fee2e2', borderRadius: 10 }}>{error}</div>
      ) : (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Compliance Brands</div>
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <List size={16} />
                <strong style={{ color: '#fff' }}>{brands.length}</strong> registrierte Brands
              </div>
              <ul style={styles.list}>
                {brands.map((brand) => (
                  <li key={brand.id} style={styles.listItem}>
                    <span style={styles.listLabel}>{brand.name}</span>
                    <span style={styles.badge}>{brand.domains?.join(', ') || 'Keine Domains'}</span>
                  </li>
                ))}
                {brands.length === 0 && (
                  <li style={{ color: '#64748b', padding: '10px 0' }}>Noch keine Compliance-Brands konfiguriert.</li>
                )}
              </ul>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>LLM System Prompt</div>
            <div style={styles.card}>
              <div style={styles.pre}>{settings?.llm_system_prompt || 'Kein Prompt gefunden.'}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

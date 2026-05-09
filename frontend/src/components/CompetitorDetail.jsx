import { useState, useEffect } from 'react'
import { Play, RefreshCw, ExternalLink, Edit2, Trash2, Globe, Newspaper, AlertTriangle, ChevronDown, ChevronRight, Map } from 'lucide-react'
import { api } from '../api'
import SiteMapTab from './SiteMapTab'

const s = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: 600, color: '#f1f5f9' },
  url: { fontSize: 13, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
  actions: { display: 'flex', gap: 8 },
  btn: (variant) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none',
    background: variant === 'primary' ? '#2563eb' : variant === 'danger' ? '#450a0a' : '#1e2a3a',
    color: variant === 'danger' ? '#f87171' : '#e2e8f0',
    cursor: 'pointer',
  }),
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 12,
  },
  summaryBox: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 10,
    padding: '16px 20px', fontSize: 14, color: '#cbd5e1', lineHeight: 1.7,
  },
  changesGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  changeCard: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 8,
    padding: '12px 16px',
  },
  changeUrl: { fontSize: 12, color: '#60a5fa', marginBottom: 6, wordBreak: 'break-all' },
  changeStat: { fontSize: 12, color: '#94a3b8' },
  newsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  newsCard: {
    background: '#131b27', border: '1px solid #1e2a3a', borderRadius: 8,
    padding: '12px 16px',
  },
  newsTitle: { fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 },
  newsSnippet: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  newsUrl: { fontSize: 11, color: '#3b82f6', marginTop: 4, wordBreak: 'break-all' },
  empty: { fontSize: 13, color: '#475569', fontStyle: 'italic' },
  badge: (status) => ({
    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 12,
    background: status === 'success' ? '#14532d' : status === 'error' ? '#450a0a' : '#1e2a3a',
    color: status === 'success' ? '#4ade80' : status === 'error' ? '#f87171' : '#64748b',
  }),
  spin: { animation: 'spin 1s linear infinite' },
  historyItem: {
    background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 6,
    padding: '10px 14px', marginBottom: 6,
  },
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

export default function CompetitorDetail({ competitor, results, historyResults, onRun, onEdit, onDelete, running }) {
  const [showHistory, setShowHistory] = useState(false)
  const [activeTab, setActiveTab] = useState('intelligence')
  const [sitemapData, setSitemapData] = useState(null)
  const [sitemapLoading, setSitemapLoading] = useState(false)
  const [sitemapJobId, setSitemapJobId] = useState(null)

  const latest = results[competitor.id]

  // Reset tab state when switching competitor
  useEffect(() => {
    setActiveTab('intelligence')
    setSitemapData(null)
    setSitemapLoading(false)
    setSitemapJobId(null)
  }, [competitor.id])

  // Load sitemap when tab is opened
  useEffect(() => {
    if (activeTab === 'sitemap' && sitemapData === null && !sitemapLoading) {
      api.getSitemap(competitor.id).then(setSitemapData).catch(() => {})
    }
  }, [activeTab, competitor.id])

  // Poll sitemap crawl job
  useEffect(() => {
    if (!sitemapJobId) return
    let stopped = false
    const poll = async () => {
      for (let i = 0; i < 120; i++) {
        if (stopped) return
        await new Promise(r => setTimeout(r, 3000))
        try {
          const { status } = await api.jobStatus(sitemapJobId)
          if (status !== 'running') {
            const data = await api.getSitemap(competitor.id)
            setSitemapData(data)
            setSitemapLoading(false)
            setSitemapJobId(null)
            return
          }
        } catch {
          break
        }
      }
      setSitemapLoading(false)
      setSitemapJobId(null)
    }
    poll()
    return () => { stopped = true }
  }, [sitemapJobId, competitor.id])

  const handleScanSitemap = async () => {
    setSitemapLoading(true)
    try {
      const { job_id } = await api.crawlSitemap(competitor.id)
      setSitemapJobId(job_id)
      setActiveTab('sitemap')
    } catch {
      setSitemapLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={s.header}>
        <div>
          <div style={s.titleRow}>
            <div style={s.title}>{competitor.name}</div>
            <span style={s.badge(latest?.status)}>{latest?.status || 'Not scanned'}</span>
          </div>
          <div style={s.url}>
            <Globe size={12} />
            <a href={competitor.website} target="_blank" rel="noreferrer"
              style={{ color: '#475569', textDecoration: 'none' }}>{competitor.website}</a>
            <ExternalLink size={11} />
          </div>
          {latest?.timestamp && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Last scanned {timeAgo(latest.timestamp)} · {latest.pages_scanned || 0} pages
            </div>
          )}
        </div>
        <div style={s.actions}>
          <button style={s.btn('secondary')} onClick={() => onEdit(competitor)}>
            <Edit2 size={13} /> Edit
          </button>
          <button style={s.btn('danger')} onClick={() => onDelete(competitor.id)}>
            <Trash2 size={13} /> Delete
          </button>
          <button style={s.btn('secondary')} onClick={handleScanSitemap} disabled={sitemapLoading}>
            {sitemapLoading
              ? <><RefreshCw size={13} style={s.spin} /> Crawling…</>
              : <><Map size={13} /> Scan Site Map</>
            }
          </button>
          <button style={s.btn('primary')} onClick={() => onRun(competitor.id)} disabled={running}>
            {running
              ? <><RefreshCw size={13} style={s.spin} /> Scanning…</>
              : <><Play size={13} /> Run Now</>
            }
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', marginBottom: 24 }}>
        {['intelligence', 'sitemap'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab ? '#e2e8f0' : '#64748b',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, marginBottom: -1,
            }}
          >
            {tab === 'intelligence' ? 'Intelligence' : 'Site Map'}
            {tab === 'sitemap' && sitemapData?.pages_count > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, color: '#475569' }}>
                {sitemapData.pages_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Intelligence tab */}
      {activeTab === 'intelligence' && (
        <>
          {/* AI Summary */}
          <div style={s.section}>
            <div style={s.sectionTitle}>AI Summary</div>
            <div style={s.summaryBox}>
              {latest?.ai_summary || <span style={s.empty}>No scan results yet. Click "Run Now" to start.</span>}
            </div>
          </div>

          {/* Website Changes */}
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Website Changes ({latest?.changes_detected || 0})
            </div>
            {latest?.changes?.length > 0 ? (
              <div style={s.changesGrid}>
                {latest.changes.map((change, i) => (
                  <div key={i} style={s.changeCard}>
                    <div style={s.changeUrl}>{change.url}</div>
                    <div style={s.changeStat}>
                      +{change.added_word_count} added, -{change.removed_word_count} removed words
                      {change.significant && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠ Significant change</span>}
                    </div>
                    {change.sample_added?.length > 0 && (
                      <div style={{ ...s.changeStat, marginTop: 4, color: '#475569' }}>
                        New terms: {change.sample_added.slice(0, 8).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.empty}>
                {latest ? 'No website changes detected in this scan.' : 'Run a scan to detect changes.'}
              </div>
            )}
          </div>

          {/* News & Press Releases */}
          <div style={s.section}>
            <div style={s.sectionTitle}>
              News & Press Releases ({latest?.news_articles?.length || 0})
            </div>
            {latest?.news_articles?.length > 0 ? (
              <div style={s.newsGrid}>
                {latest.news_articles.map((article, i) => (
                  <div key={i} style={s.newsCard}>
                    <div style={s.newsTitle}>{article.title}</div>
                    {article.snippet && <div style={s.newsSnippet}>{article.snippet}</div>}
                    {article.url && <div style={s.newsUrl}>{article.url}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.empty}>
                {latest ? 'No news articles found.' : 'Run a scan to search for news.'}
              </div>
            )}
          </div>

          {/* Scan History */}
          {historyResults?.length > 1 && (
            <div style={s.section}>
              <button
                style={{ ...s.btn('secondary'), marginBottom: 12, fontSize: 12 }}
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Scan History ({historyResults.length} scans)
              </button>
              {showHistory && historyResults.slice(1).map((r, i) => (
                <div key={i} style={s.historyItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{timeAgo(r.timestamp)}</span>
                    <span style={s.badge(r.status)}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    {r.pages_scanned} pages · {r.changes_detected} changes · {r.news_articles?.length || 0} articles
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Site Map tab */}
      {activeTab === 'sitemap' && (
        <SiteMapTab
          competitorId={competitor.id}
          sitemapData={sitemapData}
          loading={sitemapLoading}
          onScan={handleScanSitemap}
          scanning={sitemapLoading}
        />
      )}
    </div>
  )
}

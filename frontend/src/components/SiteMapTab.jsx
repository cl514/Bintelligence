import { useState, useMemo } from 'react'
import { RefreshCw, Play, ExternalLink } from 'lucide-react'

const CATEGORIES = ['All', 'Landing Page', 'Product/Solution', 'Pricing', 'Blog/Article', 'Legal', 'Career', 'About', 'Other']

const CATEGORY_STYLE = {
  'Landing Page':       { bg: '#7c2d12', color: '#fb923c' },
  'Product/Solution':   { bg: '#1e3a5f', color: '#60a5fa' },
  'Pricing':            { bg: '#14532d', color: '#4ade80' },
  'Blog/Article':       { bg: '#2d1b69', color: '#a78bfa' },
  'Legal':              { bg: '#1e2a3a', color: '#64748b' },
  'Career':             { bg: '#1e2a3a', color: '#64748b' },
  'About':              { bg: '#1e2a3a', color: '#64748b' },
  'Other':              { bg: '#1e2a3a', color: '#94a3b8' },
}

const s = {
  container: { padding: '0 0 32px', flex: 1 },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
    flexWrap: 'wrap',
  },
  meta: { fontSize: 12, color: '#64748b' },
  select: {
    background: '#0d1117', border: '1px solid #1e2a3a', color: '#e2e8f0',
    borderRadius: 6, padding: '5px 10px', fontSize: 12, outline: 'none',
  },
  scanBtn: (scanning) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', background: '#2563eb', border: 'none',
    borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 500,
    opacity: scanning ? 0.7 : 1, cursor: scanning ? 'default' : 'pointer',
    marginLeft: 'auto',
  }),
  spin: { animation: 'spin 1s linear infinite' },
  center: { textAlign: 'center', padding: '48px 0', color: '#475569', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#0d1117', position: 'sticky', top: 0, zIndex: 1 },
  th: (active) => ({
    padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: active ? '#60a5fa' : '#475569',
  }),
  trBase: { borderBottom: '1px solid #1a2332' },
  trHighlight: { borderBottom: '1px solid #1a2332', borderLeft: '3px solid #f59e0b', background: '#17200f' },
  td: { padding: '9px 12px', verticalAlign: 'top' },
  urlLink: {
    color: '#60a5fa', textDecoration: 'none', display: 'block',
    maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  badgeNew: {
    display: 'inline-block', background: '#1d4ed8', color: '#93c5fd',
    fontSize: 10, padding: '1px 6px', borderRadius: 10, marginRight: 6,
    verticalAlign: 'middle',
  },
  badgeStatus: (status) => ({
    fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 10,
    background: status === 'active' ? '#14532d' : '#1e2a3a',
    color: status === 'active' ? '#4ade80' : '#64748b',
  }),
  descText: { color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 },
  dash: { color: '#334155' },
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: '#334155', marginLeft: 3 }}>⇅</span>
  return <span style={{ marginLeft: 3 }}>{dir === 'asc' ? '▲' : '▼'}</span>
}

function CategoryBadge({ category }) {
  if (!category) return <span style={s.dash}>—</span>
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['Other']
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 10,
      background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  )
}

export default function SiteMapTab({ competitorId, sitemapData, loading, onScan, scanning }) {
  const [sortKey, setSortKey] = useState('importance_score')
  const [sortDir, setSortDir] = useState('desc')
  const [filterCategory, setFilterCategory] = useState('All')

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const pages = sitemapData?.pages || []

  const filtered = useMemo(() =>
    filterCategory === 'All' ? pages : pages.filter(p => p.category === filterCategory),
    [pages, filterCategory]
  )

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (sortKey === 'importance_score') {
        av = av ?? -1; bv = bv ?? -1
        return sortDir === 'asc' ? av - bv : bv - av
      }
      if (sortKey === 'first_seen') {
        av = av ? new Date(av).getTime() : 0
        bv = bv ? new Date(bv).getTime() : 0
        return sortDir === 'asc' ? av - bv : bv - av
      }
      if (sortKey === 'status') {
        const order = { active: 0, 'not found': 1 }
        av = order[av] ?? 2; bv = order[bv] ?? 2
        return sortDir === 'asc' ? av - bv : bv - av
      }
      av = (av || '').toLowerCase(); bv = (bv || '').toLowerCase()
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const cols = [
    { key: 'url', label: 'URL' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'importance_score', label: 'Score' },
    { key: 'ai_description', label: 'AI Description' },
    { key: 'first_seen', label: 'First Seen' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div style={s.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={s.toolbar}>
        {sitemapData?.last_crawled && (
          <span style={s.meta}>
            {sitemapData.pages_count} pages · last crawled {timeAgo(sitemapData.last_crawled)}
          </span>
        )}
        <select
          style={s.select}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={s.scanBtn(scanning)} onClick={onScan} disabled={scanning}>
          {scanning
            ? <><RefreshCw size={12} style={s.spin} /> Crawling…</>
            : <><Play size={12} /> Scan Site Map</>
          }
        </button>
      </div>

      {loading && !sitemapData && (
        <div style={s.center}>
          <RefreshCw size={24} style={{ ...s.spin, display: 'block', margin: '0 auto 12px' }} />
          Crawling site… this may take a minute.
        </div>
      )}

      {!loading && pages.length === 0 && (
        <div style={s.center}>
          No site map scanned yet.<br />
          <span style={{ color: '#334155' }}>Click "Scan Site Map" to crawl this competitor's website.</span>
        </div>
      )}

      {pages.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead style={s.thead}>
              <tr>
                {cols.map(col => (
                  <th key={col.key} style={{ padding: '8px 12px', background: '#0d1117' }}>
                    <button style={s.th(sortKey === col.key)} onClick={() => handleSort(col.key)}>
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((page, i) => {
                const highlight = (page.importance_score ?? 0) >= 8
                return (
                  <tr key={page.url} style={highlight ? s.trHighlight : s.trBase}>
                    <td style={{ ...s.td, maxWidth: 260 }}>
                      {page.is_new && <span style={s.badgeNew}>NEW</span>}
                      {page.category === 'Landing Page' && <span style={{ marginRight: 4 }}>🎯</span>}
                      <a href={page.url} target="_blank" rel="noreferrer" style={s.urlLink}>
                        {page.url}
                      </a>
                    </td>
                    <td style={{ ...s.td, maxWidth: 180, color: '#e2e8f0' }}>
                      {page.title || <span style={s.dash}>—</span>}
                    </td>
                    <td style={s.td}>
                      <CategoryBadge category={page.category} />
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: page.importance_score >= 8 ? '#f59e0b' : '#e2e8f0' }}>
                      {page.importance_score ?? <span style={s.dash}>—</span>}
                    </td>
                    <td style={{ ...s.td, minWidth: 200 }}>
                      {page.ai_description
                        ? <span style={s.descText}>{page.ai_description}</span>
                        : <span style={s.dash}>—</span>
                      }
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap', color: '#64748b' }}>
                      {timeAgo(page.first_seen)}
                    </td>
                    <td style={s.td}>
                      <span style={s.badgeStatus(page.status)}>{page.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

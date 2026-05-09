import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { api } from '../api'
import AdCard from './AdCard'
import AdModal from './AdModal'
import AdDetailPanel from './AdDetailPanel'

const PLATFORMS = ['All', 'Meta', 'Google', 'TikTok', 'LinkedIn', 'Other']

const styles = {
  page: { padding: '28px 32px', overflowY: 'auto', flex: 1 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: '#f8fafc' },
  button: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  filterBar: {
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24,
  },
  spin: { animation: 'spin 1s linear infinite' },
  searchRow: { display: 'flex', alignItems: 'center', gap: 10 },
  filterRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #1e2a3a', background: '#0d1117', color: '#e2e8f0', fontSize: 13, outline: 'none',
  },
  select: {
    appearance: 'none', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #1e2a3a', background: '#0d1117', color: '#e2e8f0', fontSize: 13,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 },
  empty: { padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 },
  status: { display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 },
}

function formatCount(count) {
  return count === 1 ? '1 ad' : `${count} ads`
}

export default function AdIntelligence({ competitors }) {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAd, setSelectedAd] = useState(null)
  const [filterCompetitor, setFilterCompetitor] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadAds()
  }, [])

  const loadAds = async () => {
    setLoading(true)
    try {
      const data = await api.getAds()
      setAds(data)
    } catch (error) {
      console.error('Failed to load ads', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdCreate = (newAd) => {
    setAds((current) => [newAd, ...current])
    setSelectedAd(newAd)
  }

  const handleNotesSave = (notes) => {
    if (!selectedAd) return
    const updated = { ...selectedAd, notes }
    setSelectedAd(updated)
    setAds((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleDelete = async (ad) => {
    if (!window.confirm('Delete this ad?')) return
    try {
      await api.deleteAd(ad.id)
      setAds((current) => current.filter((item) => item.id !== ad.id))
      setSelectedAd(null)
    } catch (error) {
      console.error('Delete failed', error)
    }
  }

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const matchesCompetitor = filterCompetitor ? ad.competitor_id === filterCompetitor : true
      const matchesPlatform = filterPlatform === 'All' ? true : (ad.platform || '').toLowerCase() === filterPlatform.toLowerCase()
      const text = `${ad.ad_copy || ''} ${ad.analysis?.hook || ''} ${ad.analysis?.cta || ''} ${ad.competitor_id}`.toLowerCase()
      const matchesQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true
      return matchesCompetitor && matchesPlatform && matchesQuery
    })
  }, [ads, filterCompetitor, filterPlatform, query])

  const competitorOptions = [{ id: '', name: 'All competitors' }, ...competitors.map((c) => ({ id: c.id, name: c.name }))]

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Ad Intelligence</div>
        </div>
        <button type="button" style={styles.button} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Ad
        </button>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.searchRow}>
          <Search size={16} />
          <input
            style={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ads, hooks, CTAs..."
          />
        </div>
        <div style={styles.filterRow}>
          <select style={styles.select} value={filterCompetitor} onChange={(e) => setFilterCompetitor(e.target.value)}>
            {competitorOptions.map((option) => (
              <option key={option.id || 'all'} value={option.id}>{option.name}</option>
            ))}
          </select>
          <select style={styles.select} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.status}>
        <Filter size={14} /> {formatCount(filteredAds.length)}{loading ? ' · loading…' : ''}
      </div>

      {loading ? (
        <div style={{ ...styles.empty, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={20} style={styles.spin} /> Loading ads…
        </div>
      ) : filteredAds.length === 0 ? (
        <div style={styles.empty}>No ads found. Add one to begin intelligence tracking.</div>
      ) : (
        <div style={styles.grid}>
          {filteredAds.map((ad) => {
            const competitor = competitors.find((c) => c.id === ad.competitor_id)
            return (
              <AdCard
                key={ad.id}
                ad={ad}
                competitorName={competitor?.name || ad.competitor_id}
                onSelect={setSelectedAd}
              />
            )
          })}
        </div>
      )}

      {showModal && (
        <AdModal
          onClose={() => setShowModal(false)}
          onSave={handleAdCreate}
          competitors={competitors}
        />
      )}

      {selectedAd && (
        <AdDetailPanel
          ad={selectedAd}
          competitorName={competitors.find((c) => c.id === selectedAd.competitor_id)?.name || selectedAd.competitor_id}
          onClose={() => setSelectedAd(null)}
          onDelete={handleDelete}
          onNotesSave={handleNotesSave}
        />
      )}
    </div>
  )
}

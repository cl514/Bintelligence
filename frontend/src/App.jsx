import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import CompetitorDetail from './components/CompetitorDetail'
import Settings from './components/Settings'
import CompetitorModal from './components/CompetitorModal'
import { api } from './api'
import { usePolling } from './hooks/usePolling'

export default function App() {
  const [competitors, setCompetitors] = useState([])
  const [results, setResults] = useState({})        // { competitorId: latestScan }
  const [historyMap, setHistoryMap] = useState({})   // { competitorId: [scans] }
  const [systemStatus, setSystemStatus] = useState(null)
  const [priorityLabels, setPriorityLabels] = useState([])
  const [categoryLabels, setCategoryLabels] = useState([])
  const [activeView, setActiveView] = useState('dashboard')
  const [modal, setModal] = useState(null)           // null | { mode: 'add' | 'edit', competitor }
  const [runningJobs, setRunningJobs] = useState({}) // { jobId: competitorId | 'all' }
  const [running, setRunning] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [comps, allResults, status, pLabels, cLabels] = await Promise.all([
        api.getCompetitors(),
        api.getResults(),
        api.getStatus(),
        api.getPriorityLabels(),
        api.getCategoryLabels(),
      ])
      setCompetitors(comps)
      const byId = {}
      allResults.forEach(r => { byId[r.competitor_id] = r })
      setResults(byId)
      setSystemStatus(status)
      setPriorityLabels(pLabels)
      setCategoryLabels(cLabels)
    } catch (e) {
      console.error('Load failed', e)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  usePolling(loadData, 15000)

  const pollJob = useCallback(async (jobId, targetId) => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const { status } = await api.jobStatus(jobId)
        if (status !== 'running') {
          setRunningJobs(j => {
            const next = { ...j }
            delete next[jobId]
            return next
          })
          if (Object.keys(runningJobs).length <= 1) setRunning(false)
          await loadData()
          if (targetId !== 'all') {
            const history = await api.getCompetitorResults(targetId)
            setHistoryMap(h => ({ ...h, [targetId]: history }))
          }
          break
        }
      } catch (e) { break }
    }
  }, [loadData, runningJobs])

  const handleRunAll = async () => {
    setRunning(true)
    const { job_id } = await api.runAll()
    setRunningJobs(j => ({ ...j, [job_id]: 'all' }))
    pollJob(job_id, 'all')
  }

  const handleRunOne = async (competitorId) => {
    setRunning(true)
    const { job_id } = await api.runOne(competitorId)
    setRunningJobs(j => ({ ...j, [job_id]: competitorId }))
    pollJob(job_id, competitorId)
  }

  const handleNavigate = async (view) => {
    setActiveView(view)
    if (view.startsWith('competitor:')) {
      const id = view.split(':')[1]
      const history = await api.getCompetitorResults(id)
      setHistoryMap(h => ({ ...h, [id]: history }))
    }
  }

  const handleSaveCompetitor = async (data) => {
    if (modal?.competitor?.id) {
      await api.updateCompetitor(modal.competitor.id, data)
    } else {
      await api.addCompetitor(data)
    }
    setModal(null)
    await loadData()
  }

  const handleDeleteCompetitor = async (id) => {
    if (!confirm('Delete this competitor?')) return
    await api.deleteCompetitor(id)
    setActiveView('dashboard')
    await loadData()
  }

  const activeCompetitorId = activeView.startsWith('competitor:') ? activeView.split(':')[1] : null
  const activeCompetitor = competitors.find(c => c.id === activeCompetitorId)
  const isRunningForComp = (id) => Object.values(runningJobs).includes(id) || Object.values(runningJobs).includes('all')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        competitors={competitors}
        results={results}
        priorityLabels={priorityLabels}
        activeView={activeView}
        onNavigate={handleNavigate}
        onAddCompetitor={() => setModal({ mode: 'add', competitor: null })}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'dashboard' && (
          <Dashboard
            competitors={competitors}
            results={results}
            systemStatus={systemStatus}
            onRunAll={handleRunAll}
            onRunOne={handleRunOne}
            running={running}
            onSelectCompetitor={(id) => handleNavigate(`competitor:${id}`)}
            priorityLabels={priorityLabels}
            categoryLabels={categoryLabels}
          />
        )}

        {activeView === 'settings' && (
          <Settings
            systemStatus={systemStatus}
            priorityLabels={priorityLabels}
            categoryLabels={categoryLabels}
            onLabelsChanged={loadData}
          />
        )}

        {activeCompetitor && (
          <CompetitorDetail
            competitor={activeCompetitor}
            results={results}
            historyResults={historyMap[activeCompetitorId]}
            onRun={handleRunOne}
            onEdit={(comp) => setModal({ mode: 'edit', competitor: comp })}
            onDelete={handleDeleteCompetitor}
            running={isRunningForComp(activeCompetitorId)}
            priorityLabels={priorityLabels}
            categoryLabels={categoryLabels}
            onSettingsSaved={loadData}
          />
        )}
      </main>

      {modal && (
        <CompetitorModal
          competitor={modal.competitor}
          onSave={handleSaveCompetitor}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

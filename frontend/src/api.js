const BASE = '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  getCompetitors: () => req('GET', '/competitors'),
  addCompetitor: (data) => req('POST', '/competitors', data),
  updateCompetitor: (id, data) => req('PUT', `/competitors/${id}`, data),
  deleteCompetitor: (id) => req('DELETE', `/competitors/${id}`),

  getResults: () => req('GET', '/results'),
  getCompetitorResults: (id) => req('GET', `/results/${id}`),

  runAll: () => req('POST', '/run/all'),
  runOne: (id) => req('POST', `/run/${id}`),
  jobStatus: (jobId) => req('GET', `/jobs/${jobId}`),

  getConfig: () => req('GET', '/config'),
  updateConfig: (data) => req('PUT', '/config', data),
  getStatus: () => req('GET', '/status'),

  crawlSitemap: (id) => req('POST', `/sitemap/crawl/${id}`),
  getSitemap: (id) => req('GET', `/sitemap/${id}`),
}

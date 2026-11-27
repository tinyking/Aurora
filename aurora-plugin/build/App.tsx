import { useMemo, useState } from 'react'
import { useWorkbench } from './hooks'
import { AssetsPage } from './pages/Assets'
import { CalendarPage } from './pages/Calendar'
import { ContentBoard } from './pages/ContentBoard'
import { MetricsPage } from './pages/Metrics'
import { SettingsPage } from './pages/Settings'
import { Topics } from './pages/Topics'
import { fmtDate } from './utils'

type PageKey = 'dashboard' | 'topics' | 'content' | 'calendar' | 'metrics' | 'assets' | 'settings'

const NAV: { key: PageKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: '概览', icon: '⌂' },
  { key: 'topics', label: '选题池', icon: '💡' },
  { key: 'content', label: '内容生产', icon: '📝' },
  { key: 'calendar', label: '发布日历', icon: '📅' },
  { key: 'metrics', label: '数据效果', icon: '📊' },
  { key: 'assets', label: '素材脚本', icon: '🗂' },
  { key: 'settings', label: '设置', icon: '⚙' },
]

export default function AuroraPanel() {
  const data = useWorkbench()
  const [page, setPage] = useState<PageKey>('dashboard')
  const [search, setSearch] = useState('')

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return []
    return [
      ...data.topics.map((row) => ({ id: row.id, title: row.title, kind: '选题', target: 'topics' as PageKey })),
      ...data.content.map((row) => ({ id: row.id, title: row.title, kind: '内容', target: 'content' as PageKey })),
      ...data.assets.map((row) => ({ id: row.id, title: row.title, kind: '素材', target: 'assets' as PageKey })),
    ].filter((row) => row.title.toLowerCase().includes(needle)).slice(0, 8)
  }, [search, data.topics, data.content, data.assets])

  const navigate = (target: PageKey) => {
    setPage(target)
    setSearch('')
  }

  const today = new Date()
  const upcoming = data.content
    .filter((item) => item.dueDate && item.stage !== 'published' && item.dueDate >= today.toISOString().slice(0, 10))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5)

  const recentMetrics = [...data.metrics].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="aurora-panel">
      <header className="aurora-topbar">
        <div className="aurora-search-wrap">
          <input
            className="input aurora-search-input"
            placeholder="搜索选题、内容、素材…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {results.length > 0 && (
            <div className="aurora-search-results">
              {results.map((result) => (
                <button key={`${result.kind}-${result.id}`} onClick={() => navigate(result.target)}>
                  <span className="tag">{result.kind}</span>
                  {result.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="aurora-date">{today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </header>

      <nav className="aurora-nav" aria-label="Aurora 功能导航">
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`aurora-nav-item ${page === item.key ? 'aurora-nav-active' : ''}`}
            onClick={() => navigate(item.key)}
          >
            <span className="aurora-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {data.error && (
        <div className="notice aurora-error" role="alert">
          <span>数据读写失败：{data.error}。数据仍保留在本机，可重试。</span>
          <button className="button button-small" onClick={() => void data.reload()}>重试</button>
        </div>
      )}

      <main className="aurora-content">
        {!data.ready ? (
          <div className="aurora-loading">加载中…</div>
        ) : page === 'dashboard' ? (
          <Dashboard data={data} upcoming={upcoming} recentMetrics={recentMetrics} onNavigate={navigate} />
        ) : page === 'topics' ? (
          <Topics data={data} />
        ) : page === 'content' ? (
          <ContentBoard data={data} />
        ) : page === 'calendar' ? (
          <CalendarPage data={data} />
        ) : page === 'metrics' ? (
          <MetricsPage data={data} />
        ) : page === 'assets' ? (
          <AssetsPage data={data} />
        ) : (
          <SettingsPage data={data} />
        )}
      </main>
    </div>
  )
}

function Dashboard({
  data,
  upcoming,
  recentMetrics,
  onNavigate,
}: {
  data: ReturnType<typeof useWorkbench>
  upcoming: ReturnType<typeof useWorkbench>['content']
  recentMetrics: ReturnType<typeof useWorkbench>['metrics']
  onNavigate: (page: PageKey) => void
}) {
  const totalViews = data.metrics.reduce((sum, row) => sum + row.views, 0)
  const totalFollowers = data.metrics.reduce((sum, row) => sum + row.followersGained, 0)
  const activeTopics = data.topics.filter((topic) => topic.status === 'active').length
  const inProgress = data.content.filter((item) => item.stage !== 'published').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>概览</h1>
          <p className="subtitle">你的自媒体副业，一目了然</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="💡" label="进行中的选题" value={String(activeTopics)} />
        <StatCard icon="📝" label="生产中的内容" value={String(inProgress)} />
        <StatCard icon="👁" label="累计播放 / 阅读" value={new Intl.NumberFormat('zh-CN').format(totalViews)} />
        <StatCard icon="📈" label="累计涨粉" value={new Intl.NumberFormat('zh-CN').format(totalFollowers)} />
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-card">
          <div className="section-header">
            <h2>近期截止</h2>
            <button className="link-button" onClick={() => onNavigate('content')}>查看全部 →</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">暂无近期截止的内容。</p>
          ) : (
            <ul className="mini-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <span className="mini-dot" />
                  <span className="mini-title">{item.title}</span>
                  <span className="muted small">{fmtDate(item.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card dashboard-card">
          <div className="section-header">
            <h2>最近数据</h2>
            <button className="link-button" onClick={() => onNavigate('metrics')}>查看全部 →</button>
          </div>
          {recentMetrics.length === 0 ? (
            <p className="muted">还没有数据记录。</p>
          ) : (
            <ul className="mini-list">
              {recentMetrics.map((row) => {
                const item = data.content.find((content) => content.id === row.contentId)
                return (
                  <li key={row.id}>
                    <span className="mini-dot mini-dot-blue" />
                    <span className="mini-title">{item?.title ?? '未关联内容'}</span>
                    <span className="muted small">{fmtDate(row.date)} · {new Intl.NumberFormat('zh-CN').format(row.views)} 播放</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  )
}

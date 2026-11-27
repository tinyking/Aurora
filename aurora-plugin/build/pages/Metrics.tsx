import { useMemo, useState } from 'react'
import { ConfirmDialog, Field } from '../components/Fields'
import { GroupedBarChart, TrendChart } from '../components/Charts'
import { Modal } from '../components/Modal'
import { uid } from '../db'
import type { Workbench } from '../hooks'
import type { Metric } from '../types'
import { fmtDate, fmtMoney, fmtNumber, todayISO } from '../utils'

type PlatformTotal = { platform: string; views: number; likes: number; comments: number; shares: number; followersGained: number; revenue: number }

export function MetricsPage({ data }: { data: Workbench }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Metric | null>(null)
  const [deleting, setDeleting] = useState<Metric | null>(null)
  const [contentFilter, setContentFilter] = useState('all')

  const sorted = useMemo(
    () => [...data.metrics].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [data.metrics],
  )

  const totals = useMemo(
    () => sorted.reduce(
      (acc, row) => ({
        views: acc.views + row.views,
        interactions: acc.interactions + row.likes + row.comments + row.shares,
        followers: acc.followers + row.followersGained,
        revenue: acc.revenue + row.revenue,
      }),
      { views: 0, interactions: 0, followers: 0, revenue: 0 },
    ),
    [sorted],
  )

  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; views: number; interactions: number; followers: number }>()
    for (const row of [...sorted].reverse()) {
      const current = map.get(row.date) ?? { date: row.date, views: 0, interactions: 0, followers: 0 }
      current.views += row.views
      current.interactions += row.likes + row.comments + row.shares
      current.followers += row.followersGained
      map.set(row.date, current)
    }
    return [...map.values()].slice(-30)
  }, [sorted])

  const platformData = useMemo(() => {
    const map = new Map<string, PlatformTotal>()
    for (const row of sorted) {
      const content = data.content.find((item) => item.id === row.contentId)
      const platform = content?.platform || '未指定'
      const current = map.get(platform) ?? { platform, views: 0, likes: 0, comments: 0, shares: 0, followersGained: 0, revenue: 0 }
      current.views += row.views
      current.likes += row.likes
      current.comments += row.comments
      current.shares += row.shares
      current.followersGained += row.followersGained
      current.revenue += row.revenue
      map.set(platform, current)
    }
    return [...map.values()]
  }, [sorted, data.content])

  const filtered = useMemo(
    () => (contentFilter === 'all' ? sorted : sorted.filter((row) => row.contentId === contentFilter)),
    [sorted, contentFilter],
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>数据效果分析</h1>
          <p className="subtitle">在页面手动记录每条内容的数据，复盘趋势与平台表现</p>
        </div>
        <button className="button button-primary" onClick={() => setCreating(true)}>+ 录入数据</button>
      </div>

      <div className="stat-grid">
        <StatCard label="累计播放 / 阅读" value={fmtNumber(totals.views)} icon="👁" />
        <StatCard label="累计互动" value={fmtNumber(totals.interactions)} icon="💬" />
        <StatCard label="累计涨粉" value={fmtNumber(totals.followers)} icon="📈" />
        <StatCard label="累计收益" value={fmtMoney(totals.revenue)} icon="💰" />
      </div>

      {data.metrics.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>还没有数据记录</h3>
          <p>点击「录入数据」记录第一条内容表现。</p>
        </div>
      ) : (
        <>
          <div className="chart-grid">
            <section className="card chart-card">
              <h2>播放与互动趋势（最近 30 个记录日）</h2>
              <TrendChart
                data={trendData}
                series={[
                  { key: 'views', name: '播放/阅读', color: '#2563eb' },
                  { key: 'interactions', name: '互动', color: '#7c3aed' },
                  { key: 'followers', name: '涨粉', color: '#059669' },
                ]}
              />
            </section>
            <section className="card chart-card">
              <h2>平台播放量对比</h2>
              <GroupedBarChart
                data={platformData}
                labelKey="platform"
                series={[
                  { key: 'views', name: '播放/阅读', color: '#2563eb' },
                  { key: 'likes', name: '点赞', color: '#f472b6' },
                ]}
              />
            </section>
          </div>

          <section className="card table-card">
            <div className="table-header">
              <h2>数据记录</h2>
              <select className="input" value={contentFilter} onChange={(event) => setContentFilter(event.target.value)}>
                <option value="all">全部内容</option>
                {data.content.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>内容</th>
                    <th>播放/阅读</th>
                    <th>点赞</th>
                    <th>评论</th>
                    <th>分享</th>
                    <th>涨粉</th>
                    <th>收益</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const item = data.content.find((rowItem) => rowItem.id === row.contentId)
                    return (
                      <tr key={row.id}>
                        <td>{fmtDate(row.date)}</td>
                        <td>{item?.title ?? <span className="muted">未关联</span>}</td>
                        <td>{fmtNumber(row.views)}</td>
                        <td>{fmtNumber(row.likes)}</td>
                        <td>{fmtNumber(row.comments)}</td>
                        <td>{fmtNumber(row.shares)}</td>
                        <td>{fmtNumber(row.followersGained)}</td>
                        <td>{fmtMoney(row.revenue)}</td>
                        <td className="table-actions">
                          <button className="button button-small button-ghost" onClick={() => setEditing(row)}>编辑</button>
                          <button className="button button-small button-ghost button-danger-text" onClick={() => setDeleting(row)}>删除</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {(creating || editing) && (
        <MetricForm
          initial={editing ?? undefined}
          content={data.content}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={async (value) => {
            await data.saveMetric(value)
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message="确定删除这条数据记录吗？"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await data.deleteMetric(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
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

function MetricForm({
  initial,
  content,
  onClose,
  onSave,
}: {
  initial?: Metric
  content: { id: string; title: string; platform: string }[]
  onClose: () => void
  onSave: (metric: Metric) => Promise<void>
}) {
  const [form, setForm] = useState<Metric>(
    initial ?? {
      id: uid(),
      contentId: '',
      date: todayISO(),
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      followersGained: 0,
      revenue: 0,
      notes: '',
      createdAt: new Date().toISOString(),
    },
  )
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Metric>(key: K, value: Metric[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, contentId: form.contentId || undefined })
    } finally {
      setSaving(false)
    }
  }

  const numberFields: { key: keyof Metric; label: string }[] = [
    { key: 'views', label: '播放 / 阅读' },
    { key: 'likes', label: '点赞' },
    { key: 'comments', label: '评论' },
    { key: 'shares', label: '分享' },
    { key: 'followersGained', label: '新增粉丝' },
    { key: 'revenue', label: '收益（元）' },
  ]

  return (
    <Modal open title={initial ? '编辑数据' : '录入数据'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <Field label="日期">
            <input className="input" type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
          </Field>
          <Field label="关联内容">
            <select className="input" value={form.contentId ?? ''} onChange={(event) => set('contentId', event.target.value)}>
              <option value="">不关联</option>
              {content.map((item) => <option key={item.id} value={item.id}>{item.title}（{item.platform}）</option>)}
            </select>
          </Field>
        </div>
        <div className="number-grid">
          {numberFields.map(({ key, label }) => (
            <Field label={label} key={key}>
              <input
                className="input"
                type="number"
                min="0"
                step={key === 'revenue' ? '0.01' : '1'}
                value={form[key] as number}
                onChange={(event) => set(key, Number(event.target.value))}
              />
            </Field>
          ))}
        </div>
        <Field label="备注">
          <textarea className="input textarea" rows={3} value={form.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={saving}>保存</button>
        </div>
      </form>
    </Modal>
  )
}

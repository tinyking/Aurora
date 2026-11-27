import { useMemo, useState } from 'react'
import { ConfirmDialog, Field, TagPicker } from '../components/Fields'
import { Modal } from '../components/Modal'
import { uid } from '../db'
import type { Workbench } from '../hooks'
import {
  TOPIC_STATUSES,
  TOPIC_STATUS_LABELS,
  type Topic,
  type TopicStatus,
} from '../types'
import { fmtDate } from '../utils'

export function Topics({ data }: { data: Workbench }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [editing, setEditing] = useState<Topic | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Topic | null>(null)

  const platforms = useMemo(
    () => [...new Set([...data.preferences.platforms, ...data.topics.map((topic) => topic.platform)])],
    [data.preferences.platforms, data.topics],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return data.topics
      .filter((topic) => statusFilter === 'all' || topic.status === statusFilter)
      .filter((topic) => platformFilter === 'all' || topic.platform === platformFilter)
      .filter(
        (topic) =>
          !needle ||
          topic.title.toLowerCase().includes(needle) ||
          topic.notes.toLowerCase().includes(needle) ||
          topic.tags.some((tag) => tag.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data.topics, search, statusFilter, platformFilter])

  const convertToContent = async (topic: Topic) => {
    await data.saveContent({
      id: uid(),
      topicId: topic.id,
      title: topic.title,
      platform: topic.platform,
      stage: 'idea',
      notes: topic.notes,
      createdAt: new Date().toISOString(),
    })
    await data.saveTopic({ ...topic, status: 'active' })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>选题池</h1>
          <p className="subtitle">收集灵感，评估优先级，把好选题推进到生产流程</p>
        </div>
        <button className="button button-primary" onClick={() => setCreating(true)}>+ 新建选题</button>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="搜索标题、标签、备注…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TopicStatus | 'all')}>
          <option value="all">全部状态</option>
          {TOPIC_STATUSES.map((status) => <option key={status} value={status}>{TOPIC_STATUS_LABELS[status]}</option>)}
        </select>
        <select className="input" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
          <option value="all">全部平台</option>
          {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
        </select>
        <span className="result-count">共 {filtered.length} 条</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💡</div>
          <h3>{data.topics.length === 0 ? '还没有选题' : '没有匹配的选题'}</h3>
          <p>{data.topics.length === 0 ? '点击右上角「新建选题」记录第一个灵感。' : '试试调整筛选条件。'}</p>
        </div>
      ) : (
        <div className="topic-grid">
          {filtered.map((topic) => (
            <article className="card topic-card" key={topic.id}>
              <div className="card-top">
                <span className={`badge badge-${topic.status}`}>{TOPIC_STATUS_LABELS[topic.status]}</span>
                <span className="score" title="选题评分">{topic.score} 分</span>
              </div>
              <h3>{topic.title}</h3>
              <p className="card-notes">{topic.notes || '暂无备注'}</p>
              <div className="tag-row">
                {topic.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}
              </div>
              <div className="card-meta">
                <span>{topic.platform || '未指定平台'}</span>
                <span>{fmtDate(topic.createdAt)}</span>
              </div>
              <div className="card-actions">
                <button className="button button-small button-ghost" onClick={() => setEditing(topic)}>编辑</button>
                {topic.status !== 'published' && (
                  <button className="button button-small" onClick={() => void convertToContent(topic)}>
                    转为内容 →
                  </button>
                )}
                <button className="button button-small button-ghost button-danger-text" onClick={() => setDeleting(topic)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TopicForm
          initial={editing ?? undefined}
          platforms={platforms}
          tags={data.preferences.tags}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={async (value) => {
            await data.saveTopic(value)
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`确定删除选题「${deleting.title}」吗？此操作不可恢复。`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await data.deleteTopic(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}

function TopicForm({
  initial,
  platforms,
  tags,
  onClose,
  onSave,
}: {
  initial?: Topic
  platforms: string[]
  tags: string[]
  onClose: () => void
  onSave: (topic: Topic) => Promise<void>
}) {
  const [form, setForm] = useState<Topic>(
    initial ?? {
      id: uid(),
      title: '',
      platform: platforms[0] ?? '',
      status: 'idea',
      score: 50,
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
    },
  )
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Topic>(key: K, value: Topic[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, title: form.title.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={initial ? '编辑选题' : '新建选题'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="标题">
          <input className="input" autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="例如：3 个提升效率的 AI 工具" />
        </Field>
        <div className="form-row">
          <Field label="平台">
            <input className="input" list="platform-options" value={form.platform} onChange={(event) => set('platform', event.target.value)} />
            <datalist id="platform-options">
              {platforms.map((platform) => <option key={platform} value={platform} />)}
            </datalist>
          </Field>
          <Field label="状态">
            <select className="input" value={form.status} onChange={(event) => set('status', event.target.value as TopicStatus)}>
              {TOPIC_STATUSES.map((status) => <option key={status} value={status}>{TOPIC_STATUS_LABELS[status]}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`优先级评分：${form.score}`}>
          <input type="range" min="0" max="100" value={form.score} onChange={(event) => set('score', Number(event.target.value))} />
        </Field>
        <Field label="标签">
          <TagPicker tags={tags} selected={form.tags} onChange={(value) => set('tags', value)} />
        </Field>
        <Field label="备注">
          <textarea className="input textarea" rows={4} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="记录灵感来源、角度、大纲…" />
        </Field>
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={saving || !form.title.trim()}>保存</button>
        </div>
      </form>
    </Modal>
  )
}

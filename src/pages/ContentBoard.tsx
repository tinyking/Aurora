import { useMemo, useState } from 'react'
import { ConfirmDialog, Field } from '../components/Fields'
import { Modal } from '../components/Modal'
import { uid } from '../db'
import type { Workbench } from '../hooks'
import { STAGES, STAGE_LABELS, type ContentItem, type ContentStage } from '../types'
import { fmtDate, todayISO } from '../utils'

export function ContentBoard({ data }: { data: Workbench }) {
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [creating, setCreating] = useState<ContentStage | null>(null)
  const [deleting, setDeleting] = useState<ContentItem | null>(null)
  const [stageFilter, setStageFilter] = useState<ContentStage | 'all'>('all')

  const platforms = useMemo(
    () => [...new Set([...data.preferences.platforms, ...data.content.map((item) => item.platform)])],
    [data.preferences.platforms, data.content],
  )

  const visible = useMemo(
    () => (stageFilter === 'all' ? data.content : data.content.filter((item) => item.stage === stageFilter)),
    [data.content, stageFilter],
  )

  const moveStage = async (item: ContentItem, stage: ContentStage) => {
    await data.saveContent({
      ...item,
      stage,
      publishedAt: stage === 'published' ? item.publishedAt ?? todayISO() : undefined,
    })
  }

  const activeStages = stageFilter === 'all' ? STAGES : [stageFilter]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>内容生产看板</h1>
          <p className="subtitle">从构思到发布，一步步推进每一条内容</p>
        </div>
        <div className="header-actions">
          <select className="input" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as ContentStage | 'all')}>
            <option value="all">全部阶段</option>
            {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
          <button className="button button-primary" onClick={() => setCreating('idea')}>+ 新建内容</button>
        </div>
      </div>

      <div className="board">
        {activeStages.map((stage) => {
          const items = visible.filter((item) => item.stage === stage)
          return (
            <section className="board-column" key={stage}>
              <header className="board-column-header">
                <h2>{STAGE_LABELS[stage]}</h2>
                <span className="count">{items.length}</span>
              </header>
              <div className="board-column-body">
                {items.length === 0 && <div className="board-empty">暂无内容</div>}
                {items.map((item) => {
                  const topic = data.topics.find((row) => row.id === item.topicId)
                  return (
                    <article className="board-card" key={item.id}>
                      <h3>{item.title}</h3>
                      {topic && <div className="board-source">来自选题：{topic.title}</div>}
                      <div className="board-meta">
                        <span className="tag">{item.platform || '未指定'}</span>
                        {item.dueDate && <span className={item.dueDate < todayISO() && item.stage !== 'published' ? 'overdue' : ''}>截止 {fmtDate(item.dueDate)}</span>}
                      </div>
                      {item.notes && <p className="board-notes">{item.notes}</p>}
                      <div className="board-card-actions">
                        <select
                          className="input input-small"
                          value={item.stage}
                          onChange={(event) => void moveStage(item, event.target.value as ContentStage)}
                        >
                          {STAGES.map((option) => <option key={option} value={option}>{STAGE_LABELS[option]}</option>)}
                        </select>
                        <button className="icon-button" title="编辑" onClick={() => setEditing(item)}>✎</button>
                        <button className="icon-button" title="删除" onClick={() => setDeleting(item)}>🗑</button>
                      </div>
                    </article>
                  )
                })}
                <button className="board-add" onClick={() => setCreating(stage)}>+ 添加到{STAGE_LABELS[stage]}</button>
              </div>
            </section>
          )
        })}
      </div>

      {(creating || editing) && (
        <ContentForm
          initial={editing ?? undefined}
          defaultStage={creating ?? 'idea'}
          platforms={platforms}
          topics={data.topics}
          onClose={() => { setCreating(null); setEditing(null) }}
          onSave={async (value) => {
            await data.saveContent(value)
            setCreating(null)
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`确定删除内容「${deleting.title}」吗？关联的数据记录会保留。`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await data.deleteContent(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}

function ContentForm({
  initial,
  defaultStage,
  platforms,
  topics,
  onClose,
  onSave,
}: {
  initial?: ContentItem
  defaultStage: ContentStage
  platforms: string[]
  topics: { id: string; title: string }[]
  onClose: () => void
  onSave: (item: ContentItem) => Promise<void>
}) {
  const [form, setForm] = useState<ContentItem>(
    initial ?? {
      id: uid(),
      title: '',
      platform: platforms[0] ?? '',
      stage: defaultStage,
      dueDate: '',
      publishedAt: '',
      notes: '',
      topicId: '',
      createdAt: new Date().toISOString(),
    },
  )
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ContentItem>(key: K, value: ContentItem[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        dueDate: form.dueDate || undefined,
        publishedAt: form.publishedAt || undefined,
        topicId: form.topicId || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={initial ? '编辑内容' : '新建内容'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="标题">
          <input className="input" autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="阶段">
            <select className="input" value={form.stage} onChange={(event) => set('stage', event.target.value as ContentStage)}>
              {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
            </select>
          </Field>
          <Field label="平台">
            <input className="input" list="content-platform-options" value={form.platform} onChange={(event) => set('platform', event.target.value)} />
            <datalist id="content-platform-options">
              {platforms.map((platform) => <option key={platform} value={platform} />)}
            </datalist>
          </Field>
        </div>
        <div className="form-row">
          <Field label="关联选题">
            <select className="input" value={form.topicId ?? ''} onChange={(event) => set('topicId', event.target.value)}>
              <option value="">不关联</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
            </select>
          </Field>
          <Field label="截止日期">
            <input className="input" type="date" value={form.dueDate ?? ''} onChange={(event) => set('dueDate', event.target.value)} />
          </Field>
        </div>
        <Field label="发布日期">
          <input className="input" type="date" value={form.publishedAt ?? ''} onChange={(event) => set('publishedAt', event.target.value)} />
        </Field>
        <Field label="脚本 / 备注">
          <textarea className="input textarea" rows={4} value={form.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={saving || !form.title.trim()}>保存</button>
        </div>
      </form>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { addMonths, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ConfirmDialog, Field } from '../components/Fields'
import { Modal } from '../components/Modal'
import { uid } from '../db'
import type { Workbench } from '../hooks'
import { STAGES, STAGE_LABELS, type ContentItem, type ContentStage } from '../types'
import { todayISO } from '../utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CalendarPage({ data }: { data: Workbench }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [dayDetail, setDayDetail] = useState<string | null>(null)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [creatingDate, setCreatingDate] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ContentItem | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [month])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItem[]>()
    for (const item of data.content) {
      const dates = [item.publishedAt, item.dueDate].filter(Boolean) as string[]
      for (const date of [...new Set(dates)]) {
        map.set(date, [...(map.get(date) ?? []), item])
      }
    }
    return map
  }, [data.content])

  const dayItems = dayDetail ? itemsByDate.get(dayDetail) ?? [] : []

  const platforms = [...new Set([...data.preferences.platforms, ...data.content.map((item) => item.platform)])]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>发布日历</h1>
          <p className="subtitle">按发布日期或截止日期查看内容排期 · 点击日期快速安排</p>
        </div>
        <div className="header-actions">
          <button className="button button-ghost" onClick={() => setMonth(addMonths(month, -1))}>← 上月</button>
          <strong className="month-label">{format(month, 'yyyy 年 M 月')}</strong>
          <button className="button button-ghost" onClick={() => setMonth(addMonths(month, 1))}>下月 →</button>
        </div>
      </div>

      <div className="calendar">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((day) => <div key={day}>周{day}</div>)}
        </div>
        <div className="calendar-grid">
          {days.map((date) => {
            const iso = format(date, 'yyyy-MM-dd')
            const items = itemsByDate.get(iso) ?? []
            return (
              <button
                key={iso}
                className={`calendar-cell ${isSameMonth(date, month) ? '' : 'calendar-cell-outside'} ${iso === todayISO() ? 'calendar-cell-today' : ''}`}
                onClick={() => setDayDetail(iso)}
              >
                <span className="calendar-day-number">{format(date, 'd')}</span>
                <div className="calendar-items">
                  {items.slice(0, 3).map((item) => (
                    <span key={item.id} className={`calendar-item calendar-item-${item.stage}`}>
                      {item.title}
                    </span>
                  ))}
                  {items.length > 3 && <span className="calendar-more">+{items.length - 3} 更多</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {dayDetail && (
        <Modal open title={`${format(parseISO(dayDetail), 'M 月 d 日', { locale: zhCN })} 的安排`} onClose={() => setDayDetail(null)}>
          <div className="day-detail">
            {dayItems.length === 0 && <p className="muted">这一天还没有安排。</p>}
            {dayItems.map((item) => (
              <div className="day-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted small">
                    {item.publishedAt === dayDetail ? '计划发布' : '截止日期'} · {STAGE_LABELS[item.stage]} · {item.platform}
                  </div>
                </div>
                <div className="day-item-actions">
                  <button className="button button-small button-ghost" onClick={() => { setDayDetail(null); setEditing(item) }}>编辑</button>
                  <button className="button button-small button-ghost button-danger-text" onClick={() => setDeleting(item)}>删除</button>
                </div>
              </div>
            ))}
            <div className="form-actions">
              <button className="button button-primary" onClick={() => { setDayDetail(null); setCreatingDate(dayDetail) }}>+ 当天新建内容</button>
            </div>
          </div>
        </Modal>
      )}

      {(creatingDate || editing) && (
        <ContentForm
          initial={editing ?? undefined}
          defaultDate={creatingDate ?? undefined}
          platforms={platforms}
          topics={data.topics}
          onClose={() => { setCreatingDate(null); setEditing(null) }}
          onSave={async (value) => {
            await data.saveContent(value)
            setCreatingDate(null)
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`确定删除内容「${deleting.title}」吗？`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await data.deleteContent(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}

function ContentForm({
  initial,
  defaultDate,
  platforms,
  topics,
  onClose,
  onSave,
}: {
  initial?: ContentItem
  defaultDate?: string
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
      stage: 'idea',
      dueDate: defaultDate,
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
            <input className="input" list="calendar-platform-options" value={form.platform} onChange={(event) => set('platform', event.target.value)} />
            <datalist id="calendar-platform-options">
              {platforms.map((platform) => <option key={platform} value={platform} />)}
            </datalist>
          </Field>
        </div>
        <div className="form-row">
          <Field label="截止日期">
            <input className="input" type="date" value={form.dueDate ?? ''} onChange={(event) => set('dueDate', event.target.value)} />
          </Field>
          <Field label="发布日期">
            <input className="input" type="date" value={form.publishedAt ?? ''} onChange={(event) => set('publishedAt', event.target.value)} />
          </Field>
        </div>
        <Field label="关联选题">
          <select className="input" value={form.topicId ?? ''} onChange={(event) => set('topicId', event.target.value)}>
            <option value="">不关联</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        </Field>
        <Field label="备注">
          <textarea className="input textarea" rows={3} value={form.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={saving || !form.title.trim()}>保存</button>
        </div>
      </form>
    </Modal>
  )
}

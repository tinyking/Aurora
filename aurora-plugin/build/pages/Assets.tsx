import { useMemo, useState } from 'react'
import { ConfirmDialog, Field, TagPicker } from '../components/Fields'
import { Modal } from '../components/Modal'
import { uid } from '../db'
import type { Workbench } from '../hooks'
import { ASSET_TYPES, ASSET_TYPE_LABELS, type Asset, type AssetType } from '../types'
import { fmtDate } from '../utils'

export function AssetsPage({ data }: { data: Workbench }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState<Asset | null>(null)

  const allTags = useMemo(
    () => [...new Set(data.assets.flatMap((asset) => asset.tags))].sort(),
    [data.assets],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return data.assets
      .filter((asset) => typeFilter === 'all' || asset.type === typeFilter)
      .filter((asset) => tagFilter === 'all' || asset.tags.includes(tagFilter))
      .filter(
        (asset) =>
          !needle ||
          asset.title.toLowerCase().includes(needle) ||
          asset.text.toLowerCase().includes(needle) ||
          asset.url?.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data.assets, search, typeFilter, tagFilter])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>素材与脚本库</h1>
          <p className="subtitle">沉淀文案、脚本、参考链接与文件资料</p>
        </div>
        <button className="button button-primary" onClick={() => setCreating(true)}>+ 新建素材</button>
      </div>

      <div className="toolbar">
        <input className="input" placeholder="搜索标题、内容、链接…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as AssetType | 'all')}>
          <option value="all">全部类型</option>
          {ASSET_TYPES.map((type) => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
        </select>
        <select className="input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
          <option value="all">全部标签</option>
          {allTags.map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
        </select>
        <span className="result-count">共 {filtered.length} 条</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂</div>
          <h3>{data.assets.length === 0 ? '素材库还是空的' : '没有匹配的素材'}</h3>
          <p>{data.assets.length === 0 ? '把常用的脚本、链接和笔记收进来吧。' : '试试调整筛选条件。'}</p>
        </div>
      ) : (
        <div className="asset-grid">
          {filtered.map((asset) => (
            <article className="card asset-card" key={asset.id}>
              <div className="card-top">
                <span className={`badge badge-asset-${asset.type}`}>{ASSET_TYPE_LABELS[asset.type]}</span>
                <span className="muted small">{fmtDate(asset.createdAt)}</span>
              </div>
              <h3>{asset.title}</h3>
              {asset.type === 'link' && asset.url ? (
                <a className="asset-link" href={asset.url} target="_blank" rel="noreferrer">{asset.url}</a>
              ) : asset.fileName ? (
                <div className="asset-file">📎 {asset.fileName}</div>
              ) : (
                <p className="card-notes asset-text">{asset.text || '暂无内容'}</p>
              )}
              <div className="tag-row">
                {asset.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}
              </div>
              <div className="card-actions">
                {asset.fileName && (
                  <button className="button button-small button-ghost" onClick={() => downloadAsset(asset)}>下载</button>
                )}
                <button className="button button-small button-ghost" onClick={() => setEditing(asset)}>编辑</button>
                <button className="button button-small button-ghost button-danger-text" onClick={() => setDeleting(asset)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <AssetForm
          initial={editing ?? undefined}
          tags={data.preferences.tags}
          content={data.content}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={async (value) => {
            await data.saveAsset(value)
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`确定删除素材「${deleting.title}」吗？`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await data.deleteAsset(deleting.id); setDeleting(null) }}
        />
      )}
    </div>
  )
}

function downloadAsset(asset: Asset) {
  if (!(asset.fileBlob instanceof Blob) || !asset.fileName) return
  const url = URL.createObjectURL(asset.fileBlob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = asset.fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function AssetForm({
  initial,
  tags,
  content,
  onClose,
  onSave,
}: {
  initial?: Asset
  tags: string[]
  content: { id: string; title: string }[]
  onClose: () => void
  onSave: (asset: Asset) => Promise<void>
}) {
  const [form, setForm] = useState<Asset>(
    initial ?? {
      id: uid(),
      title: '',
      type: 'note',
      text: '',
      tags: [],
      createdAt: new Date().toISOString(),
    },
  )
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Asset>(key: K, value: Asset[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        type: file ? 'file' : form.type,
        fileName: file ? file.name : form.fileName,
        fileBlob: file ?? form.fileBlob,
        url: form.type === 'link' ? form.url || undefined : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={initial ? '编辑素材' : '新建素材'} onClose={onClose} wide>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <Field label="标题">
            <input className="input" autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} />
          </Field>
          <Field label="类型">
            <select className="input" value={form.type} onChange={(event) => set('type', event.target.value as AssetType)}>
              {ASSET_TYPES.map((type) => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
            </select>
          </Field>
        </div>
        {form.type === 'link' && (
          <Field label="链接地址">
            <input className="input" type="url" value={form.url ?? ''} onChange={(event) => set('url', event.target.value)} placeholder="https://…" />
          </Field>
        )}
        {form.type !== 'file' && (
          <Field label="内容">
            <textarea className="input textarea" rows={8} value={form.text} onChange={(event) => set('text', event.target.value)} />
          </Field>
        )}
        <Field label="上传文件" hint="选择文件后类型会自动设为「文件」，数据保存在浏览器本地">
          <input className="input" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <div className="form-row">
          <Field label="关联内容">
            <select className="input" value={form.linkedContentId ?? ''} onChange={(event) => set('linkedContentId', event.target.value)}>
              <option value="">不关联</option>
              {content.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </Field>
          <Field label="标签">
            <TagPicker tags={tags} selected={form.tags} onChange={(value) => set('tags', value)} />
          </Field>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={saving || !form.title.trim()}>保存</button>
        </div>
      </form>
    </Modal>
  )
}

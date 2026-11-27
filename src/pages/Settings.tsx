import { useRef, useState } from 'react'
import { ConfirmDialog, Field } from '../components/Fields'
import { db } from '../db'
import type { Workbench } from '../hooks'
import { DEFAULT_PREFERENCES, type Preferences } from '../types'

export function SettingsPage({ data }: { data: Workbench }) {
  const [preferences, setPreferences] = useState<Preferences>(data.preferences)
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const savePreferences = async () => {
    await data.savePreferences({
      platforms: preferences.platforms.filter(Boolean),
      tags: preferences.tags.filter(Boolean),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const exportBackup = async () => {
    const snapshot = await db.snapshot()
    const serialized = JSON.stringify(snapshot, (_key, value) => {
      if (value instanceof Blob) return { __blob: true, type: value.type, data: '（二进制文件，JSON 备份不包含内容）' }
      return value
    }, 2)
    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aurora-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('备份已导出（文件类素材的二进制内容不包含在 JSON 中）。')
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.topics) || !Array.isArray(parsed.content) || !Array.isArray(parsed.metrics) || !Array.isArray(parsed.assets)) {
        throw new Error('文件格式不正确')
      }
      await db.restore({
        topics: parsed.topics,
        content: parsed.content,
        metrics: parsed.metrics,
        assets: parsed.assets,
        preferences: parsed.preferences ?? DEFAULT_PREFERENCES,
      })
      setPreferences(parsed.preferences ?? DEFAULT_PREFERENCES)
      setMessage('数据已恢复。')
    } catch (error) {
      setMessage(`恢复失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>设置</h1>
          <p className="subtitle">管理常用平台、标签与本地数据</p>
        </div>
      </div>

      {message && <div className="notice" onClick={() => setMessage('')}>{message}</div>}

      <section className="card settings-card">
        <h2>常用平台</h2>
        <p className="muted small">用于新建选题和内容时的快速填写。</p>
        <textarea
          className="input textarea"
          rows={3}
          value={preferences.platforms.join('\n')}
          onChange={(event) => setPreferences({ ...preferences, platforms: event.target.value.split('\n') })}
          placeholder="每行一个平台"
        />
        <h2>常用标签</h2>
        <textarea
          className="input textarea"
          rows={3}
          value={preferences.tags.join('\n')}
          onChange={(event) => setPreferences({ ...preferences, tags: event.target.value.split('\n') })}
          placeholder="每行一个标签"
        />
        <div className="form-actions">
          <button className="button button-primary" onClick={() => void savePreferences()}>
            {saved ? '✓ 已保存' : '保存偏好'}
          </button>
        </div>
      </section>

      <section className="card settings-card">
        <h2>数据备份</h2>
        <p className="muted small">数据保存在当前浏览器中。定期导出 JSON 备份，可在更换设备或清理浏览器后恢复。</p>
        <div className="settings-actions">
          <button className="button" onClick={() => void exportBackup()}>导出 JSON 备份</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importBackup(file)
              event.target.value = ''
            }}
          />
          <button className="button" onClick={() => fileInput.current?.click()}>从 JSON 恢复</button>
        </div>
        <div className="count-summary">
          <span>选题 {data.topics.length}</span>
          <span>内容 {data.content.length}</span>
          <span>数据 {data.metrics.length}</span>
          <span>素材 {data.assets.length}</span>
        </div>
      </section>

      <section className="card settings-card danger-zone">
        <h2>危险操作</h2>
        <Field label="清空全部数据">
          <button className="button button-danger" onClick={() => setConfirmClear(true)}>清空所有本地数据</button>
        </Field>
      </section>

      {confirmClear && (
        <ConfirmDialog
          message="确定清空所有选题、内容、数据与素材吗？此操作不可恢复，建议先导出备份。"
          onCancel={() => setConfirmClear(false)}
          onConfirm={async () => {
            await db.clearAll()
            setConfirmClear(false)
            setMessage('所有数据已清空。')
          }}
        />
      )}
    </div>
  )
}

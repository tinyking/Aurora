import { useCallback, useEffect, useState } from 'react'
import { db } from './db'
import type { Asset, ContentItem, Metric, Preferences, Snapshot, Topic } from './types'

function useSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    topics: [],
    content: [],
    metrics: [],
    assets: [],
    preferences: { platforms: [], tags: [] },
  })
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    try {
      setSnapshot(await db.snapshot())
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void reload()
    const unsubscribe = db.subscribe(() => void reload())
    return () => { unsubscribe() }
  }, [reload])

  return { snapshot, ready, reload }
}

export function useWorkbench() {
  const { snapshot, ready, reload } = useSnapshot()
  const { topics, content, metrics, assets, preferences } = snapshot

  const saveTopic = useCallback(async (value: Topic) => db.topics.save(value), [])
  const deleteTopic = useCallback(async (id: string) => db.topics.delete(id), [])
  const saveContent = useCallback(async (value: ContentItem) => db.content.save(value), [])
  const deleteContent = useCallback(async (id: string) => db.content.delete(id), [])
  const saveMetric = useCallback(async (value: Metric) => db.metrics.save(value), [])
  const deleteMetric = useCallback(async (id: string) => db.metrics.delete(id), [])
  const saveAsset = useCallback(async (value: Asset) => db.assets.save(value), [])
  const deleteAsset = useCallback(async (id: string) => db.assets.delete(id), [])
  const savePreferences = useCallback(async (value: Preferences) => db.savePreferences(value), [])

  return {
    ready,
    reload,
    topics,
    content,
    metrics,
    assets,
    preferences,
    saveTopic,
    deleteTopic,
    saveContent,
    deleteContent,
    saveMetric,
    deleteMetric,
    saveAsset,
    deleteAsset,
    savePreferences,
  }
}

export type Workbench = ReturnType<typeof useWorkbench>

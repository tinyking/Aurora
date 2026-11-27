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
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setSnapshot(await db.snapshot())
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void reload()
    const unsubscribe = db.subscribe(() => void reload())
    return () => { unsubscribe() }
  }, [reload])

  return { snapshot, ready, reload, error, setError }
}

export function useWorkbench() {
  const { snapshot, ready, reload, error, setError } = useSnapshot()
  const { topics, content, metrics, assets, preferences } = snapshot

  /** Run a write and surface its failure without swallowing the caller's flow. */
  const guard = useCallback(
    <A extends unknown[], R>(operation: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        try {
          const result = await operation(...args)
          setError(null)
          return result
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
          throw cause
        }
      },
    [setError],
  )

  const saveTopic = useCallback(guard((value: Topic) => db.topics.save(value)), [guard])
  const deleteTopic = useCallback(guard((id: string) => db.topics.delete(id)), [guard])
  const saveContent = useCallback(guard((value: ContentItem) => db.content.save(value)), [guard])
  const deleteContent = useCallback(guard((id: string) => db.content.delete(id)), [guard])
  const saveMetric = useCallback(guard((value: Metric) => db.metrics.save(value)), [guard])
  const deleteMetric = useCallback(guard((id: string) => db.metrics.delete(id)), [guard])
  const saveAsset = useCallback(guard((value: Asset) => db.assets.save(value)), [guard])
  const deleteAsset = useCallback(guard((id: string) => db.assets.delete(id)), [guard])
  const savePreferences = useCallback(guard((value: Preferences) => db.savePreferences(value)), [guard])

  return {
    ready,
    error,
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

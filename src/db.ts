import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  DEFAULT_PREFERENCES,
  type Asset,
  type ContentItem,
  type Metric,
  type Preferences,
  type Snapshot,
  type Topic,
} from './types'

interface AuroraDB extends DBSchema {
  topics: { key: string; value: Topic }
  content: { key: string; value: ContentItem }
  metrics: { key: string; value: Metric }
  assets: { key: string; value: Asset }
  preferences: { key: string; value: { key: string; value: Preferences } }
}

type StoreName = 'topics' | 'content' | 'metrics' | 'assets'
type StoreRecord = Topic | ContentItem | Metric | Asset

let dbPromise: Promise<IDBPDatabase<AuroraDB>> | null = null
const listeners = new Set<() => void>()

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AuroraDB>('aurora-workbench', 1, {
      upgrade(db) {
        db.createObjectStore('topics', { keyPath: 'id' })
        db.createObjectStore('content', { keyPath: 'id' })
        db.createObjectStore('metrics', { keyPath: 'id' })
        db.createObjectStore('assets', { keyPath: 'id' })
        db.createObjectStore('preferences', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function getAll(store: StoreName): Promise<StoreRecord[]> {
  const db = await getDB()
  return db.getAll(store) as Promise<StoreRecord[]>
}

async function put(store: StoreName, value: StoreRecord) {
  const db = await getDB()
  await db.put(store, value as never)
  notify()
}

async function remove(store: StoreName, id: string) {
  const db = await getDB()
  await db.delete(store, id)
  notify()
}

export const db = {
  subscribe,
  topics: {
    list: () => getAll('topics') as Promise<Topic[]>,
    save: (value: Topic) => put('topics', value),
    delete: (id: string) => remove('topics', id),
  },
  content: {
    list: () => getAll('content') as Promise<ContentItem[]>,
    save: (value: ContentItem) => put('content', value),
    delete: (id: string) => remove('content', id),
  },
  metrics: {
    list: () => getAll('metrics') as Promise<Metric[]>,
    save: (value: Metric) => put('metrics', value),
    delete: (id: string) => remove('metrics', id),
  },
  assets: {
    list: () => getAll('assets') as Promise<Asset[]>,
    save: (value: Asset) => put('assets', value),
    delete: (id: string) => remove('assets', id),
  },
  async getPreferences(): Promise<Preferences> {
    const db = await getDB()
    const row = await db.get('preferences', 'main')
    return row?.value ?? DEFAULT_PREFERENCES
  },
  async savePreferences(value: Preferences) {
    const database = await getDB()
    await database.put('preferences', { key: 'main', value })
    notify()
  },
  async snapshot(): Promise<Snapshot> {
    const [topics, content, metrics, assets, preferences] = await Promise.all([
      this.topics.list(),
      this.content.list(),
      this.metrics.list(),
      this.assets.list(),
      this.getPreferences(),
    ])
    return { topics, content, metrics, assets, preferences }
  },
  async restore(snapshot: Snapshot) {
    const database = await getDB()
    const tx = database.transaction(
      ['topics', 'content', 'metrics', 'assets', 'preferences'],
      'readwrite',
    )
    await Promise.all([
      tx.objectStore('topics').clear(),
      tx.objectStore('content').clear(),
      tx.objectStore('metrics').clear(),
      tx.objectStore('assets').clear(),
    ])
    await Promise.all([
      ...snapshot.topics.map((row) => tx.objectStore('topics').put(row)),
      ...snapshot.content.map((row) => tx.objectStore('content').put(row)),
      ...snapshot.metrics.map((row) => tx.objectStore('metrics').put(row)),
      ...snapshot.assets.map((row) => tx.objectStore('assets').put(row)),
      tx.objectStore('preferences').put({ key: 'main', value: snapshot.preferences }),
    ])
    await tx.done
    notify()
  },
  async clearAll() {
    const database = await getDB()
    const tx = database.transaction(
      ['topics', 'content', 'metrics', 'assets', 'preferences'],
      'readwrite',
    )
    await Promise.all([
      tx.objectStore('topics').clear(),
      tx.objectStore('content').clear(),
      tx.objectStore('metrics').clear(),
      tx.objectStore('assets').clear(),
      tx.objectStore('preferences').clear(),
    ])
    await tx.done
    notify()
  },
}

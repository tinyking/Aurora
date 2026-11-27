export type TopicStatus = 'idea' | 'active' | 'published' | 'dropped'
export type ContentStage = 'idea' | 'script' | 'production' | 'published'
export type AssetType = 'script' | 'link' | 'note' | 'file'

export interface Topic {
  id: string
  title: string
  platform: string
  status: TopicStatus
  score: number
  tags: string[]
  notes: string
  createdAt: string
}

export interface ContentItem {
  id: string
  topicId?: string
  title: string
  platform: string
  stage: ContentStage
  dueDate?: string
  publishedAt?: string
  notes: string
  createdAt: string
}

export interface Metric {
  id: string
  contentId?: string
  date: string
  views: number
  likes: number
  comments: number
  shares: number
  followersGained: number
  revenue: number
  notes: string
  createdAt: string
}

export interface Asset {
  id: string
  title: string
  type: AssetType
  text: string
  url?: string
  fileName?: string
  fileBlob?: Blob
  tags: string[]
  linkedContentId?: string
  createdAt: string
}

export interface Preferences {
  platforms: string[]
  tags: string[]
}

export interface Snapshot {
  topics: Topic[]
  content: ContentItem[]
  metrics: Metric[]
  assets: Asset[]
  preferences: Preferences
}

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  idea: '待定',
  active: '进行中',
  published: '已发布',
  dropped: '废弃',
}

export const STAGE_LABELS: Record<ContentStage, string> = {
  idea: '构思',
  script: '脚本',
  production: '制作',
  published: '已发布',
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  script: '脚本',
  link: '链接',
  note: '笔记',
  file: '文件',
}

export const STAGES: ContentStage[] = ['idea', 'script', 'production', 'published']
export const TOPIC_STATUSES: TopicStatus[] = ['idea', 'active', 'published', 'dropped']
export const ASSET_TYPES: AssetType[] = ['script', 'link', 'note', 'file']

export const DEFAULT_PREFERENCES: Preferences = {
  platforms: ['小红书', '抖音', 'B站', '公众号', '视频号', '知乎'],
  tags: [],
}

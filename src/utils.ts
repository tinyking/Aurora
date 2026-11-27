import { format, parseISO } from 'date-fns'

export function fmtDate(value?: string, pattern = 'yyyy-MM-dd') {
  if (!value) return '—'
  try {
    return format(parseISO(value), pattern)
  } catch {
    return value
  }
}

export function fmtNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function fmtMoney(value: number) {
  return `¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)}`
}

export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

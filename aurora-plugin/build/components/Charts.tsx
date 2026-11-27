/** Lightweight, theme-token SVG charts: no chart library, no second React runtime. */

export type Series = { key: string; name: string; color: string }

const W = 640
const H = 240
const PAD = { l: 46, r: 14, t: 16, b: 30 }

function compact(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(Math.round(value))
}

function gridY(max: number): number[] {
  if (max <= 0) return [0]
  return [0, 0.25, 0.5, 0.75, 1].map((r) => max * r)
}

/** Area/line trend chart over an ordered category axis. */
export function TrendChart({ data, series }: { data: Record<string, number | string>[]; series: Series[] }) {
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const max = Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)))
  const x = (i: number) => PAD.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const label = (i: number) => String(data[i]?.date ?? '').slice(5)

  return (
    <div className="aurora-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="趋势图">
        {gridY(max).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--aurora-border)' }} strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={10} style={{ fill: 'var(--aurora-muted)' }}>{compact(v)}</text>
          </g>
        ))}
        {data.map((_, i) => (i === 0 || i === data.length - 1 || i === Math.floor((data.length - 1) / 2) ? (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} style={{ fill: 'var(--aurora-muted)' }}>{label(i)}</text>
        ) : null))}
        {series.map((s) => {
          const points = data.map((row, i) => `${x(i)},${y(Number(row[s.key]) || 0)}`).join(' ')
          return (
            <g key={s.key}>
              <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {data.map((row, i) => (
                <circle key={i} cx={x(i)} cy={y(Number(row[s.key]) || 0)} r={2.5} fill={s.color}>
                  <title>{`${s.name} · ${label(i)}：${compact(Number(row[s.key]) || 0)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <div className="aurora-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  )
}

/** Grouped bar chart over a categorical axis. */
export function GroupedBarChart({ data, labelKey, series }: { data: Record<string, number | string>[]; labelKey: string; series: Series[] }) {
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const max = Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)))
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const group = data.length === 0 ? iw : iw / data.length
  const barW = Math.max(6, Math.min(22, (group * 0.6) / Math.max(1, series.length)))
  const label = (row: Record<string, number | string>) => String(row[labelKey] ?? '')

  return (
    <div className="aurora-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="平台对比图">
        {gridY(max).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--aurora-border)' }} strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={10} style={{ fill: 'var(--aurora-muted)' }}>{compact(v)}</text>
          </g>
        ))}
        {data.map((row, gi) => {
          const startX = PAD.l + gi * group + (group - barW * series.length) / 2
          return (
            <g key={gi}>
              {series.map((s, si) => {
                const v = Number(row[s.key]) || 0
                const h = Math.max(0, PAD.t + ih - y(v))
                return (
                  <rect key={s.key} x={startX + si * barW} y={y(v)} width={barW - 2} height={h} rx={3} fill={s.color}>
                    <title>{`${label(row)} · ${s.name}：${compact(v)}`}</title>
                  </rect>
                )
              })}
              <text x={PAD.l + gi * group + group / 2} y={H - 10} textAnchor="middle" fontSize={10} style={{ fill: 'var(--aurora-muted)' }}>{label(row)}</text>
            </g>
          )
        })}
      </svg>
      <div className="aurora-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  )
}

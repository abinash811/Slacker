import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartCard } from '@/components/patterns/chart-card'
import { EmptyState, ErrorState } from '@/components/patterns/states'
import { useTrends } from '@/hooks/useApi'
import type { TicketFiltersState, WeeklyTrend } from '@/types/api'

// Colors: chart-1/chart-2 are the validated categorical pair (see index.css).
// Status colors are deliberately not used for series.
const volumeConfig = {
  created: { label: 'Created', color: 'var(--chart-1)' },
  resolved: { label: 'Resolved', color: 'var(--chart-2)' },
} satisfies ChartConfig
const resolutionConfig = { median_resolution_hours: { label: 'Median resolution', color: 'var(--chart-1)' } } satisfies ChartConfig
const breachConfig = { sla_breached: { label: 'SLA breaches', color: 'var(--chart-1)' } } satisfies ChartConfig

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const hours = (h: number | null) => (h === null ? '—' : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`)

// Shared axis styling: hairline horizontal grid, no axis lines, muted ticks.
const grid = <CartesianGrid vertical={false} />
const margin = { top: 8, right: 16, left: 0, bottom: 0 }

/** X axis for weekly data. The last bucket is the current, unfinished week, so it's labeled as such. */
function weekAxis(data: WeeklyTrend[]) {
  const last = data.at(-1)?.week_start
  return (
    <XAxis
      dataKey="week_start"
      tickFormatter={(iso: string) => (iso === last ? 'This week' : weekLabel(iso))}
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={24}
    />
  )
}

/**
 * Weekly trends for the last 12 weeks: ticket volume (created vs resolved),
 * median resolution time, and SLA breaches. Respects the dashboard filters
 * except date range. Lazy-loaded (recharts is large). The Dashboard supplies
 * the section heading.
 */
export function TrendCharts({ filters }: { filters: TicketFiltersState }) {
  const trends = useTrends(filters)

  return (
    <>
      {trends.isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : trends.isError ? (
        <ErrorState bordered title="Couldn't load trends" error={trends.error} onRetry={() => trends.refetch()} retrying={trends.isFetching} />
      ) : trends.data.every((w) => w.created === 0 && w.resolved === 0 && w.sla_breached === 0) ? (
        <EmptyState bordered icon={TrendingUp} title="No ticket activity yet" description="Trends appear once tickets are created in the last 12 weeks." />
      ) : (
        <Charts data={trends.data} />
      )}
    </>
  )
}

function Charts({ data }: { data: WeeklyTrend[] }) {
  const latest = data.at(-1)
  const key = (w: WeeklyTrend) => w.week_start
  const week = { header: 'Week of', cell: (w: WeeklyTrend) => weekLabel(w.week_start) }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard
        title="Created vs resolved"
        description="Tickets per week"
        rows={data}
        rowKey={key}
        columns={[week, { header: 'Created', cell: (w) => w.created, align: 'right' }, { header: 'Resolved', cell: (w) => w.resolved, align: 'right' }]}
      >
        <ChartContainer config={volumeConfig} className="aspect-auto h-56 w-full">
          <LineChart data={data} margin={margin} accessibilityLayer>
            {grid}
            {weekAxis(data)}
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={(_, p) => weekLabel(String(p?.[0]?.payload?.week_start))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            {(['created', 'resolved'] as const).map((k) => (
              // Two lines converge often, so no end labels here: legend + tooltip carry identity and values.
              <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
            ))}
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Median resolution time"
        description="Hours from creation to resolution, by week resolved"
        rows={data}
        rowKey={key}
        columns={[week, { header: 'Median', cell: (w) => hours(w.median_resolution_hours), align: 'right' }]}
      >
        <ChartContainer config={resolutionConfig} className="aspect-auto h-56 w-full">
          <LineChart data={data} margin={{ ...margin, right: 40 }} accessibilityLayer>
            {grid}
            {weekAxis(data)}
            <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}h`} />
            <ChartTooltip
              cursor
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => weekLabel(String(p?.[0]?.payload?.week_start))}
                  formatter={(v) => <span className="font-medium tabular-nums">{hours(Number(v))}</span>}
                />
              }
            />
            {/* Weeks with nothing resolved are gaps, not zero. */}
            <Line dataKey="median_resolution_hours" type="monotone" stroke="var(--color-median_resolution_hours)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
            {/* The one direct label: the latest value, at the line's end. */}
            {latest?.median_resolution_hours != null && (
              <ReferenceDot
                x={latest.week_start}
                y={latest.median_resolution_hours}
                r={0}
                label={{ value: hours(latest.median_resolution_hours), position: 'right', className: 'fill-foreground text-xs font-medium' }}
              />
            )}
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="SLA breaches"
        description="Tickets whose deadline passed unmet, by week due"
        rows={data}
        rowKey={key}
        columns={[week, { header: 'Breaches', cell: (w) => w.sla_breached, align: 'right' }]}
      >
        <ChartContainer config={breachConfig} className="aspect-auto h-56 w-full">
          <BarChart data={data} margin={margin} accessibilityLayer>
            {grid}
            {weekAxis(data)}
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={(_, p) => weekLabel(String(p?.[0]?.payload?.week_start))} />} />
            <Bar dataKey="sla_breached" fill="var(--color-sla_breached)" maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}

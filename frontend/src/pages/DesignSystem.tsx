import { useState } from 'react'
import { AlertCircle, AlertTriangle, Inbox, Plus, Trash2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ChartCard } from '@/components/patterns/chart-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ButtonLink, LoadingButton } from '@/components/patterns/buttons'
import { CodeSnippet, CopyButton } from '@/components/patterns/code-snippet'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { DataTable, TablePager, type SortingState } from '@/components/patterns/data-table'
import { CheckboxField, FormField, FormSection } from '@/components/patterns/form-field'
import { OptionSelect } from '@/components/patterns/option-select'
import { EmptyState, ErrorState } from '@/components/patterns/states'
import { ToneBadge } from '@/components/patterns/tone-badge'
import { Caption, Muted, PageHeader, SectionHeader, SectionLabel } from '@/components/patterns/typography'
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { StatTile, StatTileSkeleton } from '@/components/StatTile'
import { TagPicker } from '@/components/TagPicker'
import { ApiError } from '@/lib/api'
import { columnHelper } from '@/lib/data-table'
import { toast } from '@/lib/toast'

interface Row {
  id: number
  name: string
  team: string
  breached: boolean
}
const ROWS: Row[] = [
  { id: 1, name: 'Interactive row', team: 'Support', breached: false },
  { id: 2, name: 'Needs attention', team: 'Billing', breached: true },
]
const CHART_ROWS = [
  { week: 'Aug 24', created: 14, resolved: 11 },
  { week: 'Aug 31', created: 18, resolved: 16 },
  { week: 'Sep 7', created: 12, resolved: 15 },
  { week: 'Sep 14', created: 21, resolved: 17 },
  { week: 'Sep 21', created: 17, resolved: 19 },
]
const col = columnHelper<Row>()
const COLUMNS = col.columns([
  col.accessor('name', { header: 'Sortable', meta: { className: 'font-medium' } }),
  col.accessor('team', { header: 'Muted', enableSorting: false, meta: { muted: true } }),
  col.accessor('breached', {
    header: 'Status',
    enableSorting: false,
    cell: (i) => <SlaBadge breached={i.getValue()} remainingSeconds={i.getValue() ? -3600 : 7200} />,
  }),
])

/**
 * Living reference for docs/DESIGN_SYSTEM.md: every shadcn component and
 * app pattern we use, in its states. Not linked from the nav — open /design.
 * Add anything new here in the same change.
 */
export function DesignSystem() {
  const [checked, setChecked] = useState(true)
  const [select, setSelect] = useState<string | null>(null)
  const [tags, setTags] = useState([1])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: true }])
  const [pageIndex, setPageIndex] = useState(0)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Design system" description="shadcn/ui components (Base UI) and the app patterns built from them." />

      <Section title="Typography">
        <div className="flex flex-col gap-3">
          <PageHeader title="PageHeader — h1, one per page" description="Optional description" actions={<Button size="sm">Action</Button>} />
          <SectionHeader title="SectionHeader — h2" description="Settings tabs and page sections" actions={<Button size="sm" variant="outline">Action</Button>} />
          <SectionLabel>SectionLabel</SectionLabel>
          <Muted>Muted — secondary paragraph text.</Muted>
          <Caption>Caption — meta, timestamps.</Caption>
        </div>
      </Section>

      <Section title="Color">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['bg-background ring-1 ring-foreground/10', 'background'],
            ['bg-muted', 'muted'],
            ['bg-secondary', 'secondary'],
            ['bg-primary', 'primary'],
            ['bg-ring', 'ring'],
            ['bg-success', 'success'],
            ['bg-warning', 'warning'],
            ['bg-destructive', 'destructive'],
            ['bg-border', 'border'],
            ['bg-foreground', 'foreground'],
          ].map(([cls, name]) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`size-8 rounded-md ${cls}`} />
              <Caption>{name}</Caption>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <ButtonLink variant="outline" to="/design">
            ButtonLink (navigates)
          </ButtonLink>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">
            <Plus data-icon="inline-start" /> Small with icon
          </Button>
          <LoadingButton loading>Saving…</LoadingButton>
          <Button disabled>Disabled</Button>
          <Tooltip>
            <TooltipTrigger delay={300} render={<Button variant="ghost" size="icon" aria-label="Delete" />}>
              <Trash2 />
            </TooltipTrigger>
            <TooltipContent>Delete (icon buttons always get a tooltip)</TooltipContent>
          </Tooltip>
          <Spinner />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone="neutral">Neutral</ToneBadge>
          <ToneBadge tone="info">Info</ToneBadge>
          <ToneBadge tone="success">Success</ToneBadge>
          <ToneBadge tone="warning">Warning</ToneBadge>
          <ToneBadge tone="danger">Danger</ToneBadge>
          <StatusBadge status="in_progress" />
          <PriorityBadge priority="urgent" />
          <SlaBadge breached={false} />
          <SlaBadge breached remainingSeconds={-7200} />
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Default" htmlFor="ds-default" hint="Hint text explains the format.">
            <Input id="ds-default" placeholder="Placeholder" />
          </FormField>
          <FormField label="Invalid" htmlFor="ds-invalid" error="Enter a customer name.">
            <Input id="ds-invalid" aria-invalid />
          </FormField>
          <FormField label="Disabled" htmlFor="ds-disabled">
            <Input id="ds-disabled" disabled defaultValue="Can't edit" />
          </FormField>
          <FormField label="Optional" htmlFor="ds-optional" required={false}>
            <Input id="ds-optional" />
          </FormField>
          <FormField label="Select" htmlFor="ds-select">
            <OptionSelect
              id="ds-select"
              value={select}
              onValueChange={setSelect}
              emptyLabel="Unassigned"
              placeholder="Unassigned"
              options={[
                { value: '1', label: 'Priya' },
                { value: '2', label: 'Arjun' },
              ]}
            />
          </FormField>
          <FormField label="Select (invalid)" htmlFor="ds-select-invalid" error="Choose a team.">
            <OptionSelect id="ds-select-invalid" invalid value={null} onValueChange={() => {}} options={[]} />
          </FormField>
          <FormField label="Textarea" htmlFor="ds-textarea" className="sm:col-span-2">
            <Textarea id="ds-textarea" />
          </FormField>
          <CheckboxField id="ds-check" label="Checkbox" description="With a description line" checked={checked} onCheckedChange={setChecked} />
          <CheckboxField id="ds-check-off" label="Disabled checkbox" checked={false} onCheckedChange={() => {}} disabled />
          <FormField label="Tag picker (Toggle)" className="sm:col-span-2">
            <TagPicker
              tags={[
                { id: 1, name: 'Appointment', is_archived: false },
                { id: 2, name: 'Prescription', is_archived: false },
                { id: 3, name: 'Billing', is_archived: false },
              ]}
              selectedIds={tags}
              onChange={setTags}
            />
          </FormField>
        </div>
        <div className="max-w-md">
          <FormSection title="FormSection">
            <Muted>Groups related fields in long forms.</Muted>
          </FormSection>
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex max-w-xl flex-col gap-2">
          <Alert>
            <AlertTitle>Default alert</AlertTitle>
            <AlertDescription>Persistent, inline context.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn't create ticket</AlertTitle>
            <AlertDescription>A ticket with this title already exists.</AlertDescription>
          </Alert>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success('Tag created')}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error("Couldn't save tag", 'The server ran into a problem.')}>
            Error toast
          </Button>
          <Button variant="outline" onClick={() => toast.info('Filters cleared')}>
            Info toast
          </Button>
        </div>
      </Section>

      <Section title="Tabs & copyable text">
        <div className="flex max-w-xl flex-col gap-3">
          <Tabs defaultValue="command">
            <TabsList>
              <TabsTrigger value="command">Command</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>
            <TabsContent value="command" className="pt-3">
              <CodeSnippet label="Example command" code='claude mcp add --transport http slacker http://localhost:8000/mcp' />
            </TabsContent>
            <TabsContent value="config" className="pt-3">
              <CodeSnippet label="Example config" code={'{\n  "name": "slacker"\n}'} />
            </TabsContent>
          </Tabs>
          <div className="flex items-center gap-2 text-sm">
            A line with its own copy button <CopyButton text="Copied text" />
          </div>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New tag</DialogTitle>
                <DialogDescription>Tags appear as chips on the ticket form.</DialogDescription>
              </DialogHeader>
              <FormField label="Name" htmlFor="ds-dialog-name">
                <Input id="ds-dialog-name" />
              </FormField>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button>Create tag</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            trigger={<Button variant="destructive" />}
            triggerLabel="Remove member"
            title="Remove Priya?"
            description="She'll no longer be a member of Billing. You can add her back later."
            confirmLabel="Remove member"
            onConfirm={() => new Promise((r) => setTimeout(r, 600))}
          />
        </div>
      </Section>

      <Section title="States: empty, loading, error">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <EmptyState
                icon={Inbox}
                title="No tickets match these filters"
                description="Try removing a filter."
                action={
                  <Button size="sm" variant="outline">
                    Clear filters
                  </Button>
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <ErrorState title="Couldn't load tickets" error={new ApiError(500, '')} onRetry={() => {}} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Cards & stats">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatTile label="Open tickets" value="42" icon={Inbox} />
          <StatTile
            label="SLA breached"
            value="3"
            tone="danger"
            icon={AlertTriangle}
            comparison={{ current: 3, previous: 1, change_pct: 200 }}
            invertComparisonTone
          />
          <StatTileSkeleton />
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>CardDescription</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={62} aria-label="Share" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Charts">
        <div className="max-w-md">
          <ChartCard
            title="Created vs resolved"
            description="ChartCard: shadcn chart + a table toggle"
            rows={CHART_ROWS}
            rowKey={(r) => r.week}
            columns={[
              { header: 'Week', cell: (r) => r.week },
              { header: 'Created', cell: (r) => r.created, align: 'right' },
              { header: 'Resolved', cell: (r) => r.resolved, align: 'right' },
            ]}
          >
            <ChartContainer
              config={{ created: { label: 'Created', color: 'var(--chart-1)' }, resolved: { label: 'Resolved', color: 'var(--chart-2)' } }}
              className="aspect-auto h-48 w-full"
            >
              <LineChart data={CHART_ROWS} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip cursor content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="created" type="monotone" stroke="var(--color-created)" strokeWidth={2} dot={false} />
                <Line dataKey="resolved" type="monotone" stroke="var(--color-resolved)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </Section>

      <Section title="Table">
        <DataTable
          columns={COLUMNS}
          data={ROWS}
          getRowId={(r) => String(r.id)}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={false}
          onRowClick={() => {}}
          rowTone={(r) => (r.breached ? 'danger' : undefined)}
          empty={null}
        />
        <TablePager pageIndex={pageIndex} pageSize={50} rowCount={128} onPageChange={setPageIndex} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={title} />
      {children}
    </section>
  )
}

import { useState } from 'react'
import { AlertTriangle, Inbox, Plus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field, FieldSection } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ShareBar } from '@/components/ui/share-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { Caption, Muted, PageHeader, SectionHeader, SectionLabel } from '@/components/ui/typography'
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { StatTile, StatTileSkeleton } from '@/components/StatTile'
import { TagPicker } from '@/components/TagPicker'
import { ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'

/**
 * Living reference for docs/DESIGN_SYSTEM.md — every primitive in every
 * state. Not linked from the nav; open /design. When you add or change a
 * ui/ component, add it here in the same change.
 */
export function DesignSystem() {
  const [checked, setChecked] = useState(true)
  const [select, setSelect] = useState<string | null>(null)
  const [tags, setTags] = useState([1])
  const [sort, setSort] = useState<SortDirection>('desc')

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Design system" description="Every shared component, in every state. Source of truth: docs/DESIGN_SYSTEM.md." />

      <Section title="Typography">
        <div className="flex flex-col gap-3">
          <PageHeader title="PageHeader — h1, one per page" description="Optional description" actions={<Button size="sm">Action</Button>} />
          <SectionHeader title="SectionHeader — h2" description="Settings tabs and page sections" actions={<Button size="sm" variant="outline">Action</Button>} />
          <CardTitle>CardTitle — h3</CardTitle>
          <SectionLabel>SectionLabel</SectionLabel>
          <Muted>Muted — secondary paragraph text.</Muted>
          <Caption>Caption — meta, timestamps.</Caption>
        </div>
      </Section>

      <Section title="Color">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['bg-background border', 'background'],
            ['bg-muted', 'muted'],
            ['bg-card border', 'card'],
            ['bg-primary', 'primary'],
            ['bg-accent', 'accent'],
            ['bg-success', 'success'],
            ['bg-warning', 'warning'],
            ['bg-danger', 'danger'],
          ].map(([cls, name]) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`size-8 rounded-md border-border ${cls}`} />
              <Caption>{name}</Caption>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {['shadow-card', 'shadow-popover', 'shadow-dialog', 'shadow-toast'].map((s) => (
            <div key={s} className={`flex h-16 items-center justify-center rounded-lg border border-border bg-card ${s}`}>
              <Caption>{s}</Caption>
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
          <Button variant="destructive-ghost">Destructive ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">
            <Plus /> Small with icon
          </Button>
          <Button loading>Saving…</Button>
          <Button disabled>Disabled</Button>
          <Tooltip content="Delete (icon buttons always get a tooltip)">
            <Button variant="ghost" size="icon" aria-label="Delete">
              <Trash2 />
            </Button>
          </Tooltip>
          <Spinner />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <StatusBadge status="in_progress" />
          <PriorityBadge priority="urgent" />
          <SlaBadge breached={false} />
          <SlaBadge breached remainingSeconds={-7200} />
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default" htmlFor="ds-default" hint="Hint text explains the format.">
            <Input id="ds-default" placeholder="Placeholder" />
          </Field>
          <Field label="Invalid" htmlFor="ds-invalid" error="Enter a customer name.">
            <Input id="ds-invalid" aria-invalid defaultValue="" />
          </Field>
          <Field label="Disabled" htmlFor="ds-disabled">
            <Input id="ds-disabled" disabled defaultValue="Can't edit" />
          </Field>
          <Field label="Optional" htmlFor="ds-optional" required={false}>
            <Input id="ds-optional" />
          </Field>
          <Field label="Select" htmlFor="ds-select">
            <Select
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
          </Field>
          <Field label="Select (invalid)" htmlFor="ds-select-invalid" error="Choose a team.">
            <Select id="ds-select-invalid" invalid value={null} onValueChange={() => {}} options={[]} />
          </Field>
          <Field label="Textarea" htmlFor="ds-textarea" className="sm:col-span-2">
            <Textarea id="ds-textarea" />
          </Field>
          <Checkbox label="Checkbox" description="With a description line" checked={checked} onCheckedChange={setChecked} />
          <Checkbox label="Disabled checkbox" checked={false} onCheckedChange={() => {}} disabled />
          <Field label="Tag picker" className="sm:col-span-2">
            <TagPicker
              tags={[
                { id: 1, name: 'Appointment', is_archived: false },
                { id: 2, name: 'Prescription', is_archived: false },
                { id: 3, name: 'Billing', is_archived: false },
              ]}
              selectedIds={tags}
              onChange={setTags}
            />
          </Field>
        </div>
        <div className="max-w-md">
          <FieldSection title="FieldSection">
            <Muted>Groups related fields in long forms.</Muted>
          </FieldSection>
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex max-w-xl flex-col gap-2">
          <Alert title="Info alert">Persistent, inline context.</Alert>
          <Alert tone="success" title="Success alert" />
          <Alert tone="warning" title="Warning alert">Something needs a look.</Alert>
          <Alert tone="danger" title="Couldn't create ticket">A ticket with this title already exists.</Alert>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success('Tag created')}>Success toast</Button>
          <Button variant="outline" onClick={() => toast.error("Couldn't save tag", 'The server ran into a problem.')}>
            Error toast
          </Button>
          <Button variant="outline" onClick={() => toast.info('Filters cleared')}>Info toast</Button>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>New tag</DialogTitle>
                <DialogDescription>Tags appear as chips on the ticket form.</DialogDescription>
              </DialogHeader>
              <Field label="Name" htmlFor="ds-dialog-name">
                <Input id="ds-dialog-name" />
              </Field>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button>Create tag</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            trigger={<Button variant="destructive-ghost" />}
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
            <CardContent className="pt-4">
              <EmptyState
                icon={Inbox}
                title="No tickets match these filters"
                description="Try removing a filter."
                action={<Button size="sm" variant="outline">Clear filters</Button>}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <ErrorState title="Couldn't load tickets" error={new ApiError(500, '')} onRetry={() => {}} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Cards & stats">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatTile label="Open tickets" value="42" icon={Inbox} />
          <StatTile label="SLA breached" value="3" tone="danger" icon={AlertTriangle} comparison={{ current: 3, previous: 1, change_pct: 200 }} invertComparisonTone />
          <StatTileSkeleton />
          <Card>
            <CardHeader>
              <CardTitle tone="strong">Card title (strong)</CardTitle>
              <CardDescription>CardDescription</CardDescription>
            </CardHeader>
            <CardContent>
              <ShareBar percent={62} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <tr>
              <TableHead sort={sort} onSort={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>Sortable (active)</TableHead>
              <TableHead sort={false} onSort={() => {}}>Sortable</TableHead>
              <TableHead>Plain</TableHead>
              <TableHead align="right">Right</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            <TableRow interactive>
              <TableCell className="font-medium">Interactive row</TableCell>
              <TableCell muted>Muted cell</TableCell>
              <TableCell><StatusBadge status="open" /></TableCell>
              <TableCell align="right">12</TableCell>
            </TableRow>
            <TableRow interactive tone="danger">
              <TableCell className="font-medium">Needs attention</TableCell>
              <TableCell muted>Muted cell</TableCell>
              <TableCell><SlaBadge breached remainingSeconds={-3600} /></TableCell>
              <TableCell align="right">4</TableCell>
            </TableRow>
            <TableSkeleton columns={4} rows={2} />
          </TableBody>
        </Table>
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

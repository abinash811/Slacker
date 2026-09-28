import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableMessage,
  TableRow,
  TableSkeleton,
} from '@/components/ui/table'
import { Caption, PageHeader, SectionHeader, SectionLabel } from '@/components/ui/typography'
import { CreateItemDialog } from '@/components/CreateItemDialog'
import { cn } from '@/lib/utils'
import { toOptions } from '@/lib/tickets'
import { useZodForm } from '@/lib/form'
import { addMemberSchema, nameSchema, roleSchema } from '@/lib/schemas'
import {
  useAddTeamMember,
  useCreateRole,
  useCreateTeam,
  useRemoveTeamMember,
  useRoles,
  useSetDefaultTeam,
  useTeamDetail,
  useTeamsList,
  useUpdateRole,
  useUpdateTeamMemberRole,
  useUsers,
} from '@/hooks/useApi'

export function RolesSection() {
  const roles = useRoles(true)
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const form = useZodForm(roleSchema, {
    name: '',
    can_create_settings: false,
    can_edit_settings: false,
    can_delete_settings: false,
  })

  return (
    <div>
      <SectionHeader
        title="Roles"
        description="Control who can create, edit, or delete inside Settings — not tickets elsewhere in the dashboard."
        actions={
          <CreateItemDialog
            noun="role"
            triggerLabel="New role"
            description="Permissions apply to the Settings panel only (Roles, Teams, Categories, SLA, Tags, Custom fields)."
            form={form}
            onSubmit={(v) => createRole.mutateAsync(v)}
          >
            <Field label="Name" htmlFor="role-name" error={form.formState.errors.name?.message}>
              <Input
                id="role-name"
                autoFocus
                aria-invalid={!!form.formState.errors.name}
                placeholder="e.g. Sales lead"
                {...form.register('name')}
              />
            </Field>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2 text-sm font-medium">Settings permissions</legend>
              {(
                [
                  ['can_create_settings', 'Can create'],
                  ['can_edit_settings', 'Can edit'],
                  ['can_delete_settings', 'Can delete'],
                ] as const
              ).map(([name, label]) => (
                <Controller
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => <Checkbox label={label} checked={field.value} onCheckedChange={field.onChange} />}
                />
              ))}
            </fieldset>
          </CreateItemDialog>
        }
      />
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Name</TableHead>
            <TableHead>Settings permissions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead align="right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {roles.isPending ? (
            <TableSkeleton columns={4} rows={3} />
          ) : roles.isError ? (
            <TableMessage colSpan={4}>
              <ErrorState title="Couldn't load roles" error={roles.error} onRetry={() => roles.refetch()} retrying={roles.isFetching} />
            </TableMessage>
          ) : roles.data.length === 0 ? (
            <TableMessage colSpan={4}>
              <EmptyState icon={ShieldCheck} title="No roles yet" description="Create a role to control who can change Settings." />
            </TableMessage>
          ) : (
            roles.data.map((role) => {
              const granted = [
                role.can_create_settings && 'Create',
                role.can_edit_settings && 'Edit',
                role.can_delete_settings && 'Delete',
              ].filter(Boolean) as string[]
              return (
                <TableRow key={role.id} className={cn(role.is_archived && 'bg-muted/20')}>
                  <TableCell className={cn('font-medium', role.is_archived && 'text-muted-foreground')}>{role.name}</TableCell>
                  <TableCell>
                    {granted.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {granted.map((p) => (
                          <Badge key={p} variant="accent">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Caption>No access</Caption>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.is_archived ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>}
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="ghost" size="sm" onClick={() => updateRole.mutate({ id: role.id, is_archived: !role.is_archived })}>
                      {role.is_archived ? 'Restore' : 'Archive'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function TeamsSection() {
  const teams = useTeamsList()
  const createTeam = useCreateTeam()
  const setDefaultTeam = useSetDefaultTeam()
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined)
  const teamForm = useZodForm(nameSchema, { name: '' })

  const selectedTeam = (teams.data ?? []).find((t) => t.id === selectedTeamId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description="New tickets route to the default team automatically; only its members can reassign its locked support owner."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="mb-2 flex h-8 items-center justify-between">
            <SectionLabel as="h2">All teams</SectionLabel>
            <CreateItemDialog
              noun="team"
              triggerVariant="ghost"
              description="You can add members once it's created."
              form={teamForm}
              onSubmit={(v) => createTeam.mutateAsync(v.name, { onSuccess: (team) => setSelectedTeamId(team.id) })}
            >
              <Field label="Name" htmlFor="new-team-name" error={teamForm.formState.errors.name?.message}>
                <Input
                  id="new-team-name"
                  autoFocus
                  aria-invalid={!!teamForm.formState.errors.name}
                  placeholder="e.g. Product"
                  {...teamForm.register('name')}
                />
              </Field>
            </CreateItemDialog>
          </div>
          {teams.isPending ? (
            <div className="flex flex-col gap-1 rounded-lg border border-border p-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="m-2 h-5" />
              ))}
            </div>
          ) : teams.isError ? (
            <ErrorState variant="bordered" error={teams.error} onRetry={() => teams.refetch()} retrying={teams.isFetching} />
          ) : teams.data.length === 0 ? (
            <EmptyState variant="bordered" icon={UsersRound} title="No teams yet" description="Create a team to start routing tickets." />
          ) : (
            <ul className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-card">
              {teams.data.map((team) => {
                const selected = selectedTeamId === team.id
                return (
                  <li
                    key={team.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md pr-2 text-sm transition-colors duration-150 ease-standard hover:bg-muted/60',
                      selected ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTeamId(team.id)}
                      className="focus-ring flex-1 rounded-md px-3 py-2 text-left hover:text-foreground"
                    >
                      {team.name}
                    </button>
                    {team.is_default ? (
                      <Badge variant="accent">Default</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setDefaultTeam.mutate(team.id)} disabled={setDefaultTeam.isPending}>
                        Set default
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="mb-2 flex h-8 items-center">
            <SectionLabel as="h2">
              <UserPlus aria-hidden />
              {selectedTeam ? `${selectedTeam.name} members` : 'Members'}
            </SectionLabel>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            {selectedTeamId ? (
              <TeamMembers teamId={selectedTeamId} />
            ) : (
              <EmptyState icon={UsersRound} title="No team selected" description="Pick a team on the left to view and manage its members." />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function TeamMembers({ teamId }: { teamId: number }) {
  const team = useTeamDetail(teamId)
  const { data: users } = useUsers()
  const { data: roles } = useRoles()
  const addMember = useAddTeamMember(teamId)
  const updateMemberRole = useUpdateTeamMemberRole(teamId)
  const removeMember = useRemoveTeamMember(teamId)

  const memberForm = useZodForm(addMemberSchema, { user_id: '', role_id: '' })
  const memberErrors = memberForm.formState.errors

  const members = team.data?.members ?? []
  const existingUserIds = new Set(members.map((m) => m.user.id))
  const availableUsers = (users ?? []).filter((u) => !existingUserIds.has(u.id))

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead align="right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {team.isPending ? (
            <TableSkeleton columns={3} rows={3} />
          ) : team.isError ? (
            <TableMessage colSpan={3}>
              <ErrorState title="Couldn't load members" error={team.error} onRetry={() => team.refetch()} retrying={team.isFetching} />
            </TableMessage>
          ) : members.length === 0 ? (
            <TableMessage colSpan={3}>
              <EmptyState title="No members yet" description="Add someone below to give them access to this team's tickets." />
            </TableMessage>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.user.name}</TableCell>
                <TableCell>
                  <Select
                    aria-label={`Role for ${member.user.name}`}
                    className="w-40"
                    value={String(member.role.id)}
                    onValueChange={(v) => v && updateMemberRole.mutate({ memberId: member.id, roleId: Number(v) })}
                    options={toOptions(roles)}
                  />
                </TableCell>
                <TableCell align="right">
                  <ConfirmDialog
                    trigger={<Button variant="destructive-ghost" size="sm" />}
                    triggerLabel="Remove"
                    title={`Remove ${member.user.name}?`}
                    description={`They'll no longer be a member of ${team.data?.name ?? 'this team'}. You can add them back later.`}
                    confirmLabel="Remove member"
                    onConfirm={() => removeMember.mutateAsync(member.id)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <form
        noValidate
        className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/30 p-3 sm:flex-row sm:items-start"
        onSubmit={memberForm.handleSubmit((v) =>
          addMember
            .mutateAsync({ user_id: Number(v.user_id), role_id: Number(v.role_id) })
            .then(() => memberForm.reset())
            .catch(() => {}),
        )}
      >
        <Field label="Add member" htmlFor="add-member-user" className="flex-1" error={memberErrors.user_id?.message}>
          <Controller
            control={memberForm.control}
            name="user_id"
            render={({ field }) => (
              <Select
                id="add-member-user"
                invalid={!!memberErrors.user_id}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? '')}
                placeholder={availableUsers.length ? 'Select person…' : 'Everyone is already a member'}
                disabled={availableUsers.length === 0}
                options={toOptions(availableUsers)}
              />
            )}
          />
        </Field>
        <Field label="Role" htmlFor="add-member-role" className="flex-1" error={memberErrors.role_id?.message}>
          <Controller
            control={memberForm.control}
            name="role_id"
            render={({ field }) => (
              <Select
                id="add-member-role"
                invalid={!!memberErrors.role_id}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? '')}
                placeholder="Select role…"
                options={toOptions(roles)}
              />
            )}
          />
        </Field>
        <Button type="submit" className="sm:mt-5.5" loading={memberForm.formState.isSubmitting}>
          Add
        </Button>
      </form>
    </div>
  )
}

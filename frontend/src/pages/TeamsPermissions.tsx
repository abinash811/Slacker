import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { DataTable } from '@/components/patterns/data-table'
import { CheckboxField, FormField } from '@/components/patterns/form-field'
import { LoadingButton } from '@/components/patterns/buttons'
import { OptionSelect } from '@/components/patterns/option-select'
import { EmptyState, ErrorState } from '@/components/patterns/states'
import { ToneBadge } from '@/components/patterns/tone-badge'
import { Caption, PageHeader, SectionHeader, SectionLabel } from '@/components/patterns/typography'
import { CreateItemDialog } from '@/components/CreateItemDialog'
import { cn } from '@/lib/utils'
import { toOptions } from '@/lib/tickets'
import { columnHelper } from '@/lib/data-table'
import type { Role, TeamMemberEntry } from '@/types/api'
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
            <FormField label="Name" htmlFor="role-name" error={form.formState.errors.name?.message}>
              <Input
                id="role-name"
                autoFocus
                aria-invalid={!!form.formState.errors.name}
                placeholder="e.g. Sales lead"
                {...form.register('name')}
              />
            </FormField>
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
                  render={({ field }) => (
                    <CheckboxField id={`role-${name}`} label={label} checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              ))}
            </fieldset>
          </CreateItemDialog>
        }
      />
      <DataTable
        columns={roleColumns((role) => updateRole.mutate({ id: role.id, is_archived: !role.is_archived }))}
        data={roles.data ?? NO_ROLES}
        getRowId={(r) => String(r.id)}
        isLoading={roles.isPending}
        loadingRows={3}
        error={roles.isError ? roles.error : undefined}
        errorTitle="Couldn't load roles"
        onRetry={() => roles.refetch()}
        retrying={roles.isFetching}
        empty={<EmptyState icon={ShieldCheck} title="No roles yet" description="Create a role to control who can change Settings." />}
      />
    </div>
  )
}

const NO_ROLES: Role[] = []
const NO_MEMBERS: TeamMemberEntry[] = []
const roleCol = columnHelper<Role>()

function roleColumns(onToggleArchive: (role: Role) => void) {
  return roleCol.columns([
    roleCol.accessor('name', {
      header: 'Name',
      cell: (i) => <span className={cn('font-medium', i.row.original.is_archived && 'text-muted-foreground')}>{i.getValue()}</span>,
    }),
    roleCol.display({
      id: 'permissions',
      header: 'Settings permissions',
      cell: ({ row: { original: role } }) => {
        const granted = [
          role.can_create_settings && 'Create',
          role.can_edit_settings && 'Edit',
          role.can_delete_settings && 'Delete',
        ].filter(Boolean) as string[]
        return granted.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {granted.map((p) => (
              <ToneBadge key={p} tone="info">
                {p}
              </ToneBadge>
            ))}
          </div>
        ) : (
          <Caption>No access</Caption>
        )
      },
    }),
    roleCol.accessor('is_archived', {
      header: 'Status',
      cell: (i) => (i.getValue() ? <ToneBadge tone="neutral">Archived</ToneBadge> : <ToneBadge tone="success">Active</ToneBadge>),
    }),
    roleCol.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right' },
      cell: ({ row: { original: role } }) => (
        <Button variant="ghost" size="sm" onClick={() => onToggleArchive(role)}>
          {role.is_archived ? 'Restore' : 'Archive'}
        </Button>
      ),
    }),
  ])
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
              <FormField label="Name" htmlFor="new-team-name" error={teamForm.formState.errors.name?.message}>
                <Input
                  id="new-team-name"
                  autoFocus
                  aria-invalid={!!teamForm.formState.errors.name}
                  placeholder="e.g. Product"
                  {...teamForm.register('name')}
                />
              </FormField>
            </CreateItemDialog>
          </div>
          {teams.isPending ? (
            <div className="flex flex-col gap-1 rounded-xl p-1 ring-1 ring-foreground/10">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="m-2 h-5" />
              ))}
            </div>
          ) : teams.isError ? (
            <ErrorState bordered error={teams.error} onRetry={() => teams.refetch()} retrying={teams.isFetching} />
          ) : teams.data.length === 0 ? (
            <EmptyState bordered icon={UsersRound} title="No teams yet" description="Create a team to start routing tickets." />
          ) : (
            <ul className="flex flex-col gap-1 rounded-xl p-1 ring-1 ring-foreground/10">
              {teams.data.map((team) => {
                const selected = selectedTeamId === team.id
                return (
                  <li
                    key={team.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg pr-2 text-sm transition-colors hover:bg-muted/60',
                      selected ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTeamId(team.id)}
                      className="focus-ring flex-1 rounded-lg px-3 py-2 text-left hover:text-foreground"
                    >
                      {team.name}
                    </button>
                    {team.is_default ? (
                      <ToneBadge tone="info">Default</ToneBadge>
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
          <div className="rounded-xl p-4 ring-1 ring-foreground/10">
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

  const memberCol = columnHelper<TeamMemberEntry>()
  const memberColumns = memberCol.columns([
    memberCol.accessor((m) => m.user.name, { id: 'name', header: 'Name', meta: { className: 'font-medium' } }),
    memberCol.display({
      id: 'role',
      header: 'Role',
      cell: ({ row: { original: member } }) => (
        <OptionSelect
          aria-label={`Role for ${member.user.name}`}
          className="w-40"
          value={String(member.role.id)}
          onValueChange={(v) => v && updateMemberRole.mutate({ memberId: member.id, roleId: Number(v) })}
          options={toOptions(roles)}
        />
      ),
    }),
    memberCol.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right' },
      cell: ({ row: { original: member } }) => (
        <ConfirmDialog
          trigger={<Button variant="destructive" size="sm" />}
          triggerLabel="Remove"
          title={`Remove ${member.user.name}?`}
          description={`They'll no longer be a member of ${team.data?.name ?? 'this team'}. You can add them back later.`}
          confirmLabel="Remove member"
          onConfirm={() => removeMember.mutateAsync(member.id)}
        />
      ),
    }),
  ])

  const memberForm = useZodForm(addMemberSchema, { user_id: '', role_id: '' })
  const memberErrors = memberForm.formState.errors

  const members = team.data?.members ?? []
  const existingUserIds = new Set(members.map((m) => m.user.id))
  const availableUsers = (users ?? []).filter((u) => !existingUserIds.has(u.id))

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={memberColumns}
        data={team.data?.members ?? NO_MEMBERS}
        getRowId={(m) => String(m.id)}
        isLoading={team.isPending}
        loadingRows={3}
        error={team.isError ? team.error : undefined}
        errorTitle="Couldn't load members"
        onRetry={() => team.refetch()}
        retrying={team.isFetching}
        empty={<EmptyState title="No members yet" description="Add someone below to give them access to this team's tickets." />}
      />

      <form
        noValidate
        className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-3 sm:flex-row sm:items-start"
        onSubmit={memberForm.handleSubmit((v) =>
          addMember
            .mutateAsync({ user_id: Number(v.user_id), role_id: Number(v.role_id) })
            .then(() => memberForm.reset())
            .catch(() => {}),
        )}
      >
        <FormField label="Add member" htmlFor="add-member-user" className="flex-1" error={memberErrors.user_id?.message}>
          <Controller
            control={memberForm.control}
            name="user_id"
            render={({ field }) => (
              <OptionSelect
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
        </FormField>
        <FormField label="Role" htmlFor="add-member-role" className="flex-1" error={memberErrors.role_id?.message}>
          <Controller
            control={memberForm.control}
            name="role_id"
            render={({ field }) => (
              <OptionSelect
                id="add-member-role"
                invalid={!!memberErrors.role_id}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? '')}
                placeholder="Select role…"
                options={toOptions(roles)}
              />
            )}
          />
        </FormField>
        <LoadingButton type="submit" className="sm:mt-6" loading={memberForm.formState.isSubmitting}>
          Add
        </LoadingButton>
      </form>
    </div>
  )
}

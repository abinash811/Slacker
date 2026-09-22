import { useState } from 'react'
import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
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
import type { Role, Team } from '@/types/api'

export function TeamsPermissions() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Teams &amp; Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Manage teams, membership, and the roles that will gate Settings access.
        </p>
      </div>

      <RolesSection />
      <TeamsSection />
    </div>
  )
}

function RolesSection() {
  const { data: roles } = useRoles(true)
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Roles
          </CardTitle>
          <RoleFormDialog onSubmit={(payload) => createRole.mutate(payload)} trigger={<Button size="sm">New Role</Button>} />
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2">Name</th>
              <th className="py-2">Create</th>
              <th className="py-2">Edit</th>
              <th className="py-2">Delete</th>
              <th className="py-2">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {(roles ?? []).map((role) => (
              <tr
                key={role.id}
                className={cn('border-b border-border last:border-0 hover:bg-muted/60', role.is_archived && 'bg-muted/30 text-muted-foreground')}
              >
                <td className="py-2 font-medium">{role.name}</td>
                <td className="py-2">{role.can_create_settings ? '✓' : '—'}</td>
                <td className="py-2">{role.can_edit_settings ? '✓' : '—'}</td>
                <td className="py-2">{role.can_delete_settings ? '✓' : '—'}</td>
                <td className="py-2">
                  {role.is_archived ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateRole.mutate({ id: role.id, is_archived: !role.is_archived })}
                  >
                    {role.is_archived ? 'Unarchive' : 'Archive'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function RoleFormDialog({
  trigger,
  onSubmit,
}: {
  trigger: React.ReactNode
  onSubmit: (payload: { name: string; can_create_settings: boolean; can_edit_settings: boolean; can_delete_settings: boolean }) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [canCreate, setCanCreate] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)

  function reset() {
    setName('')
    setCanCreate(false)
    setCanEdit(false)
    setCanDelete(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Lead" />
          </div>
          <p className="text-xs text-muted-foreground">
            These control access to the Settings panel only (Teams &amp; Permissions, Form Fields &amp; Dropdowns) —
            not tickets elsewhere in the dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <PermissionCheckbox label="Can create in Settings" checked={canCreate} onChange={setCanCreate} />
            <PermissionCheckbox label="Can edit in Settings" checked={canEdit} onChange={setCanEdit} />
            <PermissionCheckbox label="Can delete in Settings" checked={canDelete} onChange={setCanDelete} />
          </div>
          <Button
            className="mt-2"
            disabled={!name}
            onClick={() => {
              onSubmit({ name, can_create_settings: canCreate, can_edit_settings: canEdit, can_delete_settings: canDelete })
              reset()
              setOpen(false)
            }}
          >
            Create role
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PermissionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  )
}

function TeamsSection() {
  const { data: teams } = useTeamsList()
  const createTeam = useCreateTeam()
  const setDefaultTeam = useSetDefaultTeam()
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined)
  const [newTeamName, setNewTeamName] = useState('')

  const selectedTeam = (teams ?? []).find((t) => t.id === selectedTeamId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <UsersRound className="h-4 w-4 text-muted-foreground" /> Teams
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            New tickets route to the default team automatically; only its members can reassign its locked support owner.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            {(teams ?? []).map((team: Team) => (
              <div
                key={team.id}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                  selectedTeamId === team.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                <button onClick={() => setSelectedTeamId(team.id)} className="flex-1 text-left">
                  {team.name}
                </button>
                {team.is_default ? (
                  <Badge variant="accent">Default</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefaultTeam.mutate(team.id)}
                    disabled={setDefaultTeam.isPending}
                  >
                    Set default
                  </Button>
                )}
              </div>
            ))}
            {(teams ?? []).length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No teams yet — add one below.</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <Input placeholder="New team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
            <Button
              disabled={!newTeamName}
              onClick={() => {
                createTeam.mutate(newTeamName, { onSuccess: (team) => setSelectedTeamId(team.id) })
                setNewTeamName('')
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            {selectedTeam ? `${selectedTeam.name} — Members` : 'Select a team'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTeamId ? (
            <TeamMembers teamId={selectedTeamId} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pick a team on the left to view and manage its members.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeamMembers({ teamId }: { teamId: number }) {
  const { data: team } = useTeamDetail(teamId)
  const { data: users } = useUsers()
  const { data: roles } = useRoles()
  const addMember = useAddTeamMember(teamId)
  const updateMemberRole = useUpdateTeamMemberRole(teamId)
  const removeMember = useRemoveTeamMember(teamId)

  const [newUserId, setNewUserId] = useState('')
  const [newRoleId, setNewRoleId] = useState('')

  const existingUserIds = new Set((team?.members ?? []).map((m) => m.user.id))
  const availableUsers = (users ?? []).filter((u) => !existingUserIds.has(u.id))

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2">Name</th>
            <th className="py-2">Role</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {(team?.members ?? []).map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/60">
              <td className="py-2 font-medium">{member.user.name}</td>
              <td className="py-2">
                <Select
                  value={String(member.role.id)}
                  onValueChange={(v) => updateMemberRole.mutate({ memberId: member.id, roleId: Number(v) })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles ?? []).map((r: Role) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(member.id)}>
                  Remove
                </Button>
              </td>
            </tr>
          ))}
          {(team?.members ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                No members yet — add one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-end gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
        <div className="flex-1">
          <Label className="mb-1.5 block text-xs">Add member</Label>
          <Select value={newUserId} onValueChange={setNewUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select user…" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="mb-1.5 block text-xs">Role</Label>
          <Select value={newRoleId} onValueChange={setNewRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role…" />
            </SelectTrigger>
            <SelectContent>
              {(roles ?? []).map((r: Role) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!newUserId || !newRoleId}
          onClick={() => {
            addMember.mutate({ user_id: Number(newUserId), role_id: Number(newRoleId) })
            setNewUserId('')
            setNewRoleId('')
          }}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

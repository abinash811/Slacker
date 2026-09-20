import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUsers } from '@/hooks/useApi'
import { getCurrentUserEmail, setCurrentUserEmail } from '@/lib/devUser'

/**
 * V1 has no real authentication (spec section 14) — this lets you act as
 * different users for demoing accountability features. Replace with the
 * company SSO session once that's wired up; every API call already reads
 * "who am I" from one place (lib/devUser.ts).
 */
export function DevUserSwitcher() {
  const { data: users } = useUsers()
  const [email, setEmail] = useState<string | null>(getCurrentUserEmail())

  useEffect(() => {
    if (!email && users && users.length > 0) {
      setCurrentUserEmail(users[0].email)
      setEmail(users[0].email)
    }
  }, [users, email])

  if (!users) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Acting as</span>
      <Select
        value={email ?? undefined}
        onValueChange={(v) => {
          setCurrentUserEmail(v)
          setEmail(v)
          window.location.reload()
        }}
      >
        <SelectTrigger className="w-auto min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.email}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

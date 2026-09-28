import { useEffect } from 'react'
import { Select } from '@/components/ui/select'
import { Caption } from '@/components/ui/typography'
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
  const email = getCurrentUserEmail() ?? users?.[0]?.email ?? null

  useEffect(() => {
    if (!getCurrentUserEmail() && users && users.length > 0) setCurrentUserEmail(users[0].email)
  }, [users])

  if (!users) return null

  return (
    <div className="flex items-center gap-2">
      <Caption>Acting as</Caption>
      <Select
        aria-label="Acting as"
        className="w-auto min-w-36"
        value={email}
        onValueChange={(v) => {
          if (!v) return
          setCurrentUserEmail(v)
          window.location.reload()
        }}
        options={users.map((u) => ({ value: u.email, label: u.name }))}
      />
    </div>
  )
}

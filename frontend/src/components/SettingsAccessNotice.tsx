import { Lock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useMe } from '@/hooks/useApi'

/** Explains why Settings controls are missing when the user's role doesn't allow some actions. */
export function SettingsAccessNotice() {
  const { data: me } = useMe()
  if (!me) return null
  const { create, edit, delete: remove } = me.settings
  if (create && edit && remove) return null

  const cannot = [!create && 'add', !edit && 'edit', !remove && 'archive'].filter(Boolean)
  const title = cannot.length === 3 ? 'You can view Settings, but not change them' : `You can't ${list(cannot as string[])} items here`
  return (
    <Alert>
      <Lock />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>Your role doesn't include these permissions. Ask a Settings admin if you need them.</AlertDescription>
    </Alert>
  )
}

function list(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`
}

import { toast as sonner } from 'sonner'

/**
 * Fire-and-forget feedback after an action (shadcn Sonner). Most mutation
 * feedback is automatic — see `meta` in hooks/useApi.ts.
 *   toast.success('Tag created')
 *   toast.error("Couldn't save tag", 'A tag with that name already exists.')
 */
export const toast = {
  success: (title: string, description?: string) => sonner.success(title, { description }),
  error: (title: string, description?: string) => sonner.error(title, { description, duration: 8000 }),
  info: (title: string, description?: string) => sonner.info(title, { description }),
}

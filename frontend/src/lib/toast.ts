import { Toast } from '@base-ui/react/toast'

export type ToastType = 'success' | 'error' | 'info'

export const toastManager = Toast.createToastManager()

/**
 * Fire-and-forget feedback after an action. Callable from anywhere (hooks,
 * the query client), not just components.
 *   toast.success('Tag created')
 *   toast.error("Couldn't save tag", 'A tag with that name already exists.')
 * Most mutation feedback is automatic — see `meta` in hooks/useApi.ts.
 */
export const toast = {
  success: (title: string, description?: string) => toastManager.add({ title, description, type: 'success' }),
  error: (title: string, description?: string) => toastManager.add({ title, description, type: 'error', timeout: 8000 }),
  info: (title: string, description?: string) => toastManager.add({ title, description, type: 'info' }),
}

import { Toast } from '@base-ui/react/toast'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { toastManager, type ToastType } from '@/lib/toast'
import { cn } from '@/lib/utils'

const ICON: Record<ToastType, typeof Info> = { success: CheckCircle2, error: AlertCircle, info: Info }
const ICON_TONE: Record<ToastType, string> = { success: 'text-success', error: 'text-danger', info: 'text-primary' }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={4000} limit={4}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] flex-col gap-2 outline-none sm:w-96">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((t) => {
    const type = (t.type as ToastType | undefined) ?? 'info'
    const Icon = ICON[type]
    return (
      <Toast.Root
        key={t.id}
        toast={t}
        className={cn(
          'flex items-start gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-toast',
          'transition-[opacity,transform] duration-200 ease-standard',
          'data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0',
        )}
      >
        <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_TONE[type])} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="text-sm font-medium" />
          <Toast.Description className="text-sm text-muted-foreground empty:hidden" />
        </div>
        <Toast.Close
          aria-label="Dismiss"
          className="focus-ring -m-1 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

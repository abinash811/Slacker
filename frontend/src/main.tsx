import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { toast } from '@/lib/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { describeError } from '@/lib/api'
import './index.css'
import App from './App.tsx'

// Every mutation reports its outcome the same way: errors always toast
// (unless the UI shows them inline — set `meta.inlineError`), successes
// toast when the hook sets `meta.success`. See hooks/useApi.ts.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.inlineError) return
      toast.error(mutation.meta?.errorTitle ?? "Couldn't save changes", describeError(error))
    },
    onSuccess: (_data, variables, _context, mutation) => {
      const success = mutation.meta?.success
      if (success) toast.success(typeof success === 'function' ? success(variables) : success)
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider delay={300}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)

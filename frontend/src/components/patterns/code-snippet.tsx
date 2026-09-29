import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/** Icon button that copies `text`, confirming with a tick and a toast. */
export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy", 'Select the text and copy it instead.')
    }
  }
  return (
    <Tooltip>
      <TooltipTrigger delay={300} render={<Button variant="ghost" size="icon-sm" aria-label={label} className={className} onClick={copy} />}>
        {copied ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Copied' : label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Text the user copies somewhere else (a command, a config file, a key):
 * monospaced, selectable, wraps long lines, with a copy button.
 */
export function CodeSnippet({ code, label, className }: { code: string; label: string; className?: string }) {
  return (
    <div className={cn('relative rounded-lg bg-muted', className)}>
      <pre aria-label={label} className="overflow-x-auto p-3 pr-11 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        {code}
      </pre>
      <CopyButton text={code} label={`Copy ${label.toLowerCase()}`} className="absolute top-1.5 right-1.5" />
    </div>
  )
}

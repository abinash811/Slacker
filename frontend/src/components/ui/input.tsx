import * as React from 'react'
import { controlClasses } from '@/components/ui/styles'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, 'h-9 px-3', className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-20 px-3 py-2', className)} {...props} />
}

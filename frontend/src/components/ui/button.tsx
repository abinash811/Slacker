import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/styles'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  /** Shows a spinner, disables the button, and keeps its width stable. */
  loading?: boolean
}

export function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner label="Working" />}
      {children as React.ReactNode}
    </ButtonPrimitive>
  )
}

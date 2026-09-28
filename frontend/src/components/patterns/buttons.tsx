import * as React from 'react'
import { Link } from 'react-router-dom'
import type { VariantProps } from 'class-variance-authority'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/**
 * A router link styled as a shadcn Button (shadcn's documented `buttonVariants`
 * pattern). Use it — not `<Button render={<Link/>}>` — so screen readers
 * announce a link, not a button.
 */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

/** shadcn Button + Spinner (shadcn's documented loading pattern): disabled and busy while `loading`. */
export function LoadingButton({
  loading,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}

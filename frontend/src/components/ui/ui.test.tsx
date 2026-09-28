import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { ApiError } from '@/lib/api'

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Field', () => {
  it('labels the control and shows the error instead of the hint', () => {
    render(
      <Field label="Title" htmlFor="t" hint="Short and specific." error="Add a short title.">
        <Input id="t" aria-invalid />
      </Field>,
    )
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Add a short title.')
    expect(screen.queryByText('Short and specific.')).not.toBeInTheDocument()
  })

  it('marks optional fields', () => {
    render(
      <Field label="Doctor name" htmlFor="d" required={false}>
        <Input id="d" />
      </Field>,
    )
    expect(screen.getByText('(optional)')).toBeInTheDocument()
  })
})

describe('EmptyState / ErrorState', () => {
  it('renders the empty title, description and action', () => {
    render(<EmptyState icon={Inbox} title="No tags yet" description="Create one." action={<Button>New</Button>} />)
    expect(screen.getByText('No tags yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
  })

  it('explains the error and retries', async () => {
    const onRetry = vi.fn()
    render(<ErrorState title="Couldn't load tickets" error={new ApiError(500, '')} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/server ran into a problem/)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('Pagination', () => {
  it('shows the range and disables buttons at the ends', async () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<Pagination pageIndex={0} pageSize={50} rowCount={120} onPageChange={onPageChange} />)
    expect(screen.getByText('Showing 1–50 of 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    rerender(<Pagination pageIndex={2} pageSize={50} rowCount={120} onPageChange={onPageChange} />)
    expect(screen.getByText('Showing 101–120 of 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})

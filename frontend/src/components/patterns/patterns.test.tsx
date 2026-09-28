import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/patterns/buttons'
import { TablePager } from '@/components/patterns/data-table'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState, ErrorState } from '@/components/patterns/states'
import { ApiError } from '@/lib/api'

describe('LoadingButton', () => {
  it('is disabled and busy while loading', () => {
    render(<LoadingButton loading>Save</LoadingButton>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('FormField', () => {
  it('labels the control and shows the error instead of the hint', () => {
    render(
      <FormField label="Title" htmlFor="t" hint="Short and specific." error="Add a short title.">
        <Input id="t" aria-invalid />
      </FormField>,
    )
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Add a short title.')
    expect(screen.queryByText('Short and specific.')).not.toBeInTheDocument()
  })

  it('marks optional fields', () => {
    render(
      <FormField label="Doctor name" htmlFor="d" required={false}>
        <Input id="d" />
      </FormField>,
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

describe('TablePager', () => {
  it('shows the range and blocks paging past either end', async () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<TablePager pageIndex={0} pageSize={50} rowCount={120} onPageChange={onPageChange} />)
    expect(screen.getByText('Showing 1–50 of 120')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to previous page')).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(screen.getByLabelText('Go to next page'))
    expect(onPageChange).toHaveBeenCalledWith(1)

    rerender(<TablePager pageIndex={2} pageSize={50} rowCount={120} onPageChange={onPageChange} />)
    expect(screen.getByText('Showing 101–120 of 120')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to next page')).toHaveAttribute('aria-disabled', 'true')
  })
})

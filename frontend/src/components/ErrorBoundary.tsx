import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/components/patterns/states'

/** Last-resort catch for render crashes, so one broken page never blanks the whole app. Give it a `key` (e.g. the route) to reset on navigation. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          bordered
          title="This page crashed"
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

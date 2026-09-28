import '@tanstack/react-query'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Toast shown on success. A function receives the mutation's variables. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      success?: string | ((variables: any) => string)
      /** Title of the error toast (description comes from the server). */
      errorTitle?: string
      /** Set when the component renders the error itself, to skip the toast. */
      inlineError?: boolean
    }
  }
}

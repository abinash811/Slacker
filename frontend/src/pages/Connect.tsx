import { useState } from 'react'
import { KeyRound, ShieldCheck, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ButtonLink, LoadingButton } from '@/components/patterns/buttons'
import { CodeSnippet, CopyButton } from '@/components/patterns/code-snippet'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState, ErrorState } from '@/components/patterns/states'
import { Caption, Muted, PageHeader } from '@/components/patterns/typography'
import { useApiTokens, useCreateApiToken, useMcpInfo, useRevokeApiToken } from '@/hooks/useApi'
import { formatDateTime } from '@/lib/format'
import { useZodForm } from '@/lib/form'
import {
  claudeCodeCommand,
  claudeDesktopConfig,
  cursorInstallLink,
  EXAMPLE_PROMPTS,
  KEY_PLACEHOLDER,
  vscodeInstallLink,
} from '@/lib/mcp'
import { nameSchema } from '@/lib/schemas'
import type { ApiTokenCreated } from '@/types/api'

/**
 * Connect an AI assistant (Claude, Cursor, VS Code) to Slacker over MCP:
 * create a personal key, then add it with the snippet or one-click link for
 * your app. Read-only: assistants can look at tickets, not change them.
 */
export function Connect() {
  const mcpInfo = useMcpInfo()
  // The full key exists only in this response; it's gone after a reload.
  const [created, setCreated] = useState<ApiTokenCreated | null>(null)
  const key = created?.key ?? KEY_PLACEHOLDER

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Connect to Claude"
        description="Ask Claude about your tickets in plain words: what's overdue, who's overloaded, how this week compares."
      />

      <Alert>
        <ShieldCheck />
        <AlertTitle>Read-only</AlertTitle>
        <AlertDescription>
          Claude can read tickets and dashboard numbers as you. It can't create, change or resolve anything.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>1. Create your key</CardTitle>
            <CardDescription>The key lets your app read Slacker as you. Keep it private.</CardDescription>
          </CardHeader>
          <CardContent>
            {created ? <NewKey created={created} onDone={() => setCreated(null)} /> : <CreateKeyForm onCreated={setCreated} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>2. Add it to your app</CardTitle>
            <CardDescription>
              {created ? 'Your new key is already filled in below.' : `Create a key first; until then the steps show ${KEY_PLACEHOLDER}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mcpInfo.isError ? (
              <ErrorState error={mcpInfo.error} onRetry={() => mcpInfo.refetch()} retrying={mcpInfo.isFetching} />
            ) : mcpInfo.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <AppSetup url={mcpInfo.data.url} apiKey={key} hasKey={!!created} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>3. Try asking</CardTitle>
            <CardDescription>Once connected, ask things like:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <li key={prompt} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/50">
                  <span>“{prompt}”</span>
                  <CopyButton text={prompt} label="Copy question" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <KeyList />
      </div>
    </div>
  )
}

function CreateKeyForm({ onCreated }: { onCreated: (created: ApiTokenCreated) => void }) {
  const createToken = useCreateApiToken()
  const form = useZodForm(nameSchema, { name: 'Claude' })
  const error = form.formState.errors.name?.message
  return (
    <form
      noValidate
      className="flex items-start gap-3"
      onSubmit={form.handleSubmit(async (v) => {
        try {
          onCreated(await createToken.mutateAsync(v.name))
        } catch {
          // Reported by the global error toast.
        }
      })}
    >
      <FormField label="Name" htmlFor="key-name" hint="Where you'll use it, e.g. “Claude on my laptop”." error={error} className="flex-1">
        <Input id="key-name" aria-invalid={!!error} {...form.register('name')} />
      </FormField>
      <LoadingButton type="submit" className="mt-6" loading={form.formState.isSubmitting}>
        <KeyRound data-icon="inline-start" /> Create key
      </LoadingButton>
    </form>
  )
}

function NewKey({ created, onDone }: { created: ApiTokenCreated; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <KeyRound />
        <AlertTitle>Copy your key now</AlertTitle>
        <AlertDescription>You won't see it again. If you lose it, revoke it and create a new one.</AlertDescription>
      </Alert>
      <CodeSnippet code={created.key} label="Key" />
      <Button variant="outline" size="sm" className="self-start" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

function AppSetup({ url, apiKey, hasKey }: { url: string; apiKey: string; hasKey: boolean }) {
  const oneClickHint = hasKey ? null : <Caption>Create a key first to enable this button.</Caption>
  return (
    <Tabs defaultValue="desktop">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="desktop">Claude Desktop</TabsTrigger>
        <TabsTrigger value="code">Claude Code</TabsTrigger>
        <TabsTrigger value="web">Claude.ai</TabsTrigger>
        <TabsTrigger value="cursor">Cursor</TabsTrigger>
        <TabsTrigger value="vscode">VS Code</TabsTrigger>
      </TabsList>

      <TabsContent value="desktop" className="flex flex-col gap-3 pt-3">
        <Steps
          steps={[
            'Open Claude Desktop, then Settings → Developer → Edit Config.',
            'Paste this into the file. If it already has "mcpServers", add the "slacker" entry inside it.',
            'Save, then quit and reopen Claude Desktop. Slacker appears under the tools (＋) menu.',
          ]}
        />
        <CodeSnippet code={claudeDesktopConfig(url, apiKey)} label="Claude Desktop config" />
        <Caption>Needs Node.js on your computer (nodejs.org). Claude Desktop uses it to reach Slacker.</Caption>
      </TabsContent>

      <TabsContent value="code" className="flex flex-col gap-3 pt-3">
        <Steps steps={['Run this in a terminal.', 'In Claude Code, type /mcp to check “slacker” shows as connected.']} />
        <CodeSnippet code={claudeCodeCommand(url, apiKey)} label="Claude Code command" />
      </TabsContent>

      <TabsContent value="web" className="flex flex-col gap-2 pt-3">
        <Muted>
          Available once Slacker is hosted online with sign-in. You'll add it in Claude under Settings → Connectors and sign
          in with one click, with no key to copy.
        </Muted>
        <Caption>Server address: {url}</Caption>
      </TabsContent>

      <TabsContent value="cursor" className="flex flex-col gap-2 pt-3">
        <OneClick href={cursorInstallLink(url, apiKey)} label="Add to Cursor" disabled={!hasKey} />
        {oneClickHint}
      </TabsContent>

      <TabsContent value="vscode" className="flex flex-col gap-2 pt-3">
        <OneClick href={vscodeInstallLink(url, apiKey)} label="Add to VS Code" disabled={!hasKey} />
        {oneClickHint}
      </TabsContent>
    </Tabs>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  )
}

function OneClick({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  return disabled ? (
    <Button className="self-start" disabled>
      <Sparkles data-icon="inline-start" /> {label}
    </Button>
  ) : (
    // An app link (cursor://, vscode:), so the browser hands it to the app.
    <ButtonLink className="self-start" to={href} reloadDocument>
      <Sparkles data-icon="inline-start" /> {label}
    </ButtonLink>
  )
}

function KeyList() {
  const tokens = useApiTokens()
  const revoke = useRevokeApiToken()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your keys</CardTitle>
        <CardDescription>Revoke a key to disconnect the app using it right away.</CardDescription>
      </CardHeader>
      <CardContent>
        {tokens.isError ? (
          <ErrorState error={tokens.error} onRetry={() => tokens.refetch()} retrying={tokens.isFetching} />
        ) : tokens.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : tokens.data.length === 0 ? (
          <EmptyState icon={KeyRound} title="No keys yet" description="Create one above to connect Claude." />
        ) : (
          <ul className="flex flex-col divide-y">
            {tokens.data.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{token.name}</span>
                  <Caption>
                    <span className="font-mono">{token.prefix}…</span> · created {formatDateTime(token.created_at)} ·{' '}
                    {token.last_used_at ? `last used ${formatDateTime(token.last_used_at)}` : 'never used'}
                  </Caption>
                </div>
                <ConfirmDialog
                  trigger={<Button variant="ghost" size="sm" />}
                  triggerLabel="Revoke"
                  title={`Revoke “${token.name}”?`}
                  description="Any app using this key loses access to Slacker right away. You can create a new key any time."
                  confirmLabel="Revoke key"
                  onConfirm={() => revoke.mutateAsync(token.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

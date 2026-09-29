/**
 * Connection snippets for the MCP server (backend app/mcp/). Each assistant
 * takes the same two things — the server URL and the personal key — in its
 * own format. Without a key yet, snippets show KEY_PLACEHOLDER.
 */

export const SERVER_NAME = 'slacker'
export const KEY_PLACEHOLDER = 'YOUR_KEY'

const authHeader = (key: string) => `Bearer ${key}`

/** Claude Code: one terminal command. */
export function claudeCodeCommand(url: string, key: string) {
  return `claude mcp add --transport http ${SERVER_NAME} ${url} --header "Authorization: ${authHeader(key)}"`
}

/**
 * Claude Desktop config (Settings → Developer → Edit Config). Desktop reads
 * local servers from this file, so `mcp-remote` bridges to our HTTP server.
 * The header goes through an env var because Windows mangles spaces in args.
 */
export function claudeDesktopConfig(url: string, key: string) {
  return JSON.stringify(
    {
      mcpServers: {
        [SERVER_NAME]: {
          command: 'npx',
          args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${SLACKER_AUTH}'],
          env: { SLACKER_AUTH: authHeader(key) },
        },
      },
    },
    null,
    2,
  )
}

/** Cursor's one-click install link. */
export function cursorInstallLink(url: string, key: string) {
  const config = { url, headers: { Authorization: authHeader(key) } }
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER_NAME}&config=${btoa(JSON.stringify(config))}`
}

/** VS Code's one-click install link. */
export function vscodeInstallLink(url: string, key: string) {
  const config = { name: SERVER_NAME, type: 'http', url, headers: { Authorization: authHeader(key) } }
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(config))}`
}

export const EXAMPLE_PROMPTS = [
  'Which tickets breached their SLA this week, and who owns them?',
  'Who has the most open tickets right now?',
  'Compare tickets created and resolved over the last 8 weeks.',
  'Summarise what happened on ticket 1042.',
  'Which categories take longest to resolve?',
]

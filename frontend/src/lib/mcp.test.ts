import { describe, expect, it } from 'vitest'
import { claudeCodeCommand, claudeDesktopConfig, cursorInstallLink, vscodeInstallLink } from '@/lib/mcp'

const SERVER_URL = 'http://localhost:8000/mcp'
const KEY = 'slk_abc'

describe('MCP connection snippets', () => {
  it('Claude Code command adds an HTTP server with the key header', () => {
    expect(claudeCodeCommand(SERVER_URL, KEY)).toBe(
      'claude mcp add --transport http slacker http://localhost:8000/mcp --header "Authorization: Bearer slk_abc"',
    )
  })

  it('Claude Desktop config bridges with mcp-remote and passes the key via env', () => {
    const config = JSON.parse(claudeDesktopConfig(SERVER_URL, KEY))
    expect(config.mcpServers.slacker).toEqual({
      command: 'npx',
      args: ['-y', 'mcp-remote', SERVER_URL, '--header', 'Authorization:${SLACKER_AUTH}'],
      env: { SLACKER_AUTH: 'Bearer slk_abc' },
    })
  })

  it('Cursor link carries base64 config with url and header', () => {
    const link = new URL(cursorInstallLink(SERVER_URL, KEY))
    expect(link.searchParams.get('name')).toBe('slacker')
    expect(JSON.parse(atob(link.searchParams.get('config')!))).toEqual({
      url: SERVER_URL,
      headers: { Authorization: 'Bearer slk_abc' },
    })
  })

  it('VS Code link carries the encoded server definition', () => {
    const link = vscodeInstallLink(SERVER_URL, KEY)
    expect(link.startsWith('vscode:mcp/install?')).toBe(true)
    expect(JSON.parse(decodeURIComponent(link.split('?')[1]))).toEqual({
      name: 'slacker',
      type: 'http',
      url: SERVER_URL,
      headers: { Authorization: 'Bearer slk_abc' },
    })
  })
})

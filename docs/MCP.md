# Connect AI assistants (MCP)

Slacker runs an [MCP](https://modelcontextprotocol.io) server so people can
ask Claude (or Cursor, VS Code…) about tickets in plain words: "which tickets
breached SLA this week, and who owns them?"

- **Where:** `POST /mcp` on the backend (Streamable HTTP, stateless, JSON
  responses). Built on the official MCP Python SDK (`mcp`, `MCPServer`).
- **What:** read-only tools that call the same services as the dashboard, so
  answers match it exactly. Every tool is marked `readOnlyHint`.
- **Who:** each request carries a personal key (`Authorization: Bearer slk_…`)
  and acts as that key's owner ("me" in filters).

## Tools

| Tool | What it returns |
|---|---|
| `whoami` | The person the connection acts as |
| `list_reference_data` | Exact team, category, people, tag, status and priority names |
| `search_tickets` | One page of tickets plus the total, filtered by text, state (ongoing/done), status, priority, team, category, pending on, support owner, SLA, created dates; sortable |
| `get_ticket` | One ticket in full, with parent/sub-issues, links and its timeline |
| `get_summary` | The Dashboard's numbers |
| `get_breakdown` | Counts by team, category, priority, or who tickets are pending on |
| `get_weekly_trends` | Created, resolved, median resolution hours and SLA breaches per week |

Filters take names, not ids; an unknown name answers with the valid ones.

## Keys

People create keys on the **Connect Claude** page (`/connect`). A key is
shown once; only its SHA-256 hash is stored (`api_tokens`). Up to 10 active
keys per person; revoking one cuts access immediately. `last_used_at` is
updated at most every 5 minutes.

The page builds each app's setup from the key: a Claude Desktop config
(bridged with `mcp-remote`), a Claude Code command, and one-click install
links for Cursor and VS Code.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_API_URL` | `http://localhost:8000` | Where assistants reach the backend. The MCP URL shown on the Connect page is this plus `/mcp`, and its host is the only one (besides localhost) `/mcp` accepts |
| `PUBLIC_APP_URL` | `http://localhost:5173` | Dashboard address, for ticket links in results |

## Next: Claude.ai with one-click sign-in

Claude.ai (web and mobile) connects to remote servers with OAuth, not pasted
keys. Once Slacker is hosted with real sign-in (Slack or Google), add an
OAuth authorization server (the SDK's `auth_server_provider`) so people add
Slacker under Claude → Settings → Connectors and sign in, with no key. Claude
needs: a `401` with `WWW-Authenticate: Bearer resource_metadata=…`, protected
resource metadata, Dynamic Client Registration or a Client ID Metadata
Document, PKCE S256, and the redirect `https://claude.ai/api/mcp/auth_callback`
(see Claude's [connector authentication docs](https://claude.com/docs/connectors/building/authentication)).

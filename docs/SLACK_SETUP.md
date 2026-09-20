# Slack App Setup

Official docs referenced throughout: [Bolt for Python](https://tools.slack.dev/bolt-python/),
[Block Kit](https://api.slack.com/block-kit), [Events API](https://docs.slack.dev/apis/events-api/),
[OAuth scopes](https://docs.slack.dev/reference/scopes), [Socket Mode vs HTTP](https://docs.slack.dev/apis/events-api/comparing-http-socket-mode/).

## 1. Create the Slack app

Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**. Pick your
development workspace.

## 2. OAuth & Permissions — Bot Token Scopes

Under **OAuth & Permissions**, add these Bot Token Scopes:

| Scope | Why |
|---|---|
| `chat:write` | Post and update the ticket message (`chat.postMessage` / `chat.update`) |
| `commands` | The `/create-ticket` slash command |
| `users:read` | Resolve a Slack user id to their name/profile (`users.info`) |
| `users:read.email` | Match a Slack user to an internal `User` row by email |
| `channels:history` | Receive `message` events for thread replies in public channels the bot is in |
| `groups:history` | Same, for private channels (only if you'll post tickets into a private channel) |

## 3. Event Subscriptions

Under **Event Subscriptions**:
1. Turn **Enable Events** on.
2. **Request URL**: `https://<your-public-host>/slack/events` — this is the
   single endpoint the whole app uses (Bolt dispatches events,
   interactions, and slash commands from the same URL based on payload
   shape). Slack will send a `url_verification` challenge here; the app
   must already be running and reachable for this to succeed.
3. Under **Subscribe to bot events**, add `message.channels` (and
   `message.groups` if using private channels). This is how thread replies
   are detected for first-response tracking (spec section 6).

## 4. Interactivity & Shortcuts

1. Turn **Interactivity** on.
2. **Request URL**: same `https://<your-public-host>/slack/events`.
3. Under **Shortcuts**, add a **Global Shortcut**:
   - Name: `Create Ticket`
   - Callback ID: `create_ticket` (must match exactly — this is how
     `backend/app/slack/bolt_app.py` recognizes it)

## 5. Slash Commands

Add a command:
- Command: `/create-ticket`
- Request URL: same `https://<your-public-host>/slack/events`
- Short description: "Create a support ticket"

## 6. Socket Mode vs HTTP (choose one for now)

**Production / anything with a public URL: use HTTP** (steps above — this
is what `docker-compose`/AWS deployment uses, no extra setup). See
`docs/ARCHITECTURE.md` for why HTTP is recommended over Socket Mode at
this scale.

**Local development without a public URL**: enable **Socket Mode** under
**Socket Mode** in the left nav, generate an **App-Level Token** with the
`connections:write` scope (starts with `xapp-`), put it in `SLACK_APP_TOKEN`,
set `SLACK_USE_SOCKET_MODE=true`, and run:
```bash
cd backend && python -m app.slack.socket_mode
```
instead of relying on the `/slack/events` HTTP route. You can skip the
Event Subscriptions/Interactivity Request URL fields entirely in this mode
— Socket Mode delivers everything over the open WebSocket connection.

## 7. Install the app

**OAuth & Permissions** → **Install to Workspace** → Allow. Copy the
generated **Bot User OAuth Token** (`xoxb-...`) into `SLACK_BOT_TOKEN`.
Copy the **Signing Secret** from **Basic Information** into
`SLACK_SIGNING_SECRET` — every request is verified against this (see
`app.slack.bolt_app`'s signature verification, handled by Bolt itself).

> V1 does not implement the OAuth *install* callback endpoint — a single
> internal company workspace installs the app once, manually, via the
> button above. Multi-workspace OAuth is out of scope (spec section 20/26).

## 8. Configure channels

1. Invite the bot to your ticket channel(s): `/invite @YourAppName` in Slack.
2. In the database, add a row to `slack_channels` for the default channel
   (`is_default = true`, `team_id = NULL`) and optionally one row per team
   that should route elsewhere (`team_id` set, `is_default = false`) — or
   set `SLACK_DEFAULT_CHANNEL_ID` as a simpler single-channel fallback.

## 9. Test the integration

With the backend running and reachable at your Request URL:

1. **Ticket creation (Slack → dashboard)**: run `/create-ticket` in Slack,
   fill the modal, submit. A structured ticket message should post in the
   configured channel, and the ticket should appear in the dashboard's
   Tickets page immediately.
2. **Ticket creation (dashboard → Slack)**: create a ticket from the
   dashboard with "Create & push to Slack" — same message should appear.
3. **Assign**: click **Assign** on the ticket message → pick a user in the
   modal → the message updates to show the new owner, and the dashboard
   ticket detail's timeline shows an "Assigned to …" entry.
4. **Reassign**: click **Assign** again with a different user → timeline
   shows "Reassigned to X (from Y)".
5. **Status change**: click **Status** → pick a value → message and
   dashboard both update.
6. **Priority change**: click **Priority** → pick a value.
7. **Resolve**: click **Resolve** → confirm in the dialog → status becomes
   Resolved, `resolved_at` is stamped, message updates.
8. **First response tracking**: reply in the ticket's Slack thread → the
   ticket's `first_response_at` should be set (visible on the ticket detail
   page) without the reply's text ever being stored in the database.

# modulo

A proof of concept for a Slack agent that encourages respectful communication through educational reactions and statistics shared publicly within the community.

## Documentation

- [POC requirements](docs/requirements.md): confirmed scope, expected behavior, acceptance criteria, and open decisions.
- [Development instructions](AGENTS.md): guidance for Codex and other coding agents.

## Local startup

Prerequisites: Node.js 24 or later, npm, Slack CLI connected to the workspace, and an OpenAI API key. The local Modulo app is installed in `contrevent-groupe` (`T0APQ2W08CX`, app `A0C1JBDNW3E`). Local CLI credentials remain in `.slack/`, which Git ignores.

```sh
npm ci
cp .env.example .env
```

Do not copy `.env.example` over an existing `.env`. Set `OPENAI_API_KEY` without publishing it. Keep `EDUCATION_BASE_URL=https://modulo.contre-vent.ca` to use the deployed educational pages. For another deployment, supply a publicly accessible HTTPS origin serving those pages. The local listener at `http://127.0.0.1:3000` is only an HTTP development server; it is not a valid `EDUCATION_BASE_URL` and requires an HTTPS tunnel or proxy if used for Slack links. Set `MODULO_ENABLED=true` when the public HTTPS address is ready.

```sh
slack manifest validate --team T0APQ2W08CX
slack run --team T0APQ2W08CX
```

Slack CLI supplies the bot and Socket Mode tokens to the process. To run `npm start` directly, set `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` yourself. Signing in through the CLI alone does not add these tokens to `.env`.

Startup verifies the token's workspace, joins internal public channels, and records their activation dates. The bot responds only to new human text messages received after that date. New channels are discovered through events and periodic checks. Editing or deleting source messages does not change the initial results.

The local process must remain running. `Ctrl+C` stops it. A lock prevents two Modulo processes from using the same database simultaneously. Keep `data/modulo.sqlite` between runs: deleting it erases statistics and activation boundaries.

## Slack commands

Use these in a monitored public channel; the results will be public there:

```text
/modulo c
/modulo c #general
/modulo u
/modulo u @person
/modulo u 2026-09
/modulo c #general 2026-09
```

`u` without a target lists all observed users; `c` without a target lists all monitored channels. Select names from Slack's suggestions to target a person or channel. The current month is used by default. `/modulo` alone continues to list channels; older commands (`utilisateur`, `utilisateurs`, `canal`, `canaux`, and their English equivalents) remain compatible.

Reports and command feedback default to English; their language is not derived from a Slack setting. Educational explanations still follow the message's language. Monthly reports publish statistics for all monitored channels and observed users in the general channel, with up to three medals per ranking. A medal requires 20 analyzed messages. The timezone is read from the installer's account (`SLACK_TIMEZONE_USER_ID`), falling back to Montréal; `REPORT_TIMEZONE` provides an explicit override.

## Verification

```sh
npm run check       # TypeScript and tests without real Slack or OpenAI calls
npm run evaluate    # Real OpenAI evaluation, fictional examples, API charges apply
npm run status      # Local diagnostics without message text or secrets
npm run education   # Educational pages only, to prepare HTTPS before starting the bot
```

`npm run education` and the bot use the same port; stop the former before starting the latter. The HTTP server provides only `/education/fr/<category>`, `/education/en/<category>`, and `/health`. It exposes no statistics, keys, or Slack text. It can be published behind an HTTPS proxy or tunnel. A temporary tunnel URL stops working when the tunnel stops.

The evaluation set is versioned in `evals/cases.json`. Results from the latest run are stored in `eval-results/latest.json` (ignored by Git). The analysis model is configurable; GPT-6 Astra low is the initial baseline, independent of the Codex setting.

## Educational pages on Vercel

Stable address: [modulo.contre-vent.ca](https://modulo.contre-vent.ca). This deployment publishes only generic educational pages; the bot and SQLite remain local.

To update the pages:

```sh
npm run build:education
# If the generated directory is not already linked to this project:
vercel link --yes --project modulo --scope contre-vent --cwd dist/education
vercel deploy --prebuilt --prod --yes --scope contre-vent --cwd dist/education
```

The build produces only HTML pages and routing configuration in `dist/education/.vercel/output`. No secrets or database files are included. Automatic Git integration for the educational site is disabled; if the CLI recreates it during another `link`, disconnect it with `vercel git disconnect --scope contre-vent --cwd dist/education`.

The Vercel project is now named `modulo`. The domain association for `modulo.contre-vent.ca` is tracked in the [deployment documentation](docs/deployment.md).

## POC behavior and limitations

- SQLite stores the received message queue, classifications, and pending deliveries. Repeated events are not counted again.
- Received text and suggested rephrasings are purged locally after 30 days; categories and statistics remain. This purge does not delete messages posted in Slack or configure the AI provider's retention policy.
- The score includes neutral messages; indeterminate messages, failures, and pending analyses appear separately. Reports measure observed messages, not people's worth.
- Private channels, Slack Connect, bots, system messages, files, and emoji-only messages are excluded. A channel that becomes private or inaccessible is suspended.
- Messages missed while the process is stopped are not recovered. The local queue resumes on restart; no earlier history is imported. Displayed coverage indicates observation boundaries, not a guarantee that every message was received.
- Monthly reports become due on the first at 9 a.m. If the process is stopped at that time, the previous month is published at the next scheduler pass within the current month. Older months remain available on demand.
- Classification calls and reactions have limited retries. If the response to a Slack post is lost, its delivery is marked `uncertain` to prevent duplicate posts. Check `npm run status`; an uncertain delivery may require technical investigation.
- Processing is sequential for this POC. Volumes above analysis capacity will create a backlog; no production latency target is specified.

See the [implementation tracker](docs/implementation-plan.md) for completed checks and startup steps.

## Documentation convention

The project uses a lightweight Markdown specification with stable identifiers and verifiable criteria. This is a project convention, not a requirements format imposed by Codex.

`AGENTS.md` contains working instructions and references the specification. It is not the prompt for the moderator running in Slack. Future prompts and evaluation sets will be versioned with the code.

Reference: [AGENTS.md instructions in the official OpenAI documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

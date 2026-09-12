# POC implementation plan

Date: 2026-09-12. Functional source: [requirements](requirements.md).

1. **Foundations**: TypeScript, taxonomy, deterministic calculations, persistence, and isolated tests.
2. **Slack and analysis**: app configuration, public channels, durable events, structured French/English classification, reactions, and explanations.
3. **Reports and education**: commands, monthly periods, rankings, bilingual educational pages, and scheduler.
4. **Verification and startup**: functional tests with simulated Slack, AI evaluations, live configuration, and operational documentation.

Open behavior in the requirements must be confirmed before implementation. Independent foundational work can proceed while these points are clarified.

Slack CLI verified: v4.7.0; connected workspace `contrevent-groupe` (`T0APQ2W08CX`). Local installation is complete; activation is tracked below.

## Completed work

- [x] TypeScript, taxonomy, scoring, and SQLite with persistence tests.
- [x] Slack Bolt/Socket Mode adapter, internal public channel discovery, and processing queue.
- [x] Structured OpenAI classification, reactions, and bilingual explanations.
- [x] Four report scopes, Slack account timezone, and medals starting at 20 messages.
- [x] Integration tests with simulated Slack, without posting test messages to the company workspace.
- [x] Manifest validated by Slack; **Modulo (local)** app installed, ID `A0C1JBDNW3E`.
- [x] Static pages published at [modulo.contre-vent.ca](https://modulo.contre-vent.ca), Vercel production, status READY.
- [x] Vercel project renamed to `modulo`, Cloudflare CNAME created for the subdomain, domain and HTTPS verified.
- [x] Bot started and monitored channels verified on 2026-09-12, after explicit authorization from the owner.
- [x] Live Slack testing: reactions, educational thread replies, and an English user report observed during the owner's tests.

## Verification results

- `npm run check`: 26 tests pass and TypeScript reports no errors, including all four short-command scopes and English reports.
- `npm run evaluate`: 18/18 fictional examples passed with GPT-6 Astra low, prompt version `modulo-poc-1`. This is a small baseline set, not an estimate of real-world accuracy.
- Anonymous HTTP requests to the Vercel homepage and French/English educational pages returned 200; `/.env` and `/reports` returned 404.
- Vercel deployment: `dpl_8itHvdzgBMEk5CPvkZFfurxqmvcX`, static HTML pages without functions or Slack data.
- The Git integration automatically created by Vercel was removed from the educational site project. Pushing code will not deploy the local bot to Vercel.

## Activation

On 2026-09-12, the owner explicitly authorized sending new internal public messages and up to 10 context messages to OpenAI, followed by automatic reactions and explanations in Slack. This authorization allowed startup after the initial automatic approval review rejection.

Startup confirmed the connection to `T0APQ2W08CX`, monitoring of 6 internal public channels, and the Slack timezone `America/New_York`. The local health endpoint returned `ok`. At the initial check, no messages had been received and no deliveries had failed. Subsequent testing in Slack confirmed heart and orange-circle reactions, educational thread replies, and an English user statistics report. These observations verify the tested flows, not overall classification accuracy.

Vercel hosts only the generic educational pages. The Slack process and SQLite database remain local, as confirmed for the POC. Future permanent operation will require a suitable host or an architectural change.

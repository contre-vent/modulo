# Requirements — Modulo Slack POC

Date: 2026-09-12. Source: decisions made with the owner during the scoping conversation.
Status: POC implemented; startup decisions are incorporated below. Verification and startup status are recorded in the [implementation tracker](implementation-plan.md).

## 1. Purpose and terminology

Modulo raises awareness of written communication quality within the community: it recognizes positive contributions, explains inappropriate wording, and produces statistics.

This is an educational and statistical proof of concept. A result describes an observed message without claiming to measure its author's worth. A negative emotion or disagreement alone does not constitute inappropriate behavior.

- **Confirmed**: a requirement confirmed by the owner.
- **Proposal**: a suggested approach to meeting the requirements, with technical details still to be determined.
- **Open**: behavior or a parameter that has not been settled; request confirmation before implementing it.

The criteria below describe expected outcomes; they do not represent tests that have already passed.

## 2. Confirmed scope

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| SCOPE-01 | One company: the contre-vent Slack workspace. | The bot and reports are associated with this workspace. |
| SCOPE-02 | Monitor all accessible public channels, rather than the 2 or 3 initially considered. | Existing public channels are discovered and joined with appropriate permissions; an inaccessible channel is identified as not covered. |
| SCOPE-03 | Support new public channels. | A new public channel is monitored after the bot effectively joins it. |
| SCOPE-04 | No history before activation in each channel. | A message predating activation is not classified, annotated, or counted; this boundary persists across restarts. |
| SCOPE-05 | Exclude private channels and direct messages from analysis. | Their messages do not contribute to annotations or statistics. |
| SCOPE-06 | No human validation or reporting, appeal, or review process. | Analysis and interventions run automatically without an approval queue or appeal button. |
| SCOPE-07 | Education only: never remove or change a user's message. | The bot adds reactions and its own explanations; it does not delete or rewrite the source message. |

The restriction on direct messages concerns analysis. The command interface for requesting reports remains to be defined.

## 3. Analysis and taxonomy

| ID | Confirmed requirement | Acceptance criterion |
| --- | --- | --- |
| CLASS-01 | Identify positive, negative, and neutral messages. | Classifications are stored and available for reporting. |
| CLASS-02 | Consider available context for ambiguous wording. | Sarcasm, condescension, and passive-aggressive examples are included in the evaluation set; retrieving history from before activation is not required. |
| LANG-01 | French and English. | Both languages have evaluation examples and educational text; mixed-language messages are also evaluated. |
| LANG-02 | Adapt explanations to the message's language. | Straightforward French and English cases receive an explanation in the corresponding language. The language for mixed-language messages remains to be specified. |

### Negative categories

The working taxonomy established during scoping includes:

| Category | Operational definition |
| --- | --- |
| Aggression, insults, and disparagement | Personal attacks, humiliation, or hostile wording directed at someone. |
| Threats and intimidation | Coercive pressure, threats of retaliation, or attempts to silence someone. |
| Harassment and repeated targeting | Signs of repeated hostile behavior; distinguish an observed indicator from a conclusion about a person. The context window is still open. |
| Discrimination and hate speech | Disparagement or exclusion targeting an identity or group. |
| Sexualized compliments or intrusive comments | Sexualization, inappropriate comments about someone's body, or persistent advances. This is the confirmed meaning of "indecent flattery." |
| Condescension | Infantilization, contemptuous superiority, or belittling compliments. Explicitly added by the owner. |
| Contempt and targeted sarcasm | Ridiculing a person, including under the guise of humor. |
| Passive aggression | Indirect reproaches or belittling wording whose context supports that interpretation. |

**Example explicitly provided by the owner (CLASS-03)**: "You look very pretty in your short, sexy little dress; you should wear it more often" must be recognized as a negative sexualized compliment, not a positive compliment. Original French wording: « Tu es très jolie dans ta petite robe courte et sexy, tu devrais la porter plus souvent ».

Excessive flattery toward a superior is not, in itself, a confirmed negative category.

### Positive categories

- Thanks and recognition of help.
- Encouragement and positive reinforcement.
- Respectful compliments about a contribution, idea, or work.
- Mutual support and empathy.
- Constructive feedback and respectful disagreement accompanied by useful information.
- Repair: apologies, acknowledging a mistake, or efforts to defuse conflict.
- Inclusion and giving others credit.

### Edge cases

- "I feel discouraged," a respectful refusal, or factual criticism are not negative for moderation purposes by default.
- "Thanks, finally something intelligent" must not receive a positive classification merely because it contains "thanks."
- A message combining positive and negative content counts as **negative**. **Indeterminate** messages remain unannotated and are counted separately, outside the score.
- An analysis failure is not equivalent to a neutral message.
- These examples support scoping and the future evaluation set; model accuracy has not yet been measured.

## 4. Slack interventions

| ID | Confirmed requirement | Acceptance criterion |
| --- | --- | --- |
| UI-01 | Publicly identify positive messages with a reaction, such as a heart. | A bot reaction is visible on a message classified as positive. The exact emoji remains open. |
| UI-02 | Publicly identify negative messages with a visual reaction. | A bot reaction is visible on a message classified as negative, without prior validation. |
| UI-03 | Provide an educational explanation linking to an informational page. | A bot reply in the thread explains the wording, how to avoid it in the future, and provides a link members can open. |
| UI-04 | Suggest an immediate correction to the author. | The bot suggests a rephrasing; the author alone remains responsible for editing their text. |
| UI-05 | Present an educational interpretation of the message. | The explanation addresses the wording and guideline without labeling the author's personality. |

Platform constraints checked during scoping: reactions and thread replies are feasible; the bot cannot edit a colleague's message through `chat.update`. Arbitrary recoloring, injected badges, or custom tooltips on the original message are not promised for the POC. A link or button in the bot's message is the proposed solution.

## 5. Statistics and access

| ID | Confirmed requirement | Acceptance criterion |
| --- | --- | --- |
| STAT-01 | Keep statistics per user and channel. | Each report presents counts and percentages for the observed scope and period. |
| STAT-02 | Include neutral messages in the denominator. | 30 positive, 5 negative, and 65 neutral messages yield 30% positive, 5% negative, and 25 points. |
| STAT-03 | Calculate the score as the difference between percentages. | For an eligible denominator N greater than zero: score = 100 × (P − M) / N, where P is positive and M is negative. |
| ACCESS-01 | All individual and collective statistics are public within the authenticated Slack community. | An authenticated member can view another person's or monitored channel's positive and negative results; no HR role is required. |
| ACCESS-02 | "Public" means within the Slack community, not on the Internet. | An unauthenticated request or a request from outside the workspace does not grant access to statistical data. |

Human text messages, including thread replies, are eligible. Bots, system messages, messages with files, and emoji-only messages are excluded. Edits and deletions by the author do not change the initial result or statistics. Indeterminate messages and analysis failures are excluded from the denominator and shown separately. Neutral messages are included.

## 6. Reports and medals

| ID | Confirmed requirement | Acceptance criterion |
| --- | --- | --- |
| REPORT-01 | On the first of each month at 9 a.m., produce individual and channel statistics for the previous month. | Use the Slack installer's account timezone, falling back to America/Toronto; the report explicitly states the period and timezone. |
| REPORT-02 | Publish a summary of all monitored channels and observed users in #general. | The summary provides access to individual and collective statistics, not just winners. Details may be split across messages if Slack limits require it. |
| REPORT-03 | Award gold, silver, and bronze to three channels by descending score. | Apart from ties and low-participation cases still to be decided, the highest score receives gold. |
| REPORT-04 | Award gold, silver, and bronze to three people using the same formula. | Apart from open cases, medal order matches descending scores. |
| REPORT-05 | Produce an on-demand partial report for all channels, one channel, all users, or one user. | `/modulo u` and `/modulo c` list all users or channels; an optional Slack mention targets a person or channel. The optional month uses `YYYY-MM`, defaulting to the current month. |
| REPORT-06 | Reports and command feedback default to English. | Titles, rows, coverage, score explanations, empty states, help, and command errors are in English. Language is not currently derived from any Slack setting; timezone is still derived from the installer's account. |

A channel's score is calculated from its message counts; a person's score is calculated from their messages in monitored channels. Medals require **20 analyzed messages** (positive, negative, or neutral) during the period. Ties are broken by descending analyzed message count, then ascending Slack ID. If fewer than three candidates qualify, only qualifying candidates receive a medal. There is no score without an analyzed message. No additional severity penalty applies.

Reports default to English at the owner's request; the initial French text was hardcoded, without a Slack setting. Educational explanations continue to follow the message's language (LANG-02).

`/modulo u`, `/modulo u @person`, `/modulo c`, and `/modulo c #channel` accept an optional `YYYY-MM` month; the current month is the default. Names must be selected from Slack suggestions to provide an unambiguous mention; Slack IDs remain accepted. With no arguments after `/modulo`, the all-channels report is preserved. Older French and English commands remain compatible aliases. The command is used in a monitored public channel, and the report is published there. A workspace member can view another member's statistics.

## 7. Technical direction

Proposed architecture: Slack events → receipt → processing queue → contextual classification → deterministic rules → persistence, reactions, and reports.

- TypeScript and Slack Bolt for integration.
- SQLite in a file, confirmed to simplify the local POC; PostgreSQL is not required.
- OpenAI API with structured output; configurable model, with GPT-6 Astra at low reasoning effort as the initial evaluation baseline, separate from the development model.
- Asynchronous processing and a scheduler for monthly reports.
- No web portal in the initial scope. Bilingual educational pages can be served by the application or exported as static pages; they are published at https://modulo.contre-vent.ca. No statistics are exposed over HTTP.
- No AG-UI/CopilotKit in the initial POC: potentially useful for a future portal, with no established benefit for the native Slack interface.
- Ambiguous.ai is explicitly excluded for now.
- GPT-6 Astra High was recommended for development in Codex; this does not select the model that analyzes messages.
- Slack CLI v4.7.0 verified, connected to `contrevent-groupe` (`T0APQ2W08CX`). Local app `A0C1JBDNW3E` installed with a validated manifest.
- Socket Mode, one local process, and context from the last 10 observed messages in the channel or thread. No history predating activation is downloaded.
- Local retention of message text and rephrasings for 30 days; categories and statistics retained during the POC. This does not delete messages already posted in Slack.
- Confirmed reactions: heart (`heart`) and orange circle (`large_orange_circle`).

### Proposed technical reliability criteria

- TECH-01: repeated delivery of an event does not duplicate statistics or bot interventions.
- TECH-02: the bot does not react to its own explanations or reports in a loop.
- TECH-03: score and period calculations are deterministic and testable without a model.
- TECH-04: received messages are data to analyze, never instructions authorizing tool execution or rule changes.
- TECH-05: tokens remain on the service side; model outputs are validated before use.
- TECH-06: restarts preserve activation boundaries and report data; retrying a report avoids duplicates.

## 8. Open decisions

Decisions confirmed during startup replace the corresponding scoping questions. Technical limitations are not promises of additional functionality.

| ID | Decision |
| --- | --- |
| OPEN-01 | Resolved: mixed content counts as negative; indeterminate content remains unannotated and outside the score. No model-declared numerical confidence threshold. |
| OPEN-02 | Resolved: retain the initial result after editing or deletion. |
| OPEN-03 | Resolved: human text and replies; exclude bots, system messages, files, and emoji-only messages. |
| OPEN-04 | Resolved: minimum 20, no minimum number of days, volume then identifier for ties, at most three medals, no score for zero messages. |
| OPEN-05 | Resolved: 9 a.m. in the installer's account timezone, falling back to Montréal; English by default; `/modulo u` and `/modulo c` with an optional target and the current or a selected month. |
| OPEN-06 | Resolved: 10 context messages, text retained for 30 days, statistics retained during the POC. |
| OPEN-07 | Confirmed baseline: local, SQLite, Socket Mode, configurable OpenAI. Maximum budget and permanent hosting are undefined. |
| OPEN-08 | Heart/orange reactions and bilingual educational pages confirmed. Pages deployed at https://modulo.contre-vent.ca following the owner's preference for Vercel. Initial mixed-language convention: dominant language, French in a tie. |
| OPEN-09 | Slack Connect excluded. Archived channels and channels that become private or inaccessible are suspended. A workspace account (including a local guest) can request a report from a monitored public channel; an external participant cannot access it. |
| OPEN-10 | Initial evaluation using fictional examples; accuracy and latency targets to be measured during the pilot, without a stated numerical guarantee. |
| OPEN-11 | Persistent local queue, resumption of received events, and limited retries. No recovery of messages missed during downtime. An ambiguous Slack delivery is marked uncertain and is not blindly reposted. |

## 9. Future validation

- Deterministic tests: periods, scores including neutral messages, access, scope, activation boundaries, duplicates, recovery, and loop prevention.
- Bilingual AI evaluations: positive, negative, neutral, and ambiguous examples; track false positives and false negatives by category/language. Tests must not claim to guarantee every human interpretation.
- Slack verification: channel discovery, observation of a new message, reaction, explanation, educational link, and all four report scopes.
- A simulated month change will verify monthly reports without waiting for the first of the month.
- Link results to this document's identifiers and record observed limitations.

## 10. Technical references from scoping

- [Slack Events API](https://docs.slack.dev/apis/events-api/)
- [Slack reactions.add](https://docs.slack.dev/reference/methods/reactions.add/)
- [Slack chat.update](https://docs.slack.dev/reference/methods/chat.update/)
- [Slack chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage/)
- [Slack buttons with links](https://docs.slack.dev/reference/block-kit/block-elements/button-element/)
- [Slack Bolt for JavaScript](https://docs.slack.dev/tools/bolt-js/)
- [AG-UI and CopilotKit](https://docs.copilotkit.ai/ag-ui/introduction)

These references explain technical capabilities; the product decisions are those in this document. Recheck the APIs when implementing.

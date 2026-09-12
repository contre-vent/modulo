# Copilot review assessment — PR #1

Reviewed against `main` after the documentation translations, on branch `fix/copilot-review`.
Source: [Copilot review on merged PR #1](https://github.com/contre-vent/modulo/pull/1). The review contains three inline threads and five additional findings in its summary. Scope: relevant fixes that preserve agreed behavior.

## Applied

- **Stale process-lock recovery race (TECH-01/06).** Multiple starters could read the same dead PID and unlink a replacement lock. Acquisition and recovery now run under an exclusive SQLite transaction in a separate `.lock.sqlite` file held for the worker's lifetime. The PID check remains compatible with an already running older worker. The guard file is retained; closing the connection or terminating the process releases its OS lock. The application's data database is unaffected. A repeated release cannot remove a later owner's PID file.
- **Education URL instructions.** The README now explicitly uses `https://modulo.contre-vent.ca`, distinguishes the local HTTP listener, and explains the HTTPS tunnel/proxy option. Configuration validation and deployed URLs are unchanged.

## Not applied

| Finding | Assessment |
| --- | --- |
| Read `is_ext_shared_channel` from the inner message event instead of `body` | Incorrect for the documented Events API payload. Slack places this flag on the outer event callback. The installed Bolt Socket Mode receiver passes the callback payload as `body`, matching the existing code. Moving the check would weaken the exclusion. Existing directory checks before analysis and delivery remain in place. |
| Reject nonempty suggestions on neutral/indeterminate classifications | Relevant to the prompt contract, but tightening validation would reject responses currently accepted and can cause retries or change failed/indeterminate statistics. Deferred under the no-behavior-change constraint. Such suggestions are not posted because those verdicts receive no annotation. |
| Bound or truncate the target message text | A resource concern, but truncation changes classification input and could remove the problematic part of a message. A limit and overflow policy need a separate product decision. |
| Accept `thread_broadcast` messages | These can be human replies, so the concern is relevant to the intended scope. Accepting the subtype changes which messages are analyzed and counted. Deferred rather than expanding current intake in this branch. |
| Accept punctuation-only messages | The current text filter excludes these as well as emoji-only messages. Changing it would expand classification and statistics inputs. Deferred pending a separate behavior decision. |
| Move initial channel discovery before `app.start()` | Startup can miss messages before registration. Simply swapping the calls records activation before Socket Mode is receiving, creating a different gap; it does not establish reliable coverage. Buffering or redefining activation requires a separate lifecycle change. No startup order change is included. |

## Evidence and validation

- [Slack Events API: callback fields](https://docs.slack.dev/apis/events-api/) documents `is_ext_shared_channel` on the outer callback object. Verified against the installed Bolt receiver's mapping from `args.body` to `ReceiverEvent.body`.
- [SQLite transactions](https://sqlite.org/lang_transaction.html) documents exclusive transaction acquisition. A dedicated guard database avoids holding a write transaction on the statistics database.
- The concurrency regression test pauses each starter after a stale PID read. Against the original implementation, three of four workers acquired the lock; the fixed implementation permits exactly one.
- Additional checks cover recovery after an abrupt worker exit, existing live PID files, invalid PID files, and repeated release.
- `npm run check`: TypeScript and 28 tests pass without real Slack or OpenAI calls.

No classification rules, message filters, report calculations, commands, or runtime settings are changed. The running bot is not restarted as part of this review.

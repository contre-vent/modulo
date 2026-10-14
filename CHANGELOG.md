# Changelog

## 0.1.0 — In preparation

- Implemented the Modulo Slack POC: internal public channel events, French and English analysis, reactions, and educational pages.
- Public statistics, the `/modulo` command, monthly reports, and medals for at least 20 analyzed messages.
- Reports and command feedback default to English; short commands `/modulo u [@person] [YYYY-MM]` and `/modulo c [#channel] [YYYY-MM]`, with older aliases preserved.
- SQLite, persistent activation boundaries, a processing queue, duplicate prevention, and 30-day text retention.
- Deterministic tests and an initial set of 18 fictional examples for evaluating classification.
- Static educational pages deployed on Vercel at `https://modulo.contre-vent.ca`, with a subdomain configured through Cloudflare.
- Serialized process-lock acquisition and stale-PID recovery with a separate SQLite lock to prevent simultaneous workers after a crash.
- Clarified the public HTTPS education URL and the local HTTP development listener in the startup guide.

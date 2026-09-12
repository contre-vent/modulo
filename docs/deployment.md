# Deploying Modulo educational pages

## Vercel project

- Team: `contre-vent`.
- Project: `modulo` (initially created as `modulo-education`, then renamed at the owner's request).
- Stable ID: `prj_nx1ANHpXnL8FEiuzHLn8bTJJHXSi`.
- Content: static educational pages, without the bot, database, API key, or Slack messages.
- Initial deployment: `dpl_8itHvdzgBMEk5CPvkZFfurxqmvcX`.
- Automatic Git integration disabled; explicit deployment using `--prebuilt`.

## Requested domain

`modulo.contre-vent.ca` is associated with the `modulo` project. The CNAME was created in Cloudflare; Vercel confirmed `configured-correctly` and `verified`. The homepage and an educational page were checked in the browser over HTTPS on 2026-09-12.

Record recommended by `vercel domains verify` on 2026-09-12:

| Cloudflare field | Value |
| --- | --- |
| Zone | contre-vent.ca |
| Type | CNAME |
| Name | modulo |
| Target | be918b264554551b.vercel-dns-016.com |
| Proxy | DNS only (disabled) |
| TTL | Auto |

This operation applies only to `modulo`. Do not change the nameservers, root domain, or Verbatim record.

## Publishing and verification

```sh
npm run build:education
vercel deploy --prebuilt --prod --yes --scope contre-vent --cwd dist/education
vercel domains verify modulo.contre-vent.ca --scope contre-vent --cwd dist/education
```

If the generated directory needs to be linked again:

```sh
vercel link --yes --project modulo --scope contre-vent --cwd dist/education
```

`EDUCATION_BASE_URL=https://modulo.contre-vent.ca` is configured in the local `.env` file and provided in `.env.example`. This setting alone does not start the bot.

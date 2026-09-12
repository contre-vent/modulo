# Déploiement des fiches Modulo

## Projet Vercel

- Équipe : `contre-vent`.
- Projet : `modulo` (créé initialement sous `modulo-education`, puis renommé à la demande du propriétaire).
- ID stable : `prj_nx1ANHpXnL8FEiuzHLn8bTJJHXSi`.
- Contenu : pages éducatives statiques, sans bot, base de données, clé API ni messages Slack.
- Déploiement initial : `dpl_8itHvdzgBMEk5CPvkZFfurxqmvcX`.
- Liaison Git automatique désactivée ; déploiement explicite avec `--prebuilt`.

## Domaine demandé

`modulo.contre-vent.ca` est rattaché au projet `modulo`. Le CNAME a été créé dans Cloudflare ; Vercel confirme `configured-correctly` et `verified`. L’accueil et une fiche ont été vérifiés dans le navigateur sur HTTPS le 2026-09-12.

Enregistrement recommandé par `vercel domains verify` le 2026-09-12 :

| Champ Cloudflare | Valeur |
| --- | --- |
| Zone | contre-vent.ca |
| Type | CNAME |
| Nom | modulo |
| Cible | be918b264554551b.vercel-dns-016.com |
| Proxy | DNS only (désactivé) |
| TTL | Auto |

Cette opération concerne uniquement `modulo`. Ne pas modifier les serveurs de noms, le domaine racine ou l’enregistrement de Verbatim.

## Publication et vérification

```sh
npm run build:education
vercel deploy --prebuilt --prod --yes --scope contre-vent --cwd dist/education
vercel domains verify modulo.contre-vent.ca --scope contre-vent --cwd dist/education
```

Si le dossier généré doit être relié à nouveau :

```sh
vercel link --yes --project modulo --scope contre-vent --cwd dist/education
```

`EDUCATION_BASE_URL=https://modulo.contre-vent.ca` est configuré dans le fichier local `.env` et fourni dans `.env.example`. Ce réglage ne démarre pas le bot à lui seul.

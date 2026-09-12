# Plan d’implémentation de la POC

Date : 2026-09-12. Source fonctionnelle : [requis](requirements.md).

1. **Fondations** : TypeScript, taxonomie, calcul déterministe, persistance et tests isolés.
2. **Slack et analyse** : configuration de l’application, canaux publics, événements durables, classification structurée FR/EN, réactions et explications.
3. **Rapports et éducation** : commandes, périodes mensuelles, classement, fiches bilingues et ordonnanceur.
4. **Vérification et mise en route** : tests fonctionnels avec Slack simulé, évaluations IA, configuration réelle et documentation d’exploitation.

Les comportements encore ouverts dans les requis doivent être confirmés avant leur implémentation. Les fondations indépendantes peuvent avancer pendant ces clarifications.

Slack CLI vérifié : v4.7.0 ; espace connecté `contrevent-groupe` (`T0APQ2W08CX`). L’installation locale est effectuée ; l’activation est suivie ci-dessous.

## Réalisation

- [x] TypeScript, taxonomie, score et SQLite avec tests de persistance.
- [x] Adaptateur Slack Bolt/Socket Mode, découverte des canaux publics internes et file de traitement.
- [x] Classification OpenAI structurée, réactions et explications bilingues.
- [x] Quatre périmètres de rapports, fuseau du compte Slack et médailles dès 20 messages.
- [x] Tests d’intégration avec Slack simulé, sans publication de messages de test dans la compagnie.
- [x] Manifeste validé par Slack ; application **Modulo (local)** installée, ID `A0C1JBDNW3E`.
- [x] Fiches statiques publiées sur [modulo.contre-vent.ca](https://modulo.contre-vent.ca), production Vercel, statut READY.
- [x] Projet Vercel renommé `modulo`, CNAME Cloudflare créé pour le sous-domaine, domaine et HTTPS vérifiés.
- [ ] Démarrage du bot et vérification des canaux effectivement suivis.

## Éléments vérifiés

- `npm run check` : 23 tests passent et TypeScript ne signale aucune erreur.
- `npm run evaluate` : 18/18 exemples fictifs réussis avec GPT-6 Astra low, version de prompt `modulo-poc-1`. Il s’agit d’un petit jeu de cadrage, pas d’une estimation de précision en conditions réelles.
- HTTP anonyme sur l’accueil et des fiches FR/EN Vercel : 200 ; chemins `/.env` et `/reports` : 404.
- Déploiement Vercel : `dpl_8itHvdzgBMEk5CPvkZFfurxqmvcX`, pages HTML statiques sans fonctions ni données Slack.
- La liaison Git automatiquement créée par Vercel a été retirée du projet de fiches. Le bot local ne sera pas déployé sur Vercel lors d’un push.

## Activation

Le premier démarrage a été refusé par la revue automatique d’autorisation : elle demande une autorisation explicite de transférer les nouveaux messages publics Slack et leur contexte à OpenAI, puis de publier les interventions automatiques. La question a été transmise au propriétaire. Le bot n’a pas encore observé de messages de l’espace.

Vercel héberge uniquement les fiches génériques. Le processus Slack et la base SQLite restent locaux, comme confirmé pour la POC. Une future exécution permanente nécessitera un hôte adapté ou une évolution de l’architecture.

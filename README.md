# modulo

POC d’un agent Slack de sensibilisation aux communications respectueuses, avec réactions éducatives et statistiques publiques dans la communauté.

## Documentation

- [Requis de la POC](docs/requirements.md) : périmètre validé, comportements attendus, critères d’acceptation et décisions ouvertes.
- [Instructions de développement](AGENTS.md) : consignes pour Codex et les autres agents de programmation.

## État

Requis documentés le 12 septembre 2026. L’implémentation n’a pas commencé.
Slack CLI est installé et connecté à l’espace **contre-vent** selon le propriétaire ; cette connexion n’a pas encore été vérifiée dans le dépôt.

## Convention documentaire

Le projet utilise une spécification légère en Markdown, avec identifiants stables et critères vérifiables. Ce choix est une convention du projet, pas un format de requis imposé par Codex.

`AGENTS.md` contient les instructions de travail et renvoie à la spécification. Il ne constitue pas le prompt du modérateur exécuté dans Slack. Les futurs prompts et jeux d’évaluation seront versionnés avec le code.

Référence : [instructions AGENTS.md dans la documentation officielle OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

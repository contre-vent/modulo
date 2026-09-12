# Changelog

## 0.1.0 — En préparation

- Implémentation de la POC Slack Modulo : événements des canaux publics internes, analyse FR/EN, réactions et fiches éducatives.
- Statistiques publiques, commande `/modulo`, rapports mensuels et médailles à partir de 20 messages analysés.
- Rapports et retours de commande en anglais par défaut ; commandes courtes `/modulo u [@personne] [AAAA-MM]` et `/modulo c [#canal] [AAAA-MM]`, avec conservation des anciens alias.
- SQLite, borne d’activation persistante, file de traitement, prévention des doublons et conservation des textes pendant 30 jours.
- Tests déterministes et jeu initial de 18 exemples fictifs pour évaluer la classification.
- Fiches éducatives statiques déployées sur Vercel à `https://modulo.contre-vent.ca`, avec sous-domaine Cloudflare.

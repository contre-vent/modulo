# modulo

POC d’un agent Slack de sensibilisation aux communications respectueuses, avec réactions éducatives et statistiques publiques dans la communauté.

## Documentation

- [Requis de la POC](docs/requirements.md) : périmètre validé, comportements attendus, critères d’acceptation et décisions ouvertes.
- [Instructions de développement](AGENTS.md) : consignes pour Codex et les autres agents de programmation.

## Démarrage local

Prérequis : Node.js 24 ou supérieur, npm, Slack CLI connecté à l’espace et une clé API OpenAI. L’application locale Modulo est installée dans `contrevent-groupe` (`T0APQ2W08CX`, application `A0C1JBDNW3E`). Les identifiants locaux du CLI restent dans `.slack/`, ignoré par Git.

```sh
npm ci
cp .env.example .env
```

Ne pas recopier `.env.example` si `.env` existe déjà. Renseigner `OPENAI_API_KEY` sans la publier. Configurer `EDUCATION_BASE_URL` avec l’origine HTTPS qui expose le serveur de fiches (`127.0.0.1:3000`). Définir `MODULO_ENABLED=true` lorsque cette adresse est prête.

```sh
slack manifest validate --team T0APQ2W08CX
slack run --team T0APQ2W08CX
```

Slack CLI fournit les jetons du bot et de Socket Mode au processus. Pour exécuter `npm start` directement, il faut renseigner `SLACK_BOT_TOKEN` et `SLACK_APP_TOKEN` soi-même. La connexion CLI seule n’ajoute pas ces jetons dans `.env`.

Le démarrage vérifie l’espace du jeton, rejoint les canaux publics internes et enregistre leur date d’activation. Le bot réagit uniquement aux nouveaux messages humains textuels reçus après cette date. Les nouveaux canaux sont découverts par événements et vérification périodique. Les modifications/suppressions des messages sources ne changent pas les résultats initiaux.

Le processus local doit rester lancé. `Ctrl+C` l’arrête. Un verrou empêche deux processus Modulo d’utiliser la même base simultanément. Le fichier `data/modulo.sqlite` doit être conservé entre les démarrages : le supprimer efface les statistiques et les bornes d’activation.

## Commandes dans Slack

À utiliser dans un canal public suivi ; le résultat y sera public :

```text
/modulo canaux
/modulo canal #general
/modulo utilisateurs
/modulo utilisateur @personne
/modulo utilisateurs 2026-09
```

Sélectionner les mentions Slack de canal/personne. Le mois courant est utilisé par défaut. Les rapports mensuels publient les statistiques de tous les canaux suivis et utilisateurs observés dans le canal général, avec trois médailles au maximum par classement. Il faut 20 messages analysés pour une médaille. Le fuseau est lu sur le compte de l’installateur (`SLACK_TIMEZONE_USER_ID`), avec repli sur Montréal ; `REPORT_TIMEZONE` permet une surcharge explicite.

## Vérification

```sh
npm run check       # TypeScript et tests sans Slack ni OpenAI réels
npm run evaluate    # Évaluation réelle OpenAI, exemples fictifs, facturation API
npm run status      # Diagnostic local sans texte des messages ni secrets
npm run education   # Fiches seules, pour préparer l’adresse HTTPS avant le bot
```

`npm run education` et le bot utilisent le même port ; arrêter le premier avant de lancer le second. Le serveur HTTP ne propose que `/education/fr/<categorie>`, `/education/en/<categorie>` et `/health`. Il n’expose ni statistiques, ni clé, ni texte Slack. Il peut être publié derrière un proxy HTTPS ou un tunnel. Une URL de tunnel temporaire cesse de fonctionner lorsque ce tunnel s’arrête.

Le jeu d’évaluation est versionné dans `evals/cases.json`. Les résultats de la dernière exécution se trouvent dans `eval-results/latest.json` (ignoré par Git). Le modèle d’analyse est configurable ; GPT-6 Astra low est la base initiale, indépendamment du réglage de Codex.

## Fiches sur Vercel

Adresse stable : [modulo.contre-vent.ca](https://modulo.contre-vent.ca). Ce déploiement publie uniquement les fiches génériques ; le bot et SQLite restent locaux.

Pour mettre à jour les fiches :

```sh
npm run build:education
# Si le dossier généré n’est pas encore lié à ce projet :
vercel link --yes --project modulo --scope contre-vent --cwd dist/education
vercel deploy --prebuilt --prod --yes --scope contre-vent --cwd dist/education
```

Le build produit uniquement des pages HTML et une configuration de routage dans `dist/education/.vercel/output`. Aucun secret ni fichier de base de données n’est inclus. La liaison Git automatique du projet de fiches est désactivée ; si le CLI la recrée lors d’un nouveau `link`, la déconnecter avec `vercel git disconnect --scope contre-vent --cwd dist/education`.

Le projet Vercel s’appelle désormais `modulo`. Le rattachement du domaine `modulo.contre-vent.ca` est suivi dans [la documentation de déploiement](docs/deployment.md).

## Fonctionnement et limites de la POC

- SQLite conserve la file reçue, les classifications et les envois à effectuer. Les événements répétés ne sont pas recomptés.
- Les textes reçus et reformulations sont purgés localement après 30 jours ; les catégories et statistiques restent. Cette purge ne supprime pas les messages publiés dans Slack et ne configure pas la rétention du fournisseur d’IA.
- Le score inclut les neutres ; les indéterminés, échecs et traitements en attente apparaissent séparément. Les rapports mesurent les messages observés, pas la valeur des personnes.
- Les canaux privés, Slack Connect, bots, messages système, fichiers et messages uniquement emoji sont exclus. Un canal devenu privé ou inaccessible est suspendu.
- Les messages manqués lorsque le processus est arrêté ne sont pas récupérés. Au redémarrage, la file locale reprend ; aucun historique antérieur n’est importé. La couverture affichée indique les bornes d’observation, pas une garantie de réception exhaustive.
- Les rapports mensuels deviennent exigibles le 1er à 9 h. En cas d’arrêt à cette heure, le mois précédent est publié au prochain passage de l’ordonnanceur dans le mois courant. Les mois plus anciens restent accessibles sur demande.
- Les appels de classification et réactions sont retentés avec une limite. Si la réponse à un envoi Slack est perdue, sa livraison est marquée `uncertain` pour éviter une publication en double. Consulter `npm run status` ; une livraison incertaine peut nécessiter un diagnostic technique.
- Le traitement est séquentiel pour cette POC. Un volume supérieur à la capacité d’analyse créera une attente ; aucun objectif de latence en production n’est annoncé.

Voir [le suivi d’implémentation](docs/implementation-plan.md) pour les validations réalisées et les étapes de mise en route.

## Convention documentaire

Le projet utilise une spécification légère en Markdown, avec identifiants stables et critères vérifiables. Ce choix est une convention du projet, pas un format de requis imposé par Codex.

`AGENTS.md` contient les instructions de travail et renvoie à la spécification. Il ne constitue pas le prompt du modérateur exécuté dans Slack. Les futurs prompts et jeux d’évaluation seront versionnés avec le code.

Référence : [instructions AGENTS.md dans la documentation officielle OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

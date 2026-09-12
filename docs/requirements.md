# Requis — Modulo, POC Slack

Date : 2026-09-12. Source : décisions prises avec le propriétaire dans la conversation de cadrage.
Statut : périmètre fonctionnel validé ; paramètres ouverts listés en fin de document. Aucune implémentation ni activation Slack réalisée par cette documentation.

## 1. Objectif et vocabulaire

Modulo sensibilise la communauté à la qualité des communications écrites : il reconnaît les contributions positives, explique les formulations inappropriées et produit des statistiques.

Il s’agit d’une preuve de concept éducative et statistique. Un résultat décrit un message observé, sans prétendre mesurer la valeur de son auteur. Une émotion négative ou un désaccord ne constitue pas à lui seul un comportement inapproprié.

- **Validé** : exigence confirmée par le propriétaire.
- **Orientation** : solution proposée pour réaliser les exigences, à préciser techniquement.
- **Ouvert** : comportement ou paramètre non encore tranché ; demander confirmation avant de l’implémenter.

Les critères ci-dessous expriment les résultats attendus ; ils ne constituent pas des tests déjà passés.

## 2. Périmètre validé

| ID | Exigence | Critère d’acceptation |
| --- | --- | --- |
| SCOPE-01 | Une seule entreprise, espace Slack contre-vent. | Le bot et les rapports sont rattachés à cet espace. |
| SCOPE-02 | Suivre tous les canaux publics accessibles, plutôt que les 2 ou 3 initialement envisagés. | Les canaux publics existants sont découverts et rejoints avec les permissions appropriées ; un canal inaccessible est identifié comme non couvert. |
| SCOPE-03 | Prendre en charge les nouveaux canaux publics. | Un nouveau canal public devient suivi après son intégration effective par le bot. |
| SCOPE-04 | Aucun historique antérieur à l’activation dans chaque canal. | Un message antérieur à cette date n’est ni classé, ni annoté, ni compté ; cette borne persiste après redémarrage. |
| SCOPE-05 | Exclure les canaux privés et les messages directs de l’analyse. | Leurs messages ne contribuent pas aux annotations ou statistiques. |
| SCOPE-06 | Aucune validation humaine et aucune procédure de signalement, contestation ou révision. | L’analyse et les interventions fonctionnent automatiquement sans file d’approbation ni bouton de contestation. |
| SCOPE-07 | Sensibilisation uniquement : aucun retrait ou changement du message d’un utilisateur. | Le bot ajoute ses réactions et ses propres explications ; il ne supprime ni ne réécrit le message source. |

La restriction sur les messages directs concerne l’analyse. La surface de commande permettant de demander un rapport reste à définir.

## 3. Analyse et taxonomie

| ID | Exigence validée | Critère d’acceptation |
| --- | --- | --- |
| CLASS-01 | Identifier les messages positifs, négatifs et neutres. | Les classifications sont enregistrées et exploitables par les rapports. |
| CLASS-02 | Prendre en compte le contexte disponible pour les formulations ambiguës. | Les exemples de sarcasme, condescendance et passif-agressif font partie du jeu d’évaluation ; aucune récupération d’historique antérieur à l’activation n’est requise. |
| LANG-01 | Français et anglais. | Les deux langues disposent d’exemples d’évaluation et de textes éducatifs ; les messages mixtes sont également évalués. |
| LANG-02 | Explications adaptées à la langue du message. | Les cas simples français et anglais reçoivent une explication dans la langue correspondante. La langue des messages mixtes reste à préciser. |

### Catégories négatives

La taxonomie de travail issue du cadrage comprend :

| Catégorie | Définition opérationnelle |
| --- | --- |
| Agressivité, insulte et dénigrement | Attaque personnelle, humiliation ou formulation hostile dirigée contre quelqu’un. |
| Menace et intimidation | Pression coercitive, menace de représailles, tentative de faire taire. |
| Harcèlement et acharnement | Signaux de comportements hostiles répétés ; distinguer un indice observé d’une conclusion sur une personne. La fenêtre de contexte est ouverte. |
| Discrimination et propos haineux | Dévalorisation ou exclusion visant une identité ou un groupe. |
| Compliment sexualisé ou commentaire intrusif | Sexualisation, commentaire déplacé sur le corps, avances insistantes. C’est le sens confirmé de « flatterie indécente ». |
| Condescendance | Infantilisation, supériorité méprisante ou compliment dévalorisant. Explicitement ajouté par le propriétaire. |
| Mépris et sarcasme ciblé | Ridiculisation d’une personne, y compris sous couvert d’humour. |
| Passif-agressif | Reproche indirect ou formulation dévalorisante dont le contexte soutient cette interprétation. |

**Exemple explicitement fourni par le propriétaire (CLASS-03)** : « Tu es très jolie dans ta petite robe courte et sexy, tu devrais la porter plus souvent » doit être reconnu comme un compliment sexualisé négatif, et non comme un compliment positif.

La flatterie excessive envers un supérieur n’est pas, en soi, une catégorie négative validée.

### Catégories positives

- Remerciements et reconnaissance d’une aide.
- Encouragements et renforcement positif.
- Compliments respectueux sur une contribution, une idée ou un travail.
- Entraide et empathie.
- Retour constructif et désaccord respectueux accompagné d’éléments utiles.
- Réparation : excuses, reconnaissance d’une erreur, effort pour désamorcer un conflit.
- Inclusion et attribution du mérite aux autres.

### Cas limites

- « Je suis découragé », un refus respectueux ou une critique factuelle ne sont pas négatifs au sens de la modération par défaut.
- « Merci, enfin quelque chose d’intelligent » ne doit pas recevoir une classification positive sur la seule présence de « merci ».
- Les états **mixte** et **indéterminé** ont été proposés. Leur traitement statistique précis n’est pas validé. L’orientation est de laisser les indéterminés sans annotation et de les compter séparément.
- Une panne d’analyse n’équivaut pas à un message neutre.
- Les exemples ci-dessus servent au cadrage et au futur jeu d’évaluation ; aucune précision du modèle n’est encore mesurée.

## 4. Interventions dans Slack

| ID | Exigence validée | Critère d’acceptation |
| --- | --- | --- |
| UI-01 | Identifier publiquement les messages positifs par une réaction, par exemple un cœur. | Une réaction du bot est visible sur un message classé positif. Le choix exact de l’emoji reste ouvert. |
| UI-02 | Identifier publiquement les messages négatifs par une réaction visuelle. | Une réaction du bot est visible sur un message classé négatif, sans validation préalable. |
| UI-03 | Fournir une explication éducative avec lien vers une fiche informative. | Une réponse du bot dans le fil explique la formulation concernée, comment l’éviter à l’avenir et fournit un lien consultable par les membres. |
| UI-04 | Proposer un correctif immédiat à l’auteur. | Le bot suggère une reformulation ; l’auteur reste seul responsable de modifier son texte. |
| UI-05 | Présenter une interprétation éducative du message. | L’explication porte sur la formulation et la règle, sans étiqueter la personnalité de l’auteur. |

Contraintes de plateforme vérifiées pendant le cadrage : les réactions et réponses dans un fil sont réalisables ; le bot ne peut pas modifier le message d’un collègue via `chat.update`. Une recoloration arbitraire, un badge injecté ou une info-bulle personnalisée sur le message original ne sont pas retenus comme promesses de la POC. Un lien ou bouton dans le message du bot constitue la solution envisagée.

## 5. Statistiques et accès

| ID | Exigence validée | Critère d’acceptation |
| --- | --- | --- |
| STAT-01 | Conserver des statistiques par utilisateur et par canal. | Chaque rapport présente les volumes et pourcentages correspondant au périmètre et à la période observés. |
| STAT-02 | Inclure les messages neutres dans le dénominateur. | 30 positifs, 5 négatifs et 65 neutres donnent 30 % positifs, 5 % négatifs et 25 points. |
| STAT-03 | Calculer le score par différence des pourcentages. | Pour un dénominateur admissible N supérieur à zéro : score = 100 × (P − M) / N, avec P positifs et M négatifs. |
| ACCESS-01 | Toutes les statistiques individuelles et collectives sont publiques dans la communauté Slack authentifiée. | Un membre authentifié peut consulter les résultats, positifs et négatifs, d’une autre personne ou d’un autre canal suivi ; aucun rôle RH n’est requis. |
| ACCESS-02 | « Public » signifie dans la communauté Slack, pas sur Internet. | Une demande non authentifiée ou extérieure à l’espace ne donne pas accès aux données statistiques. |

L’admissibilité des messages mixtes, indéterminés, techniques, modifiés ou supprimés reste à définir. Les messages neutres doivent être inclus quelle que soit la décision retenue. Les indisponibilités d’analyse et les périodes non couvertes doivent rester distinguables des résultats neutres.

## 6. Rapports et médailles

| ID | Exigence validée | Critère d’acceptation |
| --- | --- | --- |
| REPORT-01 | Le premier de chaque mois, produire un relevé des statistiques individuelles et des canaux pour le mois précédent. | Le rapport indique explicitement la période observée. L’heure et le fuseau sont à confirmer. |
| REPORT-02 | Publier dans #general un compte rendu de tous les canaux suivis et de tous les utilisateurs observés. | Le compte rendu donne accès aux statistiques individuelles et collectives, et pas seulement aux gagnants. Les détails peuvent être répartis si les limites Slack l’exigent. |
| REPORT-03 | Décerner or, argent et bronze à trois canaux selon le score décroissant. | Hors égalités et cas de faible participation restant à décider, le score le plus élevé reçoit l’or. |
| REPORT-04 | Décerner or, argent et bronze à trois personnes selon la même formule. | Hors cas ouverts, l’ordre des médailles correspond aux scores décroissants. |
| REPORT-05 | Produire sur demande un rapport partiel pour tous les canaux, un canal, tous les utilisateurs ou un utilisateur. | Les quatre périmètres sont accessibles à un membre authentifié ; période et syntaxe restent à définir. |

Le score d’un canal est envisagé à partir des volumes de ses messages ; celui d’une personne à partir de ses messages dans les canaux suivis. Aucun seuil minimum, départage des égalités ni pénalité supplémentaire liée à la gravité n’est actuellement arrêté.

## 7. Orientation technique

Architecture envisagée : événements Slack → réception → file de traitement → classification contextualisée → règles déterministes → persistance, réactions et rapports.

- TypeScript et Slack Bolt pour l’intégration.
- Base de données persistante ; PostgreSQL recommandé pendant le cadrage, choix final non arrêté.
- Modèle multilingue avec sortie structurée ; fournisseur, modèle et niveau de réflexion d’inférence à choisir après évaluation.
- Traitement asynchrone et ordonnanceur pour les rapports mensuels.
- Pas de portail web dans le périmètre initial. L’hébergement des fiches éducatives reste nécessaire et à choisir.
- Pas d’AG-UI/CopilotKit dans la POC initiale : utiles éventuellement pour un futur portail, sans bénéfice établi pour l’interface Slack native.
- Ambiguous.ai explicitement écarté pour l’instant.
- GPT-6 Astra High a été recommandé pour le développement dans Codex ; cela ne sélectionne pas le modèle qui analysera les messages.
- Slack CLI installé et connecté à contre-vent selon le propriétaire ; permissions et installation du bot à vérifier lors de la mise en place.

### Critères techniques proposés pour fiabiliser la réalisation

- TECH-01 : la livraison répétée d’un événement ne double ni les statistiques ni les interventions du bot.
- TECH-02 : le bot ne réagit pas à ses propres explications ou rapports en boucle.
- TECH-03 : les calculs de score et de période sont déterministes et testables sans modèle.
- TECH-04 : les messages reçus sont des données à analyser, jamais des instructions autorisant l’exécution d’outils ou le changement de règles.
- TECH-05 : les jetons restent côté service ; les sorties du modèle sont validées avant utilisation.
- TECH-06 : les redémarrages conservent les bornes d’activation et les données nécessaires aux rapports ; une nouvelle tentative de rapport évite les doublons.

## 8. Décisions encore ouvertes

Ces points ne remettent pas en question le périmètre validé. Les confirmer avant d’implémenter le comportement correspondant.

| ID | Décision à prendre |
| --- | --- |
| OPEN-01 | Traitement des messages mixtes et indéterminés dans le score et les rapports ; abstention et seuils de classification. |
| OPEN-02 | Effet des modifications et suppressions par les auteurs sur les classifications, réactions et statistiques. Cela ne crée pas de procédure de révision utilisateur. |
| OPEN-03 | Exclusion des bots tiers et messages système ; inclusion des réponses de fils ; traitement des fichiers, images et messages uniquement emoji. |
| OPEN-04 | Volume minimum et jours actifs pour les médailles, égalités, moins de trois participants, aucun message admissible. |
| OPEN-05 | Heure, fuseau et langue des rapports mensuels ; période par défaut et syntaxe des rapports sur demande. |
| OPEN-06 | Fenêtre de contexte après activation, état nécessaire pour les comportements répétés, durée de conservation des textes et statistiques. |
| OPEN-07 | Fournisseur/modèle, hébergement, base de données, mode de connexion Slack et budget de fonctionnement. |
| OPEN-08 | Emojis exacts, emplacement et accès des fiches bilingues, langue pour les messages mixtes. |
| OPEN-09 | Sort des canaux publics Slack Connect avec des participants externes, des canaux archivés ou devenant privés ; droits des invités pour les rapports. |
| OPEN-10 | Mesures de qualité par catégorie et langue, seuil de réussite du pilote, délai acceptable d’intervention. |
| OPEN-11 | Politique de reprise après panne, tout en respectant l’absence d’import d’historique antérieur à l’activation. |

## 9. Validation future

- Tests déterministes : périodes, score avec neutres, accès, périmètre, borne d’activation, doublons, reprise et absence de boucle.
- Évaluations IA bilingues : exemples positifs, négatifs, neutres et ambigus ; suivre les faux positifs et faux négatifs par catégorie/langue. Les tests ne doivent pas prétendre garantir toutes les interprétations humaines.
- Vérification Slack : découverte des canaux, observation d’un nouveau message, réaction, explication, lien éducatif et quatre périmètres de rapport.
- Une simulation de changement de mois vérifiera les rapports mensuels sans devoir attendre le premier du mois.
- Relier les résultats aux identifiants de ce document et mentionner les limites observées.

## 10. Références techniques du cadrage

- [Slack Events API](https://docs.slack.dev/apis/events-api/)
- [Slack reactions.add](https://docs.slack.dev/reference/methods/reactions.add/)
- [Slack chat.update](https://docs.slack.dev/reference/methods/chat.update/)
- [Slack chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage/)
- [Boutons Slack avec liens](https://docs.slack.dev/reference/block-kit/block-elements/button-element/)
- [Slack Bolt pour JavaScript](https://docs.slack.dev/tools/bolt-js/)
- [AG-UI et CopilotKit](https://docs.copilotkit.ai/ag-ui/introduction)

Ces références expliquent les possibilités techniques ; les décisions produit sont celles du présent document. Revérifier les API au moment de l’implémentation.

# API Ocazbike

API backend construite avec Elysia, Bun et SQLite.

## 🧰 Prérequis

- **Git** pour récupérer le dépôt.
- **Bun** pour installer les dépendances, lancer l'API et exécuter les tests.
  Node.js n'est pas nécessaire pour le développement courant.

| Système | Ressources d'installation |
| --- | --- |
| Windows | [Installer Bun sur Windows](https://bun.sh/docs/installation#installing-bun) · [Installer Git](https://git-scm.com/download/win) |
| macOS | [Installer Bun sur macOS](https://bun.sh/docs/installation#installing-bun) · [Installer Git](https://git-scm.com/download/mac) |
| Linux | [Installer Bun sur Linux](https://bun.sh/docs/installation#installing-bun) · [Installer Git](https://git-scm.com/download/linux) |

Les instructions complètes de Bun sont sur [bun.sh](https://bun.sh/docs/installation).
Après l'installation, vérifier les outils :

```sh
bun --version
git --version
```

## 🚀 Installation et démarrage

Depuis la racine du dépôt, se placer dans le dossier de l'API :

```sh
cd da
bun install
```

Créer le fichier `.env` à partir du modèle :

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Configurer au minimum `JWT_SECRET` et `ENCRYPTION_KEY` dans `.env` (voir
[Configuration](#-configuration-env)). Puis démarrer le serveur :

```sh
bun run dev
```

Le serveur écoute par défaut sur `http://localhost:3000`. La documentation
interactive de l'API est disponible sur
[`http://localhost:3000/docs`](http://localhost:3000/docs).
Les migrations de la base sont appliquées automatiquement au démarrage.

Pour arrêter le serveur, utiliser `Ctrl+C`.

## ⚙️ Configuration `.env`

Bun charge automatiquement le fichier `.env` du dossier courant. `.env.example`
est un modèle à copier ; les valeurs d'exemple doivent être remplacées par
celles de votre environnement. Ne partagez pas `.env` et n'y inscrivez pas de
secrets dans Git : ce fichier est ignoré par le `.gitignore`.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `JWT_SECRET` | Oui | Secret de signature d'au moins 32 caractères. Utiliser une valeur aléatoire et privée. |
| `ENCRYPTION_KEY` | Oui | Clé hexadécimale de 64 caractères (32 octets) pour chiffrer les données sensibles en base. |
| `STORE_INFORMATION_INITIAL_DATA` | Non | JSON privé pour l'initialisation unique des coordonnées du magasin après migration ; utiliser `"-"` pour un champ vide. Chiffré avec `ENCRYPTION_KEY`, sans remplacer une ligne existante. |
| `SQLITE_DB_PATH` | Non | Chemin du fichier SQLite ; défaut : `./data/elysia.sqlite`, relatif au dossier `da/`. |
| `PORT` | Non | Port HTTP ; défaut : `3000`. |
| `SPA_APP_ID` | Non | Identifiant attendu dans l'en-tête `X-App-Id` ; défaut : `my-spa`. |
| `CORS_ORIGIN` | Non | Origine(s) autorisée(s) pour le navigateur ; défaut : `http://localhost:3111`. Plusieurs origines peuvent être séparées par des virgules. |
| `COOKIE_SECURE` | Non | Mettre `false` pour le développement local en HTTP. En production, les cookies sécurisés sont activés par défaut. |
| `DISCORD_WEBHOOK_URL` | Non | Webhook Discord pour les notifications Support. Sans cette variable, l'enregistrement de la demande reste possible, mais la notification échoue. |
| `LOG_LEVEL` | Non | Niveau de journalisation ; défaut : `info`. |
| `OTEL_SERVICE_NAME` | Non | Nom du service pour la télémétrie ; défaut : `elysia-api`. |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Non | Endpoint OTLP des traces, si un collecteur est utilisé. |

Pour générer deux valeurs aléatoires de 32 octets avec Bun, exécuter :

```sh
bun -e 'for (let i = 0; i < 2; i++) console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex"))'
```

Utiliser une valeur pour `JWT_SECRET` et l'autre pour `ENCRYPTION_KEY`. La clé
`ENCRYPTION_KEY` doit être conservée dans un gestionnaire de secrets et
sauvegardée séparément de la base : sans elle, les données chiffrées ne sont
plus lisibles. Ne pas la remplacer après avoir créé des données chiffrées.

## 🧪 Tests

Depuis `da/`, lancer toute la suite :

```sh
bun run test
```

Les tests chargent automatiquement `src/test-support/setup.ts` via
`bunfig.toml`, qui force `NODE_ENV=test` : la base configurée par
`SQLITE_DB_PATH` est alors refusée. Les tests qui ont besoin de SQLite créent
chacun une base temporaire migrée avec `createTestDatabase()`
(`src/test-support/testDatabase.ts`), puis la suppriment. Les utilitaires
communs aux tests HTTP (lecture et signature du cookie d'accès) sont dans
`src/test-support/authCookies.ts`.

Vérifier les types TypeScript (Bun n'effectue pas cette vérification) :

```sh
bun run typecheck
```

### Par catégorie

Ces commandes lancent la catégorie choisie pour toutes les features :

```sh
bun run test:unit
bun run test:contract
bun run test:integration
bun run test:performance
```

### Par feature

| Feature | Unitaires | Contrats HTTP | Intégration | Performances |
| --- | --- | --- | --- | --- |
| Utilisateurs (`auth`) | `bun run test:auth-unit` | `bun run test:auth-contract` | `bun run test:auth-integration` | `bun run test:auth-performance` |
| Facturation (`billing`) | `bun run test:billing-unit` | `bun run test:billing-contract` | `bun run test:billing-integration` | `bun run test:billing-performance` |
| Clients | `bun run test:clients-unit` | `bun run test:clients-contract` | `bun run test:clients-integration` | `bun run test:clients-performance` |
| Support | `bun run test:support-unit` | `bun run test:support-contract` | `bun run test:support-integration` | `bun run test:support-performance` |
| Informations du magasin | `bun run test:store-information-unit` | `bun run test:store-information-contract` | `bun run test:store-information-integration` | `bun run test:store-information-performance` |

Pour relancer toute la suite automatiquement à chaque modification :

```sh
bun run test:watch
```

Billing reprend l'organisation d'auth dans `src/features/billing/test/` :
`unit` vérifie les projections de liste, dates, compteurs et erreurs ;
`contract` utilise des repositories en mémoire et un hasher déterministe pour
les contrats HTTP, l'authentification, la validation et les transitions ;
`integration` utilise SQLite migré en WAL pour les quatre prestations, les
documents chiffrés immuables, les paiements, la pagination et les transactions.
Les anciens tests billing sont déplacés dans ces catégories, sans doublons.
Les fixtures SQLite réutilisent le socle clients/auth et sont nettoyées après
chaque test.

Comme auth, `performance` mesure 100 échantillons de 10 appels par opération
(1 000 appels), hors préparation des transitions. Le tableau présente les
tailles des tables, la moyenne et le p99 pour chaque méthode du repository,
ainsi que la pagination par client et la recherche chiffrée. Le plafond p99
est de 25 ms, comme pour clients, afin de couvrir les lectures de documents et
le déchiffrement ; il ne reprend pas le plafond de 1 ms des requêtes auth.
Les trois variantes de `listOperations` ont un plafond renforcé de 3 ms.
Le listing utilise trois requêtes indépendantes de la taille de page
(comptage, dossiers avec client et métadonnées dédiées, métadonnées héritées),
sans lire les lignes ni le JSON chiffré des documents. Chaque client distinct
n'est déchiffré qu'une fois par liste ; ce cache est local à l'appel et ne
conserve pas de données personnelles entre requêtes. La liste historique des
réparations actives applique aussi ce déchiffrement par client distinct.

## 🗃️ Base de données

### Devis et factures

`GET /operations` accepte `status=pending,in_progress,payment_pending`
(plusieurs statuts combinés par OU) et `search` pour retrouver un client.
La recherche réutilise les n-grammes chiffrés et la vérification exacte des
clients, y compris les noms complets dans les deux ordres. Les filtres client,
type et statuts sont combinés avant le comptage et la pagination. Sans `status`,
l'API retourne tous les statuts ; les trois statuts actifs par défaut sont
choisis par la SPA.
Le filtre facultatif `clientId` sélectionne exactement un client avant
pagination. Il sert les quatre grilles du détail client, sans filtre de statut.
L'ordre est `date_ms DESC, id DESC` dans chaque type.

`GET /operations/counts`, soumis à la même authentification que les dossiers,
retourne un objet par type (`repair`, `sale`, `purchase`, `rental`) contenant
`pending`, `in_progress` et `payment_pending`. Les compteurs à zéro sont inclus.
Une seule agrégation SQL compte tous les dossiers, sans pagination, lecture
des lignes ni déchiffrement des clients ou documents. Les autres statuts
ne sont pas inclus dans ces compteurs.
L'index couvrant `billing_documents_status_type_idx` (`status`, `type`) sert
le filtre et l'agrégation sans lire les dossiers ni trier les groupes.
La migration `0021` l'ajoute ; les index de pagination existants sont conservés.
L'index couvrant `billing_documents_client_type_date_ms_idx`
(`client_id`, `type`, `date_ms`, `id`) sert les grilles par client et type
sans parcourir tous les dossiers du type ni trier en mémoire. Il remplace
`billing_documents_client_id_idx` (préfixe identique, clé étrangère comprise ;
migration `0022`).

Les nouveaux devis sont conservés dans `billing_quotes` et les nouvelles
factures dans `billing_invoices`, avec un lien unique vers leur dossier.
Le JSON complet est chiffré avec `ENCRYPTION_KEY`. Le contenu, le sel de
chiffrement et la date d'émission sont immuables, y compris par mise à jour SQL.
Les statuts et les informations de règlement restent dans des colonnes séparées,
jamais réécrits dans le JSON.

Chaque nouveau devis contient une date `validUntil` dans son JSON chiffré :
30 jours après son émission (timestamp UTC en millisecondes), indépendamment
de son statut, y compris en cas d'acceptation automatique. Cette date est
affichée et imprimée ; elle n'est pas recalculée lors de l'acceptation.
Les anciens documents immuables ne sont pas modifiés.

- Devis : statut `pending`, `accepted` ou `rejected`, date d'émission
  `issued_at_ms` et dernier changement de statut `status_changed_at_ms`.
- Facture : statut `unpaid` ou `paid`, moyen de paiement `payment_method`,
  date d'émission `issued_at_ms` et date de paiement `paid_at_ms`.
  Les dates sont des timestamps UTC en millisecondes. Une facture impayée
  n'a ni moyen ni date de paiement. Une facture à 0 EUR utilise `free` et
  est automatiquement réglée lors de son émission.

Les réparations, ventes, rachats et locations suivent le même parcours : devis facultatif,
démarrage `in_progress` sans devis, `pending` avec devis, acceptation vers
`in_progress` et refus vers `cancelled`. Un devis à 0 EUR est autoaccepté.
Terminer un de ces dossiers crée sa facture dans la même transaction, avec ou
sans devis. Un devis existant doit être accepté et son contenu immuable est
utilisé pour la facture. Un montant non nul laisse la facture `unpaid` et
le dossier `payment_pending` ; un montant nul règle la facture avec `free`.
Les locations exigent une période prévue complète, conservée dans le dossier
et les documents indépendamment de la création et de la clôture.

Seul ce parcours est exposé : `GET|POST /operations`, `GET /operations/:id`,
`/operations/counts` et les actions `accept`, `reject`, `complete` et `pay`.
Les anciennes routes (`/repairs`, `/clients/:id/documents`, `PUT /operations/:id`
et les actions `submit`, `start` et `invoice`) ont été supprimées ; les grilles
d'un client utilisent `GET /operations?clientId=`. Un ancien dossier
`completed` non facturé reste traitable : `complete` crée sa facture et `pay`
la crée et la règle dans la même transaction.

L'API conserve la collection `snapshots` du dossier ; `payload` est le JSON
immuable, `status`, `createdAt`, `updatedAt`, `paymentMethod` et `paidAt` sont
les métadonnées du document. Le statut d'une facture dans cette collection
est désormais `unpaid` ou `paid`.

Les opérations n'ont plus de champ `paymentStatus` ni de colonne
`payment_status`. Le règlement est déterminé par le statut de la facture ;
l'absence de facture signifie « Non facturé ». Les colonnes `payment_method`
et `paid_at_ms` de l'opération restent disponibles pour les anciens documents.

La liste paginée `GET /operations` omet `lines`, limite `client` à `firstname`, `lastname`
et `email`, et `snapshots` aux métadonnées (sans JSON complet). Pour une
prestation de tout type, les dates saisies sont prioritaires dans `serviceStartAt`
et `serviceEndAt`. Sans dates saisies, le début reprend la date du dossier et
la fin la date de refus du devis ou de paiement de la facture (`null` sinon).
Les dates sont des entiers en millisecondes UTC. Pour tous les types, `closedAt` indique la date
du refus du devis ou du paiement de la facture (`null` sinon), distincte de
la période prévue de location. `GET /operations/:id` conserve le détail
du client et le JSON des documents pour leur consultation.

Le schéma conserve `billing_document_snapshots` pour la lecture des anciens
documents et leurs transitions sans réécrire leur JSON chiffré.
Tout nouveau document est écrit uniquement dans sa table dédiée.

La base SQLite est créée dans `data/elysia.sqlite` par défaut, en mode WAL.
Définir `SQLITE_DB_PATH` pour choisir un autre emplacement. Importer
`src/shared/database/db.ts` n'a aucun effet de bord : `src/prepareDatabase.ts`
ouvre, migre puis initialise la base explicitement, au démarrage du serveur
(`src/server.ts`) comme via `bun run db:migrate` (`src/migrate.ts`). Pour gérer
les migrations manuellement :

```sh
bun run db:generate
bun run db:migrate
bun run db:studio
```

L'historique a été regroupé dans `drizzle/0000_initial_schema.sql`, accompagné
d'un seul snapshot et du journal Drizzle. Cette migration crée le schéma actuel
complet, les index et les triggers d'immutabilité des documents. Elle ne contient
aucun identifiant de connexion : le premier administrateur est toujours créé
par `ensureBootstrapAdmin` au démarrage du serveur, avec changement obligatoire
du mot de passe. `bun run db:migrate` initialise le schéma et les coordonnées
du magasin, mais ne crée pas cet administrateur.

Cette nouvelle initiale est destinée aux bases neuves. Une base ayant appliqué
l'ancien historique est refusée explicitement avant toute migration ; aucune
donnée ni aucun journal existant n'est réécrit. Pour démarrer sans toucher à
l'ancienne base, définir `SQLITE_DB_PATH` vers un nouveau fichier. La reprise
des données existantes nécessite une migration de données distincte, précédée
d'une sauvegarde ; ne pas supprimer ni modifier manuellement leur journal.
Les migrations suivantes peuvent être générées normalement avec
`bun run db:generate`. Les trois triggers sont ajoutés manuellement à l'initiale,
car Drizzle ne les représente pas dans ses snapshots.

Pour initialiser les informations du magasin lors de la migration, définir
`STORE_INFORMATION_INITIAL_DATA` comme JSON dans la configuration secrète de
l'environnement (ne pas committer sa valeur). Le JSON doit contenir les champs
`name`, `address`, `phone`, `email`, `siret`, `apeCode`, `vatNumber`,
`bankName`, `iban` et `bic`. Utiliser `"-"` pour un champ vide. Après la
migration, les données sont chiffrées en base avec `ENCRYPTION_KEY` ; un
redémarrage ou une migration suivante ne remplace pas les coordonnées déjà
initialisées.

### 🔄 Vérifier une sauvegarde et sa restauration

La stack Docker réplique SQLite vers Garage avec Litestream. Pour tester une
restauration réelle sans écraser la base active, lancer depuis le dépôt :

```sh
./infra/scripts/verify-backup.sh
```

Le script restaure la dernière réplication dans un fichier temporaire du volume
SQLite, vérifie l'intégrité et la présence des tables principales, puis supprime
le fichier restauré. L'API et Litestream doivent être démarrés, et une première
réplication doit déjà exister. Une erreur de restauration ou de vérification
fait échouer le script ; relancer régulièrement ce contrôle, notamment après
une modification de la configuration de sauvegarde.

## 🔔 Support et notifications

Les titres et descriptions des demandes Support sont chiffrés au repos avec
`ENCRYPTION_KEY` et un sel aléatoire par demande. Le listing est indexé sur
`(status|type, created_at, id)` pour paginer sans tri en mémoire.

Configurer `DISCORD_WEBHOOK_URL` pour notifier le canal Discord à la création
d'une demande. Si Discord est indisponible, la demande reste enregistrée et
l'API indique l'échec ; un administrateur peut réessayer depuis le grid
Support. Une notification déjà envoyée peut être renvoyée après 24 heures.
Les demandes clôturées ne peuvent plus être notifiées.

Les références utilisent un compteur journalier atomique, par exemple
`SR-2026-10-04-001`, `INC-2026-10-04-002` et `BUG-2026-10-04-003`.

## 🧹 Vérifications du code

```sh
bun run check
bun run lint
bun run typecheck
```

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

Les tests chargent automatiquement `src/shared/database/testSetup.ts` via
`bunfig.toml`. Le mode test force `NODE_ENV=test` ; la base applicative utilise
alors une base mémoire et ignore `SQLITE_DB_PATH`. Les tests d'intégration et
de performance qui ont besoin de SQLite créent chacun une base temporaire
migrée, puis la suppriment. Ils ne doivent pas utiliser la base de
développement.

### Par catégorie

Ces commandes lancent la catégorie choisie pour les features `auth` (utilisateurs),
`clients` et `support` :

```sh
# Unitaires
bun test src/features/auth/test/unit src/features/clients/test/unit src/features/support/test/unit

# Contrats HTTP
bun test src/features/auth/test/contract src/features/clients/test/contract src/features/support/test/contract

# Intégration SQLite
bun test src/features/auth/test/integration src/features/clients/test/integration src/features/support/test/integration

# Performances SQLite
bun test src/features/auth/test/performance src/features/clients/test/performance src/features/support/test/performance
```

### Par feature

| Feature | Unitaires | Contrats HTTP | Intégration | Performances |
| --- | --- | --- | --- | --- |
| Utilisateurs (`auth`) | `bun test src/features/auth/test/unit` | `bun run test:user-contract` | `bun run test:user-integration` | `bun run test:db-performance` |
| Clients | `bun run test:clients-unit` | `bun run test:clients-contract` | `bun run test:clients-integration` | `bun run test:clients-performance` |
| Support | `bun run test:support-unit` | `bun run test:support-contract` | `bun run test:support-integration` | `bun run test:support-performance` |

Pour relancer toute la suite automatiquement à chaque modification :

```sh
bun run test:watch
```

## 🗃️ Base de données

La base SQLite est créée dans `data/elysia.sqlite` par défaut, en mode WAL.
Définir `SQLITE_DB_PATH` pour choisir un autre emplacement. Les migrations
Drizzle sont appliquées au démarrage ; pour les gérer manuellement :

```sh
bun run db:generate
bun run db:migrate
bun run db:studio
```

## 🔔 Support et notifications

Les titres et descriptions des demandes Support sont chiffrés au repos avec
`ENCRYPTION_KEY` et un sel aléatoire par demande. Au démarrage, les anciennes
demandes sont chiffrées et vérifiées avant que l'API accepte le trafic.

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
```

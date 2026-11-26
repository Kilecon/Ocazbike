# Ocazbike

Application de gestion pour un magasin de vélos : une API Bun/Elysia et une
interface web React. L'API utilise SQLite pour ses données.

## Démarrage local

Prérequis : Git, [Bun](https://bun.sh/docs/installation), OpenSSL et unzip.
Depuis la racine du dépôt, si `da/.env` n'existe pas encore :

```sh
cp da/.env.example da/.env
```

Dans `da/.env`, renseigner :

- `JWT_SECRET` : une valeur aléatoire privée d'au moins 32 caractères ;
- `ENCRYPTION_KEY` : une clé aléatoire de 64 caractères hexadécimaux ;
- `BOOTSTRAP_ADMIN_PASSWORD` : un mot de passe d'au moins 12 caractères pour
  créer le premier administrateur.

Pour générer séparément les deux premières valeurs, lancer deux fois
`openssl rand -hex 32` et copier chaque résultat dans la variable correspondante.
Ne pas partager ni versionner ces valeurs. Conserver la clé de chiffrement :
la remplacer rend les données déjà chiffrées illisibles.

Dans un premier terminal, démarrer l'API :

```sh
cd da
bun install
bun run dev
```

Dans un second terminal, depuis la racine du dépôt, démarrer l'interface :

```sh
unzip -p /chemin/vers/Chillax_Complete.zip \
  Chillax_Complete/Fonts/WEB/fonts/Chillax-Variable.woff2 \
  > spa/public/assets/fonts/Chillax-Variable.woff2
cd spa
bun install
bun run dev
```

La police Chillax doit être téléchargée directement depuis Fontshare par chaque
utilisateur autorisé. Sa licence permet l'auto-hébergement, mais interdit sa
redistribution : le fichier de police est ignoré par Git. Il doit aussi être
fourni avant chaque build CI ou Docker, dans le contexte de build de la SPA.

Ouvrir [http://localhost:3111](http://localhost:3111). L'API est disponible
sur [http://localhost:3000](http://localhost:3000) et sa documentation sur
[http://localhost:3000/docs](http://localhost:3000/docs). Au premier
démarrage, le compte `admin@example.com` est créé avec le mot de passe
configuré et doit le changer à la première connexion. Arrêter chaque serveur
avec `Ctrl+C`.

Ces commandes de développement démarrent les serveurs directement, sans reverse
proxy ; elles ne constituent pas une configuration de production.

Les téléphones clients et magasin acceptent 7 à 15 chiffres, un `+` initial
facultatif et les espaces, parenthèses, points ou tirets comme séparateurs.
Pour un client, un email valide ou un téléphone valide reste obligatoire.

Pour prévisualiser successivement les notifications en développement, ajouter
`?toastPreview=1` à une URL de l'administration. Retirer le paramètre pour
arrêter l'aperçu ; il n'est pas disponible dans le build de production.

## Docker et informations complémentaires

Les [analyses des choix techniques et des conteneurs](tech/README.md)
expliquent l'architecture, les alternatives et les limites du projet.

Pour démarrer la stack Docker de développement, avec Garage pour les sauvegardes
et les services d'observabilité, suivre les prérequis et commandes du
[guide API](da/README.md#démarrer-la-stack-docker-de-développement). Ce guide
décrit aussi les variables, les tests, les sauvegardes et la release.

Pour tester l'API et vérifier ses types :

```sh
cd da
bun run test
bun run typecheck
```

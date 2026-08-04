# MobiLab

Maquette Figma éditable : https://www.figma.com/design/x8ULjfRLFvPHYeoVViBmSR?node-id=1-2

Boutique web responsive d’accessoires pour iPhone, Samsung et chargeurs.

## Ouvrir l’application

Ouvrez `index.html` dans un navigateur, ou lancez un petit serveur local dans ce dossier :

```powershell
python -m http.server 4173
```

Puis ouvrez `http://localhost:4173`.

## Fonctions incluses

- filtres iPhone, Samsung et chargeurs ;
- recherche instantanée ;
- favoris sauvegardés dans le navigateur ;
- aperçu rapide des produits ;
- panier avec quantités, total et sauvegarde locale ;
- sélecteur de compatibilité ;
- mise en page responsive mobile, tablette et ordinateur.

## Installation sur Android

L’application est une PWA installable. Elle doit être publiée sur une adresse HTTPS.

1. Ouvrez cette adresse dans Chrome sur Android.
2. Touchez le menu `⋮`.
3. Choisissez **Installer l’application** ou **Ajouter à l’écran d’accueil**.
4. MobiLab apparaîtra ensuite dans la liste des applications.

Le manifeste, les icônes et le mode hors ligne sont déjà configurés.

## Compte administrateur de démonstration

- Email : `admin@mobilab.ml`
- Mot de passe : `MobiLab#Admin26`

L’espace administrateur permet de gérer les produits, leurs photos, les stocks, les commandes et les rôles des utilisateurs. Les photos importées sont automatiquement redimensionnées avant leur enregistrement local.

Important : dans cette version autonome, les utilisateurs, commandes et produits sont enregistrés dans le navigateur. Pour une mise en ligne multi-utilisateur, il faut connecter l’application à une base de données et à une authentification côté serveur.

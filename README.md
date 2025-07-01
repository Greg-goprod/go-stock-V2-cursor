# GO-Mat

Système de gestion de matériel moderne et intuitif.

## Fonctionnalités

- 📦 Gestion d'équipements
- 👥 Gestion d'utilisateurs  
- 📋 Suivi des emprunts
- 🔔 Notifications
- 📱 Scanner QR Code
- 🌙 Mode sombre/clair
- 🌍 Multilingue (FR/EN)

## Technologies

- React + TypeScript
- Tailwind CSS
- Supabase
- Vite

## Installation locale

```bash
npm install
npm run dev
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anonyme_supabase
```

### Configuration Supabase

1. Créer un projet Supabase sur [supabase.com](https://supabase.com)
2. Récupérer l'URL du projet et la clé anonyme dans Settings > API
3. Exécuter les migrations dans l'éditeur SQL de Supabase
4. Configurer les variables d'environnement

## Déploiement sur Netlify

### 1. Configuration des variables d'environnement

Dans votre dashboard Netlify :
1. Allez dans **Site settings** > **Environment variables**
2. Ajoutez les variables suivantes :
   - `VITE_SUPABASE_URL` : L'URL de votre projet Supabase
   - `VITE_SUPABASE_ANON_KEY` : La clé anonyme de votre projet Supabase

### 2. Configuration automatique

Le projet inclut déjà :
- `netlify.toml` pour la configuration de build
- `public/_redirects` pour le routage SPA
- Gestion des erreurs de variables d'environnement manquantes

### 3. Vérification du déploiement

Après déploiement, vérifiez :
1. Les variables d'environnement sont bien configurées
2. L'application se connecte à Supabase
3. Les données se chargent correctement

### Résolution des problèmes courants

#### Page blanche après déploiement
- Vérifiez que les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurées dans Netlify
- Consultez les logs de déploiement pour d'éventuelles erreurs
- Vérifiez la console du navigateur pour les erreurs JavaScript

#### Erreurs de connexion Supabase
- Vérifiez que votre projet Supabase est actif
- Vérifiez que les URLs et clés sont correctes
- Assurez-vous que RLS est désactivé ou correctement configuré

#### Erreurs 404 sur les routes
- Le fichier `_redirects` doit être présent dans le dossier `public/`
- Netlify doit être configuré pour servir `index.html` pour toutes les routes

## Structure du projet

```
src/
├── components/     # Composants réutilisables
├── contexts/       # Contextes React
├── hooks/          # Hooks personnalisés
├── lib/           # Configuration et utilitaires
├── pages/         # Pages de l'application
└── types/         # Types TypeScript

supabase/
└── migrations/    # Migrations de base de données
```

## Commandes utiles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Aperçu du build
npm run preview

# Linting
npm run lint
```

## Support

Pour toute question ou problème :
1. Vérifiez d'abord la configuration des variables d'environnement
2. Consultez les logs de Netlify et la console du navigateur
3. Vérifiez que votre projet Supabase est correctement configuré
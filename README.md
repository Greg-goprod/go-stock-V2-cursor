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

### ⚠️ IMPORTANT : Configuration des variables d'environnement

**ÉTAPE OBLIGATOIRE** : Avant que l'application fonctionne sur Netlify, vous DEVEZ configurer les variables d'environnement Supabase.

### 1. Configuration des variables d'environnement dans Netlify

1. **Accédez à votre dashboard Netlify** : https://app.netlify.com
2. **Sélectionnez votre site** dans la liste
3. **Allez dans Site settings** (bouton dans le menu du site)
4. **Cliquez sur "Environment variables"** dans le menu de gauche
5. **Ajoutez les variables suivantes** en cliquant sur "Add variable" :

   | Variable | Valeur | Description |
   |----------|--------|-------------|
   | `VITE_SUPABASE_URL` | `https://votre-projet.supabase.co` | URL de votre projet Supabase |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Clé anonyme de votre projet Supabase |

6. **Sauvegardez** les variables

### 2. Où trouver vos informations Supabase

1. **Connectez-vous à Supabase** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans Settings > API**
4. **Copiez** :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 3. Redéploiement

Après avoir configuré les variables :

1. **Retournez dans Netlify** → votre site → **Deploys**
2. **Cliquez sur "Trigger deploy"** → **"Deploy site"**
3. **Attendez** que le déploiement se termine
4. **Testez** votre site

### 4. Vérification du déploiement

Après déploiement, vérifiez :

✅ **Variables configurées** : Site settings → Environment variables  
✅ **Déploiement réussi** : Aucune erreur dans les logs  
✅ **Application accessible** : Le site se charge sans page blanche  
✅ **Connexion Supabase** : Les données se chargent correctement  

### Résolution des problèmes courants

#### 🚨 Page blanche après déploiement
**Cause** : Variables d'environnement manquantes
**Solution** :
1. Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurées dans Netlify
2. Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs
3. Redéployez le site après configuration

#### 🚨 Erreur "Failed to fetch" ou "Network Error"
**Cause** : URL Supabase incorrecte ou projet Supabase inactif
**Solution** :
1. Vérifiez que l'URL Supabase est au format `https://xxx.supabase.co`
2. Vérifiez que votre projet Supabase est actif
3. Testez la connexion depuis votre dashboard Supabase

#### 🚨 Erreur "Invalid API key"
**Cause** : Clé anonyme Supabase incorrecte
**Solution** :
1. Vérifiez que vous utilisez la clé **anon public** (pas la clé service_role)
2. Recopiez la clé complète depuis Supabase → Settings → API
3. Vérifiez qu'il n'y a pas de caractères manquants

#### 🚨 Erreur 404 sur les routes
**Cause** : Configuration de redirection manquante
**Solution** : Le fichier `_redirects` est déjà inclus dans le projet

### Configuration automatique

Le projet inclut déjà :
- ✅ `netlify.toml` pour la configuration de build
- ✅ `public/_redirects` pour le routage SPA
- ✅ Gestion des erreurs de variables d'environnement manquantes
- ✅ Messages d'erreur explicites pour guider la configuration

### Support et débogage

Si vous rencontrez des problèmes :

1. **Consultez les logs de déploiement** dans Netlify → Deploys → [votre déploiement] → Deploy log
2. **Vérifiez la console du navigateur** (F12) pour les erreurs JavaScript
3. **Testez votre configuration Supabase** directement depuis le dashboard Supabase
4. **Vérifiez que RLS est désactivé** ou correctement configuré dans Supabase

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

## Variables d'environnement requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Support

Pour toute question ou problème :
1. **Vérifiez d'abord** la configuration des variables d'environnement dans Netlify
2. **Consultez les logs** de Netlify et la console du navigateur
3. **Vérifiez** que votre projet Supabase est correctement configuré et actif
4. **Testez** la connexion Supabase depuis le dashboard
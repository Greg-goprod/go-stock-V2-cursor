import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement avec validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fonction de validation des variables d'environnement
const validateEnvironmentVariables = () => {
  console.log('🔧 Validation des variables d\'environnement Supabase:');
  console.log('- VITE_SUPABASE_URL:', supabaseUrl ? '✅ Définie' : '❌ Manquante');
  console.log('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Définie' : '❌ Manquante');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
    
    console.error(`❌ Variables d'environnement Supabase manquantes: ${missingVars.join(', ')}`);
    return false;
  }

  // Validation du format de l'URL
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error(`❌ Format d'URL Supabase invalide: ${supabaseUrl}`);
    return false;
  }

  console.log('✅ Variables d\'environnement Supabase validées avec succès');
  return true;
};

// Validation des variables d'environnement
const isValidConfig = validateEnvironmentVariables();

// Création du client Supabase seulement si la configuration est valide
export const supabase = isValidConfig ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'go-mat-equipment-management',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}) : null;

// Fonction de test de connexion
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 Test de connexion Supabase...');
    
    // Vérifier d'abord si la configuration est valide
    if (!isValidConfig || !supabase) {
      return {
        success: false,
        error: 'Configuration Supabase invalide. Vérifiez vos variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
      };
    }

    // Vérifier si les variables contiennent des valeurs par défaut
    if (supabaseUrl.includes('votre-projet.supabase.co') || supabaseAnonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
      return {
        success: false,
        error: 'Veuillez remplacer les valeurs par défaut dans le fichier .env par vos vraies valeurs Supabase.'
      };
    }
    
    // Test simple de connexion avec une requête basique
    const { data, error } = await supabase
      .from('equipment')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error.message);
      
      // Vérifier si c'est un problème de RLS
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        console.log('🔧 Tentative de désactivation temporaire de RLS...');
        
        // Essayer une requête sur une table publique
        const { data: publicData, error: publicError } = await supabase
          .from('categories')
          .select('id')
          .limit(1);
          
        if (publicError) {
          return { 
            success: false, 
            error: `Erreur RLS: ${error.message}. Vérifiez que RLS est correctement configuré ou désactivé pour les tables.` 
          };
        }
      }
      
      return { 
        success: false, 
        error: `Erreur de connexion: ${error.message}` 
      };
    }
    
    console.log('✅ Connexion Supabase réussie');
    console.log('📊 Données trouvées:', data?.length || 0, 'enregistrements');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur lors du test de connexion:', error);
    
    // Gestion spécifique des erreurs de réseau
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return {
        success: false,
        error: 'Impossible de se connecter à Supabase. Vérifiez votre connexion internet et vos variables d\'environnement.'
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Erreur de connexion inconnue' 
    };
  }
};

// Test de connexion au chargement (uniquement en développement)
if (import.meta.env.DEV && isValidConfig) {
  testSupabaseConnection().then(result => {
    if (result.success) {
      console.log('🎉 Supabase connecté avec succès en mode développement');
    } else {
      console.warn('⚠️ Problème de connexion Supabase en développement:', result.error);
    }
  });
}
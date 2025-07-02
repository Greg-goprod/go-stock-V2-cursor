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
    
    throw new Error(`❌ Variables d'environnement Supabase manquantes: ${missingVars.join(', ')}

Pour Netlify, configurez ces variables dans:
1. Dashboard Netlify > Site settings > Environment variables
2. Ajoutez VITE_SUPABASE_URL avec votre URL Supabase
3. Ajoutez VITE_SUPABASE_ANON_KEY avec votre clé anonyme Supabase
4. Redéployez le site

Variables actuelles:
- VITE_SUPABASE_URL: ${supabaseUrl || 'NON DÉFINIE'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'DÉFINIE' : 'NON DÉFINIE'}`);
  }

  // Validation du format de l'URL
  try {
    new URL(supabaseUrl);
  } catch (error) {
    throw new Error(`❌ Format d'URL Supabase invalide: ${supabaseUrl}`);
  }

  console.log('✅ Variables d\'environnement Supabase validées avec succès');
};

// Validation des variables d'environnement
validateEnvironmentVariables();

// Création du client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});

// Fonction de test de connexion
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 Test de connexion Supabase...');
    
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
    return { 
      success: false, 
      error: error.message || 'Erreur de connexion inconnue' 
    };
  }
};

// Test de connexion au chargement (uniquement en développement)
if (import.meta.env.DEV) {
  testSupabaseConnection().then(result => {
    if (result.success) {
      console.log('🎉 Supabase connecté avec succès en mode développement');
    } else {
      console.warn('⚠️ Problème de connexion Supabase en développement:', result.error);
    }
  });
}
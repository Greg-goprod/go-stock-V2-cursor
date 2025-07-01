import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Declare variables at top level
let supabase: ReturnType<typeof createClient>;
let testSupabaseConnection: () => Promise<{ success: boolean; error?: string }>;

// Vérifications détaillées pour le débogage
console.log('🔧 Configuration Supabase:');
console.log('URL:', supabaseUrl ? '✅ Définie' : '❌ Manquante');
console.log('Anon Key:', supabaseAnonKey ? '✅ Définie' : '❌ Manquante');

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `❌ Variables d'environnement Supabase manquantes:
- VITE_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ MANQUANTE'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌ MANQUANTE'}

Pour Netlify, assurez-vous d'avoir configuré ces variables dans:
Site settings > Environment variables`;
  
  console.error(errorMessage);
  
  // En production, on peut créer un client factice pour éviter le crash
  if (import.meta.env.PROD) {
    console.warn('⚠️ Création d\'un client Supabase factice pour éviter le crash en production');
    // Créer un client avec des valeurs par défaut pour éviter le crash
    supabase = createClient(
      'https://placeholder.supabase.co', 
      'placeholder-key',
      {
        auth: { persistSession: false },
        global: { headers: { 'X-Client-Info': 'equipment-management-app-fallback' } }
      }
    );
    
    // Fonction de test qui retournera toujours une erreur
    testSupabaseConnection = async () => ({
      success: false,
      error: 'Variables d\'environnement Supabase non configurées'
    });
  } else {
    throw new Error(errorMessage);
  }
} else {
  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in environment variables.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'equipment-management-app',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // Test connection function
  testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id')
        .limit(1);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Connection test failed' 
      };
    }
  };
}

// Export at top level
export { supabase, testSupabaseConnection };
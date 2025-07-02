import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Settings, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isSupabaseError = this.state.error?.message?.includes('Supabase') || 
                             this.state.error?.message?.includes('VITE_SUPABASE');

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
              
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {isSupabaseError ? 'Erreur de configuration Supabase' : 'Une erreur est survenue'}
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {isSupabaseError 
                  ? 'La connexion à la base de données Supabase a échoué. Vérifiez la configuration.'
                  : 'L\'application a rencontré une erreur inattendue.'
                }
              </p>
            </div>

            {/* Informations de débogage */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  Détails de l'erreur (développement uniquement) :
                </h3>
                <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Instructions spécifiques pour Supabase */}
            {isSupabaseError && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                  <Settings size={18} className="mr-2" />
                  Configuration Netlify requise
                </h3>
                <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
                  <div>
                    <strong>1. Accédez aux paramètres Netlify :</strong>
                    <p className="ml-4">Dashboard Netlify → Votre site → Site settings → Environment variables</p>
                  </div>
                  <div>
                    <strong>2. Ajoutez ces variables :</strong>
                    <ul className="ml-4 space-y-1">
                      <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">VITE_SUPABASE_URL</code> : URL de votre projet Supabase</li>
                      <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> : Clé anonyme Supabase</li>
                    </ul>
                  </div>
                  <div>
                    <strong>3. Redéployez le site</strong>
                    <p className="ml-4">Netlify → Deploys → Trigger deploy</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>💡 Astuce :</strong> Vous pouvez trouver ces informations dans votre dashboard Supabase → Settings → API
                  </p>
                </div>
              </div>
            )}

            {/* Vérifications générales */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Vérifications à effectuer :
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Variables d'environnement configurées dans Netlify</li>
                <li>• Projet Supabase actif et accessible</li>
                <li>• Connexion internet stable</li>
                <li>• Configuration RLS correcte (si applicable)</li>
                {isSupabaseError && (
                  <>
                    <li>• URL Supabase au format correct (https://xxx.supabase.co)</li>
                    <li>• Clé anonyme Supabase valide</li>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Recharger la page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Retour à l'accueil
              </button>

              {isSupabaseError && (
                <a
                  href="https://app.netlify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Ouvrir Netlify
                </a>
              )}
            </div>

            {/* Informations de contact */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Si le problème persiste, vérifiez les logs de déploiement Netlify ou contactez le support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
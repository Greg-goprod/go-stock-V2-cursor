import React, { createContext, useContext, ReactNode } from 'react';

// Context simplifié sans mockdata - tout est maintenant géré directement dans les composants via Supabase
interface AppContextType {
  // Fonctions utilitaires si nécessaire
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <AppContext.Provider value={{}}>
      {children}
    </AppContext.Provider>
  );
};
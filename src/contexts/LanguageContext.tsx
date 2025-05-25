import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  fr: {
    dashboard: 'Tableau de bord',
    equipment: 'Équipement',
    users: 'Utilisateurs',
    checkouts: 'Emprunts',
    notifications: 'Notifications',
    categories: 'Catégories',
    suppliers: 'Fournisseurs',
    settings: 'Paramètres',
    scan: 'Scanner',
    grid: 'Grille',
    list: 'Liste',
    filters: 'Filtres',
    addEquipment: 'Ajouter un équipement',
    addUser: 'Ajouter un utilisateur',
    addCategory: 'Ajouter une catégorie',
    addSupplier: 'Ajouter un fournisseur',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    department: 'Département',
    role: 'Rôle',
    status: 'Statut',
    actions: 'Actions',
    qrCode: 'QR Code',
    available: 'Disponible',
    checkedOut: 'Emprunté',
    maintenance: 'En maintenance',
    retired: 'Retiré',
    admin: 'Administrateur',
    user: 'Utilisateur',
    search: 'Rechercher',
    apply: 'Appliquer',
    reset: 'Réinitialiser',
    language: 'Langue',
    theme: 'Thème',
    dark: 'Sombre',
    light: 'Clair',
    recentCheckouts: 'Emprunts récents',
    recentNotifications: 'Notifications récentes',
    viewAllCheckouts: 'Voir tous les emprunts',
    viewAllNotifications: 'Voir toutes les notifications',
    noActiveCheckouts: 'Aucun emprunt actif',
    noNotifications: 'Aucune notification',
    unknownEquipment: 'Équipement inconnu',
    unknownUser: 'Utilisateur inconnu',
    active: 'Actif',
    overdue: 'En retard',
    checkoutDate: 'Date d\'emprunt',
    dueDate: 'Date de retour',
    returnDate: 'Date de retour effective',
    equipmentStatuses: 'Statuts des équipements',
    userRoles: 'Rôles des utilisateurs',
    newStatus: 'Nouveau statut',
    newRole: 'Nouveau rôle',
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    contactPerson: 'Contact',
    website: 'Site web',
    description: 'Description',
    serialNumber: 'Numéro de série',
    location: 'Emplacement',
    addedDate: 'Date d\'ajout',
    lastMaintenance: 'Dernière maintenance',
  },
  en: {
    dashboard: 'Dashboard',
    equipment: 'Equipment',
    users: 'Users',
    checkouts: 'Checkouts',
    notifications: 'Notifications',
    categories: 'Categories',
    suppliers: 'Suppliers',
    settings: 'Settings',
    scan: 'Scan',
    grid: 'Grid',
    list: 'List',
    filters: 'Filters',
    addEquipment: 'Add Equipment',
    addUser: 'Add User',
    addCategory: 'Add Category',
    addSupplier: 'Add Supplier',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    department: 'Department',
    role: 'Role',
    status: 'Status',
    actions: 'Actions',
    qrCode: 'QR Code',
    available: 'Available',
    checkedOut: 'Checked Out',
    maintenance: 'Maintenance',
    retired: 'Retired',
    admin: 'Administrator',
    user: 'User',
    search: 'Search',
    apply: 'Apply',
    reset: 'Reset',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    recentCheckouts: 'Recent Checkouts',
    recentNotifications: 'Recent Notifications',
    viewAllCheckouts: 'View All Checkouts',
    viewAllNotifications: 'View All Notifications',
    noActiveCheckouts: 'No active checkouts',
    noNotifications: 'No notifications',
    unknownEquipment: 'Unknown Equipment',
    unknownUser: 'Unknown User',
    active: 'Active',
    overdue: 'Overdue',
    checkoutDate: 'Checkout Date',
    dueDate: 'Due Date',
    returnDate: 'Return Date',
    equipmentStatuses: 'Equipment Statuses',
    userRoles: 'User Roles',
    newStatus: 'New Status',
    newRole: 'New Role',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    contactPerson: 'Contact Person',
    website: 'Website',
    description: 'Description',
    serialNumber: 'Serial Number',
    location: 'Location',
    addedDate: 'Added Date',
    lastMaintenance: 'Last Maintenance',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return (savedLanguage as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
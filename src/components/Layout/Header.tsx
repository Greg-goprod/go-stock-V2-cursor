import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { notifications } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  const unreadNotifications = notifications.filter(notif => !notif.read).length;
  
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return t('dashboard');
    if (path.startsWith('/equipment')) return t('equipment');
    if (path.startsWith('/users')) return t('users');
    if (path.startsWith('/checkouts')) return t('checkouts');
    if (path.startsWith('/notifications')) return t('notifications');
    if (path.startsWith('/settings')) return t('settings');
    if (path.startsWith('/scan')) return t('scan');
    
    return 'Inventory Pro';
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 lg:py-4 flex items-center justify-between">
      <div className="lg:hidden w-8"></div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <Moon size={20} className="text-gray-600 dark:text-gray-300" />
          )}
        </button>

        <div className="relative hidden lg:block">
          <Bell size={20} className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </div>
        
        <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center">
          <span className="font-medium text-sm">AS</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
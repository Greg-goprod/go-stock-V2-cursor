import React from 'react';
import Card from '../components/common/Card';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sun, Moon, Languages } from 'lucide-react';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t('settings')}
      </h1>

      <Card>
        <div className="space-y-6">
          {/* Language Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                <Languages className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {t('language')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'fr' ? 'Français' : 'English'}
                </p>
              </div>
            </div>
            <div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                ) : (
                  <Sun className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {t('theme')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? t('dark') : t('light')}
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 mr-2" />
                ) : (
                  <Moon className="w-4 h-4 mr-2" />
                )}
                {theme === 'dark' ? t('light') : t('dark')}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApp } from '../contexts/AppContext';
import { Sun, Moon, Languages, Plus, Pencil, Trash2, Tag, UserCheck } from 'lucide-react';
import ColorPicker from '../components/common/ColorPicker';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { 
    categories, 
    suppliers, 
    deleteCategory, 
    deleteSupplier,
    equipmentStatuses,
    userRoles,
    updateEquipmentStatuses,
    updateUserRoles,
    statusConfigs,
    roleConfigs,
    updateStatusConfigs,
    updateRoleConfigs,
  } = useApp();

  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleAddStatus = () => {
    if (newStatus && !equipmentStatuses.includes(newStatus)) {
      updateEquipmentStatuses([...equipmentStatuses, newStatus]);
      setNewStatus('');
    }
  };

  const handleRemoveStatus = (status: string) => {
    updateEquipmentStatuses(equipmentStatuses.filter(s => s !== status));
  };

  const handleAddRole = () => {
    if (newRole && !userRoles.includes(newRole)) {
      updateUserRoles([...userRoles, newRole]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (role: string) => {
    updateUserRoles(userRoles.filter(r => r !== role));
  };

  const handleStatusColorChange = (statusId: string, color: string) => {
    const newConfigs = statusConfigs.map(config =>
      config.id === statusId ? { ...config, color } : config
    );
    updateStatusConfigs(newConfigs);
  };

  const handleRoleColorChange = (roleId: string, color: string) => {
    const newConfigs = roleConfigs.map(config =>
      config.id === roleId ? { ...config, color } : config
    );
    updateRoleConfigs(newConfigs);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t('settings')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Language Settings */}
          <Card>
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
          </Card>

          {/* Theme Settings */}
          <Card>
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
          </Card>

          {/* Equipment Statuses */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Statuts des équipements
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="Nouveau statut"
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={handleAddStatus}
                >
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {statusConfigs.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        color={status.color}
                        onChange={(color) => handleStatusColorChange(status.id, color)}
                      />
                      <span className="text-sm font-medium">{status.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveStatus(status.id)}
                      className="text-gray-500 hover:text-danger-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* User Roles */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <UserCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Rôles des utilisateurs
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Nouveau rôle"
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={handleAddRole}
                >
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {roleConfigs.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        color={role.color}
                        onChange={(color) => handleRoleColorChange(role.id, color)}
                      />
                      <span className="text-sm font-medium">{role.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveRole(role.id)}
                      className="text-gray-500 hover:text-danger-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Categories */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {t('categories')}
              </h3>
              <Button variant="primary" size="sm" icon={<Plus size={16} />}>
                {t('addCategory')}
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">
                      {category.name}
                    </h4>
                    {category.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={16} />}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={() => deleteCategory(category.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Suppliers */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {t('suppliers')}
              </h3>
              <Button variant="primary" size="sm" icon={<Plus size={16} />}>
                {t('addSupplier')}
              </Button>
            </div>
            <div className="space-y-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">
                      {supplier.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {supplier.contactPerson} • {supplier.phone}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {supplier.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={16} />}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={() => deleteSupplier(supplier.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApp } from '../contexts/AppContext';
import { Sun, Moon, Languages, Plus, Pencil, Trash2, Tag, UserCheck, Save, X, Upload, Download } from 'lucide-react';
import ColorPicker from '../components/common/ColorPicker';
import CategoryModal from '../components/categories/CategoryModal';
import SupplierModal from '../components/suppliers/SupplierModal';
import ExcelImport from '../components/import/ExcelImport';
import { Category, Supplier } from '../types';

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

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();

  // Excel Import State
  const [showExcelImport, setShowExcelImport] = useState(false);

  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editedStatusName, setEditedStatusName] = useState('');

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setShowCategoryModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setShowSupplierModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setSelectedCategory(undefined);
  };

  const handleCloseSupplierModal = () => {
    setShowSupplierModal(false);
    setSelectedSupplier(undefined);
  };

  const handleAddStatus = () => {
    if (newStatus && !equipmentStatuses.includes(newStatus)) {
      const newStatusConfig = {
        id: newStatus.toLowerCase().replace(/\s+/g, '-'),
        name: newStatus,
        color: '#64748b' // default color
      };
      updateStatusConfigs([...statusConfigs, newStatusConfig]);
      setNewStatus('');
    }
  };

  const handleRemoveStatus = (statusId: string) => {
    updateStatusConfigs(statusConfigs.filter(s => s.id !== statusId));
  };

  const handleEditStatus = (statusId: string) => {
    const status = statusConfigs.find(s => s.id === statusId);
    if (status) {
      setEditingStatusId(statusId);
      setEditedStatusName(status.name);
    }
  };

  const handleSaveStatusName = (statusId: string) => {
    if (editedStatusName.trim()) {
      const newConfigs = statusConfigs.map(config =>
        config.id === statusId ? { ...config, name: editedStatusName.trim() } : config
      );
      updateStatusConfigs(newConfigs);
      setEditingStatusId(null);
      setEditedStatusName('');
    }
  };

  const handleStatusColorChange = (statusId: string, color: string) => {
    const newConfigs = statusConfigs.map(config =>
      config.id === statusId ? { ...config, color } : config
    );
    updateStatusConfigs(newConfigs);
  };

  const handleAddRole = () => {
    if (newRole && !userRoles.includes(newRole)) {
      const newRoleConfig = {
        id: newRole.toLowerCase().replace(/\s+/g, '-'),
        name: newRole,
        color: '#64748b' // default color
      };
      updateRoleConfigs([...roleConfigs, newRoleConfig]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (roleId: string) => {
    updateRoleConfigs(roleConfigs.filter(r => r.id !== roleId));
  };

  const handleRoleColorChange = (roleId: string, color: string) => {
    const newConfigs = roleConfigs.map(config =>
      config.id === roleId ? { ...config, color } : config
    );
    updateRoleConfigs(newConfigs);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

          {/* Import Excel */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                    Import de Matériel
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Importer du matériel depuis un fichier Excel
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={() => {
                    // Télécharger directement le modèle
                    const link = document.createElement('a');
                    link.href = '/template/GO-Mat_Modele_Import.xlsx';
                    link.download = 'GO-Mat_Modele_Import.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Modèle
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={16} />}
                  onClick={() => setShowExcelImport(true)}
                >
                  Importer
                </Button>
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
                  {t('statusManagement')}
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder={t('newStatus')}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={handleAddStatus}
                >
                  {t('add')}
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
                      {editingStatusId === status.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedStatusName}
                            onChange={(e) => setEditedStatusName(e.target.value)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <Button
                            variant="success"
                            size="sm"
                            icon={<Save size={14} />}
                            onClick={() => handleSaveStatusName(status.id)}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<X size={14} />}
                            onClick={() => setEditingStatusId(null)}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{status.name}</span>
                          <button
                            onClick={() => handleEditStatus(status.id)}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveStatus(status.id)}
                      className="text-gray-500 hover:text-danger-500 dark:hover:text-danger-400"
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
                  {t('userRoles')}
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder={t('newRole')}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={handleAddRole}
                >
                  {t('add')}
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
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Plus size={16} />}
                onClick={handleAddCategory}
              >
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
                      onClick={() => handleEditCategory(category)}
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
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Plus size={16} />}
                onClick={handleAddSupplier}
              >
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
                      onClick={() => handleEditSupplier(supplier)}
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

      {/* Modals */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={handleCloseCategoryModal}
        category={selectedCategory}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={handleCloseSupplierModal}
        supplier={selectedSupplier}
      />

      <ExcelImport
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportComplete={() => {
          // Refresh data if needed
          console.log('Import completed');
        }}
      />
    </div>
  );
};

export default Settings;
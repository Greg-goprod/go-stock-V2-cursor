import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sun, Moon, Languages, Plus, Pencil, Trash2, Tag, UserCheck, Save, X, Upload, Download, Settings as SettingsIcon } from 'lucide-react';
import ColorPicker from '../components/common/ColorPicker';
import CategoryModal from '../components/categories/CategoryModal';
import SupplierModal from '../components/suppliers/SupplierModal';
import GroupModal from '../components/groups/GroupModal';
import ExcelImport from '../components/import/ExcelImport';
import { Category, Supplier, EquipmentGroup, SystemSetting } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EquipmentGroup | undefined>();
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Settings states
  const [articlePrefix, setArticlePrefix] = useState('GOMAT');
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [tempPrefix, setTempPrefix] = useState('GOMAT');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [categoriesRes, suppliersRes, groupsRes, settingsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('equipment_groups').select('*').order('name'),
        supabase.from('system_settings').select('*')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setCategories(categoriesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setGroups(groupsRes.data || []);
      setSystemSettings(settingsRes.data || []);

      // Set article prefix
      const prefixSetting = settingsRes.data?.find(s => s.id === 'article_prefix');
      if (prefixSetting) {
        setArticlePrefix(prefixSetting.value);
        setTempPrefix(prefixSetting.value);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast.success(t('success'));
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || t('error'));
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      toast.success(t('success'));
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || t('error'));
    }
  };

  const handleEditGroup = (group: EquipmentGroup) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const handleAddGroup = () => {
    setSelectedGroup(undefined);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('equipment_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success(t('success'));
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error(error.message || t('error'));
    }
  };

  const handleSavePrefix = async () => {
    if (tempPrefix.length > 5) {
      toast.error('Le préfixe ne peut pas dépasser 5 caractères');
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'article_prefix',
          value: tempPrefix,
          description: 'Préfixe pour les numéros d\'articles (5 caractères max)'
        });

      if (error) throw error;

      setArticlePrefix(tempPrefix);
      setIsEditingPrefix(false);
      toast.success(t('saved'));
    } catch (error: any) {
      console.error('Error saving prefix:', error);
      toast.error(error.message || t('error'));
    }
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setSelectedCategory(undefined);
    fetchData(); // Refresh data
  };

  const handleCloseSupplierModal = () => {
    setShowSupplierModal(false);
    setSelectedSupplier(undefined);
    fetchData(); // Refresh data
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setSelectedGroup(undefined);
    fetchData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

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
                    {language === 'fr' ? 'Français' : language === 'en' ? 'English' : 'Deutsch'}
                  </p>
                </div>
              </div>
              <div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en' | 'de')}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
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

          {/* System Settings */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {t('systemSettings')}
                </h3>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('articlePrefix')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t('prefixDescription')}
                </p>
                
                {isEditingPrefix ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempPrefix}
                      onChange={(e) => setTempPrefix(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <Button
                      variant="success"
                      size="sm"
                      icon={<Save size={14} />}
                      onClick={handleSavePrefix}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<X size={14} />}
                      onClick={() => {
                        setIsEditingPrefix(false);
                        setTempPrefix(articlePrefix);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-mono text-lg font-medium text-gray-900 dark:text-gray-100">
                      {articlePrefix}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={14} />}
                      onClick={() => setIsEditingPrefix(true)}
                    >
                      {t('edit')}
                    </Button>
                  </div>
                )}
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
                    {t('importExcel')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Importer du matériel depuis un fichier Excel
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={16} />}
                  onClick={() => setShowExcelImport(true)}
                >
                  {t('import')}
                </Button>
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
                      onClick={() => handleDeleteCategory(category.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Groups */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {t('groups')}
              </h3>
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Plus size={16} />}
                onClick={handleAddGroup}
              >
                {t('addGroup')}
              </Button>
            </div>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {group.name}
                      </h4>
                      {group.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={16} />}
                      onClick={() => handleEditGroup(group)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDeleteGroup(group.id)}
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
                      onClick={() => handleDeleteSupplier(supplier.id)}
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

      <GroupModal
        isOpen={showGroupModal}
        onClose={handleCloseGroupModal}
        group={selectedGroup}
      />

      <ExcelImport
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportComplete={() => {
          console.log('Import completed');
        }}
      />
    </div>
  );
};

export default Settings;
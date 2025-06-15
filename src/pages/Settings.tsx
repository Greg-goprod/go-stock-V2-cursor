import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import AccordionCard from '../components/common/AccordionCard';
import Button from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sun, Moon, Languages, Plus, Pencil, Trash2, Tag, UserCheck, Save, X, Upload, Download, Settings as SettingsIcon, Image, Building2 } from 'lucide-react';
import ColorPicker from '../components/common/ColorPicker';
import CategoryModal from '../components/categories/CategoryModal';
import SupplierModal from '../components/suppliers/SupplierModal';
import GroupModal from '../components/groups/GroupModal';
import DepartmentModal from '../components/departments/DepartmentModal';
import ExcelImport from '../components/import/ExcelImport';
import { Category, Supplier, EquipmentGroup, Department, SystemSetting } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EquipmentGroup | undefined>();
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>();
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Settings states
  const [articlePrefix, setArticlePrefix] = useState('GOMAT');
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [tempPrefix, setTempPrefix] = useState('GOMAT');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [categoriesRes, suppliersRes, groupsRes, departmentsRes, settingsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('equipment_groups').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('system_settings').select('*')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (departmentsRes.error) throw departmentsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setCategories(categoriesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setGroups(groupsRes.data || []);
      setDepartments(departmentsRes.data || []);
      setSystemSettings(settingsRes.data || []);

      // Set article prefix
      const prefixSetting = settingsRes.data?.find(s => s.id === 'article_prefix');
      if (prefixSetting) {
        setArticlePrefix(prefixSetting.value);
        setTempPrefix(prefixSetting.value);
      }

      // Set company logo
      const logoSetting = settingsRes.data?.find(s => s.id === 'company_logo');
      if (logoSetting) {
        setCompanyLogo(logoSetting.value);
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

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleAddDepartment = () => {
    setSelectedDepartment(undefined);
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;
      
      setDepartments(prev => prev.filter(d => d.id !== departmentId));
      toast.success('Département supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 2MB');
      return;
    }

    try {
      setIsUploadingLogo(true);

      // Convertir l'image en base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        
        try {
          // Sauvegarder le logo en base64 dans les paramètres système
          const { error } = await supabase
            .from('system_settings')
            .upsert({
              id: 'company_logo',
              value: base64String,
              description: 'Logo de l\'entreprise (base64)'
            });

          if (error) throw error;

          setCompanyLogo(base64String);
          toast.success('Logo uploadé avec succès');
        } catch (error: any) {
          console.error('Error saving logo:', error);
          toast.error('Erreur lors de la sauvegarde du logo');
        } finally {
          setIsUploadingLogo(false);
        }
      };

      reader.onerror = () => {
        toast.error('Erreur lors de la lecture du fichier');
        setIsUploadingLogo(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors de l\'upload du logo');
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', 'company_logo');

      if (error) throw error;

      setCompanyLogo('');
      toast.success('Logo supprimé avec succès');
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error('Erreur lors de la suppression du logo');
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

  const handleCloseDepartmentModal = () => {
    setShowDepartmentModal(false);
    setSelectedDepartment(undefined);
    fetchData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400 font-medium">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight uppercase">
        PARAMÈTRES
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Language Settings - Simple Card */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <Languages className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">
                    LANGUE
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {language === 'fr' ? 'Français' : language === 'en' ? 'English' : 'Deutsch'}
                  </p>
                </div>
              </div>
              <div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en' | 'de')}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Theme Settings - Simple Card */}
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
                  <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">
                    THÈME
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {theme === 'dark' ? 'SOMBRE' : 'CLAIR'}
                  </p>
                </div>
              </div>
              <div>
                <button
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase tracking-wide"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 mr-2" />
                  ) : (
                    <Moon className="w-4 h-4 mr-2" />
                  )}
                  {theme === 'dark' ? 'CLAIR' : 'SOMBRE'}
                </button>
              </div>
            </div>
          </Card>

          {/* Company Logo - Simple Card */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <Image className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">
                    LOGO DE L'ENTREPRISE
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Apparaît sur les bons de sortie et dans l'interface
                  </p>
                </div>
              </div>

              {companyLogo && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <img
                    src={companyLogo}
                    alt="Logo de l'entreprise"
                    className="max-h-16 max-w-32 object-contain bg-white rounded border"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Logo actuel
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="font-bold"
                  >
                    SUPPRIMER
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={isUploadingLogo}
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer uppercase tracking-wide ${
                    isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingLogo ? 'UPLOAD EN COURS...' : companyLogo ? 'CHANGER LE LOGO' : 'UPLOADER UN LOGO'}
                </label>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center font-medium">
                  Formats: JPG, PNG, GIF • Max: 2MB
                </div>
              </div>
            </div>
          </Card>

          {/* System Settings - Accordion */}
          <AccordionCard
            title="PARAMÈTRES SYSTÈME"
            icon={<SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  PRÉFIXE ARTICLE
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Préfixe pour les numéros d'articles (5 caractères max)
                </p>
                
                {isEditingPrefix ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempPrefix}
                      onChange={(e) => setTempPrefix(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-bold"
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
                    <span className="font-mono text-lg font-black text-gray-900 dark:text-gray-100">
                      {articlePrefix}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={14} />}
                      onClick={() => setIsEditingPrefix(true)}
                      className="font-bold"
                    >
                      MODIFIER
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </AccordionCard>

          {/* Import Excel - Simple Card */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                  <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">
                    IMPORT EXCEL
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
                  className="font-bold"
                >
                  IMPORTER
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Categories - Accordion */}
          <AccordionCard
            title="CATÉGORIES"
            icon={<Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddCategory}
                  className="font-bold"
                >
                  AJOUTER CATÉGORIE
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h4 className="font-black text-gray-800 dark:text-white">
                        {category.name}
                      </h4>
                      {category.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
            </div>
          </AccordionCard>

          {/* Groups - Accordion */}
          <AccordionCard
            title="GROUPES"
            icon={<UserCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddGroup}
                  className="font-bold"
                >
                  AJOUTER GROUPE
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        <h4 className="font-black text-gray-800 dark:text-white">
                          {group.name}
                        </h4>
                        {group.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
            </div>
          </AccordionCard>

          {/* Departments - Accordion */}
          <AccordionCard
            title="DÉPARTEMENTS"
            icon={<Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddDepartment}
                  className="font-bold"
                >
                  AJOUTER DÉPARTEMENT
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: department.color }}
                      />
                      <div>
                        <h4 className="font-black text-gray-800 dark:text-white">
                          {department.name}
                        </h4>
                        {department.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {department.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Pencil size={16} />}
                        onClick={() => handleEditDepartment(department)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteDepartment(department.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionCard>

          {/* Suppliers - Accordion */}
          <AccordionCard
            title="FOURNISSEURS"
            icon={<UserCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddSupplier}
                  className="font-bold"
                >
                  AJOUTER FOURNISSEUR
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h4 className="font-black text-gray-800 dark:text-white">
                        {supplier.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {supplier.contactPerson} • {supplier.phone}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
            </div>
          </AccordionCard>
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

      <DepartmentModal
        isOpen={showDepartmentModal}
        onClose={handleCloseDepartmentModal}
        department={selectedDepartment}
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
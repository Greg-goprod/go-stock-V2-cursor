import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import AccordionCard from '../components/common/AccordionCard';
import Button from '../components/common/Button';
import ConfirmModal from '../components/common/ConfirmModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sun, Moon, Languages, Plus, Pencil, Trash2, Tag, UserCheck, Save, X, Upload, Download, Settings as SettingsIcon, Image, Building2, Palette, Layers, Wrench } from 'lucide-react';
import ColorPicker from '../components/common/ColorPicker';
import CategoryModal from '../components/categories/CategoryModal';
import SupplierModal from '../components/suppliers/SupplierModal';
import GroupModal from '../components/groups/GroupModal';
import SubgroupModal from '../components/subgroups/SubgroupModal';
import DepartmentModal from '../components/departments/DepartmentModal';
import StatusModal from '../components/settings/StatusModal';
import MaintenanceTypeModal from '../components/settings/MaintenanceTypeModal';
import ExcelImport from '../components/import/ExcelImport';
import { Category, Supplier, EquipmentGroup, EquipmentSubgroup, SystemSetting, Department, StatusConfig, MaintenanceType } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [subgroups, setSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EquipmentGroup | undefined>();
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [selectedSubgroup, setSelectedSubgroup] = useState<EquipmentSubgroup | undefined>();
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusConfig | undefined>();
  const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<MaintenanceType | undefined>();
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    type: 'category' | 'supplier' | 'group' | 'subgroup' | 'department' | 'status' | 'maintenanceType';
    item: any;
  } | null>(null);

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
      const [categoriesRes, suppliersRes, groupsRes, subgroupsRes, statusRes, maintenanceTypesRes, settingsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('equipment_groups').select('*').order('name'),
        supabase.from('equipment_subgroups').select('*, equipment_groups(id, name, color)').order('name'),
        supabase.from('status_configs').select('*').order('name'),
        supabase.from('maintenance_types').select('*').order('name'),
        supabase.from('system_settings').select('*')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (subgroupsRes.error) throw subgroupsRes.error;
      if (statusRes.error) throw statusRes.error;
      if (maintenanceTypesRes.error) throw maintenanceTypesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setCategories(categoriesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setGroups(groupsRes.data || []);
      setSystemSettings(settingsRes.data || []);

      // Transform subgroups data
      const transformedSubgroups: EquipmentSubgroup[] = subgroupsRes.data?.map(sg => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        color: sg.color,
        groupId: sg.group_id,
        createdAt: sg.created_at
      })) || [];
      setSubgroups(transformedSubgroups);

      // Transform maintenance types
      const transformedMaintenanceTypes: MaintenanceType[] = maintenanceTypesRes.data?.map(mt => ({
        id: mt.id,
        name: mt.name,
        description: mt.description,
        color: mt.color,
        createdAt: mt.created_at
      })) || [];
      setMaintenanceTypes(transformedMaintenanceTypes);

      // Set status configs with defaults if none exist
      if (!statusRes.data || statusRes.data.length === 0) {
        const defaultStatuses: StatusConfig[] = [
          { id: 'available', name: 'Disponible', color: '#10b981' },
          { id: 'checked-out', name: 'Emprunté', color: '#f59e0b' },
          { id: 'maintenance', name: 'En maintenance', color: '#3b82f6' },
          { id: 'retired', name: 'Retiré', color: '#ef4444' }
        ];
        setStatusConfigs(defaultStatuses);
        
        // Insert default statuses into database
        await supabase.from('status_configs').insert(defaultStatuses);
      } else {
        setStatusConfigs(statusRes.data);
      }

      // Fetch departments from users table (unique departments)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('department')
        .order('department');

      if (usersError) throw usersError;

      // Create departments list from unique user departments
      const uniqueDepartments = Array.from(new Set(usersData?.map(u => u.department).filter(Boolean) || []));
      const departmentsList: Department[] = uniqueDepartments.map((dept, index) => ({
        id: `dept-${index}`,
        name: dept,
        description: `Département ${dept}`,
        color: '#64748b',
        createdAt: new Date().toISOString()
      }));

      setDepartments(departmentsList);

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

  const handleDeleteCategory = (category: Category) => {
    setDeleteItem({ type: 'category', item: category });
    setShowDeleteConfirm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setDeleteItem({ type: 'supplier', item: supplier });
    setShowDeleteConfirm(true);
  };

  const handleEditGroup = (group: EquipmentGroup) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const handleAddGroup = () => {
    setSelectedGroup(undefined);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = (group: EquipmentGroup) => {
    setDeleteItem({ type: 'group', item: group });
    setShowDeleteConfirm(true);
  };

  const handleEditSubgroup = (subgroup: EquipmentSubgroup) => {
    setSelectedSubgroup(subgroup);
    setShowSubgroupModal(true);
  };

  const handleAddSubgroup = () => {
    setSelectedSubgroup(undefined);
    setShowSubgroupModal(true);
  };

  const handleDeleteSubgroup = (subgroup: EquipmentSubgroup) => {
    setDeleteItem({ type: 'subgroup', item: subgroup });
    setShowDeleteConfirm(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleAddDepartment = () => {
    setSelectedDepartment(undefined);
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    setDeleteItem({ type: 'department', item: department });
    setShowDeleteConfirm(true);
  };

  const handleEditStatus = (status: StatusConfig) => {
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  const handleAddStatus = () => {
    setSelectedStatus(undefined);
    setShowStatusModal(true);
  };

  const handleDeleteStatus = (status: StatusConfig) => {
    setDeleteItem({ type: 'status', item: status });
    setShowDeleteConfirm(true);
  };

  const handleEditMaintenanceType = (type: MaintenanceType) => {
    setSelectedMaintenanceType(type);
    setShowMaintenanceTypeModal(true);
  };

  const handleAddMaintenanceType = () => {
    setSelectedMaintenanceType(undefined);
    setShowMaintenanceTypeModal(true);
  };

  const handleDeleteMaintenanceType = (type: MaintenanceType) => {
    setDeleteItem({ type: 'maintenanceType', item: type });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    try {
      const { type, item } = deleteItem;

      switch (type) {
        case 'category':
          const { error: categoryError } = await supabase
            .from('categories')
            .delete()
            .eq('id', item.id);
          if (categoryError) throw categoryError;
          setCategories(prev => prev.filter(c => c.id !== item.id));
          break;

        case 'supplier':
          const { error: supplierError } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', item.id);
          if (supplierError) throw supplierError;
          setSuppliers(prev => prev.filter(s => s.id !== item.id));
          break;

        case 'group':
          // Check if any subgroups are using this group
          const { data: subgroupsWithGroup, error: subgroupCheckError } = await supabase
            .from('equipment_subgroups')
            .select('id')
            .eq('group_id', item.id);

          if (subgroupCheckError) throw subgroupCheckError;

          if (subgroupsWithGroup && subgroupsWithGroup.length > 0) {
            toast.error(`Impossible de supprimer le groupe "${item.name}" car ${subgroupsWithGroup.length} sous-groupe(s) l'utilisent encore.`);
            return;
          }

          // Check if any equipment is using this group
          const { data: equipmentWithGroup, error: equipmentCheckError } = await supabase
            .from('equipment')
            .select('id')
            .eq('group_id', item.id);

          if (equipmentCheckError) throw equipmentCheckError;

          if (equipmentWithGroup && equipmentWithGroup.length > 0) {
            toast.error(`Impossible de supprimer le groupe "${item.name}" car ${equipmentWithGroup.length} équipement(s) l'utilisent encore.`);
            return;
          }

          const { error: groupError } = await supabase
            .from('equipment_groups')
            .delete()
            .eq('id', item.id);
          if (groupError) throw groupError;
          setGroups(prev => prev.filter(g => g.id !== item.id));
          break;

        case 'subgroup':
          // Check if any equipment is using this subgroup
          const { data: equipmentWithSubgroup, error: equipmentSubgroupError } = await supabase
            .from('equipment')
            .select('id')
            .eq('subgroup_id', item.id);

          if (equipmentSubgroupError) throw equipmentSubgroupError;

          if (equipmentWithSubgroup && equipmentWithSubgroup.length > 0) {
            toast.error(`Impossible de supprimer le sous-groupe "${item.name}" car ${equipmentWithSubgroup.length} équipement(s) l'utilisent encore.`);
            return;
          }

          const { error: subgroupError } = await supabase
            .from('equipment_subgroups')
            .delete()
            .eq('id', item.id);
          if (subgroupError) throw subgroupError;
          setSubgroups(prev => prev.filter(sg => sg.id !== item.id));
          break;

        case 'department':
          // Check if any users are using this department
          const { data: usersWithDept, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('department', item.name);

          if (checkError) throw checkError;

          if (usersWithDept && usersWithDept.length > 0) {
            toast.error(`Impossible de supprimer le département "${item.name}" car ${usersWithDept.length} utilisateur(s) l'utilisent encore.`);
            return;
          }

          setDepartments(prev => prev.filter(d => d.name !== item.name));
          break;

        case 'status':
          // Check if any equipment is using this status
          const { data: equipmentWithStatus, error: equipmentError } = await supabase
            .from('equipment')
            .select('id')
            .eq('status', item.id);

          if (equipmentError) throw equipmentError;

          if (equipmentWithStatus && equipmentWithStatus.length > 0) {
            toast.error(`Impossible de supprimer le statut "${item.name}" car ${equipmentWithStatus.length} équipement(s) l'utilisent encore.`);
            return;
          }

          const { error: statusError } = await supabase
            .from('status_configs')
            .delete()
            .eq('id', item.id);
          if (statusError) throw statusError;
          setStatusConfigs(prev => prev.filter(s => s.id !== item.id));
          break;

        case 'maintenanceType':
          // Check if any maintenance records are using this type
          const { data: maintenanceWithType, error: maintenanceError } = await supabase
            .from('equipment_maintenance')
            .select('id')
            .eq('maintenance_type_id', item.id);

          if (maintenanceError) throw maintenanceError;

          if (maintenanceWithType && maintenanceWithType.length > 0) {
            toast.error(`Impossible de supprimer le type de maintenance "${item.name}" car ${maintenanceWithType.length} maintenance(s) l'utilisent encore.`);
            return;
          }

          const { error: typeError } = await supabase
            .from('maintenance_types')
            .delete()
            .eq('id', item.id);
          if (typeError) throw typeError;
          setMaintenanceTypes(prev => prev.filter(mt => mt.id !== item.id));
          break;
      }

      toast.success('Élément supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting item:', error);
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

  const handleCloseSubgroupModal = () => {
    setShowSubgroupModal(false);
    setSelectedSubgroup(undefined);
    fetchData(); // Refresh data
  };

  const handleCloseDepartmentModal = () => {
    setShowDepartmentModal(false);
    setSelectedDepartment(undefined);
    fetchData(); // Refresh data
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedStatus(undefined);
    fetchData(); // Refresh data
  };

  const handleCloseMaintenanceTypeModal = () => {
    setShowMaintenanceTypeModal(false);
    setSelectedMaintenanceType(undefined);
    fetchData(); // Refresh data
  };

  const getDeleteMessage = () => {
    if (!deleteItem) return '';
    
    const { type, item } = deleteItem;
    
    switch (type) {
      case 'category':
        return `Êtes-vous sûr de vouloir supprimer la catégorie "${item.name}" ? Cette action est irréversible.`;
      case 'supplier':
        return `Êtes-vous sûr de vouloir supprimer le fournisseur "${item.name}" ? Cette action est irréversible.`;
      case 'group':
        return `Êtes-vous sûr de vouloir supprimer le groupe "${item.name}" ? Cette action est irréversible.`;
      case 'subgroup':
        return `Êtes-vous sûr de vouloir supprimer le sous-groupe "${item.name}" ? Cette action est irréversible.`;
      case 'department':
        return `Êtes-vous sûr de vouloir supprimer le département "${item.name}" ? Cette action est irréversible.`;
      case 'status':
        return `Êtes-vous sûr de vouloir supprimer le statut "${item.name}" ? Cette action est irréversible.`;
      case 'maintenanceType':
        return `Êtes-vous sûr de vouloir supprimer le type de maintenance "${item.name}" ? Cette action est irréversible.`;
      default:
        return 'Êtes-vous sûr de vouloir supprimer cet élément ?';
    }
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Groupe inconnu';
  };

  const getGroupColor = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.color || '#64748b';
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
          {/* Status Configurations - Accordion */}
          <AccordionCard
            title="STATUTS DU MATÉRIEL"
            icon={<Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddStatus}
                  className="font-bold"
                >
                  AJOUTER STATUT
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {statusConfigs.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <div>
                        <h4 className="font-black text-gray-800 dark:text-white">
                          {status.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {status.color}
                        </p>
                      </div>
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Pencil size={16} />}
                        onClick={() => handleEditStatus(status)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteStatus(status)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionCard>

          {/* Maintenance Types - Accordion */}
          <AccordionCard
            title="TYPES DE MAINTENANCE/PANNE"
            icon={<Wrench className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddMaintenanceType}
                  className="font-bold"
                >
                  AJOUTER TYPE
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {maintenanceTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <h4 className="font-black text-gray-800 dark:text-white">
                          {type.name}
                        </h4>
                        {type.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {type.description}
                          </p>
                        )}
                      </div>
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: type.color }}
                      >
                        {type.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Pencil size={16} />}
                        onClick={() => handleEditMaintenanceType(type)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteMaintenanceType(type)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionCard>

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
                        onClick={() => handleDeleteCategory(category)}
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
                        onClick={() => handleDeleteGroup(group)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionCard>

          {/* Subgroups - Accordion */}
          <AccordionCard
            title="SOUS-GROUPES"
            icon={<Layers className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={handleAddSubgroup}
                  className="font-bold"
                  disabled={groups.length === 0}
                >
                  AJOUTER SOUS-GROUPE
                </Button>
              </div>
              {groups.length === 0 ? (
                <div className="text-center py-4">
                  <Layers size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Créez d'abord des groupes pour pouvoir ajouter des sous-groupes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subgroups.length === 0 ? (
                    <div className="text-center py-4">
                      <Layers size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Aucun sous-groupe créé pour le moment.
                      </p>
                    </div>
                  ) : (
                    subgroups.map((subgroup) => (
                      <div
                        key={subgroup.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getGroupColor(subgroup.groupId) }}
                            />
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: subgroup.color }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-gray-800 dark:text-white">
                                {subgroup.name}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                → {getGroupName(subgroup.groupId)}
                              </span>
                            </div>
                            {subgroup.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {subgroup.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Pencil size={16} />}
                            onClick={() => handleEditSubgroup(subgroup)}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleDeleteSubgroup(subgroup)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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
                {departments.length === 0 ? (
                  <div className="text-center py-4">
                    <Building2 size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Aucun département trouvé. Les départements sont créés automatiquement lors de l'ajout d'utilisateurs.
                    </p>
                  </div>
                ) : (
                  departments.map((department) => (
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
                          onClick={() => handleDeleteDepartment(department)}
                        />
                      </div>
                    </div>
                  ))
                )}
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
                        onClick={() => handleDeleteSupplier(supplier)}
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

      <DepartmentModal
        isOpen={showDepartmentModal}
        onClose={handleCloseDepartmentModal}
        department={selectedDepartment}
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

      <SubgroupModal
        isOpen={showSubgroupModal}
        onClose={handleCloseSubgroupModal}
        subgroup={selectedSubgroup}
        groups={groups}
      />

      <StatusModal
        isOpen={showStatusModal}
        onClose={handleCloseStatusModal}
        status={selectedStatus}
      />

      <MaintenanceTypeModal
        isOpen={showMaintenanceTypeModal}
        onClose={handleCloseMaintenanceTypeModal}
        maintenanceType={selectedMaintenanceType}
      />

      <ExcelImport
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportComplete={() => {
          console.log('Import completed');
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="CONFIRMER LA SUPPRESSION"
        message={getDeleteMessage()}
        confirmLabel="SUPPRIMER"
        cancelLabel="ANNULER"
      />
    </div>
  );
};

export default Settings;
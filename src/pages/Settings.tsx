import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

import Button from '../components/common/Button';
import Accordion from '../components/common/Accordion';
import Badge from '../components/common/Badge';
import { Settings as SettingsIcon, Plus, Edit, Trash2, RefreshCw, AlertTriangle, Building2, Package, Users, Tag, FolderTree, Layers } from 'lucide-react';
import MaintenanceTypeModal from '../components/maintenance/MaintenanceTypeModal';
import StatusModal from '../components/settings/StatusModal';
import CategoryModal from '../components/categories/CategoryModal';
import SupplierModal from '../components/suppliers/SupplierModal';
import DepartmentModal from '../components/departments/DepartmentModal';
import GroupModal from '../components/groups/GroupModal';
import SubgroupModal from '../components/subgroups/SubgroupModal';
import { SystemResetModal } from '../components/admin/SystemResetModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MaintenanceType {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface StatusConfig {
  id: string;
  name: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Subgroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  group_id: string;
  group?: Group;
}

export default function Settings() {
  const { refreshData } = useApp();
  
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [showSystemResetModal, setShowSystemResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<MaintenanceType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<Subgroup | null>(null);
  const [deleteType, setDeleteType] = useState<'maintenanceType' | 'status' | 'category' | 'supplier' | 'department' | 'group' | 'subgroup' | null>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Chargement des paramètres...');
      
      // Charger chaque table une par une pour identifier les problèmes
      const loadData = async (tableName: string, setter: Function) => {
        try {
          const { data, error } = await supabase!
            .from(tableName)
            .select('*')
            .order('name');
          
          if (error) {
            console.error(`❌ Erreur ${tableName}:`, error);
            return [];
          }
          
          console.log(`✅ ${tableName}:`, data?.length || 0, 'éléments');
          setter(data || []);
          return data || [];
        } catch (err) {
          console.error(`❌ Exception ${tableName}:`, err);
          return [];
        }
      };

             // Charger les données principales
       await Promise.all([
         loadData('categories', setCategories),
         loadData('suppliers', setSuppliers),
         loadData('departments', setDepartments),
         loadData('equipment_groups', setGroups)
       ]);

      // Charger les maintenance types (peut être une table différente)
      try {
        const { data: maintenanceData, error: maintenanceError } = await supabase!
          .from('maintenance_types')
          .select('*')
          .order('name');
        
        if (!maintenanceError) {
          console.log('✅ maintenance_types:', maintenanceData?.length || 0, 'éléments');
          setMaintenanceTypes(maintenanceData || []);
        } else {
          console.log('⚠️ maintenance_types non disponible:', maintenanceError.message);
        }
               } catch {
           console.log('⚠️ maintenance_types non disponible');
         }

      // Charger les status configs
      try {
        const { data: statusData, error: statusError } = await supabase!
          .from('status_configs')
          .select('*')
          .order('name');
        
        if (!statusError) {
          console.log('✅ status_configs:', statusData?.length || 0, 'éléments');
          setStatusConfigs(statusData || []);
        } else {
          console.log('⚠️ status_configs non disponible:', statusError.message);
        }
      } catch (err) {
        console.log('⚠️ status_configs non disponible');
      }

      // Charger les sous-groupes avec leurs groupes
      try {
        const { data: subgroupData, error: subgroupError } = await supabase!
          .from('equipment_subgroups')
          .select('*, equipment_groups(*)')
          .order('name');
        
        if (!subgroupError && subgroupData) {
          console.log('✅ equipment_subgroups:', subgroupData.length, 'éléments');
          setSubgroups(subgroupData.map(sub => ({
            id: sub.id,
            name: sub.name,
            description: sub.description,
            color: sub.color,
            group_id: sub.group_id,
            group: sub.equipment_groups
          })));
        } else {
          console.log('⚠️ equipment_subgroups non disponible:', subgroupError?.message);
        }
      } catch {
        console.log('⚠️ equipment_subgroups non disponible');
      }

    } catch (error) {
      console.error('❌ Erreur générale lors du chargement:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
      console.log('✅ Chargement terminé');
    }
  };

  // Handlers pour chaque type d'élément
  const createHandlers = (
    type: string,
    items: any[],
    setItems: Function,
    setSelected: Function,
    setShowModal: Function
  ) => ({
    add: () => {
      setSelected(null);
      setShowModal(true);
    },
    edit: (item: any) => {
      setSelected(item);
      setShowModal(true);
    },
    delete: (item: any) => {
      setDeleteType(type as any);
      setDeleteItem(item);
    setShowDeleteModal(true);
    },
    save: (newItem: any) => {
      if (selectedCategory || selectedSupplier || selectedDepartment || selectedGroup || selectedSubgroup || selectedMaintenanceType || selectedStatus) {
        // Update existing
        setItems((prev: any[]) => 
          prev.map((item: any) => {
            const selected = 
              (type === 'category' && selectedCategory && item.id === selectedCategory.id) ||
              (type === 'supplier' && selectedSupplier && item.id === selectedSupplier.id) ||
              (type === 'department' && selectedDepartment && item.id === selectedDepartment.id) ||
              (type === 'group' && selectedGroup && item.id === selectedGroup.id) ||
              (type === 'subgroup' && selectedSubgroup && item.id === selectedSubgroup.id) ||
              (type === 'maintenanceType' && selectedMaintenanceType && item.id === selectedMaintenanceType.id) ||
              (type === 'status' && selectedStatus && item.id === selectedStatus.id);
            
            return selected ? { ...item, ...newItem } : item;
          })
        );
      } else {
        // Add new
        setItems((prev: any[]) => [...prev, newItem]);
      }
      setSelected(null);
      setShowModal(false);
    }
  });

  const categoryHandlers = createHandlers('category', categories, setCategories, setSelectedCategory, setShowCategoryModal);
  const supplierHandlers = createHandlers('supplier', suppliers, setSuppliers, setSelectedSupplier, setShowSupplierModal);
  const departmentHandlers = createHandlers('department', departments, setDepartments, setSelectedDepartment, setShowDepartmentModal);
  const groupHandlers = createHandlers('group', groups, setGroups, setSelectedGroup, setShowGroupModal);
  const subgroupHandlers = createHandlers('subgroup', subgroups, setSubgroups, setSelectedSubgroup, setShowSubgroupModal);
  const maintenanceTypeHandlers = createHandlers('maintenanceType', maintenanceTypes, setMaintenanceTypes, setSelectedMaintenanceType, setShowMaintenanceTypeModal);
  const statusHandlers = createHandlers('status', statusConfigs, setStatusConfigs, setSelectedStatus, setShowStatusModal);

  const confirmDelete = async () => {
    if (!deleteType || !deleteItem) return;

    try {
      const tableMap = {
        category: 'categories',
        supplier: 'suppliers', 
        department: 'departments',
        group: 'equipment_groups',
        subgroup: 'equipment_subgroups',
        maintenanceType: 'maintenance_types',
        status: 'status_configs'
      };

      const tableName = tableMap[deleteType];
      const { error } = await supabase!
        .from(tableName)
        .delete()
        .eq('id', deleteItem.id);

      if (error) throw error;
      
      // Update local state
      const setterMap = {
        category: setCategories,
        supplier: setSuppliers,
        department: setDepartments,
        group: setGroups,
        subgroup: setSubgroups,
        maintenanceType: setMaintenanceTypes,
        status: setStatusConfigs
      };

      setterMap[deleteType]((prev: any[]) => prev.filter((item: any) => item.id !== deleteItem.id));
      toast.success('Élément supprimé avec succès');

    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setShowDeleteModal(false);
      setDeleteType(null);
      setDeleteItem(null);
    }
  };

  const renderItemsList = (items: any[], onEdit: Function, onDelete: Function) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm italic p-2">
          Aucun élément configuré
        </p>
      ) : (
        items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-center gap-2">
              {item.color && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="font-medium text-sm">{item.name}</span>
              {item.description && (
                <span className="text-xs text-gray-500">• {item.description}</span>
              )}
              {item.group && (
                <span className="text-xs text-gray-500">• Groupe: {item.group.name}</span>
              )}
            </div>
            <div className="flex gap-1">
                             <Button
                 variant="outline"
                 size="sm"
                 onClick={() => onEdit(item)}
                 className="p-1"
               >
                 <Edit className="w-3 h-3" />
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => onDelete(item)}
                 className="p-1 text-red-600 hover:text-red-700"
               >
                 <Trash2 className="w-3 h-3" />
               </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderAccordion = (
    title: string,
    icon: React.ReactNode,
    items: any[],
    onAdd: Function,
    onEdit: Function,
    onDelete: Function,
    colorClass: string = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  ) => (
    <Accordion
      title={title}
      icon={icon}
      badge={
                 <Badge 
           className={`${colorClass} text-xs px-2 py-1`}
         >
           {items.length}
         </Badge>
      }
      className="bg-white dark:bg-gray-800"
    >
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAdd()}
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
        {renderItemsList(items, onEdit, onDelete)}
      </div>
    </Accordion>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <div className="flex gap-2">
                <Button
                  variant="outline"
            onClick={() => {
            fetchData();
            refreshData();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowSystemResetModal(true)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
        </div>
        
      {/* Loading state */}
      {isLoading && (
          <div className="flex justify-center items-center h-40">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des paramètres...</span>
                </div>
      )}

      {/* Content in 2 columns */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne 1 */}
          <div className="space-y-4">
            {renderAccordion(
              "Catégories",
              <Tag className="w-5 h-5 text-blue-600" />,
              categories,
              categoryHandlers.add,
              categoryHandlers.edit,
              categoryHandlers.delete,
              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            )}

            {renderAccordion(
              "Départements", 
              <Users className="w-5 h-5 text-purple-600" />,
              departments,
              departmentHandlers.add,
              departmentHandlers.edit,
              departmentHandlers.delete,
              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            )}

            {renderAccordion(
              "Groupes",
              <FolderTree className="w-5 h-5 text-orange-600" />,
              groups,
              groupHandlers.add,
              groupHandlers.edit,
              groupHandlers.delete,
              "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            )}

            {renderAccordion(
              "Types de maintenance",
              <Package className="w-5 h-5 text-yellow-600" />,
              maintenanceTypes,
              maintenanceTypeHandlers.add,
              maintenanceTypeHandlers.edit,
              maintenanceTypeHandlers.delete,
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            )}
          </div>

          {/* Colonne 2 */}
          <div className="space-y-4">
            {renderAccordion(
              "Fournisseurs",
              <Building2 className="w-5 h-5 text-green-600" />,
              suppliers,
              supplierHandlers.add,
              supplierHandlers.edit,
              supplierHandlers.delete,
              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            )}

            {renderAccordion(
              "Sous-groupes",
              <Layers className="w-5 h-5 text-cyan-600" />,
              subgroups,
              subgroupHandlers.add,
              subgroupHandlers.edit,
              subgroupHandlers.delete,
              "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
            )}

            {renderAccordion(
              "Statuts",
              <SettingsIcon className="w-5 h-5 text-gray-600" />,
              statusConfigs,
              statusHandlers.add,
              statusHandlers.edit,
              statusHandlers.delete,
              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
              )}
            </div>
        </div>
      )}

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setSelectedCategory(null);
            fetchData(); // Refresh data after modal close
          }}
          category={selectedCategory || undefined}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          onClose={() => {
            setShowSupplierModal(false);
            setSelectedSupplier(null);
            fetchData(); // Refresh data after modal close
          }}
          supplier={selectedSupplier as any}
        />
      )}

      {showDepartmentModal && (
        <DepartmentModal
          isOpen={showDepartmentModal}
          onClose={() => {
            setShowDepartmentModal(false);
            setSelectedDepartment(null);
            fetchData(); // Refresh data after modal close
          }}
          department={selectedDepartment as any}
        />
      )}

      {showGroupModal && (
        <GroupModal
          isOpen={showGroupModal}
          onClose={() => {
            setShowGroupModal(false);
            setSelectedGroup(null);
            fetchData(); // Refresh data after modal close
          }}
          group={selectedGroup as any}
        />
      )}

      {showSubgroupModal && (
        <SubgroupModal
          isOpen={showSubgroupModal}
          onClose={() => {
            setShowSubgroupModal(false);
            setSelectedSubgroup(null);
            fetchData(); // Refresh data after modal close
          }}
          subgroup={selectedSubgroup as any}
          groups={groups as any}
        />
      )}

      {showMaintenanceTypeModal && (
        <MaintenanceTypeModal
          isOpen={showMaintenanceTypeModal}
        onClose={() => {
            setShowMaintenanceTypeModal(false);
            setSelectedMaintenanceType(null);
            fetchData(); // Refresh data after modal close
          }}
          maintenanceType={selectedMaintenanceType as any}
        />
      )}

      {showStatusModal && (
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
            setSelectedStatus(null);
            fetchData(); // Refresh data after modal close
          }}
          status={selectedStatus || undefined}
        />
      )}

      {showSystemResetModal && (
        <SystemResetModal
          isOpen={showSystemResetModal}
          onClose={() => setShowSystemResetModal(false)}
      />
      )}

      {showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
        onClose={() => {
            setShowDeleteModal(false);
            setDeleteType(null);
            setDeleteItem(null);
        }}
          onConfirm={confirmDelete}
          title="Supprimer l'élément"
          message={`Êtes-vous sûr de vouloir supprimer "${deleteItem?.name}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
        />
      )}
    </div>
  );
} 
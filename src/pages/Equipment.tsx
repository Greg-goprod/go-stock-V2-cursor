import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import MaintenanceModal from '../components/maintenance/MaintenanceModal';
import { Plus, Filter, QrCode, LayoutGrid, List, ArrowUpDown, Pencil, Trash2, Package, Wrench, RefreshCw, AlertCircle } from 'lucide-react';
import QRCodeGenerator from '../components/QRCode/QRCodeGenerator';
import QRCodesModal from '../components/equipment/QRCodesModal';
import Modal from '../components/common/Modal';
import FilterPanel, { FilterOption } from '../components/common/FilterPanel';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import EditEquipmentModal from '../components/equipment/EditEquipmentModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useStatusColors } from '../hooks/useStatusColors';
import { Equipment, Category, Supplier, EquipmentGroup, EquipmentInstance } from '../types';
import { supabase, testSupabaseConnection } from '../lib/supabase';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'status' | 'serial_number' | 'category' | 'group';
type SortDirection = 'asc' | 'desc';

const EquipmentPage: React.FC = () => {
  const { t } = useLanguage();
  const { statusConfigs, getStatusColor } = useStatusColors();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [instances, setInstances] = useState<EquipmentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<EquipmentInstance | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRCodesModal, setShowQRCodesModal] = useState(false);
  const [selectedEquipmentForQR, setSelectedEquipmentForQR] = useState<Equipment | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedEquipmentForMaintenance, setSelectedEquipmentForMaintenance] = useState<Equipment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('testing');

      // Test de connexion d'abord
      console.log('🔄 Test de connexion Supabase...');
      const connectionTest = await testSupabaseConnection();
      
      if (!connectionTest.success) {
        throw new Error(`Connexion échouée: ${connectionTest.error}`);
      }

      setConnectionStatus('connected');
      console.log('✅ Connexion réussie, chargement des données...');
      
      // Fetch equipment avec gestion d'erreur améliorée
      console.log('📦 Chargement des équipements...');
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name),
          equipment_groups(id, name)
        `)
        .order('name');

      if (equipmentError) {
        console.error('❌ Erreur lors du chargement des équipements:', equipmentError);
        throw new Error(`Erreur équipements: ${equipmentError.message}`);
      }

      console.log('📦 Équipements chargés:', equipmentData?.length || 0);

      // Fetch categories
      console.log('🏷️ Chargement des catégories...');
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categoriesError) {
        console.warn('⚠️ Erreur catégories (non critique):', categoriesError);
      } else {
        console.log('🏷️ Catégories chargées:', categoriesData?.length || 0);
      }
      setCategories(categoriesData || []);

      // Fetch suppliers
      console.log('🏢 Chargement des fournisseurs...');
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (suppliersError) {
        console.warn('⚠️ Erreur fournisseurs (non critique):', suppliersError);
      } else {
        console.log('🏢 Fournisseurs chargés:', suppliersData?.length || 0);
      }
      setSuppliers(suppliersData || []);

      // Fetch equipment instances
      console.log('🔢 Chargement des instances...');
      const { data: instancesData, error: instancesError } = await supabase
        .from('equipment_instances')
        .select('*')
        .order('instance_number');

      if (instancesError) {
        console.warn('⚠️ Erreur instances (non critique):', instancesError);
      } else {
        console.log('🔢 Instances chargées:', instancesData?.length || 0);
      }

      // Transform equipment data to match our interface
      const transformedEquipment: Equipment[] = equipmentData?.map(eq => ({
        id: eq.id,
        name: eq.name,
        description: eq.description || '',
        category: eq.categories?.name || '',
        serialNumber: eq.serial_number,
        status: eq.status as Equipment['status'],
        addedDate: eq.added_date || eq.created_at,
        lastMaintenance: eq.last_maintenance,
        imageUrl: eq.image_url,
        supplier: eq.suppliers?.name || '',
        location: eq.location || '',
        articleNumber: eq.article_number,
        qrType: eq.qr_type || 'individual',
        totalQuantity: eq.total_quantity || 1,
        availableQuantity: eq.available_quantity || 1,
        shortTitle: eq.short_title,
        group: eq.equipment_groups?.name || ''
      })) || [];

      // Transform instances data
      const transformedInstances: EquipmentInstance[] = instancesData?.map(inst => ({
        id: inst.id,
        equipmentId: inst.equipment_id,
        instanceNumber: inst.instance_number,
        qrCode: inst.qr_code,
        status: inst.status as EquipmentInstance['status'],
        createdAt: inst.created_at
      })) || [];

      setEquipment(transformedEquipment);
      setInstances(transformedInstances);
      
      console.log('✅ Toutes les données chargées avec succès');
      console.log('📊 Résumé:', {
        equipment: transformedEquipment.length,
        categories: categoriesData?.length || 0,
        suppliers: suppliersData?.length || 0,
        instances: transformedInstances.length
      });

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setConnectionStatus('disconnected');
      setError(error.message || 'Erreur lors du chargement des données');
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleEditClick = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setShowEditModal(true);
  };

  const handleMaintenanceClick = (equipment: Equipment) => {
    setSelectedEquipmentForMaintenance(equipment);
    setShowMaintenanceModal(true);
  };

  const handleDeleteClick = (equipment: Equipment) => {
    setEquipmentToDelete(equipment);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return;

    try {
      // Check if equipment is currently checked out
      const { data: checkouts, error: checkoutError } = await supabase
        .from('checkouts')
        .select('id')
        .eq('equipment_id', equipmentToDelete.id)
        .eq('status', 'active');

      if (checkoutError) throw checkoutError;

      if (checkouts && checkouts.length > 0) {
        toast.error('Impossible de supprimer un matériel actuellement emprunté');
        return;
      }

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipmentToDelete.id);

      if (error) throw error;

      setEquipment(prev => prev.filter(eq => eq.id !== equipmentToDelete.id));
      toast.success('Matériel supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleShowQR = (equipmentId: string, instance?: EquipmentInstance) => {
    const equipmentItem = equipment.find(eq => eq.id === equipmentId);
    if (!equipmentItem) return;

    console.log('Equipment item:', equipmentItem);
    console.log('QR Type:', equipmentItem.qrType);
    console.log('Total Quantity:', equipmentItem.totalQuantity);

    // Récupérer les instances pour cet équipement
    const equipmentInstances = getEquipmentInstances(equipmentId);
    console.log('Equipment instances:', equipmentInstances);

    // Si c'est un équipement avec QR individuels ET qu'il y a plusieurs instances
    if (equipmentItem.qrType === 'individual' && equipmentInstances.length > 1) {
      console.log('Showing multiple QR codes modal');
      // Afficher la modal avec tous les QR codes
      setSelectedEquipmentForQR(equipmentItem);
      setShowQRCodesModal(true);
      return;
    }

    // Si c'est un équipement avec QR individuels mais une seule instance
    if (equipmentItem.qrType === 'individual' && equipmentInstances.length === 1) {
      console.log('Showing single QR code for individual equipment');
      setSelectedEquipment(equipmentId);
      setSelectedInstance(equipmentInstances[0]);
      setShowQRModal(true);
      return;
    }

    // Sinon, afficher le QR code unique (batch ou pas d'instances)
    console.log('Showing single QR code for batch equipment');
    setSelectedEquipment(equipmentId);
    setSelectedInstance(instance || null);
    setShowQRModal(true);
  };

  const handleSortEquipment = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    fetchData(); // Refresh data after adding equipment
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEquipment(null);
    fetchData(); // Refresh data after editing equipment
  };

  const handleCloseMaintenanceModal = () => {
    setShowMaintenanceModal(false);
    setSelectedEquipmentForMaintenance(null);
    fetchData(); // Refresh data after maintenance changes
  };

  const getEquipmentInstances = (equipmentId: string) => {
    return instances.filter(instance => instance.equipmentId === equipmentId);
  };

  const getAvailableInstancesCount = (equipmentId: string) => {
    const equipmentInstances = getEquipmentInstances(equipmentId);
    return equipmentInstances.filter(instance => instance.status === 'available').length;
  };

  const filterOptions: FilterOption[] = [
    {
      id: 'status',
      label: 'Statut',
      type: 'select',
      options: statusConfigs.map(status => ({
        value: status.id,
        label: status.name,
      })),
    },
    {
      id: 'category',
      label: 'Catégorie',
      type: 'select',
      options: categories.map(cat => ({
        value: cat.name,
        label: cat.name,
      })),
    },
    {
      id: 'search',
      label: 'Rechercher',
      type: 'text',
    },
  ];

  const sortedEquipment = [...equipment].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * direction;
      case 'status':
        return a.status.localeCompare(b.status) * direction;
      case 'serial_number':
        return a.serialNumber.localeCompare(b.serialNumber) * direction;
      case 'category':
        return a.category.localeCompare(b.category) * direction;
      case 'group':
        return a.group.localeCompare(b.group) * direction;
      default:
        return 0;
    }
  });

  const filteredEquipment = sortedEquipment.filter(item => {
    return Object.entries(activeFilters).every(([key, value]) => {
      if (!value) return true;
      
      switch (key) {
        case 'search':
          const searchTerm = value.toLowerCase();
          return (
            item.name.toLowerCase().includes(searchTerm) ||
            item.serialNumber.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm) ||
            (item.articleNumber || '').toLowerCase().includes(searchTerm)
          );
        case 'status':
          return item.status === value;
        case 'category':
          return item.category === value;
        default:
          return true;
      }
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw size={28} className="mx-auto animate-spin text-primary-600 mb-3" />
          <div className="text-gray-500 dark:text-gray-400 text-sm">Chargement du matériel...</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {connectionStatus === 'testing' ? 'Test de connexion...' : 'Chargement des données...'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight uppercase">MATÉRIEL</h1>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} />}
            onClick={handleRefresh}
          >
            Réessayer
          </Button>
        </div>
        
        <Card className="p-6">
          <div className="text-center">
            <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Erreur de chargement des données
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {error}
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={handleRefresh}
                icon={<RefreshCw size={14} />}
              >
                Réessayer
              </Button>
              
              <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Vérifications à effectuer:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Vérifiez que les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont configurées dans Netlify</li>
                  <li>• Vérifiez que votre projet Supabase est actif</li>
                  <li>• Vérifiez que RLS (Row Level Security) est désactivé ou correctement configuré</li>
                  <li>• Consultez les logs de la console pour plus de détails</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const renderListView = () => (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-compact">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th 
                className="px-4 py-2 text-left cursor-pointer group"
                onClick={() => handleSortEquipment('name')}
              >
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  NOM
                  <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                N° ARTICLE
              </th>
              <th 
                className="px-4 py-2 text-left cursor-pointer group"
                onClick={() => handleSortEquipment('serial_number')}
              >
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  N° SÉRIE
                  <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left cursor-pointer group"
                onClick={() => handleSortEquipment('category')}
              >
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CATÉGORIE
                  <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left cursor-pointer group"
                onClick={() => handleSortEquipment('group')}
              >
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  GROUPE
                  <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                STOCK
              </th>
              <th 
                className="px-4 py-2 text-left cursor-pointer group"
                onClick={() => handleSortEquipment('status')}
              >
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  STATUT
                  <ArrowUpDown size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEquipment.map((item) => {
              const availableCount = item.qrType === 'individual' && (item.totalQuantity || 1) > 1 
                ? getAvailableInstancesCount(item.id)
                : item.availableQuantity || 1;
              const totalCount = item.totalQuantity || 1;

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-8 w-8 rounded-lg object-cover mr-2 bg-white"
                        />
                      )}
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono font-medium">
                    {item.articleNumber}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {item.serialNumber}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {item.category}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {item.group && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        {item.group}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${
                        item.status === 'checked-out' || availableCount === 0 ? 'text-red-600 dark:text-red-400' :
                        item.status === 'maintenance' || availableCount < totalCount ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {availableCount}/{totalCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<QrCode size={14} />}
                      onClick={() => handleShowQR(item.id)}
                    >
                      QR
                    </Button>
                    {item.status === 'maintenance' && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Wrench size={14} />}
                        onClick={() => handleMaintenanceClick(item)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={14} />}
                      onClick={() => handleEditClick(item)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleDeleteClick(item)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {filteredEquipment.map((item) => {
        const availableCount = item.qrType === 'individual' && (item.totalQuantity || 1) > 1 
          ? getAvailableInstancesCount(item.id)
          : item.availableQuantity || 1;
        const totalCount = item.totalQuantity || 1;

        return (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 overflow-hidden flex flex-col h-full">
            <div className="p-2 flex-1 flex flex-col">
              {/* Image */}
              <div className="relative mb-2">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-24 object-contain rounded-md bg-white"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                    <Package size={24} className="text-gray-400" />
                  </div>
                )}
                
                {/* Stock indicator */}
                <div className="absolute top-1 left-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'checked-out' || availableCount === 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                    item.status === 'maintenance' || availableCount < totalCount ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200' :
                    'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                  }`}>
                    {availableCount}/{totalCount}
                  </span>
                </div>
              </div>
              
              {/* Nom de l'appareil avec espace pour 2 lignes */}
              <h3 className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2 leading-tight h-8">
                {item.name}
              </h3>

              {/* Status badge */}
              <div className="mt-1">
                <StatusBadge status={item.status} />
              </div>
              
              {/* Actions - toujours en bas sur une seule ligne */}
              <div className="mt-auto pt-2">
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<QrCode size={12} />}
                    onClick={() => handleShowQR(item.id)}
                    className="text-xs px-1.5 py-0.5 font-medium flex-1"
                  >
                    QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Wrench size={12} />}
                    onClick={() => handleMaintenanceClick(item)}
                    className={`px-1.5 py-0.5 flex-1 ${item.status === 'maintenance' ? 'text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Pencil size={12} />}
                    onClick={() => handleEditClick(item)}
                    className="px-1.5 py-0.5 flex-1"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={12} />}
                    onClick={() => handleDeleteClick(item)}
                    className="px-1.5 py-0.5 flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const getQRCodeValue = () => {
    if (!selectedEquipment) return '';
    
    if (selectedInstance) {
      return selectedInstance.qrCode;
    }
    
    const equipment = filteredEquipment.find(eq => eq.id === selectedEquipment);
    if (equipment?.qrType === 'batch') {
      return selectedEquipment;
    }
    
    return selectedEquipment;
  };

  const getQRCodeTitle = () => {
    if (!selectedEquipment) return '';
    
    const equipment = filteredEquipment.find(eq => eq.id === selectedEquipment);
    if (!equipment) return '';
    
    if (selectedInstance) {
      return `${equipment.name} #${selectedInstance.instanceNumber}`;
    }
    
    return equipment.name;
  };

  const getQRCodeSubtitle = () => {
    if (!selectedEquipment) return '';
    
    const equipment = filteredEquipment.find(eq => eq.id === selectedEquipment);
    if (!equipment) return '';
    
    if (selectedInstance) {
      return `${equipment.articleNumber} - Instance ${selectedInstance.instanceNumber}`;
    }
    
    return equipment.articleNumber || equipment.serialNumber;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight uppercase">MATÉRIEL</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {equipment.length} équipement{equipment.length > 1 ? 's' : ''} • 
            Connexion: <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
              {connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
            </span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              icon={<LayoutGrid size={16} />}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none font-bold"
            >
              GRILLE
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={<List size={16} />}
              onClick={() => setViewMode('list')}
              className="rounded-l-none font-bold"
            >
              LISTE
            </Button>
          </div>
          <Button 
            variant="outline" 
            icon={<Filter size={16} />}
            onClick={() => setShowFilters(true)}
            className="font-bold"
          >
            FILTRES
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 px-1 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded-full font-bold">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </Button>
          <Button 
            variant="primary" 
            icon={<Plus size={16} />}
            onClick={() => setShowAddModal(true)}
            className="font-bold"
          >
            AJOUTER
          </Button>
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package size={36} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase">
              AUCUN MATÉRIEL
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {connectionStatus === 'connected' 
                ? 'Aucun matériel trouvé dans la base de données. Commencez par ajouter votre premier matériel.'
                : 'Impossible de charger les données. Vérifiez la connexion à la base de données.'
              }
            </p>
            {connectionStatus === 'connected' && (
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => setShowAddModal(true)}
                className="font-bold"
              >
                AJOUTER DU MATÉRIEL
              </Button>
            )}
            {connectionStatus === 'disconnected' && (
              <Button
                variant="primary"
                icon={<RefreshCw size={16} />}
                onClick={handleRefresh}
                className="font-bold"
              >
                RÉESSAYER
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'list' ? renderListView() : renderGridView()}
          
          {filteredEquipment.length === 0 && equipment.length > 0 && (
            <Card>
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aucun matériel ne correspond aux filtres sélectionnés.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal pour un seul QR code */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="QR CODE MATÉRIEL"
        size="sm"
      >
        {selectedEquipment && (
          <div className="flex justify-center">
            <QRCodeGenerator
              value={getQRCodeValue()}
              title={getQRCodeTitle()}
              subtitle={getQRCodeSubtitle()}
              size={180}
            />
          </div>
        )}
      </Modal>

      {/* Modal pour plusieurs QR codes */}
      {selectedEquipmentForQR && (
        <QRCodesModal
          isOpen={showQRCodesModal}
          onClose={() => {
            setShowQRCodesModal(false);
            setSelectedEquipmentForQR(null);
          }}
          equipment={selectedEquipmentForQR}
          instances={getEquipmentInstances(selectedEquipmentForQR.id)}
        />
      )}

      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        options={filterOptions}
        onApplyFilters={setActiveFilters}
      />

      <AddEquipmentModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
      />

      {editingEquipment && (
        <EditEquipmentModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          equipment={editingEquipment}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="CONFIRMER LA SUPPRESSION"
        message={`Êtes-vous sûr de vouloir supprimer le matériel "${equipmentToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="SUPPRIMER"
        cancelLabel="ANNULER"
      />

      {selectedEquipmentForMaintenance && (
        <MaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={handleCloseMaintenanceModal}
          equipment={selectedEquipmentForMaintenance}
        />
      )}
    </div>
  );
};

export default EquipmentPage;
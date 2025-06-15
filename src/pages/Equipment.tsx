import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { Plus, Filter, Import, QrCode, LayoutGrid, List, ArrowUpDown, Pencil, Trash2, Package } from 'lucide-react';
import QRCodeGenerator from '../components/QRCode/QRCodeGenerator';
import Modal from '../components/common/Modal';
import FilterPanel, { FilterOption } from '../components/common/FilterPanel';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import EditEquipmentModal from '../components/equipment/EditEquipmentModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { Equipment, Category, Supplier, EquipmentInstance } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'status' | 'serial_number' | 'category' | 'group';
type SortDirection = 'asc' | 'desc';

const EquipmentPage: React.FC = () => {
  const { t } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [instances, setInstances] = useState<EquipmentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<EquipmentInstance | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRPrintModal, setShowQRPrintModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch equipment with related data
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name),
          equipment_groups(id, name)
        `)
        .order('name');

      if (equipmentError) throw equipmentError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (suppliersError) throw suppliersError;

      // Fetch equipment instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('equipment_instances')
        .select('*')
        .order('instance_number');

      if (instancesError) throw instancesError;

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

      setEquipment(transformedEquipment);
      setCategories(categoriesData || []);
      setSuppliers(suppliersData || []);
      setInstances(instancesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setShowEditModal(true);
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
    setSelectedEquipment(equipmentId);
    setSelectedInstance(instance || null);
    setShowQRModal(true);
  };

  const handleShowQRPrint = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowQRPrintModal(true);
  };

  const handleSort = (field: SortField) => {
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
      options: [
        { value: 'available', label: 'Disponible' },
        { value: 'checked-out', label: 'Emprunté' },
        { value: 'maintenance', label: 'En maintenance' },
        { value: 'retired', label: 'Retiré' },
      ],
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
        <div className="text-gray-500 dark:text-gray-400 font-medium">Chargement du matériel...</div>
      </div>
    );
  }

  const renderListView = () => (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  NOM
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                N° ARTICLE
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('serial_number')}
              >
                <div className="flex items-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  N° SÉRIE
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CATÉGORIE
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('group')}
              >
                <div className="flex items-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  GROUPE
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                STOCK
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  STATUT
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover mr-3 bg-white"
                        />
                      )}
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono font-medium">
                    {item.articleNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {item.serialNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.group && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        {item.group}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${
                        availableCount === 0 ? 'text-red-600 dark:text-red-400' :
                        availableCount < totalCount ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {availableCount}/{totalCount}
                      </span>
                      {item.qrType === 'batch' && totalCount > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">(lot)</span>
                      )}
                      {item.qrType === 'individual' && totalCount > 1 && (
                        <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">(indiv.)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        item.status === 'available' ? 'success' :
                        item.status === 'checked-out' ? 'warning' :
                        item.status === 'maintenance' ? 'info' : 'neutral'
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<QrCode size={16} />}
                      onClick={() => handleShowQR(item.id)}
                    >
                      QR Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil size={16} />}
                      onClick={() => handleEditClick(item)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
      {filteredEquipment.map((item) => {
        const availableCount = item.qrType === 'individual' && (item.totalQuantity || 1) > 1 
          ? getAvailableInstancesCount(item.id)
          : item.availableQuantity || 1;
        const totalCount = item.totalQuantity || 1;

        return (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 overflow-hidden">
            <div className="p-3">
              {/* Image avec fond blanc en mode sombre */}
              <div className="relative mb-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-32 object-contain rounded-md bg-white"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                    <Package size={32} className="text-gray-400" />
                  </div>
                )}
                
                {/* Badge de stock en overlay */}
                <div className="absolute top-1 right-1">
                  <Badge
                    variant={
                      availableCount === 0 ? 'danger' :
                      availableCount < totalCount ? 'warning' : 'success'
                    }
                  >
                    {totalCount > 1 ? `${availableCount}/${totalCount}` : 
                     item.status === 'available' ? 'Dispo' :
                     item.status === 'checked-out' ? 'Emprunté' :
                     item.status === 'maintenance' ? 'Maint.' : 'Retiré'}
                  </Badge>
                </div>

                {/* Badge de type QR */}
                {totalCount > 1 && (
                  <div className="absolute top-1 left-1">
                    <Badge variant={item.qrType === 'individual' ? 'info' : 'neutral'}>
                      {item.qrType === 'individual' ? 'QR Indiv.' : 'QR Lot'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Informations principales */}
              <div className="space-y-1 mb-3">
                <h3 className="text-sm font-black text-gray-800 dark:text-white line-clamp-2 leading-tight">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono font-medium">
                  {item.articleNumber}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono font-medium">
                  {item.serialNumber}
                </p>
                {item.category && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {item.category}
                  </p>
                )}
                {item.group && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                    📁 {item.group}
                  </p>
                )}
                {item.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    📍 {item.location}
                  </p>
                )}
                {totalCount > 1 && (
                  <div className="flex items-center gap-1">
                    <Package size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {item.qrType === 'batch' ? `${totalCount} pcs (lot)` : `${totalCount} pcs`}
                    </span>
                  </div>
                )}
              </div>

              {/* Description tronquée */}
              {item.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 font-light">
                  {item.description}
                </p>
              )}
              
              {/* Actions */}
              <div className="flex justify-between items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<QrCode size={14} />}
                  onClick={() => handleShowQR(item.id)}
                  className="text-xs px-2 py-1 font-medium"
                >
                  QR
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Pencil size={14} />}
                    onClick={() => handleEditClick(item)}
                    className="px-2 py-1"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDeleteClick(item)}
                    className="px-2 py-1"
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight uppercase">MATÉRIEL</h1>
        
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              icon={<LayoutGrid size={18} />}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none font-bold"
            >
              GRILLE
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={<List size={18} />}
              onClick={() => setViewMode('list')}
              className="rounded-l-none font-bold"
            >
              LISTE
            </Button>
          </div>
          <Button 
            variant="outline" 
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(true)}
            className="font-bold"
          >
            FILTRES
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded-full font-black">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </Button>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => setShowAddModal(true)}
            className="font-bold"
          >
            AJOUTER MATÉRIEL
          </Button>
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 uppercase">
              AUCUN MATÉRIEL
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">
              Commencez par ajouter votre premier matériel.
            </p>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setShowAddModal(true)}
              className="font-bold"
            >
              AJOUTER DU MATÉRIEL
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'list' ? renderListView() : renderGridView()}
          
          {filteredEquipment.length === 0 && equipment.length > 0 && (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Aucun matériel ne correspond aux filtres sélectionnés.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

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
              size={200}
            />
          </div>
        )}
      </Modal>

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
    </div>
  );
};

export default EquipmentPage;
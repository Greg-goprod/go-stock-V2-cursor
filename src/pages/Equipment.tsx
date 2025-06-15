import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { Plus, Filter, Import, QrCode, LayoutGrid, List, ArrowUpDown, Pencil, Trash2, Package, Printer } from 'lucide-react';
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

  const handlePrintAllQRCodes = async (equipment: Equipment) => {
    try {
      // Récupérer le logo depuis les paramètres système
      const { data: logoSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'company_logo')
        .maybeSingle();

      const logoUrl = logoSetting?.value || '';

      if (equipment.qrType === 'individual' && equipment.totalQuantity > 1) {
        // Récupérer les instances pour ce matériel
        const { data: equipmentInstances, error } = await supabase
          .from('equipment_instances')
          .select('*')
          .eq('equipment_id', equipment.id)
          .order('instance_number');

        if (error) throw error;

        const printContent = `
          <html>
            <head>
              <title>QR Codes - ${equipment.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  color: #333;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 30px; 
                  border-bottom: 2px solid #333; 
                  padding-bottom: 20px; 
                }
                .logo {
                  max-height: 60px;
                  max-width: 150px;
                  margin-bottom: 10px;
                }
                .qr-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 20px;
                  margin-top: 20px;
                }
                .qr-item {
                  border: 2px solid #333;
                  padding: 15px;
                  text-align: center;
                  border-radius: 8px;
                  page-break-inside: avoid;
                }
                .qr-code {
                  margin-bottom: 10px;
                }
                .qr-title {
                  font-weight: bold;
                  margin-bottom: 5px;
                  font-size: 14px;
                }
                .qr-subtitle {
                  font-size: 12px;
                  color: #666;
                  margin-bottom: 5px;
                }
                .qr-id {
                  font-family: monospace;
                  font-size: 10px;
                  color: #999;
                }
                @media print {
                  body { margin: 0; }
                  .qr-grid { 
                    grid-template-columns: repeat(3, 1fr); 
                  }
                }
              </style>
            </head>
            <body>
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
                <h1>QR Codes - ${equipment.name}</h1>
                <p>Article: ${equipment.articleNumber} • Total: ${equipmentInstances?.length || 0} instances</p>
              </div>
              
              <div class="qr-grid">
                ${equipmentInstances?.map(instance => `
                  <div class="qr-item">
                    <div class="qr-code">
                      <div style="width: 128px; height: 128px; margin: 0 auto; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                        QR Code
                      </div>
                    </div>
                    <div class="qr-title">${equipment.name}</div>
                    <div class="qr-subtitle">Instance #${instance.instance_number}</div>
                    <div class="qr-id">${instance.qr_code}</div>
                  </div>
                `).join('')}
              </div>
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
        
        if (!printWindow) {
          toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
          return;
        }
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };

      } else {
        // QR code unique pour le lot
        const printContent = `
          <html>
            <head>
              <title>QR Code - ${equipment.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  color: #333;
                  text-align: center;
                }
                .header { 
                  margin-bottom: 30px; 
                  border-bottom: 2px solid #333; 
                  padding-bottom: 20px; 
                }
                .logo {
                  max-height: 60px;
                  max-width: 150px;
                  margin-bottom: 10px;
                }
                .qr-container {
                  border: 2px solid #333;
                  padding: 30px;
                  display: inline-block;
                  border-radius: 8px;
                  margin: 20px;
                }
                .qr-code {
                  margin-bottom: 20px;
                }
                .qr-title {
                  font-weight: bold;
                  margin-bottom: 10px;
                  font-size: 18px;
                }
                .qr-subtitle {
                  font-size: 14px;
                  color: #666;
                  margin-bottom: 10px;
                }
                .qr-id {
                  font-family: monospace;
                  font-size: 12px;
                  color: #999;
                }
                .quantity-info {
                  margin-top: 15px;
                  padding: 10px;
                  background: #f0f0f0;
                  border-radius: 4px;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
                <h1>QR Code - ${equipment.name}</h1>
              </div>
              
              <div class="qr-container">
                <div class="qr-code">
                  <div style="width: 200px; height: 200px; margin: 0 auto; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                    QR Code
                  </div>
                </div>
                <div class="qr-title">${equipment.name}</div>
                <div class="qr-subtitle">${equipment.articleNumber}</div>
                <div class="qr-id">${equipment.id}</div>
                <div class="quantity-info">
                  <strong>Quantité totale: ${equipment.totalQuantity}</strong><br>
                  QR Code unique pour tout le lot
                </div>
              </div>
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
        
        if (!printWindow) {
          toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
          return;
        }
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

    } catch (error) {
      console.error('Error printing QR codes:', error);
      toast.error('Erreur lors de l\'impression des QR codes');
    }
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
        <div className="text-gray-500 dark:text-gray-400">Chargement du matériel...</div>
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
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nom
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                N° Article
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('serial_number')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  N° Série
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Catégorie
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('group')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Groupe
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {item.articleNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.serialNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.group && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        {item.group}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        availableCount === 0 ? 'text-red-600 dark:text-red-400' :
                        availableCount < totalCount ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {availableCount}/{totalCount}
                      </span>
                      {item.qrType === 'batch' && totalCount > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">(lot)</span>
                      )}
                      {item.qrType === 'individual' && totalCount > 1 && (
                        <span className="text-xs text-blue-500 dark:text-blue-400">(indiv.)</span>
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
                      icon={<Printer size={16} />}
                      onClick={() => handlePrintAllQRCodes(item)}
                    >
                      Imprimer
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
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-2 leading-tight">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {item.articleNumber}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {item.serialNumber}
                </p>
                {item.category && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.category}
                  </p>
                )}
                {item.group && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    📁 {item.group}
                  </p>
                )}
                {item.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📍 {item.location}
                  </p>
                )}
                {totalCount > 1 && (
                  <div className="flex items-center gap-1">
                    <Package size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.qrType === 'batch' ? `${totalCount} pcs (lot)` : `${totalCount} pcs`}
                    </span>
                  </div>
                )}
              </div>

              {/* Description tronquée */}
              {item.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
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
                  className="text-xs px-2 py-1"
                >
                  QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer size={14} />}
                  onClick={() => handlePrintAllQRCodes(item)}
                  className="text-xs px-2 py-1"
                >
                  Print
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Matériel</h1>
        
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              icon={<LayoutGrid size={18} />}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              Grille
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={<List size={18} />}
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              Liste
            </Button>
          </div>
          <Button 
            variant="outline" 
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(true)}
          >
            Filtres
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded-full">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </Button>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => setShowAddModal(true)}
          >
            Ajouter Matériel
          </Button>
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun matériel
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Commencez par ajouter votre premier matériel.
            </p>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setShowAddModal(true)}
            >
              Ajouter du matériel
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'list' ? renderListView() : renderGridView()}
          
          {filteredEquipment.length === 0 && equipment.length > 0 && (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
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
        title="QR Code Matériel"
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
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le matériel "${equipmentToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      />
    </div>
  );
};

export default EquipmentPage;
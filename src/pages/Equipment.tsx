import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import { EditEquipmentModal } from '../components/equipment/EditEquipmentModal';
import { QRCodeGenerator } from '../components/QRCode/QRCodeGenerator';
import { QRCodesModal } from '../components/equipment/QRCodesModal';
import { MaintenanceModal } from '../components/maintenance/MaintenanceModal';
import { MaintenanceHistoryModal } from '../components/maintenance/MaintenanceHistoryModal';
import { CheckoutModal } from '../components/checkout/CheckoutModal';
import { ReturnModal } from '../components/checkout/ReturnModal';
import { FilterPanel } from '../components/common/FilterPanel';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ExcelImport } from '../components/import/ExcelImport';
import { Plus, QrCode, Wrench, History, LogOut, LogIn, Edit, Trash2, Download, Upload, Search, Filter } from 'lucide-react';
import { Equipment as EquipmentType, EquipmentInstance } from '../types';
import { useStatusColors } from '../hooks/useStatusColors';

export function Equipment() {
  const {
    equipment,
    categories,
    suppliers,
    equipmentGroups,
    equipmentSubgroups,
    equipmentInstances,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    refreshData
  } = useAppContext();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRCodesModal, setShowQRCodesModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showMaintenanceHistoryModal, setShowMaintenanceHistoryModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedEquipmentForQR, setSelectedEquipmentForQR] = useState<EquipmentType | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<EquipmentInstance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    supplier: '',
    group: '',
    subgroup: ''
  });

  const { getStatusColor } = useStatusColors();

  const handleShowQR = (equipmentId: string, instance?: EquipmentInstance | null) => {
    const equipmentItem = equipment.find(eq => eq.id === equipmentId);
    if (!equipmentItem) return;

    // Si c'est un équipement avec QR individuels et plusieurs quantités
    if (equipmentItem.qrType === 'individual' && (equipmentItem.totalQuantity || 1) > 1) {
      setSelectedEquipmentForQR(equipmentItem);
      setShowQRCodesModal(true);
      return;
    }

    // Si c'est un équipment avec QR individuels mais une seule quantité
    if (equipmentItem.qrType === 'individual' && (equipmentItem.totalQuantity || 1) === 1) {
      // Récupérer l'instance si elle existe
      const equipmentInstances = getEquipmentInstances(equipmentId);
      const singleInstance = equipmentInstances.length > 0 ? equipmentInstances[0] : null;
      
      setSelectedEquipment(equipmentId);
      setSelectedInstance(singleInstance);
      setShowQRModal(true);
      return;
    }

    setSelectedEquipment(equipmentId);
    setSelectedInstance(instance || null);
    setShowQRModal(true);
  };

  const handleEdit = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowEditModal(true);
  };

  const handleDelete = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedEquipment) {
      await deleteEquipment(selectedEquipment);
      setShowDeleteModal(false);
      setSelectedEquipment(null);
    }
  };

  const handleMaintenance = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowMaintenanceModal(true);
  };

  const handleMaintenanceHistory = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowMaintenanceHistoryModal(true);
  };

  const handleCheckout = (equipmentId: string, instance?: EquipmentInstance) => {
    setSelectedEquipment(equipmentId);
    setSelectedInstance(instance || null);
    setShowCheckoutModal(true);
  };

  const handleReturn = (equipmentId: string, instance?: EquipmentInstance) => {
    setSelectedEquipment(equipmentId);
    setSelectedInstance(instance || null);
    setShowReturnModal(true);
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Numéro de série', 'Statut', 'Catégorie', 'Fournisseur', 'Localisation', 'Date d\'ajout'];
    const csvContent = [
      headers.join(','),
      ...filteredEquipment.map(eq => [
        `"${eq.name}"`,
        `"${eq.serialNumber}"`,
        `"${eq.status}"`,
        `"${categories.find(c => c.id === eq.categoryId)?.name || ''}"`,
        `"${suppliers.find(s => s.id === eq.supplierId)?.name || ''}"`,
        `"${eq.location || ''}"`,
        `"${eq.addedDate ? new Date(eq.addedDate).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'equipment.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (eq.articleNumber && eq.articleNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !filters.status || eq.status === filters.status;
    const matchesCategory = !filters.category || eq.categoryId === filters.category;
    const matchesSupplier = !filters.supplier || eq.supplierId === filters.supplier;
    const matchesGroup = !filters.group || eq.groupId === filters.group;
    const matchesSubgroup = !filters.subgroup || eq.subgroupId === filters.subgroup;

    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesGroup && matchesSubgroup;
  });

  const getEquipmentInstances = (equipmentId: string) => {
    return equipmentInstances.filter(instance => instance.equipmentId === equipmentId);
  };

  const renderEquipmentCard = (eq: EquipmentType) => {
    const category = categories.find(c => c.id === eq.categoryId);
    const supplier = suppliers.find(s => s.id === eq.supplierId);
    const group = equipmentGroups.find(g => g.id === eq.groupId);
    const subgroup = equipmentSubgroups.find(sg => sg.id === eq.subgroupId);
    const instances = getEquipmentInstances(eq.id);

    return (
      <Card key={eq.id} className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{eq.name}</h3>
            {eq.shortTitle && (
              <p className="text-sm text-gray-600 mb-2">{eq.shortTitle}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" color={getStatusColor(eq.status)}>
                {eq.status}
              </Badge>
              {category && (
                <Badge variant="outline" style={{ backgroundColor: category.color + '20', color: category.color }}>
                  {category.name}
                </Badge>
              )}
              {group && (
                <Badge variant="outline" style={{ backgroundColor: group.color + '20', color: group.color }}>
                  {group.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShowQR(eq.id)}
            >
              <QrCode className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(eq.id)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(eq.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          <div>
            <span className="font-medium">Numéro de série:</span>
            <p>{eq.serialNumber}</p>
          </div>
          {eq.articleNumber && (
            <div>
              <span className="font-medium">Numéro d'article:</span>
              <p>{eq.articleNumber}</p>
            </div>
          )}
          {supplier && (
            <div>
              <span className="font-medium">Fournisseur:</span>
              <p>{supplier.name}</p>
            </div>
          )}
          {eq.location && (
            <div>
              <span className="font-medium">Localisation:</span>
              <p>{eq.location}</p>
            </div>
          )}
          {eq.qrType === 'batch' && (
            <>
              <div>
                <span className="font-medium">Quantité totale:</span>
                <p>{eq.totalQuantity}</p>
              </div>
              <div>
                <span className="font-medium">Quantité disponible:</span>
                <p>{eq.availableQuantity}</p>
              </div>
            </>
          )}
        </div>

        {eq.qrType === 'individual' && instances.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Instances:</h4>
            <div className="grid grid-cols-1 gap-2">
              {instances.map(instance => (
                <div key={instance.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{instance.instanceNumber}</span>
                    <Badge variant="outline" color={getStatusColor(instance.status || 'available')}>
                      {instance.status || 'available'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowQR(eq.id, instance)}
                    >
                      <QrCode className="w-3 h-3" />
                    </Button>
                    {(instance.status === 'available' || !instance.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckout(eq.id, instance)}
                      >
                        <LogOut className="w-3 h-3" />
                      </Button>
                    )}
                    {instance.status === 'checked-out' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturn(eq.id, instance)}
                      >
                        <LogIn className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMaintenance(eq.id)}
          >
            <Wrench className="w-4 h-4 mr-1" />
            Maintenance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMaintenanceHistory(eq.id)}
          >
            <History className="w-4 h-4 mr-1" />
            Historique
          </Button>
          {eq.qrType === 'batch' && eq.availableQuantity > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCheckout(eq.id)}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sortir
            </Button>
          )}
          {eq.qrType === 'individual' && eq.status === 'available' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCheckout(eq.id)}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sortir
            </Button>
          )}
          {eq.status === 'checked-out' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReturn(eq.id)}
            >
              <LogIn className="w-4 h-4 mr-1" />
              Retourner
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Équipements</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un équipement
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par nom, numéro de série ou numéro d'article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtres
        </Button>
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          suppliers={suppliers}
          groups={equipmentGroups}
          subgroups={equipmentSubgroups}
          statusOptions={[
            { value: 'available', label: 'Disponible' },
            { value: 'checked-out', label: 'Sorti' },
            { value: 'maintenance', label: 'En maintenance' },
            { value: 'retired', label: 'Retiré' },
            { value: 'lost', label: 'Perdu' }
          ]}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map(renderEquipmentCard)}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun équipement trouvé.</p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={addEquipment}
        />
      )}

      {showEditModal && selectedEquipment && (
        <EditEquipmentModal
          equipmentId={selectedEquipment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEquipment(null);
          }}
          onUpdate={updateEquipment}
        />
      )}

      {showQRModal && selectedEquipment && (
        <Modal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedEquipment(null);
            setSelectedInstance(null);
          }}
          title="Code QR"
        >
          <QRCodeGenerator
            equipmentId={selectedEquipment}
            instance={selectedInstance}
          />
        </Modal>
      )}

      {showQRCodesModal && selectedEquipmentForQR && (
        <QRCodesModal
          equipment={selectedEquipmentForQR}
          onClose={() => {
            setShowQRCodesModal(false);
            setSelectedEquipmentForQR(null);
          }}
        />
      )}

      {showMaintenanceModal && selectedEquipment && (
        <MaintenanceModal
          equipmentId={selectedEquipment}
          onClose={() => {
            setShowMaintenanceModal(false);
            setSelectedEquipment(null);
          }}
        />
      )}

      {showMaintenanceHistoryModal && selectedEquipment && (
        <MaintenanceHistoryModal
          equipmentId={selectedEquipment}
          onClose={() => {
            setShowMaintenanceHistoryModal(false);
            setSelectedEquipment(null);
          }}
        />
      )}

      {showCheckoutModal && selectedEquipment && (
        <CheckoutModal
          equipmentId={selectedEquipment}
          instance={selectedInstance}
          onClose={() => {
            setShowCheckoutModal(false);
            setSelectedEquipment(null);
            setSelectedInstance(null);
          }}
        />
      )}

      {showReturnModal && selectedEquipment && (
        <ReturnModal
          equipmentId={selectedEquipment}
          instance={selectedInstance}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedEquipment(null);
            setSelectedInstance(null);
          }}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedEquipment(null);
          }}
          onConfirm={confirmDelete}
          title="Supprimer l'équipement"
          message="Êtes-vous sûr de vouloir supprimer cet équipement ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          variant="danger"
        />
      )}

      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importer des équipements"
        >
          <ExcelImport
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              setShowImportModal(false);
              refreshData();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
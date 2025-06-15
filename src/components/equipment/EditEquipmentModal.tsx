import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Equipment, Category, Supplier, EquipmentGroup } from '../../types';
import { Package, QrCode, Copy, AlertTriangle } from 'lucide-react';

interface EditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
}

const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({ isOpen, onClose, equipment }) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQrType, setCurrentQrType] = useState<'individual' | 'batch'>('individual');
  const [instances, setInstances] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    group_id: '',
    serial_number: '',
    status: 'available',
    supplier_id: '',
    location: '',
    image_url: '',
    short_title: '',
    total_quantity: 1,
    qr_type: 'individual' as 'individual' | 'batch'
  });

  useEffect(() => {
    if (isOpen && equipment) {
      fetchRelatedData();
      // Populate form with equipment data
      setFormData({
        name: equipment.name,
        description: equipment.description || '',
        category_id: '', // Will be set after fetching categories
        group_id: '', // Will be set after fetching groups
        serial_number: equipment.serialNumber,
        status: equipment.status,
        supplier_id: '', // Will be set after fetching suppliers
        location: equipment.location || '',
        image_url: equipment.imageUrl || '',
        short_title: equipment.shortTitle || '',
        total_quantity: equipment.totalQuantity || 1,
        qr_type: equipment.qrType || 'individual'
      });
      setCurrentQrType(equipment.qrType || 'individual');
    }
  }, [isOpen, equipment]);

  const fetchRelatedData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('equipment_groups')
        .select('*')
        .order('name');
      
      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Get current equipment data with relations
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name),
          equipment_groups(id, name)
        `)
        .eq('id', equipment.id)
        .single();

      if (equipmentError) throw equipmentError;

      // Update form data with current values
      setFormData(prev => ({
        ...prev,
        category_id: equipmentData.category_id || '',
        supplier_id: equipmentData.supplier_id || '',
        group_id: equipmentData.group_id || ''
      }));

      // Fetch instances if individual QR type
      if (equipmentData.qr_type === 'individual') {
        const { data: instancesData, error: instancesError } = await supabase
          .from('equipment_instances')
          .select('*')
          .eq('equipment_id', equipment.id)
          .order('instance_number');

        if (instancesError) throw instancesError;
        setInstances(instancesData || []);
      }

    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleQrTypeChange = async (newQrType: 'individual' | 'batch') => {
    if (newQrType === currentQrType) return;

    try {
      setIsLoading(true);

      if (newQrType === 'individual') {
        // Créer des instances individuelles
        const instances = [];
        for (let i = 1; i <= formData.total_quantity; i++) {
          instances.push({
            equipment_id: equipment.id,
            instance_number: i,
            qr_code: `${equipment.articleNumber}-${String(i).padStart(3, '0')}`,
            status: 'available'
          });
        }

        const { error: instancesError } = await supabase
          .from('equipment_instances')
          .insert(instances);

        if (instancesError) throw instancesError;

        // Recharger les instances
        const { data: newInstances } = await supabase
          .from('equipment_instances')
          .select('*')
          .eq('equipment_id', equipment.id)
          .order('instance_number');

        setInstances(newInstances || []);
        toast.success(`${formData.total_quantity} instances créées avec QR codes individuels`);

      } else {
        // Supprimer les instances existantes
        const { error: deleteError } = await supabase
          .from('equipment_instances')
          .delete()
          .eq('equipment_id', equipment.id);

        if (deleteError) throw deleteError;
        setInstances([]);
        toast.success('Instances supprimées, QR code unique pour le lot');
      }

      // Mettre à jour le type de QR dans la base de données
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ qr_type: newQrType })
        .eq('id', equipment.id);

      if (updateError) throw updateError;

      setCurrentQrType(newQrType);
      setFormData(prev => ({ ...prev, qr_type: newQrType }));

    } catch (error: any) {
      console.error('Error changing QR type:', error);
      toast.error('Erreur lors du changement de type de QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        group_id: formData.group_id || null,
        image_url: formData.image_url || null,
        description: formData.description || null,
        location: formData.location || null,
        short_title: formData.short_title || null
      };

      const { error } = await supabase
        .from('equipment')
        .update(dataToSubmit)
        .eq('id', equipment.id);

      if (error) throw error;

      toast.success(t('saved'));
      onClose();
    } catch (error: any) {
      console.error('Error updating equipment:', error);
      toast.error(error.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier le Matériel"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom du matériel *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('serialNumber')} *
            </label>
            <input
              type="text"
              name="serial_number"
              required
              value={formData.serial_number}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category')}
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('select')} {t('category')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('group')}
            </label>
            <select
              name="group_id"
              value={formData.group_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('select')} {t('group')}</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('supplier')}
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('select')} {t('supplier')}</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('status')}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="available">{t('available')}</option>
              <option value="checked-out">{t('checkedOut')}</option>
              <option value="maintenance">{t('maintenance')}</option>
              <option value="retired">{t('retired')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('location')}
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('totalQuantity')}
            </label>
            <input
              type="number"
              name="total_quantity"
              min="1"
              value={formData.total_quantity}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              La quantité disponible est calculée automatiquement selon les sorties et maintenances
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre court
            </label>
            <input
              type="text"
              name="short_title"
              value={formData.short_title}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL de l'image
            </label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Section QR Code Type */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Configuration des QR Codes
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  currentQrType === 'individual' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleQrTypeChange('individual')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    currentQrType === 'individual' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {currentQrType === 'individual' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <QrCode size={18} className="text-primary-600 dark:text-primary-400" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        QR Code individuel
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Chaque pièce a son propre QR code
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  currentQrType === 'batch' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleQrTypeChange('batch')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    currentQrType === 'batch' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {currentQrType === 'batch' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Copy size={18} className="text-green-600 dark:text-green-400" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        QR Code unique
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Un seul QR code pour toutes les pièces
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {currentQrType === 'individual' && instances.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Instances créées ({instances.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {instances.map((instance) => (
                    <div key={instance.id} className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">{instance.qr_code}</div>
                      <div className="text-gray-500">Instance #{instance.instance_number}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentQrType === 'individual' && formData.total_quantity !== instances.length && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Attention : Quantité modifiée
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      La quantité totale ({formData.total_quantity}) ne correspond pas au nombre d'instances ({instances.length}). 
                      Changez le type de QR pour recréer les instances.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditEquipmentModal;
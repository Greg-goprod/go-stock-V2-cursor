import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Equipment, Category, Supplier, EquipmentGroup, EquipmentSubgroup } from '../../types';
import { supabase } from '../../lib/supabase';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onUpdate: () => void;
}

const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({
  isOpen,
  onClose,
  equipment,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    serial_number: '',
    status: 'available' as const,
    location: '',
    supplier_id: '',
    image_url: '',
    short_title: '',
    qr_type: 'individual' as const,
    total_quantity: 1,
    available_quantity: 1,
    group_id: '',
    subgroup_id: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [subgroups, setSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQRCodes, setIsGeneratingQRCodes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (equipment) {
        setFormData({
          name: equipment.name,
          description: equipment.description || '',
          category_id: equipment.category_id || '',
          serial_number: equipment.serialNumber,
          status: equipment.status,
          location: equipment.location || '',
          supplier_id: equipment.supplier_id || '',
          image_url: equipment.imageUrl || '',
          short_title: equipment.shortTitle || '',
          qr_type: equipment.qrType || 'individual',
          total_quantity: equipment.totalQuantity || 1,
          available_quantity: equipment.availableQuantity || 1,
          group_id: equipment.group_id || '',
          subgroup_id: equipment.subgroup_id || ''
        });
      }
    }
  }, [isOpen, equipment]);

  const fetchData = async () => {
    try {
      const [categoriesRes, suppliersRes, groupsRes, subgroupsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('equipment_groups').select('*').order('name'),
        supabase.from('equipment_subgroups').select('*').order('name')
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (subgroupsRes.data) setSubgroups(subgroupsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  // Function to generate individual QR codes
  const generateIndividualQRCodes = async (equipmentId: string, articleNumber: string, quantity: number) => {
    try {
      // First, delete existing instances
      await supabase
        .from('equipment_instances')
        .delete()
        .eq('equipment_id', equipmentId);
      
      // Create new instances
      const instances = [];
      for (let i = 1; i <= quantity; i++) {
        instances.push({
          equipment_id: equipmentId,
          instance_number: i,
          qr_code: `${articleNumber}-${String(i).padStart(3, '0')}`,
          status: 'available'
        });
      }

      // Insert new instances
      const { error: instancesError } = await supabase
        .from('equipment_instances')
        .insert(instances);

      if (instancesError) throw instancesError;

      // Reload instances
      const { data: newInstances } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('instance_number');

    } catch (error) {
      console.error('Error generating QR codes:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    try {
      setIsLoading(true);

      const originalQuantity = equipment.totalQuantity || 1;
      const newQuantity = formData.total_quantity;
      const quantityChanged = originalQuantity !== newQuantity;
      const qrTypeChanged = equipment.qrType !== formData.qr_type;

      // Update equipment status and quantity
      const { error } = await supabase
        .from('equipment')
        .update({
          name: formData.name,
          description: formData.description || null,
          category_id: formData.category_id || null,
          serial_number: formData.serial_number,
          status: formData.status,
          location: formData.location || null,
          supplier_id: formData.supplier_id || null,
          image_url: formData.image_url || null,
          short_title: formData.short_title || null,
          qr_type: formData.qr_type,
          total_quantity: formData.total_quantity,
          available_quantity: formData.available_quantity,
          group_id: formData.group_id || null,
          subgroup_id: formData.subgroup_id || null
        })
        .eq('id', equipment.id);

      if (error) throw error;

      // If quantity changed or QR type changed to individual, regenerate QR codes
      if (formData.qr_type === 'individual' && (quantityChanged || qrTypeChanged)) {
        setIsGeneratingQRCodes(true);
        await generateIndividualQRCodes(
          equipment.id, 
          equipment.articleNumber || '', 
          formData.total_quantity
        );
      }

      toast.success('Équipement modifié avec succès');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating equipment:', error);
      toast.error(error.message || 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
      setIsGeneratingQRCodes(false);
    }
  };

  const filteredSubgroups = subgroups.filter(sg => sg.group_id === formData.group_id);

  // Disable the submit button when generating QR codes
  const isSubmitDisabled = isLoading || isGeneratingQRCodes;
  
  // Get submit button text
  const getSubmitButtonText = () => {
    return isGeneratingQRCodes ? 'Génération des QR codes...' : isLoading ? 'Modification en cours...' : 'Modifier';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier l'équipement"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre court
            </label>
            <input
              type="text"
              value={formData.short_title}
              onChange={(e) => setFormData(prev => ({ ...prev, short_title: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numéro de série *
            </label>
            <input
              type="text"
              value={formData.serial_number}
              onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="available">Disponible</option>
              <option value="checked-out">Emprunté</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retiré</option>
              <option value="lost">Perdu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fournisseur
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Sélectionner un fournisseur</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Groupe
            </label>
            <select
              value={formData.group_id}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                group_id: e.target.value,
                subgroup_id: '' // Reset subgroup when group changes
              }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Sélectionner un groupe</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sous-groupe
            </label>
            <select
              value={formData.subgroup_id}
              onChange={(e) => setFormData(prev => ({ ...prev, subgroup_id: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              disabled={!formData.group_id}
            >
              <option value="">Sélectionner un sous-groupe</option>
              {filteredSubgroups.map((subgroup) => (
                <option key={subgroup.id} value={subgroup.id}>
                  {subgroup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Localisation
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type de QR Code
            </label>
            <select
              value={formData.qr_type}
              onChange={(e) => setFormData(prev => ({ ...prev, qr_type: e.target.value as 'individual' | 'batch' }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="individual">Individuel</option>
              <option value="batch">Lot</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantité totale
            </label>
            <input
              type="number"
              min="1"
              value={formData.total_quantity}
              onChange={(e) => {
                const newValue = parseInt(e.target.value) || 1;
                setFormData(prev => ({ 
                  ...prev, 
                  total_quantity: newValue,
                  available_quantity: Math.min(prev.available_quantity, newValue)
                }));
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantité disponible
            </label>
            <input
              type="number"
              min="0"
              max={formData.total_quantity}
              value={formData.available_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: parseInt(e.target.value) || 0 }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL de l'image
          </label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            icon={<X size={18} />}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitDisabled}
            icon={<Save size={18} />}
          >
            {getSubmitButtonText()}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditEquipmentModal;
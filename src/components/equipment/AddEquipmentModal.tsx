import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Category, Supplier } from '../../types';
import { Package, Copy, QrCode } from 'lucide-react';

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'basic' | 'quantity'>('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    serial_number: '',
    status: 'available',
    supplier_id: '',
    location: '',
    image_url: '',
    short_title: ''
  });
  const [quantityData, setQuantityData] = useState({
    qrType: 'individual' as 'individual' | 'batch',
    totalQuantity: 1
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSuppliers();
      // Reset form when modal opens
      setStep('basic');
      setFormData({
        name: '',
        description: '',
        category_id: '',
        serial_number: '',
        status: 'available',
        supplier_id: '',
        location: '',
        image_url: '',
        short_title: ''
      });
      setQuantityData({
        qrType: 'individual',
        totalQuantity: 1
      });
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('quantity');
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // Préparer les données de l'équipement
      const equipmentData = {
        ...formData,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        image_url: formData.image_url || null,
        description: formData.description || null,
        location: formData.location || null,
        short_title: formData.short_title || null,
        qr_type: quantityData.qrType,
        total_quantity: quantityData.totalQuantity,
        available_quantity: quantityData.totalQuantity
      };

      // Insérer l'équipement
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .insert([equipmentData])
        .select()
        .single();

      if (equipmentError) throw equipmentError;

      // Si c'est un équipement avec QR individuels, créer les instances
      if (quantityData.qrType === 'individual' && quantityData.totalQuantity > 1) {
        const instances = [];
        for (let i = 1; i <= quantityData.totalQuantity; i++) {
          instances.push({
            equipment_id: equipment.id,
            instance_number: i,
            qr_code: `${equipment.id}-${i}`,
            status: 'available'
          });
        }

        const { error: instancesError } = await supabase
          .from('equipment_instances')
          .insert(instances);

        if (instancesError) throw instancesError;
      }

      toast.success(`Matériel ajouté avec succès${quantityData.totalQuantity > 1 ? ` (${quantityData.totalQuantity} pièces)` : ''}`);
      onClose();
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du matériel');
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

  const handleQuantityChange = (field: string, value: any) => {
    setQuantityData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'basic' ? "Ajouter du Matériel" : "Configuration des Quantités"}
      size="lg"
    >
      {step === 'basic' ? (
        <form onSubmit={handleBasicSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom *
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
                Numéro de série *
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
                Catégorie
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(category => (
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
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Statut
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="available">Disponible</option>
                <option value="checked-out">Emprunté</option>
                <option value="maintenance">En maintenance</option>
                <option value="retired">Retiré</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Emplacement
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
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
            >
              Suivant
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">
              Configuration des quantités et QR codes
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Définissez comment gérer les quantités et les QR codes pour ce matériel.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quantité totale
            </label>
            <input
              type="number"
              min="1"
              value={quantityData.totalQuantity}
              onChange={(e) => handleQuantityChange('totalQuantity', parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Type de QR Code
            </label>
            <div className="space-y-3">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  quantityData.qrType === 'individual' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleQuantityChange('qrType', 'individual')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    quantityData.qrType === 'individual' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {quantityData.qrType === 'individual' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <QrCode size={18} className="text-primary-600 dark:text-primary-400" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        QR Code individuel par pièce
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Chaque pièce aura son propre QR code unique. Idéal pour le suivi individuel.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Exemple: 5 perceuses = 5 QR codes différents
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  quantityData.qrType === 'batch' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleQuantityChange('qrType', 'batch')}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    quantityData.qrType === 'batch' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {quantityData.qrType === 'batch' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Copy size={18} className="text-green-600 dark:text-green-400" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        QR Code unique pour le lot
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Un seul QR code pour toutes les pièces. Idéal pour les articles identiques.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Exemple: 35 batteries = 1 QR code commun
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {quantityData.qrType === 'individual' && quantityData.totalQuantity > 1 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Package size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    {quantityData.totalQuantity} instances seront créées
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Chaque pièce aura son propre QR code et pourra être suivie individuellement.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('basic')}
            >
              Retour
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleFinalSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Création en cours...' : 'Créer le matériel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddEquipmentModal;
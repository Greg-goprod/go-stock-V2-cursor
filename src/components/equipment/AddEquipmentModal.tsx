Here's the fixed version with the missing closing brackets and corrected syntax:

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Accordion from '../common/Accordion';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Category, Supplier, EquipmentGroup, EquipmentSubgroup } from '../../types';
import { Package, Copy, QrCode, Settings, Info } from 'lucide-react';

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [subgroups, setSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'basic' | 'quantity'>('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    group_id: '',
    subgroup_id: '',
    serial_number: '',
    status: 'available',
    supplier_id: '',
    location: '',
    image_url: '',
    short_title: '',
    available_quantity: 1
  });
  const [quantityData, setQuantityData] = useState({
    qrType: 'individual' as 'individual' | 'batch',
    totalQuantity: 1
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSuppliers();
      fetchGroups();
      fetchSubgroups();
      // Reset form when modal opens
      setStep('basic');
      setFormData({
        name: '',
        description: '',
        category_id: '',
        group_id: '',
        subgroup_id: '',
        serial_number: '',
        status: 'available',
        supplier_id: '',
        location: '',
        image_url: '',
        short_title: '',
        available_quantity: 1
      });
      setQuantityData({
        qrType: 'individual',
        totalQuantity: 1
      });
    }
  }, [isOpen]);

  // Filter subgroups when group changes
  useEffect(() => {
    if (formData.group_id) {
      const filtered = subgroups.filter(sg => sg.groupId === formData.group_id);
      setFilteredSubgroups(filtered);
      
      // Reset subgroup selection if current selection is not valid for new group
      if (formData.subgroup_id && !filtered.find(sg => sg.id === formData.subgroup_id)) {
        setFormData(prev => ({ ...prev, subgroup_id: '' }));
      }
    } else {
      setFilteredSubgroups([]);
      setFormData(prev => ({ ...prev, subgroup_id: '' }));
    }
  }, [formData.group_id, subgroups]);

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

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_groups')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSubgroups = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_subgroups')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Transform data to match our interface
      const transformedSubgroups: EquipmentSubgroup[] = data?.map(sg => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        color: sg.color,
        groupId: sg.group_id,
        createdAt: sg.created_at
      })) || [];
      
      setSubgroups(transformedSubgroups);
    } catch (error) {
      console.error('Error fetching subgroups:', error);
    }
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Synchroniser la quantité totale avec la quantité disponible
    setQuantityData(prev => ({
      ...prev,
      totalQuantity: formData.available_quantity
    }));
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
        group_id: formData.group_id || null,
        subgroup_id: formData.subgroup_id || null,
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
            qr_code: `${equipment.article_number}-${String(i).padStart(3, '0')}`,
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

  // Synchroniser la quantité totale avec la quantité disponible
  useEffect(() => {
    if (step === 'quantity') {
      setQuantityData(prev => ({
        ...prev,
        totalQuantity: formData.available_quantity
      }));
    }
  }, [formData.available_quantity, step]);

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || '';
  };

  const getGroupColor = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.color || '#64748b';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'basic' ? "AJOUTER DU MATÉRIEL" : "CONFIGURATION DES QUANTITÉS"}
      size="lg"
    >
      {step === 'basic' ? (
        <div className="space-y-4">
          {/* Informations de base */}
          <Accordion
            title="INFORMATIONS DE BASE"
            icon={<Info size={18} className="text-blue-600 dark:text-blue-400" />}
            defaultOpen={false}
          >
            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Groupe
                  </label>
                  <select
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sélectionner un groupe</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {formData.group_id && (
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getGroupColor(formData.group_id) }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        📁 {getGroupName(formData.group_id)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sous-groupe
                  </label>
                  <select
                    name="subgroup_id"
                    value={formData.subgroup_id}
                    onChange={handleChange}
                    disabled={!formData.group_id}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.group_id ? 'Sélectionnez d\'abord un groupe' : 'Sélectionner un sous-groupe'}
                    </option>
                    {filteredSubgroups.map(subgroup => (
                      <option key={subgroup.id} value={subgroup.id}>
                        {subgroup.name}
                      </option>
                    ))}
                  </select>
                  {formData.subgroup_id && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getGroupColor(formData.group_id) }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: filteredSubgroups.find(sg => sg.id === formData.subgroup_id)?.color || '#64748b' }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        📂 {filteredSubgroups.find(sg => sg.id === formData.subgroup_id)?.name}
                      </span>
                    </div>
                  )}
                  {formData.group_id && filteredSubgroups.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Aucun sous-groupe disponible pour ce groupe
                    </p>
                  )}
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
                    placeholder="Ex: Bureau principal, Atelier..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantité disponible *
                  </label>
                  <input
                    type="number"
                    name="available_quantity"
                    min="1"
                    required
                    value={formData.available_quantity}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ ...prev, available_quantity: newValue }));
                    }}
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
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Aperçu hiérarchique */}
              {(formData.group_id || formData.subgroup_id) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    📁 Hiérarchie de classification
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {formData.category_id && (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          🏷️ {categories.find(c => c.id === formData.category_id)?.name}
                        </span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    {formData.group_id && (
                      <>
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: getGroupColor(formData.group_id) }}
                        >
                          📁 {getGroupName(formData.group_id)}
                        </span>
                        {formData.subgroup_id && <span className="text-gray-400">→</span>}
                      </>
                    )}
                    {formData.subgroup_id && (
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: filteredSubgroups.find(sg => sg.id === formData.subgroup_id)?.color || '#64748b' }}
                      >
                        📂 {filteredSubgroups.find(sg => sg.id === formData.subgroup_id)?.name}
                      </span>
                    )}
                    <span className="text-gray-400">→</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                      💻 {formData.name || 'Nom du matériel'}
                    </span>
                  </div>
                </div>
              )}

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
          </Accordion>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Configuration QR */}
          <Accordion
            title="CONFIGURATION QR CODES"
            icon={<QrCode size={18} className="text-purple-600 dark:text-purple-400" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Quantité configurée
                </h4>
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formData.available_quantity} unité{formData.available_quantity > 1 ? 's' : ''}
                  </span>
                </div>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
          </Accordion>
        </div>
      )}
    </Modal>
  );
};

export default AddEquipmentModal;
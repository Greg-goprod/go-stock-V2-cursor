import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Accordion from '../common/Accordion';
import ColorPicker from '../common/ColorPicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Equipment, Category, Supplier, EquipmentGroup, EquipmentSubgroup } from '../../types';
import { Package, QrCode, Copy, AlertTriangle, Info, Settings } from 'lucide-react';

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
  const [subgroups, setSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQRCodes, setIsGeneratingQRCodes] = useState(false);
  const [step, setStep] = useState<'basic' | 'quantity'>('basic');
  const [currentQrType, setCurrentQrType] = useState<'individual' | 'batch'>('individual');
  const [originalQuantity, setOriginalQuantity] = useState(1);
  const [instances, setInstances] = useState<any[]>([]);
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
    total_quantity: 1,
    qr_type: 'individual' as 'individual' | 'batch',
    available_quantity: 1
  });
  const [quantityData, setQuantityData] = useState({
    qrType: 'individual' as 'individual' | 'batch',
    totalQuantity: 1
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
        subgroup_id: '', // Will be set after fetching subgroups
        serial_number: equipment.serialNumber,
        status: equipment.status,
        supplier_id: '', // Will be set after fetching suppliers
        location: equipment.location || '',
        image_url: equipment.imageUrl || '',
        short_title: equipment.shortTitle || '',
        total_quantity: equipment.totalQuantity || 1,
        qr_type: equipment.qrType || 'individual',
        available_quantity: equipment.availableQuantity || 1
      });
      setCurrentQrType(equipment.qrType || 'individual');
      setOriginalQuantity(equipment.totalQuantity || 1);
      setQuantityData({
        qrType: equipment.qrType || 'individual',
        totalQuantity: equipment.totalQuantity || 1
      });
      setStep('basic');
    }
  }, [isOpen, equipment]);

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

      // Fetch subgroups
      const { data: subgroupsData, error: subgroupsError } = await supabase
        .from('equipment_subgroups')
        .select('*')
        .order('name');
      
      if (subgroupsError) throw subgroupsError;
      
      // Transform subgroups data
      const transformedSubgroups: EquipmentSubgroup[] = subgroupsData?.map(sg => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        color: sg.color,
        groupId: sg.group_id,
        createdAt: sg.created_at
      })) || [];
      setSubgroups(transformedSubgroups);

      // Get current equipment data with relations
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name),
          equipment_groups(id, name),
          equipment_subgroups(id, name)
        `)
        .eq('id', equipment.id)
        .single();

      if (equipmentError) throw equipmentError;

      // Update form data with current values
      setFormData(prev => ({
        ...prev,
        category_id: equipmentData.category_id || '',
        supplier_id: equipmentData.supplier_id || '',
        group_id: equipmentData.group_id || '',
        subgroup_id: equipmentData.subgroup_id || ''
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

  const generateQRCodes = async (equipmentId: string, articleNumber: string, quantity: number) => {
    try {
      setIsGeneratingQRCodes(true);
      
      // Delete existing instances
      const { error: deleteError } = await supabase
        .from('equipment_instances')
        .delete()
        .eq('equipment_id', equipmentId);
      
      if (deleteError) throw deleteError;
      
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
      
      // Insert new instances in batches to avoid payload size limits
      const batchSize = 50;
      for (let i = 0; i < instances.length; i += batchSize) {
        const batch = instances.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('equipment_instances')
          .insert(batch);
        
        if (insertError) throw insertError;
      }
      
      // Fetch the new instances
      const { data: newInstances, error: fetchError } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('instance_number');
      
      if (fetchError) throw fetchError;
      setInstances(newInstances || []);
      
      toast.success(`${quantity} QR codes générés avec succès`);
      return true;
    } catch (error: any) {
      console.error('Error generating QR codes:', error);
      toast.error(error.message || 'Erreur lors de la génération des QR codes');
      return false;
    } finally {
      setIsGeneratingQRCodes(false);
    }
  };

  const handleQrTypeChange = async (newQrType: 'individual' | 'batch') => {
    if (newQrType === currentQrType) return;

    try {
      setIsLoading(true);

      if (newQrType === 'individual') {
        // Générer des QR codes individuels
        const success = await generateQRCodes(
          equipment.id, 
          equipment.articleNumber || equipment.serialNumber, 
          formData.total_quantity
        );
        
        if (!success) return;
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
      setQuantityData(prev => ({ ...prev, qrType: newQrType }));

    } catch (error: any) {
      console.error('Error changing QR type:', error);
      toast.error('Erreur lors du changement de type de QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Synchroniser la quantité totale avec la quantité disponible
    setQuantityData(prev => ({
      ...prev,
      totalQuantity: formData.total_quantity
    }));
    setStep('quantity');
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setIsGeneratingQRCodes(false);

    try {
      const dataToSubmit = {
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
        total_quantity: quantityData.totalQuantity
      };

      // Vérifier si la quantité a changé
      const quantityChanged = originalQuantity !== quantityData.totalQuantity;
      const qrTypeChanged = currentQrType !== quantityData.qrType;
      
      // Mettre à jour l'équipement
      const { error } = await supabase
        .from('equipment')
        .update(dataToSubmit)
        .eq('id', equipment.id);

      if (error) throw error;

      // Si le type de QR est individuel et que la quantité a changé ou le type de QR a changé
      if (quantityData.qrType === 'individual' && (quantityChanged || qrTypeChanged)) {
        setIsGeneratingQRCodes(true);
        await generateQRCodes(
          equipment.id, 
          equipment.articleNumber || equipment.serialNumber, 
          quantityData.totalQuantity
        );
        setIsGeneratingQRCodes(false);
      }

      toast.success('Matériel modifié avec succès');
      onClose();
    } catch (error: any) {
      console.error('Error updating equipment:', error);
      toast.error(error.message || 'Erreur lors de la modification');
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
        totalQuantity: formData.total_quantity
      }));
    }
  }, [formData.total_quantity, step]);

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
      title={step === 'basic' ? "MODIFIER LE MATÉRIEL" : "CONFIGURATION DES QUANTITÉS"}
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
                    Quantité totale *
                  </label>
                  <input
                    type="number"
                    name="total_quantity"
                    min="1"
                    required
                    value={formData.total_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 1 }))}
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
                <div className="space-y-2">
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="https://example.com/image.jpg"
                />
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                   Entrez une URL d'image valide et accessible publiquement. Exemple: https://images.pexels.com/photos/1029243/pexels-photo-1029243.jpeg
                 </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Utilisez des sites comme <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Pexels</a> ou <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Unsplash</a> pour trouver des images libres de droits.
                </p>
                 {formData.image_url && (
                   <div className="mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                     <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Aperçu de l'image:</p>
                     <div className="flex justify-center">
                       <img 
                         src={formData.image_url} 
                         alt="Aperçu" 
                        className="h-32 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white shadow-sm"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           const errorMsg = document.createElement('p');
                           errorMsg.className = 'text-xs text-red-500 mt-2';
                          errorMsg.textContent = "⚠️ Impossible de charger l'image. Vérifiez que l'URL est correcte, accessible et se termine par .jpg, .jpeg, .png ou .webp";
                           e.currentTarget.parentElement?.appendChild(errorMsg);
                         }}
                       />
                     </div>
                   </div>
                 )}
                </div>
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
                    {formData.total_quantity} unité{formData.total_quantity > 1 ? 's' : ''}
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
                        Les QR codes seront régénérés lors de la sauvegarde.
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
                    disabled={isLoading || isGeneratingQRCodes}
                  >
                    {isGeneratingQRCodes ? 'Génération des QR codes...' : isLoading ? 'Modification en cours...' : 'Modifier le matériel'}
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

export default EditEquipmentModal;
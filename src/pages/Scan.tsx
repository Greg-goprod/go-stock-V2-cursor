import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeScanner from '../components/QRCode/QRCodeScanner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { ArrowLeft, Search, Package, User, FileText, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Equipment, User as UserType, CheckoutRecord } from '../types';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'equipment' | 'user' | 'checkout' | null>(null);
  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = async (decodedText: string) => {
    console.log("Scan détecté:", decodedText);
    setScannedId(decodedText);
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await identifyQRCode(decodedText);
    } catch (error: any) {
      console.error("Erreur lors de l'identification:", error);
      setError(error.message || "Erreur lors de l'identification du QR code");
      setItemType(null);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const identifyQRCode = async (id: string) => {
    console.log("Tentative d'identification du QR code:", id);
    
    // Normaliser le format du code scanné
    // Remplacer les apostrophes par des tirets si présentes
    const normalizedId = id.replace(/'/g, '-');
    
    // Vérifier si c'est un code d'instance (format: ART-20250614-0025-001)
    const isInstanceCode = /^[A-Z]+-\d+-\d+-\d+$/.test(normalizedId);
    
    // Extraire le code article de base si c'est un code d'instance
    let articleCode = normalizedId;
    if (isInstanceCode) {
      // Extraire la partie article sans le numéro d'instance
      const parts = normalizedId.split('-');
      if (parts.length >= 3) {
        articleCode = parts.slice(0, 3).join('-');
      }
    }
    
    console.log("Code normalisé:", normalizedId);
    console.log("Code article extrait:", articleCode);
    
    // Recherche par numéro de série exact
    let { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('*')
      .eq('serial_number', normalizedId)
      .maybeSingle();
    
    console.log("Recherche par numéro de série:", equipment, equipmentError);
    
    // Si pas trouvé par numéro de série, essayer par numéro d'article
    if (!equipment && !equipmentError) {
      const { data: equipmentByArticle, error: articleError } = await supabase
        .from('equipment')
        .select('*')
        .eq('article_number', normalizedId)
        .maybeSingle();
      
      console.log("Recherche par numéro d'article:", equipmentByArticle, articleError);
      
      if (equipmentByArticle) {
        equipment = equipmentByArticle;
      }
    }
    
    // Si pas trouvé par numéro d'article, essayer par code article extrait
    if (!equipment && !equipmentError) {
      const { data: equipmentByArticleCode, error: articleCodeError } = await supabase
        .from('equipment')
        .select('*')
        .eq('article_number', articleCode)
        .maybeSingle();
      
      console.log("Recherche par code article extrait:", equipmentByArticleCode, articleCodeError);
      
      if (equipmentByArticleCode) {
        equipment = equipmentByArticleCode;
      }
    }

    // Si toujours pas trouvé, essayer avec ILIKE pour une correspondance partielle
    if (!equipment && !equipmentError) {
      const { data: equipmentByPartialArticle, error: partialArticleError } = await supabase
        .from('equipment')
        .select('*')
        .ilike('article_number', `%${articleCode}%`)
        .limit(1);
      
      console.log("Recherche par correspondance partielle d'article:", equipmentByPartialArticle, partialArticleError);
      
      if (equipmentByPartialArticle && equipmentByPartialArticle.length > 0) {
        equipment = equipmentByPartialArticle[0];
      }
    }

    // Si on a trouvé un équipement
    if (equipment) {
      console.log("Équipement trouvé:", equipment);
      setItemType('equipment');
      
      // Récupérer les données de catégorie et fournisseur
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('id', equipment.category_id)
        .maybeSingle();
        
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', equipment.supplier_id)
        .maybeSingle();
      
      // Transformer les données pour correspondre à notre interface
      const transformedEquipment: Equipment = {
        id: equipment.id,
        name: equipment.name,
        description: equipment.description || '',
        category: categoryData?.name || '',
        serialNumber: equipment.serial_number,
        status: equipment.status as Equipment['status'],
        addedDate: equipment.added_date || equipment.created_at,
        lastMaintenance: equipment.last_maintenance,
        imageUrl: equipment.image_url,
        supplier: supplierData?.name || '',
        location: equipment.location || '',
        articleNumber: equipment.article_number,
        qrType: equipment.qr_type || 'individual',
        totalQuantity: equipment.total_quantity || 1,
        availableQuantity: equipment.available_quantity || 1,
        shortTitle: equipment.short_title
      };
      
      setItem(transformedEquipment);
      setSuccess(true);
      toast.success(`Équipement trouvé: ${equipment.name}`);
      return;
    }

    // Essayer de trouver une instance d'équipement
    const { data: instance, error: instanceError } = await supabase
      .from('equipment_instances')
      .select(`
        *,
        equipment(*)
      `)
      .eq('qr_code', normalizedId)
      .maybeSingle();

    console.log("Recherche instance:", instance, instanceError);

    if (instance) {
      console.log("Instance d'équipement trouvée:", instance);
      setItemType('equipment');
      
      // Transformer les données pour correspondre à notre interface
      const transformedEquipment: Equipment = {
        id: instance.equipment.id,
        name: instance.equipment.name,
        description: instance.equipment.description || '',
        category: '',
        serialNumber: instance.equipment.serial_number,
        status: instance.equipment.status as Equipment['status'],
        addedDate: instance.equipment.added_date || instance.equipment.created_at,
        lastMaintenance: instance.equipment.last_maintenance,
        imageUrl: instance.equipment.image_url,
        supplier: '',
        location: instance.equipment.location || '',
        articleNumber: instance.equipment.article_number,
        qrType: instance.equipment.qr_type || 'individual',
        totalQuantity: instance.equipment.total_quantity || 1,
        availableQuantity: instance.equipment.available_quantity || 1,
        shortTitle: instance.equipment.short_title
      };
      
      setItem({
        ...transformedEquipment,
        instance: {
          id: instance.id,
          instanceNumber: instance.instance_number,
          qrCode: instance.qr_code,
          status: instance.status
        }
      });
      
      setSuccess(true);
      toast.success(`Instance d'équipement trouvée: ${instance.equipment.name} #${instance.instance_number}`);
      return;
    }

    // Essayer de trouver un utilisateur par ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    console.log("Recherche utilisateur:", user, userError);

    if (user) {
      console.log("Utilisateur trouvé:", user);
      setItemType('user');
      
      // Transformer les données pour correspondre à notre interface
      const transformedUser: UserType = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        department: user.department,
        role: user.role as UserType['role'],
        dateCreated: user.created_at
      };
      
      setItem(transformedUser);
      setSuccess(true);
      toast.success(`Utilisateur trouvé: ${user.first_name} ${user.last_name}`);
      return;
    }

    // Essayer de trouver un checkout par ID
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select(`
        *,
        equipment(id, name, serial_number, article_number),
        users(id, first_name, last_name, email, department)
      `)
      .eq('id', id)
      .maybeSingle();

    console.log("Recherche checkout:", checkout, checkoutError);

    if (checkout) {
      console.log("Checkout trouvé:", checkout);
      setItemType('checkout');
      
      // Transformer les données pour correspondre à notre interface
      const transformedCheckout = {
        id: checkout.id,
        equipmentId: checkout.equipment_id,
        userId: checkout.user_id,
        checkoutDate: checkout.checkout_date,
        dueDate: checkout.due_date,
        returnDate: checkout.return_date,
        status: checkout.status,
        notes: checkout.notes,
        equipment: checkout.equipment,
        user: checkout.users
      };
      
      setItem(transformedCheckout);
      setSuccess(true);
      toast.success(`Emprunt trouvé pour: ${checkout.equipment?.name}`);
      return;
    }

    // Si on arrive ici, on n'a pas trouvé d'élément correspondant
    console.log("Aucun élément trouvé pour l'ID:", normalizedId);
    setItemType(null);
    setItem(null);
    throw new Error(`Aucun élément trouvé pour le code scanné: ${normalizedId}`);
  };

  const handleNavigateToItem = () => {
    if (!itemType || !item) return;

    switch (itemType) {
      case 'equipment':
        navigate(`/equipment`);
        break;
      case 'user':
        navigate(`/users`);
        break;
      case 'checkout':
        navigate(`/checkouts`);
        break;
    }
  };

  const handleReturnEquipment = async () => {
    if (itemType === 'checkout' && item && item.status === 'active') {
      try {
        setLoading(true);
        
        // Mettre à jour le statut du checkout
        const { error: checkoutError } = await supabase
          .from('checkouts')
          .update({
            status: 'returned',
            return_date: new Date().toISOString()
          })
          .eq('id', item.id);

        if (checkoutError) throw checkoutError;

        // Mettre à jour la quantité disponible de l'équipement
        const { data: equipmentData, error: equipmentFetchError } = await supabase
          .from('equipment')
          .select('available_quantity, total_quantity')
          .eq('id', item.equipmentId)
          .single();

        if (equipmentFetchError) throw equipmentFetchError;

        const newAvailableQuantity = (equipmentData.available_quantity || 0) + 1;
        const newStatus = newAvailableQuantity >= (equipmentData.total_quantity || 1) ? 'available' : 'checked-out';

        const { error: equipmentUpdateError } = await supabase
          .from('equipment')
          .update({
            status: newStatus,
            available_quantity: newAvailableQuantity
          })
          .eq('id', item.equipmentId);

        if (equipmentUpdateError) throw equipmentUpdateError;

        toast.success('Matériel retourné avec succès');
        
        // Mettre à jour l'état local
        setItem({
          ...item,
          status: 'returned',
          returnDate: new Date().toISOString()
        });
        
      } catch (error: any) {
        console.error('Erreur lors du retour:', error);
        toast.error(error.message || 'Erreur lors du retour du matériel');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SCANNER QR CODE</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Scannez un QR code pour identifier un matériel, un utilisateur ou un emprunt
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
      </div>

      <Card>
        <QRCodeScanner onScan={handleScan} onError={setError} />

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 pl-6">
              Essayez de scanner à nouveau ou saisissez manuellement le code dans le champ ci-dessus.
            </p>
          </div>
        )}

        {loading && !item && (
          <div className="mt-4 p-4 text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-primary-600 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Recherche en cours...</p>
          </div>
        )}

        {success && item && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {itemType === 'equipment' && `Équipement trouvé: ${item.name}`}
                {itemType === 'user' && `Utilisateur trouvé: ${item.first_name} ${item.last_name}`}
                {itemType === 'checkout' && `Emprunt trouvé pour: ${item.equipment?.name}`}
              </p>
            </div>
          </div>
        )}

        {item && (
          <div className="mt-6 p-4 border rounded-lg animate-fade-in">
            <div className="flex items-center mb-4">
              {itemType === 'equipment' && <Package size={24} className="text-primary-600 dark:text-primary-400 mr-2" />}
              {itemType === 'user' && <User size={24} className="text-primary-600 dark:text-primary-400 mr-2" />}
              {itemType === 'checkout' && <FileText size={24} className="text-primary-600 dark:text-primary-400 mr-2" />}
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {itemType === 'equipment' && 'Matériel identifié'}
                {itemType === 'user' && 'Utilisateur identifié'}
                {itemType === 'checkout' && 'Emprunt identifié'}
              </h3>
            </div>

            {itemType === 'equipment' && (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p><span className="font-medium">Nom:</span> {item.name}</p>
                <p><span className="font-medium">N° Série:</span> {item.serialNumber}</p>
                <p><span className="font-medium">Statut:</span> {item.status}</p>
                {item.instance && (
                  <p><span className="font-medium">Instance:</span> #{item.instance.instanceNumber} ({item.instance.qrCode})</p>
                )}
                {item.articleNumber && (
                  <p><span className="font-medium">N° Article:</span> {item.articleNumber}</p>
                )}
                {item.category && (
                  <p><span className="font-medium">Catégorie:</span> {item.category}</p>
                )}
                {item.location && (
                  <p><span className="font-medium">Emplacement:</span> {item.location}</p>
                )}
              </div>
            )}

            {itemType === 'user' && (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p><span className="font-medium">Nom:</span> {item.first_name} {item.last_name}</p>
                <p><span className="font-medium">Département:</span> {item.department}</p>
                <p><span className="font-medium">Email:</span> {item.email}</p>
                {item.phone && <p><span className="font-medium">Téléphone:</span> {item.phone}</p>}
              </div>
            )}

            {itemType === 'checkout' && (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p><span className="font-medium">Matériel:</span> {item.equipment?.name}</p>
                <p><span className="font-medium">N° Série:</span> {item.equipment?.serial_number}</p>
                <p><span className="font-medium">Utilisateur:</span> {item.user?.first_name} {item.user?.last_name}</p>
                <p><span className="font-medium">Statut:</span> {
                  item.status === 'active' ? 'Actif' :
                  item.status === 'returned' ? 'Retourné' :
                  item.status === 'overdue' ? 'En retard' :
                  item.status === 'lost' ? 'Perdu' : item.status
                }</p>
                <p><span className="font-medium">Date d'emprunt:</span> {new Date(item.checkoutDate).toLocaleDateString('fr-FR')}</p>
                <p><span className="font-medium">Date de retour prévue:</span> {new Date(item.dueDate).toLocaleDateString('fr-FR')}</p>
                {item.returnDate && (
                  <p><span className="font-medium">Date de retour effective:</span> {new Date(item.returnDate).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-3">
              <Button
                variant="primary"
                icon={<Search size={18} />}
                onClick={handleNavigateToItem}
              >
                Voir les détails
              </Button>

              {itemType === 'checkout' && item.status === 'active' && (
                <Button
                  variant="success"
                  icon={<ArrowLeft size={18} />}
                  onClick={handleReturnEquipment}
                  disabled={loading}
                >
                  {loading ? 'Traitement...' : 'Retourner le matériel'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Scan;
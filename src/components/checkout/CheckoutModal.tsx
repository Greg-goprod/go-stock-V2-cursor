import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, Equipment, Category, Supplier } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, User as UserIcon, Plus, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckoutItem {
  equipment: Equipment;
  quantity: number;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'equipment' | 'summary'>('user');
  const [users, setUsers] = useState<User[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset state when modal opens
      setStep('user');
      setSelectedUser(null);
      setCheckoutItems([]);
      setDueDate('');
      setNotes('');
      setSearchTerm('');
      setUserSearchTerm('');
      
      // Set default due date to today (same day as scan)
      const today = new Date();
      setDueDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('first_name');
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch equipment with related data
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name),
          equipment_groups(id, name)
        `)
        .eq('status', 'available')
        .gt('available_quantity', 0)
        .order('name');

      if (equipmentError) throw equipmentError;

      // Transform equipment data
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

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setStep('equipment');
    // Le scanner sera automatiquement actif grâce à l'autoFocus dans QRCodeScanner
  };

  const handleEquipmentScan = async (scannedId: string) => {
    console.log("Code scanné:", scannedId);
    
    // Normaliser le format du code scanné
    // Remplacer les apostrophes par des tirets si présentes
    const normalizedId = scannedId.replace(/'/g, '-');
    
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
    
    try {
      // Recherche par ID exact
      let foundEquipment = equipment.find(eq => eq.id === scannedId);
      
      // Si non trouvé, recherche par numéro de série exact
      if (!foundEquipment) {
        foundEquipment = equipment.find(eq => eq.serialNumber === scannedId);
      }
      
      // Si non trouvé, recherche par numéro d'article exact
      if (!foundEquipment) {
        foundEquipment = equipment.find(eq => eq.articleNumber === scannedId);
      }
      
      // Si non trouvé, recherche par numéro d'article normalisé
      if (!foundEquipment) {
        foundEquipment = equipment.find(eq => eq.articleNumber === normalizedId);
      }
      
      // Si non trouvé, recherche par numéro d'article extrait (sans numéro d'instance)
      if (!foundEquipment) {
        foundEquipment = equipment.find(eq => eq.articleNumber === articleCode);
      }
      
      // Si toujours pas trouvé, recherche par correspondance partielle
      if (!foundEquipment) {
        foundEquipment = equipment.find(eq => 
          eq.articleNumber?.includes(scannedId) || 
          eq.articleNumber?.includes(normalizedId) || 
          eq.articleNumber?.includes(articleCode)
        );
      }
      
      // Si toujours pas trouvé, essayer de faire une requête directe à la base de données
      if (!foundEquipment) {
        console.log("Équipement non trouvé en mémoire, recherche en base de données...");
        
        // Recherche directe dans la base de données avec ILIKE pour une correspondance partielle
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select(`
            *,
            categories(id, name),
            suppliers(id, name),
            equipment_groups(id, name)
          `)
          .or(`id.eq.${scannedId},serial_number.eq.${scannedId},article_number.eq.${scannedId},article_number.eq.${normalizedId},article_number.eq.${articleCode},article_number.ilike.%${articleCode}%`)
          .eq('status', 'available')
          .gt('available_quantity', 0)
          .limit(1);
        
        if (equipmentError) throw equipmentError;
        
        if (equipmentData && equipmentData.length > 0) {
          const eq = equipmentData[0];
          foundEquipment = {
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
          };
        }
      }

      if (foundEquipment) {
        console.log("Équipement trouvé:", foundEquipment);
        addEquipmentToCheckout(foundEquipment);
      } else {
        console.log("Aucun équipement trouvé pour:", scannedId);
        toast.error('Matériel non trouvé ou non disponible');
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de l'équipement:", error);
      toast.error('Erreur lors de la recherche du matériel');
    }
  };

  const addEquipmentToCheckout = (eq: Equipment) => {
    const existingItem = checkoutItems.find(item => item.equipment.id === eq.id);
    
    if (existingItem) {
      if (existingItem.quantity < eq.availableQuantity) {
        setCheckoutItems(prev =>
          prev.map(item =>
            item.equipment.id === eq.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`Quantité augmentée: ${eq.name}`);
      } else {
        toast.error(`Quantité maximale atteinte pour ${eq.name}`);
      }
    } else {
      setCheckoutItems(prev => [...prev, { equipment: eq, quantity: 1 }]);
      toast.success(`Ajouté: ${eq.name}`);
    }
  };

  const removeEquipmentFromCheckout = (equipmentId: string) => {
    setCheckoutItems(prev => prev.filter(item => item.equipment.id !== equipmentId));
  };

  const updateQuantity = (equipmentId: string, newQuantity: number) => {
    const item = checkoutItems.find(item => item.equipment.id === equipmentId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeEquipmentFromCheckout(equipmentId);
      return;
    }

    if (newQuantity > item.equipment.availableQuantity) {
      toast.error(`Quantité maximale disponible: ${item.equipment.availableQuantity}`);
      return;
    }

    setCheckoutItems(prev =>
      prev.map(item =>
        item.equipment.id === equipmentId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleCheckout = async () => {
    if (!selectedUser || checkoutItems.length === 0) {
      toast.error('Veuillez sélectionner un utilisateur et au moins un équipement');
      return;
    }

    if (!dueDate) {
      toast.error('Veuillez sélectionner une date de retour');
      return;
    }

    try {
      setIsLoading(true);

      // Create delivery note
      const { data: deliveryNote, error: deliveryNoteError } = await supabase
        .from('delivery_notes')
        .insert([{
          user_id: selectedUser.id,
          due_date: dueDate,
          notes: notes || null
        }])
        .select()
        .single();

      if (deliveryNoteError) throw deliveryNoteError;

      // Create checkouts for each item
      const checkoutPromises = checkoutItems.map(async (item) => {
        const checkouts = [];
        
        for (let i = 0; i < item.quantity; i++) {
          checkouts.push({
            equipment_id: item.equipment.id,
            user_id: selectedUser.id,
            delivery_note_id: deliveryNote.id,
            due_date: dueDate,
            status: 'active',
            notes: notes || null
          });
        }

        // Insert checkouts
        const { error: checkoutError } = await supabase
          .from('checkouts')
          .insert(checkouts);

        if (checkoutError) throw checkoutError;

        // Update equipment availability
        const newAvailableQuantity = item.equipment.availableQuantity - item.quantity;
        const newStatus = newAvailableQuantity === 0 ? 'checked-out' : 'available';

        const { error: equipmentError } = await supabase
          .from('equipment')
          .update({
            available_quantity: newAvailableQuantity,
            status: newStatus
          })
          .eq('id', item.equipment.id);

        if (equipmentError) throw equipmentError;
      });

      await Promise.all(checkoutPromises);

      // Add notification to localStorage
      const notification = {
        id: `checkout-${Date.now()}`,
        type: 'checkout',
        title: 'Nouvelle sortie de matériel',
        message: `Bon N° ${deliveryNote.note_number} créé pour ${selectedUser.first_name} ${selectedUser.last_name} (${checkoutItems.length} équipement${checkoutItems.length > 1 ? 's' : ''})`,
        date: new Date().toISOString(),
        priority: 'medium',
        read: false,
        relatedData: {
          note_number: deliveryNote.note_number,
          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
          user_department: selectedUser.department,
          equipment_count: checkoutItems.reduce((sum, item) => sum + item.quantity, 0)
        }
      };

      const existingNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      localStorage.setItem('checkout_notifications', JSON.stringify([notification, ...existingNotifications]));

      toast.success(`Sortie créée avec succès! Bon N° ${deliveryNote.note_number}`);
      
      // Print delivery note
      handlePrintDeliveryNote(deliveryNote, selectedUser, checkoutItems);
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Erreur lors de la création de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintDeliveryNote = async (deliveryNote: any, user: User, items: CheckoutItem[]) => {
    try {
      // Récupérer le logo depuis les paramètres système
      const { data: logoSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'company_logo')
        .maybeSingle();

      const logoUrl = logoSetting?.value || '';

      const printContent = `
        <html>
          <head>
            <title>Bon de Sortie ${deliveryNote.note_number} - GO-Mat</title>
            <style>
              body { 
                font-family: 'Roboto', Arial, sans-serif; 
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
                max-height: 80px;
                max-width: 200px;
                margin-bottom: 10px;
              }
              .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
              }
              .subtitle {
                font-size: 16px;
                color: #666;
                margin-bottom: 10px;
              }
              .note-number { 
                font-size: 24px; 
                font-weight: bold; 
                color: #2563eb; 
                margin-bottom: 10px; 
              }
              .info { 
                margin-bottom: 20px; 
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
              }
              .info-row {
                display: flex;
                margin-bottom: 8px;
              }
              .info-label {
                font-weight: bold;
                width: 150px;
                color: #555;
              }
              .items { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 30px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .items th, .items td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              .items th { 
                background-color: #2563eb; 
                color: white;
                font-weight: bold;
              }
              .items tr:nth-child(even) {
                background-color: #f8f9fa;
              }
              .signature { 
                margin-top: 50px; 
                display: flex;
                justify-content: space-between;
              }
              .signature-box {
                width: 45%;
                text-align: center;
              }
              .signature-line { 
                border-bottom: 2px solid #333; 
                width: 100%; 
                margin-top: 40px; 
                margin-bottom: 10px;
              }
              .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 12px; 
                color: #666; 
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
              .important-note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
              <div class="company-name">GO-Mat</div>
              <div class="subtitle">Gestion de Matériel</div>
              <div class="note-number">Bon de Sortie N° ${deliveryNote.note_number}</div>
              <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            
            <div class="info">
              <h3 style="margin-top: 0; color: #2563eb;">Informations de l'emprunteur</h3>
              <div class="info-row">
                <span class="info-label">Nom complet:</span>
                <span>${user.first_name} ${user.last_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${user.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Téléphone:</span>
                <span>${user.phone || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Département:</span>
                <span>${user.department}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date de retour prévue:</span>
                <span style="font-weight: bold; color: #dc2626;">${new Date(dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <h3 style="color: #2563eb; margin-bottom: 15px;">Matériel emprunté</h3>
            <table class="items">
              <thead>
                <tr>
                  <th style="width: 40%;">Matériel</th>
                  <th style="width: 25%;">Numéro de série</th>
                  <th style="width: 20%;">Article</th>
                  <th style="width: 15%;">Quantité</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="font-weight: 500;">${item.equipment.name}</td>
                    <td style="font-family: monospace; color: #666;">${item.equipment.serialNumber}</td>
                    <td style="font-family: monospace; color: #666;">${item.equipment.articleNumber || '-'}</td>
                    <td style="text-align: center; font-weight: bold; color: #2563eb;">${item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="important-note">
              <strong>⚠️ Important:</strong> Ce bon de sortie doit être conservé jusqu'au retour complet du matériel. 
              En cas de perte, veuillez contacter immédiatement le service de gestion du matériel.
            </div>

            <div class="signature">
              <div class="signature-box">
                <p><strong>Signature de l'emprunteur</strong></p>
                <p style="font-size: 12px; color: #666;">Je reconnais avoir reçu le matériel ci-dessus en bon état et m'engage à le restituer dans les mêmes conditions.</p>
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-size: 12px;">Date: _______________</p>
              </div>
              
              <div class="signature-box">
                <p><strong>Signature du responsable</strong></p>
                <p style="font-size: 12px; color: #666;">Matériel vérifié et remis en bon état de fonctionnement.</p>
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-size: 12px;">Date: _______________</p>
              </div>
            </div>

            <div class="footer">
              <p><strong>GO-Mat - Système de Gestion de Matériel</strong></p>
              <p>Pour tout retour, présentez ce bon ou indiquez le numéro: <strong>${deliveryNote.note_number}</strong></p>
              <p>En cas de problème, contactez le service de gestion du matériel.</p>
            </div>
          </body>
        </html>
      `;

      // Ouvrir dans une nouvelle fenêtre avec des dimensions spécifiques
      const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        toast.error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé avant d'imprimer
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
    } catch (error) {
      console.error('Error printing delivery note:', error);
      toast.error('Erreur lors de l\'impression');
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredEquipment = equipment.filter(eq =>
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (eq.articleNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SORTIE DE MATÉRIEL"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'user' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="ml-2 font-bold">Utilisateur</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'equipment' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'equipment' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="ml-2 font-bold">Matériel</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'summary' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'summary' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="ml-2 font-bold">Résumé</span>
          </div>
        </div>

        {/* Step 1: User Selection */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.department} • {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Equipment Selection */}
        {step === 'equipment' && (
          <div className="space-y-4">
            {/* Selected User Info */}
            {selectedUser && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <UserIcon size={20} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-200">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      {selectedUser.department} • {selectedUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scanner and Equipment Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scanner Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Scanner QR Code</h3>
                <QRCodeScanner onScan={handleEquipmentScan} />
              </div>

              {/* Manual Selection */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Sélection manuelle</h3>
                <input
                  type="text"
                  placeholder="Rechercher du matériel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredEquipment.slice(0, 10).map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                      onClick={() => addEquipmentToCheckout(eq)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {eq.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {eq.serialNumber} • Dispo: {eq.availableQuantity}
                        </p>
                      </div>
                      <Plus size={16} className="text-primary-600 dark:text-primary-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Items */}
            {checkoutItems.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                  Matériel sélectionné ({totalItems} article{totalItems > 1 ? 's' : ''})
                </h3>
                <div className="space-y-2">
                  {checkoutItems.map((item) => (
                    <div key={item.equipment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.equipment.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.equipment.serialNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Minus size={14} />}
                          onClick={() => updateQuantity(item.equipment.id, item.quantity - 1)}
                        />
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Plus size={14} />}
                          onClick={() => updateQuantity(item.equipment.id, item.quantity + 1)}
                          disabled={item.quantity >= item.equipment.availableQuantity}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<X size={14} />}
                          onClick={() => removeEquipmentFromCheckout(item.equipment.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('user')}
              >
                Retour
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep('summary')}
                disabled={checkoutItems.length === 0}
              >
                Continuer ({totalItems})
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-6">
            {/* User Summary */}
            {selectedUser && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Emprunteur</h3>
                <p className="text-blue-700 dark:text-blue-300">
                  {selectedUser.first_name} {selectedUser.last_name} • {selectedUser.department}
                </p>
              </div>
            )}

            {/* Equipment Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                Matériel à emprunter ({totalItems} article{totalItems > 1 ? 's' : ''})
              </h3>
              <div className="space-y-2">
                {checkoutItems.map((item) => (
                  <div key={item.equipment.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-medium">{item.equipment.name}</span>
                    <span className="text-sm text-gray-500">Qté: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Due Date and Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de retour prévue *
                </label>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-2">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    📅 Par défaut : retour le jour même ({new Date().toLocaleDateString('fr-FR')})
                  </p>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="Notes concernant cet emprunt..."
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('equipment')}
              >
                Retour
              </Button>
              <Button
                variant="primary"
                icon={<Printer size={18} />}
                onClick={handleCheckout}
                disabled={isLoading || !dueDate}
              >
                {isLoading ? 'Création en cours...' : 'Créer et Imprimer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
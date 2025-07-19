import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, Equipment, Category, Supplier } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, User as UserIcon, Plus, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserModal from '../users/UserModal';

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
  const [showUserModal, setShowUserModal] = useState(false);
  const [isManualSearchActive, setIsManualSearchActive] = useState(false);

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
      setIsManualSearchActive(false);
      
      // Set default due date to today (same day as scan)
      const today = new Date();
      setDueDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersResult, equipmentResult] = await Promise.all([
        supabase.from('users').select('*').order('last_name'),
        supabase
        .from('equipment')
        .select(`
          *,
            categories(id, name, color),
          suppliers(id, name),
            equipment_groups(id, name, color)
        `)
        .eq('status', 'available')
        .gt('available_quantity', 0)
          // Exclure les équipements en maintenance
          .neq('status', 'maintenance')
          .order('name')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (equipmentResult.error) throw equipmentResult.error;

      setUsers(usersResult.data || []);

      // Transform equipment data from snake_case to camelCase
      const transformedEquipment: Equipment[] = (equipmentResult.data || []).map(eq => ({
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
      }));

      setEquipment(transformedEquipment);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setShowUserModal(true);
  };

  const handleUserModalClose = () => {
    setShowUserModal(false);
    fetchData(); // Refresh users list
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setStep('equipment');
    // Le scanner sera automatiquement actif grâce à l'autoFocus dans QRCodeScanner
  };

  const handleEquipmentScan = async (scannedId: string) => {
    try {
      setIsLoading(true);
      // Normaliser l'ID en remplaçant les apostrophes par des tirets pour les UUID
      let normalizedId = scannedId.trim().toLowerCase();
    
      // Corriger le format UUID si nécessaire (remplacer les apostrophes par des tirets)
      if (normalizedId.includes("'")) {
        normalizedId = normalizedId.replace(/'/g, "-");
        console.log("Format UUID corrigé:", normalizedId);
      }
    
      // D'abord chercher dans les équipements déjà chargés
      let foundEquipment = equipment.find(eq => 
        eq.serialNumber.toLowerCase() === normalizedId ||
        eq.articleNumber?.toLowerCase() === normalizedId ||
        (eq.articleNumber && normalizedId.includes(eq.articleNumber.toLowerCase())) ||
        eq.id.toLowerCase() === normalizedId
      );
      
      // Si trouvé dans les équipements déjà chargés
      if (foundEquipment) {
        // Vérifier la disponibilité avec la nouvelle fonction SQL
        const { data: availabilityCheck, error: availabilityError } = await supabase!
          .rpc('check_equipment_availability', {
            equipment_id: foundEquipment.id,
            requested_quantity: 1
          });

        if (availabilityError) {
          console.error("Erreur lors de la vérification de disponibilité:", availabilityError);
          // Si l'erreur est liée à l'ambiguïté de la colonne, on considère l'équipement comme disponible
          if (availabilityError.code === '42702') {
            console.log("Contournement de l'erreur d'ambiguïté, vérification manuelle de la disponibilité");
            // Vérifier manuellement si l'équipement est disponible
            if (foundEquipment.availableQuantity && foundEquipment.availableQuantity > 0) {
              addEquipmentToCheckout(foundEquipment);
              return;
            } else {
              toast.error(`Équipement non disponible: Quantité insuffisante`);
              return;
            }
          } else {
            throw availabilityError;
          }
        }

        const availability = availabilityCheck?.[0];
        if (!availability?.is_available) {
          toast.error(`Équipement non disponible: ${availability?.message || 'Raison inconnue'}`);
          return;
        }

        addEquipmentToCheckout(foundEquipment);
        return;
      }
      
      // Si non trouvé, chercher dans la base de données avec vérification de disponibilité
        console.log("Équipement non trouvé en mémoire, recherche en base de données...");
        
        // Utiliser textSearch pour une recherche plus efficace
        let { data: equipmentData, error: equipmentError } = await supabase!
          .from('equipment')
          .select(`
            *,
            categories(id, name),
            suppliers(id, name),
            equipment_groups(id, name)
          `);
        
        // Filtrer côté client pour éviter les problèmes de syntaxe SQL avec les UUID
        if (equipmentData) {
          equipmentData = equipmentData.filter(eq => 
            (eq.id && eq.id.toLowerCase() === normalizedId) ||
            (eq.serial_number && eq.serial_number.toLowerCase() === normalizedId) ||
            (eq.article_number && eq.article_number.toLowerCase() === normalizedId) &&
            eq.status !== 'maintenance' &&
            eq.status !== 'retired' &&
            (eq.available_quantity > 0)
          );
        }
        
        if (equipmentError) {
          console.error("Erreur lors de la recherche en base de données:", equipmentError);
          throw equipmentError;
        }
        
        console.log("Résultat de la recherche en base de données:", equipmentData);
        
        if (!equipmentData || equipmentData.length === 0) {
          // Essayer une recherche plus souple si la recherche exacte n'a pas donné de résultats
          const { data: allEquipment, error: fuzzyError } = await supabase!
          .from('equipment')
          .select(`
            *,
            categories(id, name),
            suppliers(id, name),
            equipment_groups(id, name)
            `);
            
          if (fuzzyError) {
            console.error("Erreur lors de la recherche fuzzy:", fuzzyError);
            throw fuzzyError;
          }
          
          // Filtrer côté client pour la recherche fuzzy
          const fuzzyData = allEquipment?.filter(eq => 
            (eq.serial_number && eq.serial_number.toLowerCase().includes(normalizedId)) ||
            (eq.article_number && eq.article_number.toLowerCase().includes(normalizedId)) ||
            (eq.name && eq.name.toLowerCase().includes(normalizedId)) &&
            eq.status !== 'maintenance' &&
            eq.status !== 'retired' &&
            (eq.available_quantity > 0)
          ) || [];
          
          console.log("Résultat de la recherche fuzzy:", fuzzyData);
        
          if (fuzzyData && fuzzyData.length > 0) {
            equipmentData = fuzzyData;
          }
        }
        
        if (equipmentData && equipmentData.length > 0) {
          const eq = equipmentData[0];
        
        // Double vérification avec la fonction SQL
        const { data: availabilityCheck, error: availabilityError } = await supabase!
          .rpc('check_equipment_availability', {
            equipment_id: eq.id,
            requested_quantity: 1
          });

        if (availabilityError) {
          console.error("Erreur lors de la vérification de disponibilité (DB):", availabilityError);
          // Si l'erreur est liée à l'ambiguïté de la colonne, on vérifie manuellement
          if (availabilityError.code === '42702') {
            console.log("Contournement de l'erreur d'ambiguïté, vérification manuelle de la disponibilité");
            // Vérifier manuellement si l'équipement est disponible
            if (eq.available_quantity && eq.available_quantity > 0) {
              // Continuer avec la transformation et l'ajout
            } else {
              toast.error(`Équipement non disponible: Quantité insuffisante`);
              return;
            }
          } else {
            throw availabilityError;
          }
        } else {
          const availability = availabilityCheck?.[0];
          if (!availability?.is_available) {
            toast.error(`Équipement non disponible: ${availability?.message || 'Raison inconnue'}`);
            return;
          }
        }

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

        addEquipmentToCheckout(foundEquipment);
        // setScannedCode(''); // This line was removed from the new_code, so it's removed here.
        return;
      }
      
      toast.error('Équipement non trouvé ou non disponible');
      // setScannedCode(''); // This line was removed from the new_code, so it's removed here.
    } catch (error: any) {
      console.error('Error scanning equipment:', error);
      toast.error(error.message || 'Erreur lors de la recherche');
      // setScannedCode(''); // This line was removed from the new_code, so it's removed here.
    } finally {
      setIsLoading(false);
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
      
      // Generate and open PDF
      await generateDeliveryNotePDF(deliveryNote, selectedUser, checkoutItems);
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Erreur lors de la création de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDeliveryNotePDF = async (deliveryNote: any, user: User, items: CheckoutItem[]) => {
    try {
      // Récupérer le logo depuis les paramètres système
      const { data: logoSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'company_logo')
        .maybeSingle();

      const logoUrl = logoSetting?.value || '';
      const today = new Date();
      const formattedDate = today.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      // Générer le QR code pour le bon de sortie
      const noteQrCode = deliveryNote.qr_code || `DN-${deliveryNote.note_number}`;

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bon de Sortie ${deliveryNote.note_number} - GO-Mat</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                font-size: 10pt;
              }
              .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
              }
              .logo-container {
                width: 40%;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
              }
              .logo {
                max-height: 60px;
                max-width: 200px;
              }
              .company-info {
                text-align: right;
                width: 40%;
              }
              .company-name {
                font-size: 18pt;
                font-weight: bold;
                color: #4CAF50;
                margin-bottom: 5px;
              }
              .document-title {
                font-size: 14pt;
                font-weight: bold;
                margin: 20px 0;
                color: #333;
                text-align: center;
                text-transform: uppercase;
              }
              .document-number {
                font-weight: bold;
                color: #4CAF50;
              }
              .customer-info {
                margin-bottom: 20px;
              }
              .customer-box {
                border: 1px solid #ddd;
                padding: 10px;
                width: 50%;
                margin-left: auto;
              }
              .date-info {
                text-align: right;
                margin-bottom: 10px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th {
                background-color: #4CAF50;
                color: white;
                font-weight: bold;
                text-align: left;
                padding: 8px;
              }
              td {
                border: 1px solid #ddd;
                padding: 8px;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
              .total-row {
                font-weight: bold;
              }
              .footer {
                margin-top: 30px;
                border-top: 1px solid #ddd;
                padding-top: 10px;
                font-size: 9pt;
              }
              .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
              }
              .signature-box {
                width: 45%;
              }
              .signature-line {
                border-bottom: 1px solid #333;
                margin-top: 50px;
                margin-bottom: 5px;
              }
              .notes {
                margin-top: 20px;
                border: 1px solid #ddd;
                padding: 10px;
                background-color: #f9f9f9;
              }
              .page-number {
                text-align: center;
                font-size: 8pt;
                color: #777;
                margin-top: 20px;
              }
              .important-notice {
                margin-top: 20px;
                padding: 10px;
                background-color: #fff3cd;
                border: 1px solid #ffeeba;
                color: #856404;
              }
              .contact-info {
                display: flex;
                justify-content: space-between;
                font-size: 8pt;
                color: #777;
              }
              .qr-icons {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                max-width: 200px;
              }
              .qr-icon {
                width: 30px;
                height: 30px;
                background-color: #333;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 8pt;
                font-weight: bold;
              }
              .qr-label {
                font-size: 6pt;
                text-align: center;
                margin-top: 2px;
              }
              .print-button {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
              }
              .print-button:hover {
                background-color: #45a049;
              }
              .print-icon {
                width: 20px;
                height: 20px;
              }
              @media print {
                .print-button {
                  display: none;
                }
              }
              .qr-code-container {
                width: 50px;
                height: 50px;
                text-align: center;
                margin-left: 20px;
              }
              .qr-code {
                width: 100%;
                height: 100%;
              }
              .qr-code-label {
                text-align: center;
                font-size: 8pt;
                margin-top: 5px;
                color: #333;
                font-weight: bold;
              }
              .logo-and-qr {
                display: flex;
                align-items: flex-start;
              }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
          </head>
          <body>
            <button class="print-button" onclick="window.print()">
              <svg class="print-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              IMPRIMER
            </button>
            
            <div class="header">
              <div class="logo-container">
                <div class="logo-and-qr">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : `<div class="company-name">GO-Mat</div>`}
                  <div class="qr-code-container">
                    <canvas id="qrcode" class="qr-code"></canvas>
                    <div class="qr-code-label">Bon N° ${deliveryNote.note_number}</div>
                  </div>
                </div>
                <div class="qr-icons">
                  <div>
                    <div class="qr-icon">QR</div>
                    <div class="qr-label">SCAN MATÉRIEL</div>
                  </div>
                  <div>
                    <div class="qr-icon">PDF</div>
                    <div class="qr-label">TÉLÉCHARGER</div>
                  </div>
                  <div>
                    <div class="qr-icon">WWW</div>
                    <div class="qr-label">SITE WEB</div>
                  </div>
                </div>
              </div>
              <div class="company-info">
                <div class="company-name">GO-Mat</div>
                <div><strong>Emprunteur:</strong></div>
                <div>${user.first_name} ${user.last_name}</div>
                <div>Département: ${user.department}</div>
                <div>Email: ${user.email}</div>
                ${user.phone ? `<div>Téléphone: ${user.phone}</div>` : ''}
              </div>
            </div>
            
            <div class="date-info">
              <div>Date d'émission: ${formattedDate}</div>
              <div>Référence: ${deliveryNote.note_number}</div>
            </div>
            

            
            <div class="document-title">
              Bon de Sortie <span class="document-number">N° ${deliveryNote.note_number}</span>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">N°</th>
                  <th style="width: 45%;">Désignation</th>
                  <th style="width: 20%;">Référence</th>
                  <th style="width: 10%;">Quantité</th>
                  <th style="width: 20%;">Retour prévu</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.equipment.name}</td>
                    <td>${item.equipment.serialNumber}</td>
                    <td>${item.quantity}</td>
                    <td>${new Date(dueDate).toLocaleDateString('fr-FR')}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">Total articles:</td>
                  <td>${items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            
            ${notes ? `
              <div class="notes">
                <strong>Notes:</strong>
                <p>${notes}</p>
              </div>
            ` : ''}
            
            <div class="important-notice">
              <strong>Important:</strong> Ce bon de sortie doit être conservé et présenté lors du retour du matériel.
              En cas de perte ou de dommage du matériel, veuillez contacter immédiatement le service de gestion.
            </div>
            
            <div class="signatures">
              <div class="signature-box">
                <div><strong>Signature de l'emprunteur:</strong></div>
                <div class="signature-line"></div>
                <div>Date: ___________________</div>
              </div>
              <div class="signature-box">
                <div><strong>Signature du responsable:</strong></div>
                <div class="signature-line"></div>
                <div>Date: ___________________</div>
              </div>
            </div>
            
            <div class="footer">
              <div class="contact-info">
                <div>GO-PROD & GO-MAT, solutions evenementielles</div>
                <div>Tél: 01 23 45 67 89</div>
                <div>Email: contact@go-mat.fr</div>
              </div>
              <div class="page-number">Page 1/1</div>
            </div>

            <script>
              // Générer le QR code
              window.onload = function() {
                QRCode.toCanvas(document.getElementById('qrcode'), '${noteQrCode}', {
                  width: 50,
                  height: 50,
                  margin: 0,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                  }
                }, function(error) {
                  if (error) console.error(error);
                  console.log('QR code généré avec succès');
                });
              };
            </script>
          </body>
        </html>
      `;

      // Créer un Blob avec le contenu HTML
      const blob = new Blob([printContent], { type: 'text/html' });
      
      // Créer une URL pour le blob
      const blobUrl = URL.createObjectURL(blob);
      
      // Ouvrir dans un nouvel onglet
      window.open(blobUrl, '_blank');
      
      // Nettoyer l'URL après un délai
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      
      toast.success('Bon de sortie ouvert dans un nouvel onglet');
      
    } catch (error) {
      console.error('Error generating delivery note PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredEquipment = equipment.filter(eq => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    if (searchTermLower === '') return true; // Afficher tous les équipements si aucun terme de recherche
    
    // Recherche dans tous les champs pertinents
    return (
      eq.name.toLowerCase().includes(searchTermLower) ||
      eq.serialNumber.toLowerCase().includes(searchTermLower) ||
      (eq.articleNumber || '').toLowerCase().includes(searchTermLower) ||
      eq.category.toLowerCase().includes(searchTermLower) ||
      (eq.description || '').toLowerCase().includes(searchTermLower) ||
      (eq.group || '').toLowerCase().includes(searchTermLower) ||
      (eq.shortTitle || '').toLowerCase().includes(searchTermLower)
  );
  });

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
      {/* Modal pour ajouter un utilisateur */}
      <UserModal
        isOpen={showUserModal}
        onClose={handleUserModalClose}
      />

        {step === 'user' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Sélectionner un utilisateur</h3>
              <Button
                variant="success"
                size="sm"
                icon={<Plus size={14} />}
                onClick={handleAddUser}
              >
                AJOUTER UN CONTACT
              </Button>
            </div>
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
                    <div className="flex items-center gap-2">
                      {/* This part of the code was not provided in the new_code, so it's kept as is. */}
                      {/* The original code had a complex image loading fallback, which is removed here. */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {user.first_name} {user.last_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.department} • {user.email}
                        </p>
                      </div>
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
                <QRCodeScanner 
                  onScan={handleEquipmentScan}
                  disableAutoFocus={isManualSearchActive} 
                />
              </div>

              {/* Manual Selection */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Sélection manuelle</h3>
                <input
                  type="text"
                  placeholder="Rechercher du matériel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsManualSearchActive(true)}
                  onBlur={() => setIsManualSearchActive(false)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
                
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredEquipment.map((eq) => (
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
                          {eq.serialNumber} • Dispo: {eq.availableQuantity} {eq.group ? `• ${eq.group}` : ''}
                        </p>
                      </div>
                      <Plus size={16} className="text-primary-600 dark:text-primary-400" />
                    </div>
                  ))}
                  {filteredEquipment.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      Aucun équipement trouvé
                    </div>
                  )}
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
                {isLoading ? 'Création en cours...' : 'Créer et Ouvrir PDF'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
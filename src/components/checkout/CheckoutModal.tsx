import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, UserPlus, Package, Plus, Trash2, Calendar, Printer, List, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckoutItem {
  equipment: Equipment;
  quantity: number;
}

interface NewEquipment {
  name: string;
  serialNumber: string;
  description: string;
}

interface StockInfo {
  total: number;
  borrowed: number;
  maintenance: number;
  available: number;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'equipment' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [newEquipment, setNewEquipment] = useState<NewEquipment[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states
  const [userSelectionMode, setUserSelectionMode] = useState<'list' | 'new'>('list');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newUserData, setNewUserData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    department: ''
  });
  
  // Equipment states
  const [equipmentMode, setEquipmentMode] = useState<'scan' | 'list' | 'new'>('scan');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [showNewEquipmentForm, setShowNewEquipmentForm] = useState(false);
  const [tempNewEquipment, setTempNewEquipment] = useState<NewEquipment>({
    name: '',
    serialNumber: '',
    description: ''
  });
  const [stockInfo, setStockInfo] = useState<Record<string, StockInfo>>({});

  // Scan tracking
  const [scanHistory, setScanHistory] = useState<Array<{
    id: string;
    value: string;
    timestamp: number;
    status: 'success' | 'error';
    message: string;
  }>>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchEquipment();
      // Set default due date to 7 days from now
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      setDueDate(defaultDueDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter equipment based on search and filter
    let filtered = equipment;
    
    if (equipmentSearch) {
      filtered = filtered.filter(eq => 
        eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        eq.description.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(equipmentSearch.toLowerCase())
      );
    }
    
    if (equipmentFilter) {
      filtered = filtered.filter(eq => eq.category === equipmentFilter);
    }
    
    setFilteredEquipment(filtered);
  }, [equipment, equipmentSearch, equipmentFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('first_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          categories(id, name),
          suppliers(id, name)
        `)
        .order('name');
      
      if (error) throw error;
      
      // Transform data to match our interface
      const transformedEquipment: Equipment[] = data?.map(eq => ({
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
        availableQuantity: eq.available_quantity || 1
      })) || [];
      
      setEquipment(transformedEquipment);
      
      // Calculate stock info for each equipment
      await calculateStockInfo(transformedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const calculateStockInfo = async (equipmentList: Equipment[]) => {
    try {
      // Fetch active checkouts
      const { data: checkouts, error: checkoutError } = await supabase
        .from('checkouts')
        .select('equipment_id')
        .eq('status', 'active');

      if (checkoutError) throw checkoutError;

      const stockInfoMap: Record<string, StockInfo> = {};

      equipmentList.forEach(eq => {
        const total = eq.totalQuantity || 1;
        const borrowed = checkouts?.filter(c => c.equipment_id === eq.id).length || 0;
        const maintenance = eq.status === 'maintenance' ? 1 : 0;
        const available = Math.max(0, total - borrowed - maintenance);

        stockInfoMap[eq.id] = {
          total,
          borrowed,
          maintenance,
          available
        };
      });

      setStockInfo(stockInfoMap);
    } catch (error) {
      console.error('Error calculating stock info:', error);
    }
  };

  // Fonction de normalisation intelligente des QR codes
  const normalizeQRCode = (qrValue: string): string[] => {
    console.log('🔍 Normalisation du QR code:', qrValue);
    
    const variants: string[] = [];
    const cleanValue = qrValue.replace(/[\r\n\t\s]/g, '').trim();
    
    // Ajouter la valeur originale
    variants.push(cleanValue);
    variants.push(qrValue.trim());
    
    // Générer des variantes avec différents séparateurs
    const withoutSeparators = cleanValue.replace(/[-'_]/g, '');
    const withDashes = cleanValue.replace(/['_]/g, '-');
    const withUnderscores = cleanValue.replace(/[-']/g, '_');
    const withQuotes = cleanValue.replace(/[-_]/g, "'");
    
    variants.push(withoutSeparators, withDashes, withUnderscores, withQuotes);
    
    // Variantes avec différents formats de date
    if (cleanValue.includes('20')) {
      const dateMatch = cleanValue.match(/(\w+)['_-]?(\d{8})['_-]?(\d+)['_-]?(\d+)?/);
      if (dateMatch) {
        const [, prefix, date, num1, num2] = dateMatch;
        variants.push(
          `${prefix}-${date}-${num1}`,
          `${prefix}'${date}'${num1}'${num2 || '001'}`,
          `${prefix}_${date}_${num1}_${num2 || '001'}`,
          `${prefix}${date}${num1}${num2 || '001'}`
        );
      }
    }
    
    // Supprimer les doublons et retourner
    const uniqueVariants = [...new Set(variants)].filter(Boolean);
    console.log('🔄 Variantes générées:', uniqueVariants);
    return uniqueVariants;
  };

  const handleEquipmentScan = async (scannedId: string) => {
    console.log('🎯 Scan matériel reçu:', scannedId);
    
    const scanId = Date.now().toString();
    const timestamp = Date.now();
    
    try {
      // Générer toutes les variantes possibles
      const variants = normalizeQRCode(scannedId);
      console.log('🔍 Test des variantes:', variants);
      
      let foundEquipment: Equipment | null = null;
      let matchedVariant = '';
      
      // Tester chaque variante contre tous les champs
      for (const variant of variants) {
        console.log(`🔎 Test variante: "${variant}"`);
        
        // Test par ID
        foundEquipment = equipment.find(e => e.id.toLowerCase() === variant.toLowerCase());
        if (foundEquipment) {
          matchedVariant = variant;
          console.log('✅ Trouvé par ID:', foundEquipment.name);
          break;
        }
        
        // Test par numéro d'article
        foundEquipment = equipment.find(e => 
          e.articleNumber && e.articleNumber.toLowerCase() === variant.toLowerCase()
        );
        if (foundEquipment) {
          matchedVariant = variant;
          console.log('✅ Trouvé par article_number:', foundEquipment.name);
          break;
        }
        
        // Test par numéro de série
        foundEquipment = equipment.find(e => 
          e.serialNumber && e.serialNumber.toLowerCase() === variant.toLowerCase()
        );
        if (foundEquipment) {
          matchedVariant = variant;
          console.log('✅ Trouvé par serial_number:', foundEquipment.name);
          break;
        }
      }
      
      if (foundEquipment) {
        const stock = stockInfo[foundEquipment.id];
        if (!stock || stock.available === 0) {
          const errorMsg = 'Ce matériel n\'est pas disponible';
          setScanHistory(prev => [...prev, {
            id: scanId,
            value: scannedId,
            timestamp,
            status: 'error',
            message: errorMsg
          }]);
          toast.error(errorMsg);
          return;
        }

        const existingItem = checkoutItems.find(item => item.equipment.id === foundEquipment!.id);
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        
        if (currentQuantity >= stock.available) {
          const errorMsg = 'Quantité maximale atteinte pour ce matériel';
          setScanHistory(prev => [...prev, {
            id: scanId,
            value: scannedId,
            timestamp,
            status: 'error',
            message: errorMsg
          }]);
          toast.error(errorMsg);
          return;
        }

        if (existingItem) {
          setCheckoutItems(prev => 
            prev.map(item => 
              item.equipment.id === foundEquipment!.id 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          );
        } else {
          setCheckoutItems(prev => [...prev, { equipment: foundEquipment!, quantity: 1 }]);
        }
        
        const successMsg = `${foundEquipment.name} ajouté (${matchedVariant})`;
        setScanHistory(prev => [...prev, {
          id: scanId,
          value: scannedId,
          timestamp,
          status: 'success',
          message: successMsg
        }]);
        toast.success(successMsg);
        
      } else {
        console.log('❌ Aucune correspondance trouvée pour:', scannedId);
        console.log('📋 Équipements disponibles:', equipment.map(e => ({
          id: e.id,
          article: e.articleNumber,
          serial: e.serialNumber,
          name: e.name
        })));
        
        const errorMsg = `Matériel non trouvé: ${scannedId}`;
        setScanHistory(prev => [...prev, {
          id: scanId,
          value: scannedId,
          timestamp,
          status: 'error',
          message: errorMsg
        }]);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      const errorMsg = 'Erreur lors du traitement du scan';
      setScanHistory(prev => [...prev, {
        id: scanId,
        value: scannedId,
        timestamp,
        status: 'error',
        message: errorMsg
      }]);
      toast.error(errorMsg);
    }
  };

  const handleSelectEquipmentFromList = (equipmentItem: Equipment) => {
    const stock = stockInfo[equipmentItem.id];
    if (!stock || stock.available === 0) {
      toast.error('Ce matériel n\'est pas disponible');
      return;
    }

    const existingItem = checkoutItems.find(item => item.equipment.id === equipmentItem.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentQuantity >= stock.available) {
      toast.error('Quantité maximale atteinte pour ce matériel');
      return;
    }

    if (existingItem) {
      setCheckoutItems(prev => 
        prev.map(item => 
          item.equipment.id === equipmentItem.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCheckoutItems(prev => [...prev, { equipment: equipmentItem, quantity: 1 }]);
    }
    toast.success(`${equipmentItem.name} ajouté`);
  };

  const handleCreateUser = async () => {
    if (!newUserData.first_name || !newUserData.last_name || !newUserData.phone) {
      toast.error('Prénom, nom et téléphone obligatoires');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...newUserData,
          role: 'user'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setSelectedUser(data);
      setStep('equipment');
      setUserSelectionMode('list');
      toast.success('Utilisateur créé avec succès');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewEquipment = () => {
    if (!tempNewEquipment.name || !tempNewEquipment.serialNumber) {
      toast.error('Nom et numéro de série obligatoires');
      return;
    }

    setNewEquipment(prev => [...prev, tempNewEquipment]);
    setTempNewEquipment({ name: '', serialNumber: '', description: '' });
    setShowNewEquipmentForm(false);
    toast.success('Matériel ajouté à la liste');
  };

  const handleCheckout = async () => {
    if (!selectedUser || (checkoutItems.length === 0 && newEquipment.length === 0)) {
      toast.error('Utilisateur et matériel requis');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Créer le bon de sortie
      const { data: deliveryNote, error: deliveryNoteError } = await supabase
        .from('delivery_notes')
        .insert([{
          user_id: selectedUser.id,
          due_date: dueDate,
          notes: notes
        }])
        .select()
        .single();

      if (deliveryNoteError) throw deliveryNoteError;

      // 2. Ajouter les nouveaux équipements à la base de données
      const addedEquipment: Equipment[] = [];
      for (const newEq of newEquipment) {
        const { data, error } = await supabase
          .from('equipment')
          .insert([{
            name: newEq.name,
            serial_number: newEq.serialNumber,
            description: newEq.description,
            status: 'checked-out',
            qr_type: 'individual',
            total_quantity: 1,
            available_quantity: 0
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Transform to match our interface
        const transformedEquipment: Equipment = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          category: '',
          serialNumber: data.serial_number,
          status: data.status as Equipment['status'],
          addedDate: data.created_at,
          lastMaintenance: data.last_maintenance,
          imageUrl: data.image_url,
          supplier: '',
          location: data.location || '',
          articleNumber: data.article_number,
          qrType: data.qr_type || 'individual',
          totalQuantity: data.total_quantity || 1,
          availableQuantity: data.available_quantity || 0
        };
        
        addedEquipment.push(transformedEquipment);
      }

      // 3. Créer les enregistrements de checkout pour les équipements existants
      const checkoutRecords = [];
      for (const item of checkoutItems) {
        for (let i = 0; i < item.quantity; i++) {
          checkoutRecords.push({
            equipment_id: item.equipment.id,
            user_id: selectedUser.id,
            delivery_note_id: deliveryNote.id,
            due_date: dueDate,
            status: 'active',
            notes: notes
          });
        }
      }

      // 4. Créer les enregistrements de checkout pour les nouveaux équipements
      for (const eq of addedEquipment) {
        checkoutRecords.push({
          equipment_id: eq.id,
          user_id: selectedUser.id,
          delivery_note_id: deliveryNote.id,
          due_date: dueDate,
          status: 'active',
          notes: notes
        });
      }

      if (checkoutRecords.length > 0) {
        const { error: checkoutError } = await supabase
          .from('checkouts')
          .insert(checkoutRecords);

        if (checkoutError) throw checkoutError;

        // 5. Mettre à jour le statut et les quantités des équipements
        for (const item of checkoutItems) {
          const stock = stockInfo[item.equipment.id];
          const newAvailableQuantity = Math.max(0, stock.available - item.quantity);
          const newStatus = newAvailableQuantity === 0 ? 'checked-out' : 'available';
          
          await supabase
            .from('equipment')
            .update({ 
              status: newStatus,
              available_quantity: newAvailableQuantity
            })
            .eq('id', item.equipment.id);
        }
      }

      // 6. Créer une notification de sortie
      const checkoutNotification = {
        id: `checkout-${deliveryNote.id}`,
        type: 'checkout',
        title: 'Nouveau bon de sortie créé',
        message: `Bon N° ${deliveryNote.note_number} créé pour ${selectedUser.first_name} ${selectedUser.last_name} (${checkoutRecords.length} matériel${checkoutRecords.length > 1 ? 's' : ''})`,
        date: new Date().toISOString(),
        priority: 'medium',
        read: false,
        relatedData: {
          delivery_note_id: deliveryNote.id,
          note_number: deliveryNote.note_number,
          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
          user_department: selectedUser.department,
          equipment_count: checkoutRecords.length
        }
      };

      // Sauvegarder la notification dans localStorage
      const existingNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      existingNotifications.unshift(checkoutNotification);
      localStorage.setItem('checkout_notifications', JSON.stringify(existingNotifications));

      toast.success(`Bon de sortie ${deliveryNote.note_number} créé avec succès`);
      handlePrintCheckout(deliveryNote.note_number);
      handleClose();
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error(error.message || 'Erreur lors de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintCheckout = async (noteNumber: string) => {
    try {
      // Récupérer le logo depuis les paramètres système
      const { data: logoSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'company_logo')
        .maybeSingle();

      const logoUrl = logoSetting?.value || '';

      const allItems = [
        ...checkoutItems.map(item => ({ name: item.equipment.name, serialNumber: item.equipment.serialNumber, quantity: item.quantity })),
        ...newEquipment.map(eq => ({ name: eq.name, serialNumber: eq.serialNumber, quantity: 1 }))
      ];

      const printContent = `
        <html>
          <head>
            <title>Bon de Sortie ${noteNumber} - GO-Mat</title>
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
              <div class="note-number">Bon de Sortie N° ${noteNumber}</div>
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
                <span>${selectedUser?.first_name} ${selectedUser?.last_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Téléphone:</span>
                <span>${selectedUser?.phone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${selectedUser?.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Département:</span>
                <span>${selectedUser?.department}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date de retour prévue:</span>
                <span style="font-weight: bold; color: #dc2626;">${new Date(dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
              ${notes ? `
                <div class="info-row">
                  <span class="info-label">Notes:</span>
                  <span>${notes}</span>
                </div>
              ` : ''}
            </div>

            <h3 style="color: #2563eb; margin-bottom: 15px;">Matériel emprunté</h3>
            <table class="items">
              <thead>
                <tr>
                  <th style="width: 50%;">Matériel</th>
                  <th style="width: 30%;">Numéro de série</th>
                  <th style="width: 20%;">Quantité</th>
                </tr>
              </thead>
              <tbody>
                ${allItems.map(item => `
                  <tr>
                    <td style="font-weight: 500;">${item.name}</td>
                    <td style="font-family: monospace; color: #666;">${item.serialNumber}</td>
                    <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
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
              <p>Pour tout retour, présentez ce bon ou indiquez le numéro: <strong>${noteNumber}</strong></p>
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
      console.error('Error printing checkout:', error);
      toast.error('Erreur lors de l\'impression');
    }
  };

  const handleClose = () => {
    setStep('user');
    setSelectedUser(null);
    setCheckoutItems([]);
    setNewEquipment([]);
    setNotes('');
    setUserSelectionMode('list');
    setEquipmentMode('scan');
    setShowNewEquipmentForm(false);
    setUserSearch('');
    setEquipmentSearch('');
    setEquipmentFilter('');
    setNewUserData({ first_name: '', last_name: '', phone: '', email: '', department: '' });
    setTempNewEquipment({ name: '', serialNumber: '', description: '' });
    setScanHistory([]);
    onClose();
  };

  const clearScanHistory = () => {
    setScanHistory([]);
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.phone || '').includes(userSearch)
  );

  const categories = Array.from(new Set(equipment.map(eq => eq.category))).filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sortie de Matériel"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'user' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="ml-2">Utilisateur</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'equipment' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'equipment' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="ml-2">Matériel</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'summary' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'summary' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="ml-2">Résumé</span>
          </div>
        </div>

        {/* Step 1: User Selection */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={userSelectionMode === 'list' ? 'primary' : 'outline'}
                icon={<List size={18} />}
                onClick={() => setUserSelectionMode('list')}
              >
                Liste Utilisateurs
              </Button>
              <Button
                variant={userSelectionMode === 'new' ? 'primary' : 'outline'}
                icon={<UserPlus size={18} />}
                onClick={() => setUserSelectionMode('new')}
              >
                Nouvel Utilisateur
              </Button>
            </div>

            {userSelectionMode === 'list' && (
              <div>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3"
                />
                
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedUser(user);
                        setStep('equipment');
                      }}
                    >
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-gray-500">{user.phone} • {user.department}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userSelectionMode === 'new' && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Nouvel Utilisateur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    value={newUserData.first_name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={newUserData.last_name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone *"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Département"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm col-span-2"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleCreateUser}
                    disabled={isLoading}
                  >
                    Créer et Continuer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUserSelectionMode('list')}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200">Utilisateur sélectionné</h3>
                <p className="text-green-700 dark:text-green-300">{selectedUser.first_name} {selectedUser.last_name} - {selectedUser.phone}</p>
                <Button
                  variant="primary"
                  onClick={() => setStep('equipment')}
                  className="mt-2"
                >
                  Continuer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Equipment Selection */}
        {step === 'equipment' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={equipmentMode === 'scan' ? 'primary' : 'outline'}
                icon={<Package size={18} />}
                onClick={() => setEquipmentMode('scan')}
              >
                Scanner QR Code
              </Button>
              <Button
                variant={equipmentMode === 'list' ? 'primary' : 'outline'}
                icon={<List size={18} />}
                onClick={() => setEquipmentMode('list')}
              >
                Liste Matériel
              </Button>
              <Button
                variant={equipmentMode === 'new' ? 'primary' : 'outline'}
                icon={<Plus size={18} />}
                onClick={() => {
                  setEquipmentMode('new');
                  setShowNewEquipmentForm(true);
                }}
              >
                Ajouter Matériel
              </Button>
            </div>

            {equipmentMode === 'scan' && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <QRCodeScanner onScan={handleEquipmentScan} />
                </div>

                {/* Historique des scans */}
                {scanHistory.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Historique des scans ({scanHistory.length})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearScanHistory}
                      >
                        Effacer
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {scanHistory.slice(-5).reverse().map((scan) => (
                        <div
                          key={scan.id}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            scan.status === 'success' 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={scan.status === 'success' ? '✅' : '❌'} />
                            <span className="font-mono text-xs">{scan.value}</span>
                          </div>
                          <span className="text-xs">
                            {new Date(scan.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {equipmentMode === 'list' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou description..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <select
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="">Toutes catégories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md">
                  {filteredEquipment.map(eq => {
                    const stock = stockInfo[eq.id] || { total: 0, borrowed: 0, maintenance: 0, available: 0 };
                    const isUnavailable = stock.available === 0;
                    const currentQuantity = checkoutItems.find(item => item.equipment.id === eq.id)?.quantity || 0;
                    const maxQuantity = Math.max(0, stock.available - currentQuantity);

                    return (
                      <div
                        key={eq.id}
                        className={`p-3 border-b last:border-b-0 transition-all ${
                          isUnavailable 
                            ? 'bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium">{eq.name}</div>
                              {isUnavailable && (
                                <span className="text-red-500 text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                  ⚠️ INDISPONIBLE
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{eq.serialNumber} • {eq.category}</div>
                            <div className="text-sm text-gray-400">{eq.description}</div>
                            
                            {/* Informations de stock détaillées */}
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span className={`font-medium ${
                                stock.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                ✅ Disponible: {stock.available}/{stock.total}
                              </span>
                              {stock.borrowed > 0 && (
                                <span className="text-orange-600 dark:text-orange-400">
                                  🟠 Emprunté: {stock.borrowed}
                                </span>
                              )}
                              {stock.maintenance > 0 && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  🔵 Maintenance: {stock.maintenance}
                                </span>
                              )}
                              {currentQuantity > 0 && (
                                <span className="text-purple-600 dark:text-purple-400">
                                  🟣 Sélectionné: {currentQuantity}
                                </span>
                              )}
                              {!isUnavailable && maxQuantity > 0 && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  Max: {maxQuantity}
                                </span>
                              )}
                              {maxQuantity === 0 && currentQuantity > 0 && (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                  Max atteint
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            {isUnavailable ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="cursor-not-allowed opacity-50"
                              >
                                Indisponible
                              </Button>
                            ) : maxQuantity === 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="cursor-not-allowed opacity-50"
                              >
                                Max atteint
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectEquipmentFromList(eq)}
                              >
                                Ajouter
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showNewEquipmentForm && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Nouveau Matériel</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom du matériel *"
                    value={tempNewEquipment.name}
                    onChange={(e) => setTempNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Numéro de série *"
                    value={tempNewEquipment.serialNumber}
                    onChange={(e) => setTempNewEquipment(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={tempNewEquipment.description}
                  onChange={(e) => setTempNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleAddNewEquipment}
                  >
                    Ajouter à la Liste
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewEquipmentForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Equipment List */}
            {(checkoutItems.length > 0 || newEquipment.length > 0) && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Matériel sélectionné</h3>
                <div className="space-y-2">
                  {checkoutItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <span className="font-medium">{item.equipment.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.equipment.serialNumber})</span>
                        <span className="text-sm text-gray-500 ml-2">Qté: {item.quantity}</span>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setCheckoutItems(prev => prev.filter((_, i) => i !== index))}
                      />
                    </div>
                  ))}
                  {newEquipment.map((item, index) => (
                    <div key={`new-${index}`} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.serialNumber})</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">[Nouveau]</span>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setNewEquipment(prev => prev.filter((_, i) => i !== index))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(checkoutItems.length > 0 || newEquipment.length > 0) && (
              <Button
                variant="primary"
                onClick={() => setStep('summary')}
              >
                Continuer vers le résumé
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                📋 Création du bon de sortie
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Un numéro de bon unique sera généré automatiquement pour faciliter le suivi et les retours.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date de retour prévue</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                icon={<Printer size={18} />}
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? 'Création en cours...' : 'Créer le Bon et Imprimer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('equipment')}
              >
                Retour
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
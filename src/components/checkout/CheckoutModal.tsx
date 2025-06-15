import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, UserPlus, Package, Plus, Trash2, Calendar, Printer, List, Filter, CheckCircle, AlertTriangle, User as UserIcon, Clock, ArrowRight } from 'lucide-react';
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

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  scannedValue: string;
  status: 'success' | 'error';
  equipmentName?: string;
  message: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'equipment' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [newEquipment, setNewEquipment] = useState<NewEquipment[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states - SUPPRESSION DU SCAN QR UTILISATEUR
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newUserData, setNewUserData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    department: ''
  });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  
  // Equipment states
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stockInfo, setStockInfo] = useState<Record<string, StockInfo>>({});
  
  // Scan states - NOUVEAU SYSTÈME SIMPLIFIÉ
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [lastScannedEquipment, setLastScannedEquipment] = useState<Equipment | null>(null);

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

  // 🎯 ALGORITHME DE RECHERCHE ULTRA-INTELLIGENT
  const handleEquipmentScan = (scannedId: string) => {
    console.log('🔍 === DÉBUT DE LA RECHERCHE INTELLIGENTE ===');
    console.log('🔍 Valeur brute scannée:', JSON.stringify(scannedId));
    console.log('🔍 Longueur:', scannedId.length);
    console.log('🔍 Caractères:', scannedId.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));

    // 🧹 NETTOYAGE ULTRA-COMPLET
    const cleanScannedId = scannedId
      .replace(/[\r\n\t\s]/g, '') // Supprimer espaces, tabs, retours
      .replace(/[^\w\-\.]/g, '') // Garder seulement lettres, chiffres, tirets, points
      .trim()
      .toUpperCase(); // Normaliser en majuscules

    console.log('🧹 Valeur nettoyée:', JSON.stringify(cleanScannedId));

    if (!cleanScannedId) {
      console.log('❌ Valeur vide après nettoyage');
      const errorMessage = 'QR code vide ou invalide';
      setScanHistory(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        scannedValue: scannedId,
        status: 'error',
        message: errorMessage
      }]);
      toast.error(`❌ ${errorMessage}`);
      return;
    }

    // 🔍 RECHERCHE MULTI-CRITÈRES INTELLIGENTE
    let equipmentItem: Equipment | undefined;
    let searchMethod = '';

    console.log('🔍 === RECHERCHE DANS', equipment.length, 'ÉQUIPEMENTS ===');

    // 1️⃣ RECHERCHE EXACTE PAR ID
    equipmentItem = equipment.find(e => e.id.toUpperCase() === cleanScannedId);
    if (equipmentItem) {
      searchMethod = 'ID exact';
      console.log('✅ Trouvé par ID exact:', equipmentItem.name);
    }

    // 2️⃣ RECHERCHE EXACTE PAR NUMÉRO D'ARTICLE
    if (!equipmentItem) {
      equipmentItem = equipment.find(e => 
        e.articleNumber && e.articleNumber.toUpperCase() === cleanScannedId
      );
      if (equipmentItem) {
        searchMethod = 'Numéro d\'article exact';
        console.log('✅ Trouvé par numéro d\'article:', equipmentItem.name);
      }
    }

    // 3️⃣ RECHERCHE EXACTE PAR NUMÉRO DE SÉRIE
    if (!equipmentItem) {
      equipmentItem = equipment.find(e => 
        e.serialNumber.toUpperCase() === cleanScannedId
      );
      if (equipmentItem) {
        searchMethod = 'Numéro de série exact';
        console.log('✅ Trouvé par numéro de série:', equipmentItem.name);
      }
    }

    // 4️⃣ RECHERCHE PARTIELLE PAR NUMÉRO D'ARTICLE (contient)
    if (!equipmentItem) {
      equipmentItem = equipment.find(e => 
        e.articleNumber && 
        (e.articleNumber.toUpperCase().includes(cleanScannedId) || 
         cleanScannedId.includes(e.articleNumber.toUpperCase()))
      );
      if (equipmentItem) {
        searchMethod = 'Numéro d\'article partiel';
        console.log('✅ Trouvé par numéro d\'article partiel:', equipmentItem.name);
      }
    }

    // 5️⃣ RECHERCHE PARTIELLE PAR NUMÉRO DE SÉRIE (contient)
    if (!equipmentItem) {
      equipmentItem = equipment.find(e => 
        e.serialNumber.toUpperCase().includes(cleanScannedId) || 
        cleanScannedId.includes(e.serialNumber.toUpperCase())
      );
      if (equipmentItem) {
        searchMethod = 'Numéro de série partiel';
        console.log('✅ Trouvé par numéro de série partiel:', equipmentItem.name);
      }
    }

    // 6️⃣ RECHERCHE PAR NOM (contient)
    if (!equipmentItem) {
      equipmentItem = equipment.find(e => 
        e.name.toUpperCase().includes(cleanScannedId) || 
        cleanScannedId.includes(e.name.toUpperCase())
      );
      if (equipmentItem) {
        searchMethod = 'Nom du matériel';
        console.log('✅ Trouvé par nom:', equipmentItem.name);
      }
    }

    // 7️⃣ RECHERCHE FUZZY (sans caractères spéciaux)
    if (!equipmentItem) {
      const fuzzyScanned = cleanScannedId.replace(/[^A-Z0-9]/g, '');
      equipmentItem = equipment.find(e => {
        const fuzzyArticle = (e.articleNumber || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
        const fuzzySerial = e.serialNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const fuzzyName = e.name.replace(/[^A-Z0-9]/g, '').toUpperCase();
        
        return fuzzyArticle === fuzzyScanned || 
               fuzzySerial === fuzzyScanned ||
               fuzzyName.includes(fuzzyScanned) ||
               fuzzyScanned.includes(fuzzyArticle) ||
               fuzzyScanned.includes(fuzzySerial);
      });
      if (equipmentItem) {
        searchMethod = 'Recherche fuzzy';
        console.log('✅ Trouvé par recherche fuzzy:', equipmentItem.name);
      }
    }

    // 8️⃣ RECHERCHE PAR SIMILARITÉ (Levenshtein distance)
    if (!equipmentItem) {
      const calculateSimilarity = (str1: string, str2: string): number => {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
          for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
              matrix[j][i - 1] + 1,
              matrix[j - 1][i] + 1,
              matrix[j - 1][i - 1] + indicator
            );
          }
        }
        
        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
      };

      let bestMatch: Equipment | undefined;
      let bestSimilarity = 0;

      equipment.forEach(e => {
        const similarities = [
          e.articleNumber ? calculateSimilarity(cleanScannedId, e.articleNumber.toUpperCase()) : 0,
          calculateSimilarity(cleanScannedId, e.serialNumber.toUpperCase()),
          calculateSimilarity(cleanScannedId, e.name.toUpperCase())
        ];
        
        const maxSimilarity = Math.max(...similarities);
        if (maxSimilarity > bestSimilarity && maxSimilarity > 0.7) { // 70% de similarité minimum
          bestSimilarity = maxSimilarity;
          bestMatch = e;
        }
      });

      if (bestMatch) {
        equipmentItem = bestMatch;
        searchMethod = `Similarité (${Math.round(bestSimilarity * 100)}%)`;
        console.log('✅ Trouvé par similarité:', equipmentItem.name, `(${Math.round(bestSimilarity * 100)}%)`);
      }
    }

    const timestamp = new Date().toLocaleTimeString('fr-FR');

    if (equipmentItem) {
      console.log('🎯 === ÉQUIPEMENT TROUVÉ ===');
      console.log('📦 Nom:', equipmentItem.name);
      console.log('🔢 Article:', equipmentItem.articleNumber);
      console.log('🏷️ Série:', equipmentItem.serialNumber);
      console.log('🔍 Méthode:', searchMethod);
      
      const stock = stockInfo[equipmentItem.id];
      if (!stock || stock.available === 0) {
        const errorMessage = 'Matériel non disponible';
        setScanHistory(prev => [...prev, {
          id: Date.now().toString(),
          timestamp,
          scannedValue: cleanScannedId,
          status: 'error',
          equipmentName: equipmentItem!.name,
          message: errorMessage
        }]);
        toast.error(`❌ ${errorMessage} (${equipmentItem.name})`);
        return;
      }

      const existingItem = checkoutItems.find(item => item.equipment.id === equipmentItem!.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentQuantity >= stock.available) {
        const errorMessage = 'Quantité maximale atteinte';
        setScanHistory(prev => [...prev, {
          id: Date.now().toString(),
          timestamp,
          scannedValue: cleanScannedId,
          status: 'error',
          equipmentName: equipmentItem!.name,
          message: errorMessage
        }]);
        toast.error(`❌ ${errorMessage} (${equipmentItem.name})`);
        return;
      }

      // ✅ AJOUT RÉUSSI
      if (existingItem) {
        setCheckoutItems(prev => 
          prev.map(item => 
            item.equipment.id === equipmentItem!.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        setCheckoutItems(prev => [...prev, { equipment: equipmentItem!, quantity: 1 }]);
      }

      setLastScannedEquipment(equipmentItem);
      setTotalScanned(prev => prev + 1);
      
      setScanHistory(prev => [...prev, {
        id: Date.now().toString(),
        timestamp,
        scannedValue: cleanScannedId,
        status: 'success',
        equipmentName: equipmentItem.name,
        message: `✅ Ajouté via ${searchMethod} (${(currentQuantity + 1)}/${stock.available})`
      }]);

      toast.success(`✅ ${equipmentItem.name} ajouté ! (${searchMethod})`);
    } else {
      console.log('❌ === ÉQUIPEMENT NON TROUVÉ ===');
      console.log('📋 Équipements disponibles dans la base:');
      equipment.slice(0, 5).forEach((eq, index) => {
        console.log(`  ${index + 1}. "${eq.name}"`);
        console.log(`     ID: ${eq.id}`);
        console.log(`     Article: ${eq.articleNumber || 'N/A'}`);
        console.log(`     Série: ${eq.serialNumber}`);
        console.log(`     ---`);
      });
      if (equipment.length > 5) {
        console.log(`  ... et ${equipment.length - 5} autres équipements`);
      }

      const errorMessage = `Matériel non trouvé (scanné: "${cleanScannedId}")`;
      setScanHistory(prev => [...prev, {
        id: Date.now().toString(),
        timestamp,
        scannedValue: cleanScannedId,
        status: 'error',
        message: errorMessage
      }]);
      toast.error(`❌ ${errorMessage}`);
    }

    console.log('🔍 === FIN DE LA RECHERCHE ===');
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
      setShowNewUserForm(false);
      toast.success('Utilisateur créé avec succès');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
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
                font-weight: 900;
                color: #2563eb;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .subtitle {
                font-size: 16px;
                color: #666;
                margin-bottom: 10px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .note-number { 
                font-size: 24px; 
                font-weight: 900; 
                color: #2563eb; 
                margin-bottom: 10px; 
                text-transform: uppercase;
                letter-spacing: 1px;
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
                font-weight: 700;
                width: 150px;
                color: #555;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
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
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: 12px;
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
                font-weight: 500;
              }
              .important-note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                font-weight: 500;
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
              <h3 style="margin-top: 0; color: #2563eb; font-weight: 900; text-transform: uppercase;">Informations de l'emprunteur</h3>
              <div class="info-row">
                <span class="info-label">Nom complet:</span>
                <span style="font-weight: 700;">${selectedUser?.first_name} ${selectedUser?.last_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Téléphone:</span>
                <span style="font-weight: 500;">${selectedUser?.phone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span style="font-weight: 500;">${selectedUser?.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Département:</span>
                <span style="font-weight: 700;">${selectedUser?.department}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date de retour prévue:</span>
                <span style="font-weight: 900; color: #dc2626;">${new Date(dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
              ${notes ? `
                <div class="info-row">
                  <span class="info-label">Notes:</span>
                  <span style="font-weight: 500;">${notes}</span>
                </div>
              ` : ''}
            </div>

            <h3 style="color: #2563eb; margin-bottom: 15px; font-weight: 900; text-transform: uppercase;">Matériel emprunté</h3>
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
                    <td style="font-weight: 700;">${item.name}</td>
                    <td style="font-family: monospace; color: #666; font-weight: 500;">${item.serialNumber}</td>
                    <td style="text-align: center; font-weight: 900;">${item.quantity}</td>
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
                <p><strong style="text-transform: uppercase; font-weight: 900;">Signature de l'emprunteur</strong></p>
                <p style="font-size: 12px; color: #666; font-weight: 500;">Je reconnais avoir reçu le matériel ci-dessus en bon état et m'engage à le restituer dans les mêmes conditions.</p>
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-size: 12px; font-weight: 700;">Date: _______________</p>
              </div>
              
              <div class="signature-box">
                <p><strong style="text-transform: uppercase; font-weight: 900;">Signature du responsable</strong></p>
                <p style="font-size: 12px; color: #666; font-weight: 500;">Matériel vérifié et remis en bon état de fonctionnement.</p>
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-size: 12px; font-weight: 700;">Date: _______________</p>
              </div>
            </div>

            <div class="footer">
              <p><strong style="font-weight: 900; text-transform: uppercase;">GO-Mat - Système de Gestion de Matériel</strong></p>
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
    setUserSearch('');
    setNewUserData({ first_name: '', last_name: '', phone: '', email: '', department: '' });
    setShowNewUserForm(false);
    setScanHistory([]);
    setTotalScanned(0);
    setLastScannedEquipment(null);
    onClose();
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.phone || '').includes(userSearch)
  );

  const clearScanHistory = () => {
    setScanHistory([]);
    setTotalScanned(0);
    setLastScannedEquipment(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="SORTIE MATÉRIEL"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator - DESIGN COHÉRENT */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'user' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${step === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="ml-2 font-black uppercase tracking-wide">UTILISATEUR</span>
          </div>
          <ArrowRight size={20} className="text-gray-300" />
          <div className={`flex items-center ${step === 'equipment' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${step === 'equipment' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="ml-2 font-black uppercase tracking-wide">SCAN MATÉRIEL</span>
          </div>
          <ArrowRight size={20} className="text-gray-300" />
          <div className={`flex items-center ${step === 'summary' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${step === 'summary' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="ml-2 font-black uppercase tracking-wide">FINALISER</span>
          </div>
        </div>

        {/* Step 1: User Selection - SANS SCAN QR */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-black text-blue-800 dark:text-blue-200 mb-2 uppercase tracking-wide">
                👤 SÉLECTIONNER L'UTILISATEUR
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                Choisissez un utilisateur existant ou créez-en un nouveau
              </p>
            </div>

            {/* Recherche utilisateur */}
            <div>
              <div className="relative mb-3">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => {
                      setSelectedUser(user);
                      setStep('equipment');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                        <span className="font-black text-sm">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {user.phone} • {user.department}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton nouvel utilisateur */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                icon={<UserPlus size={18} />}
                onClick={() => setShowNewUserForm(!showNewUserForm)}
                className="font-black"
              >
                CRÉER UN NOUVEL UTILISATEUR
              </Button>
            </div>

            {/* Formulaire nouvel utilisateur */}
            {showNewUserForm && (
              <div className="border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wide">CRÉER UN NOUVEL UTILISATEUR</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    value={newUserData.first_name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={newUserData.last_name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone *"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Département"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium col-span-2"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleCreateUser}
                    disabled={isLoading}
                    className="font-black"
                  >
                    {isLoading ? 'CRÉATION...' : 'CRÉER ET CONTINUER'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewUserForm(false)}
                    className="font-black"
                  >
                    ANNULER
                  </Button>
                </div>
              </div>
            )}

            {/* Utilisateur sélectionné */}
            {selectedUser && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                    <div>
                      <h3 className="font-black text-green-800 dark:text-green-200 uppercase tracking-wide">
                        UTILISATEUR SÉLECTIONNÉ
                      </h3>
                      <p className="text-green-700 dark:text-green-300 font-bold">
                        {selectedUser.first_name} {selectedUser.last_name} • {selectedUser.department}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    onClick={() => setStep('equipment')}
                    className="font-black"
                    icon={<ArrowRight size={18} />}
                  >
                    CONTINUER
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Equipment Scanning - ULTRA SIMPLIFIÉ SANS INTERFACE TECHNIQUE */}
        {step === 'equipment' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-lg font-black text-green-800 dark:text-green-200 mb-2 uppercase tracking-wide">
                📦 SCAN AUTOMATIQUE DU MATÉRIEL
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                Scannez directement avec votre douchette - Le scan démarre automatiquement !
              </p>
            </div>

            {/* Statistiques de scan en temps réel - DESIGN COHÉRENT */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {totalScanned}
                </div>
                <div className="text-sm font-black text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                  SCANNÉS
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-green-600 dark:text-green-400">
                  {checkoutItems.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div className="text-sm font-black text-green-800 dark:text-green-200 uppercase tracking-wide">
                  AJOUTÉS
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-red-600 dark:text-red-400">
                  {scanHistory.filter(h => h.status === 'error').length}
                </div>
                <div className="text-sm font-black text-red-800 dark:text-red-200 uppercase tracking-wide">
                  ERREURS
                </div>
              </div>
            </div>

            {/* Dernier article scanné */}
            {lastScannedEquipment && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package size={24} className="text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <h4 className="font-black text-yellow-800 dark:text-yellow-200 uppercase tracking-wide">
                      DERNIER ARTICLE SCANNÉ
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 font-bold">
                      {lastScannedEquipment.name}
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      {lastScannedEquipment.articleNumber} • {lastScannedEquipment.serialNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scanner QR automatique - SANS INTERFACE TECHNIQUE */}
            <div className="border rounded-lg p-4">
              <QRCodeScanner onScan={handleEquipmentScan} />
            </div>

            {/* Historique des scans - VERSION SIMPLIFIÉE */}
            {scanHistory.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wide">
                    HISTORIQUE DES SCANS ({scanHistory.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearScanHistory}
                    className="font-black"
                  >
                    EFFACER
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {scanHistory.slice().reverse().map((scan) => (
                    <div
                      key={scan.id}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        scan.status === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {scan.status === 'success' ? (
                          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <span className={`font-black ${
                            scan.status === 'success' 
                              ? 'text-green-800 dark:text-green-200' 
                              : 'text-red-800 dark:text-red-200'
                          }`}>
                            {scan.equipmentName || 'Matériel inconnu'}
                          </span>
                          <span className={`ml-2 text-xs font-medium ${
                            scan.status === 'success' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {scan.message}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} />
                        <span className="font-medium">{scan.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste du matériel sélectionné */}
            {checkoutItems.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-black text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                  MATÉRIEL SÉLECTIONNÉ ({checkoutItems.length})
                </h3>
                <div className="space-y-2">
                  {checkoutItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package size={20} className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <span className="font-black text-gray-900 dark:text-white">
                            {item.equipment.name}
                          </span>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {item.equipment.articleNumber} • Qté: {item.quantity}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setCheckoutItems(prev => prev.filter((_, i) => i !== index))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checkoutItems.length > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="success"
                  size="lg"
                  onClick={() => setStep('summary')}
                  className="font-black text-lg"
                  icon={<ArrowRight size={20} />}
                >
                  FINALISER LA SORTIE ({checkoutItems.length} ARTICLES)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-black text-blue-800 dark:text-blue-200 mb-2 uppercase tracking-wide">
                📋 FINALISATION DU BON DE SORTIE
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                Un numéro de bon unique sera généré automatiquement
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                  Date de retour prévue
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-medium"
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('equipment')}
                className="font-black"
              >
                ← RETOUR AU SCAN
              </Button>
              
              <Button
                variant="success"
                size="lg"
                icon={<Printer size={20} />}
                onClick={handleCheckout}
                disabled={isLoading}
                className="font-black text-lg"
              >
                {isLoading ? 'CRÉATION EN COURS...' : 'CRÉER LE BON ET IMPRIMER'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
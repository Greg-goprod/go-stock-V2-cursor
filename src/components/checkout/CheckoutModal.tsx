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

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteNumber: string;
  selectedUser: User | null;
  dueDate: string;
  notes: string;
  checkoutItems: CheckoutItem[];
  newEquipment: NewEquipment[];
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  noteNumber, 
  selectedUser, 
  dueDate, 
  notes, 
  checkoutItems, 
  newEquipment 
}) => {
  const allItems = [
    ...checkoutItems.map(item => ({ name: item.equipment.name, serialNumber: item.equipment.serialNumber, quantity: item.quantity })),
    ...newEquipment.map(eq => ({ name: eq.name, serialNumber: eq.serialNumber, quantity: 1 }))
  ];

  const handlePrint = () => {
    // Créer le contenu HTML pour l'impression
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bon de Sortie ${noteNumber} - GO-Mat</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            @media print {
              body { 
                margin: 0; 
                font-size: 12pt; 
                color: #000 !important;
                background: #fff !important;
              }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #000;
              background: #fff;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
            }
            .note-number { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2563eb; 
              margin-bottom: 10px; 
            }
            .info { 
              margin-bottom: 20px; 
              line-height: 1.6;
            }
            .items { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
            }
            .items th, .items td { 
              border: 1px solid #333; 
              padding: 8px; 
              text-align: left; 
            }
            .items th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
            .signature { 
              margin-top: 50px; 
            }
            .signature-line { 
              border-bottom: 1px solid #333; 
              width: 200px; 
              margin-top: 30px; 
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GO-Mat - Bon de Sortie</h1>
            <div class="note-number">N° ${noteNumber}</div>
            <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="info">
            <p><strong>Utilisateur:</strong> ${selectedUser?.first_name} ${selectedUser?.last_name}</p>
            <p><strong>Téléphone:</strong> ${selectedUser?.phone}</p>
            <p><strong>Département:</strong> ${selectedUser?.department}</p>
            <p><strong>Date de retour prévue:</strong> ${new Date(dueDate).toLocaleDateString('fr-FR')}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>Équipement</th>
                <th>Numéro de série</th>
                <th>Quantité</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.serialNumber}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature">
            <p>Je reconnais avoir reçu le matériel ci-dessus et m'engage à le restituer en bon état.</p>
            <p>Signature de l'utilisateur:</p>
            <div class="signature-line"></div>
            <p style="margin-top: 5px;">Date: _______________</p>
          </div>

          <div class="footer">
            <p>Ce bon de sortie doit être conservé jusqu'au retour complet du matériel.</p>
            <p>Pour tout retour, présentez ce bon ou indiquez le numéro: <strong>${noteNumber}</strong></p>
          </div>

          <!-- Deuxième copie -->
          <div class="page-break"></div>
          
          <div class="header">
            <h1>GO-Mat - Bon de Sortie (COPIE)</h1>
            <div class="note-number">N° ${noteNumber}</div>
            <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="info">
            <p><strong>Utilisateur:</strong> ${selectedUser?.first_name} ${selectedUser?.last_name}</p>
            <p><strong>Téléphone:</strong> ${selectedUser?.phone}</p>
            <p><strong>Département:</strong> ${selectedUser?.department}</p>
            <p><strong>Date de retour prévue:</strong> ${new Date(dueDate).toLocaleDateString('fr-FR')}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>Équipement</th>
                <th>Numéro de série</th>
                <th>Quantité</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.serialNumber}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature">
            <p>Je reconnais avoir reçu le matériel ci-dessus et m'engage à le restituer en bon état.</p>
            <p>Signature de l'utilisateur:</p>
            <div class="signature-line"></div>
            <p style="margin-top: 5px;">Date: _______________</p>
          </div>

          <div class="footer">
            <p>Ce bon de sortie doit être conservé jusqu'au retour complet du matériel.</p>
            <p>Pour tout retour, présentez ce bon ou indiquez le numéro: <strong>${noteNumber}</strong></p>
          </div>
        </body>
      </html>
    `;

    // Créer un blob avec le contenu HTML
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Créer un iframe caché pour l'impression
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '1px';
    printFrame.style.height = '1px';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    
    document.body.appendChild(printFrame);
    
    printFrame.onload = () => {
      try {
        // Lancer l'impression
        printFrame.contentWindow?.print();
        
        // Nettoyer après impression
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
          URL.revokeObjectURL(url);
        }, 1000);
        
      } catch (error) {
        console.error('Erreur lors de l\'impression:', error);
        toast.error('Erreur lors de l\'impression');
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        URL.revokeObjectURL(url);
      }
    };
    
    printFrame.src = url;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bon de sortie ${noteNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
            ✅ Bon de sortie créé avec succès !
          </h3>
          <p className="text-green-700 dark:text-green-300 text-sm">
            Le bon de sortie N° <strong>{noteNumber}</strong> a été créé et enregistré dans la base de données.
            Cliquez sur "Imprimer" pour imprimer automatiquement 2 copies du bon.
          </p>
        </div>
        
        {/* Aperçu du bon de sortie */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
            <h4 className="font-medium text-gray-900 dark:text-white">Aperçu du bon de sortie</h4>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-100 max-h-96 overflow-y-auto" style={{ 
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#000'
          }}>
            {/* Header */}
            <div className="text-center mb-6 pb-3 border-b-2 border-gray-800">
              <h1 className="text-xl font-bold mb-2 text-black">GO-Mat - Bon de Sortie</h1>
              <div className="text-lg font-bold text-blue-600 mb-2">N° {noteNumber}</div>
              <p className="text-sm text-black">Date d'émission: {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            
            {/* Informations utilisateur */}
            <div className="mb-6 text-black">
              <p className="mb-1"><strong>Utilisateur:</strong> {selectedUser?.first_name} {selectedUser?.last_name}</p>
              <p className="mb-1"><strong>Téléphone:</strong> {selectedUser?.phone}</p>
              <p className="mb-1"><strong>Département:</strong> {selectedUser?.department}</p>
              <p className="mb-1"><strong>Date de retour prévue:</strong> {new Date(dueDate).toLocaleDateString('fr-FR')}</p>
              {notes && <p className="mb-1"><strong>Notes:</strong> {notes}</p>}
            </div>

            {/* Tableau des équipements */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-2 py-2 text-left font-bold text-black">Équipement</th>
                  <th className="border border-gray-800 px-2 py-2 text-left font-bold text-black">Numéro de série</th>
                  <th className="border border-gray-800 px-2 py-2 text-left font-bold text-black">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-800 px-2 py-2 text-black">{item.name}</td>
                    <td className="border border-gray-800 px-2 py-2 text-black">{item.serialNumber}</td>
                    <td className="border border-gray-800 px-2 py-2 text-black">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature */}
            <div className="mt-12 text-black">
              <p className="mb-4">Je reconnais avoir reçu le matériel ci-dessus et m'engage à le restituer en bon état.</p>
              <p className="mb-4">Signature de l'utilisateur:</p>
              <div className="border-b border-gray-800 w-48 mb-2"></div>
              <p className="text-sm">Date: _______________</p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-600">
              <p>Ce bon de sortie doit être conservé jusqu'au retour complet du matériel.</p>
              <p>Pour tout retour, présentez ce bon ou indiquez le numéro: <strong>{noteNumber}</strong></p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Printer size={18} className="text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Information d'impression</h4>
          </div>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            L'impression générera automatiquement <strong>2 copies</strong> du bon de sortie :
          </p>
          <ul className="text-blue-700 dark:text-blue-300 text-sm mt-2 ml-4 list-disc">
            <li>Une copie pour l'utilisateur</li>
            <li>Une copie pour l'archive</li>
          </ul>
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Fermer
          </Button>
          <Button
            variant="primary"
            icon={<Printer size={18} />}
            onClick={handlePrint}
          >
            Imprimer (2 copies)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'equipment' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [newEquipment, setNewEquipment] = useState<NewEquipment[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states
  const [userSelectionMode, setUserSelectionMode] = useState<'scan' | 'new' | 'list'>('scan');
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
  const [showScanner, setShowScanner] = useState(false);
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

  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printNoteNumber, setPrintNoteNumber] = useState('');

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
        .eq('status', 'available')
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
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const handleUserScan = (scannedId: string) => {
    const user = users.find(u => u.id === scannedId);
    if (user) {
      setSelectedUser(user);
      setStep('equipment');
      toast.success(`Utilisateur sélectionné: ${user.first_name} ${user.last_name}`);
    } else {
      toast.error('Utilisateur non trouvé');
    }
  };

  const handleEquipmentScan = (scannedId: string) => {
    const equipmentItem = equipment.find(e => e.id === scannedId);
    if (equipmentItem) {
      const existingItem = checkoutItems.find(item => item.equipment.id === equipmentItem.id);
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
    } else {
      toast.error('Équipement non trouvé ou non disponible');
    }
  };

  const handleSelectEquipmentFromList = (equipmentItem: Equipment) => {
    const existingItem = checkoutItems.find(item => item.equipment.id === equipmentItem.id);
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
      setUserSelectionMode('scan');
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
    toast.success('Équipement ajouté à la liste');
  };

  // Fonction pour créer une notification de sortie
  const createCheckoutNotification = async (deliveryNote: any, equipmentCount: number) => {
    try {
      // Créer une notification système pour le mouvement de sortie
      const notificationData = {
        type: 'checkout',
        title: 'Nouveau bon de sortie créé',
        message: `Bon N° ${deliveryNote.note_number} créé pour ${selectedUser?.first_name} ${selectedUser?.last_name} (${equipmentCount} équipement${equipmentCount > 1 ? 's' : ''})`,
        priority: 'medium',
        read: false,
        related_data: {
          delivery_note_id: deliveryNote.id,
          note_number: deliveryNote.note_number,
          user_name: `${selectedUser?.first_name} ${selectedUser?.last_name}`,
          user_department: selectedUser?.department,
          equipment_count: equipmentCount,
          due_date: dueDate
        }
      };

      // Dans un vrai système, on stockerait cette notification en base de données
      // Pour cette démo, on l'ajoute au localStorage pour simulation
      const existingNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      const newNotification = {
        id: `checkout-${Date.now()}`,
        ...notificationData,
        date: new Date().toISOString()
      };
      
      existingNotifications.unshift(newNotification);
      localStorage.setItem('checkout_notifications', JSON.stringify(existingNotifications));

      console.log('Notification de sortie créée:', newNotification);
      
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }
  };

  const handleCheckout = async () => {
    if (!selectedUser || (checkoutItems.length === 0 && newEquipment.length === 0)) {
      toast.error('Utilisateur et équipements requis');
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
          const newAvailableQuantity = Math.max(0, (item.equipment.availableQuantity || 1) - item.quantity);
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

      // 6. Créer la notification de sortie
      const totalEquipmentCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0) + newEquipment.length;
      await createCheckoutNotification(deliveryNote, totalEquipmentCount);

      toast.success(`Bon de sortie ${deliveryNote.note_number} créé avec succès`);
      
      // Afficher la popup d'aperçu et d'impression
      setPrintNoteNumber(deliveryNote.note_number);
      setShowPrintPreview(true);
      
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error(error.message || 'Erreur lors de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('user');
    setSelectedUser(null);
    setCheckoutItems([]);
    setNewEquipment([]);
    setNotes('');
    setUserSelectionMode('scan');
    setEquipmentMode('scan');
    setShowScanner(false);
    setShowNewEquipmentForm(false);
    setUserSearch('');
    setEquipmentSearch('');
    setEquipmentFilter('');
    setNewUserData({ first_name: '', last_name: '', phone: '', email: '', department: '' });
    setTempNewEquipment({ name: '', serialNumber: '', description: '' });
    setShowPrintPreview(false);
    setPrintNoteNumber('');
    onClose();
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.phone || '').includes(userSearch)
  );

  const categories = Array.from(new Set(equipment.map(eq => eq.category))).filter(Boolean);

  return (
    <>
      <Modal
        isOpen={isOpen && !showPrintPreview}
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
              <span className="ml-2">Équipements</span>
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
                  variant={userSelectionMode === 'scan' ? 'primary' : 'outline'}
                  icon={<Search size={18} />}
                  onClick={() => setUserSelectionMode('scan')}
                >
                  Scanner Badge
                </Button>
                <Button
                  variant={userSelectionMode === 'new' ? 'primary' : 'outline'}
                  icon={<UserPlus size={18} />}
                  onClick={() => setUserSelectionMode('new')}
                >
                  Nouvel Utilisateur
                </Button>
                <Button
                  variant={userSelectionMode === 'list' ? 'primary' : 'outline'}
                  icon={<List size={18} />}
                  onClick={() => setUserSelectionMode('list')}
                >
                  Liste Utilisateurs
                </Button>
              </div>

              {userSelectionMode === 'scan' && (
                <div className="border rounded-lg p-4">
                  <QRCodeScanner onScan={handleUserScan} />
                </div>
              )}

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
                      onClick={() => setUserSelectionMode('scan')}
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
                  onClick={() => {
                    setEquipmentMode('scan');
                    setShowScanner(true);
                  }}
                >
                  Scanner QR Code
                </Button>
                <Button
                  variant={equipmentMode === 'list' ? 'primary' : 'outline'}
                  icon={<List size={18} />}
                  onClick={() => {
                    setEquipmentMode('list');
                    setShowScanner(false);
                  }}
                >
                  Liste Matériel
                </Button>
                <Button
                  variant={equipmentMode === 'new' ? 'primary' : 'outline'}
                  icon={<Plus size={18} />}
                  onClick={() => {
                    setEquipmentMode('new');
                    setShowScanner(false);
                    setShowNewEquipmentForm(true);
                  }}
                >
                  Ajouter Équipement
                </Button>
              </div>

              {equipmentMode === 'scan' && showScanner && (
                <div className="border rounded-lg p-4">
                  <QRCodeScanner onScan={handleEquipmentScan} />
                  <Button
                    variant="outline"
                    onClick={() => setShowScanner(false)}
                    className="mt-2"
                  >
                    Arrêter Scanner
                  </Button>
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
                    {filteredEquipment.map(eq => (
                      <div
                        key={eq.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                        onClick={() => handleSelectEquipmentFromList(eq)}
                      >
                        <div>
                          <div className="font-medium">{eq.name}</div>
                          <div className="text-sm text-gray-500">{eq.serialNumber} • {eq.category}</div>
                          <div className="text-sm text-gray-400">{eq.description}</div>
                          <div className="text-xs text-gray-500">
                            Stock: {eq.availableQuantity}/{eq.totalQuantity}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEquipmentFromList(eq);
                          }}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showNewEquipmentForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Nouvel Équipement</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nom de l'équipement *"
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
                  <h3 className="font-medium mb-3">Équipements sélectionnés</h3>
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
                  Le bon sera affiché dans une popup modale pour impression (2 copies automatiques).
                  Une notification sera automatiquement créée pour tracer ce mouvement de sortie.
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
                  {isLoading ? 'Création en cours...' : 'Créer le Bon et Afficher l\'Aperçu'}
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

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => {
          setShowPrintPreview(false);
          handleClose(); // Close the main modal after printing
        }}
        noteNumber={printNoteNumber}
        selectedUser={selectedUser}
        dueDate={dueDate}
        notes={notes}
        checkoutItems={checkoutItems}
        newEquipment={newEquipment}
      />
    </>
  );
};

export default CheckoutModal;
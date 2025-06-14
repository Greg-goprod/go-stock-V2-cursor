import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, UserPlus, Package, Plus, Trash2, Calendar, Printer } from 'lucide-react';
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

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'equipment' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [newEquipment, setNewEquipment] = useState<NewEquipment[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states
  const [showUserForm, setShowUserForm] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newUserData, setNewUserData] = useState({
    name: '',
    phone: '',
    email: '',
    department: ''
  });
  
  // Equipment states
  const [showScanner, setShowScanner] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showNewEquipmentForm, setShowNewEquipmentForm] = useState(false);
  const [tempNewEquipment, setTempNewEquipment] = useState<NewEquipment>({
    name: '',
    serialNumber: '',
    description: ''
  });

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
        .order('name');
      
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
        .select('*')
        .eq('status', 'available')
        .order('name');
      
      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const handleUserScan = (scannedId: string) => {
    const user = users.find(u => u.id === scannedId);
    if (user) {
      setSelectedUser(user);
      setStep('equipment');
      toast.success(`Utilisateur sélectionné: ${user.name}`);
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

  const handleCreateUser = async () => {
    if (!newUserData.name || !newUserData.phone) {
      toast.error('Nom et téléphone obligatoires');
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
      setShowUserForm(false);
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

  const handleCheckout = async () => {
    if (!selectedUser || (checkoutItems.length === 0 && newEquipment.length === 0)) {
      toast.error('Utilisateur et équipements requis');
      return;
    }

    try {
      setIsLoading(true);

      // First, add new equipment to database if any
      const addedEquipment: Equipment[] = [];
      for (const newEq of newEquipment) {
        const { data, error } = await supabase
          .from('equipment')
          .insert([{
            name: newEq.name,
            serial_number: newEq.serialNumber,
            description: newEq.description,
            status: 'checked-out'
          }])
          .select()
          .single();

        if (error) throw error;
        addedEquipment.push(data);
      }

      // Create checkout records for existing equipment
      const checkoutRecords = [];
      for (const item of checkoutItems) {
        for (let i = 0; i < item.quantity; i++) {
          checkoutRecords.push({
            equipment_id: item.equipment.id,
            user_id: selectedUser.id,
            due_date: dueDate,
            status: 'active',
            notes: notes
          });
        }
      }

      // Create checkout records for new equipment
      for (const eq of addedEquipment) {
        checkoutRecords.push({
          equipment_id: eq.id,
          user_id: selectedUser.id,
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

        // Update equipment status to checked-out
        for (const item of checkoutItems) {
          await supabase
            .from('equipment')
            .update({ status: 'checked-out' })
            .eq('id', item.equipment.id);
        }
      }

      toast.success('Sortie de matériel enregistrée');
      handlePrintCheckout();
      handleClose();
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error(error.message || 'Erreur lors de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintCheckout = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const allItems = [
      ...checkoutItems.map(item => ({ name: item.equipment.name, serialNumber: item.equipment.serial_number, quantity: item.quantity })),
      ...newEquipment.map(eq => ({ name: eq.name, serialNumber: eq.serialNumber, quantity: 1 }))
    ];

    printWindow.document.write(`
      <html>
        <head>
          <title>Bon de Sortie - GO-Mat</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .signature { margin-top: 50px; }
            .signature-line { border-bottom: 1px solid #333; width: 200px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GO-Mat - Bon de Sortie</h1>
            <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="info">
            <p><strong>Utilisateur:</strong> ${selectedUser?.name}</p>
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
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setStep('user');
    setSelectedUser(null);
    setCheckoutItems([]);
    setNewEquipment([]);
    setNotes('');
    setShowUserForm(false);
    setShowScanner(false);
    setShowNewEquipmentForm(false);
    setUserSearch('');
    setNewUserData({ name: '', phone: '', email: '', department: '' });
    setTempNewEquipment({ name: '', serialNumber: '', description: '' });
    onClose();
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.phone || '').includes(userSearch)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sortie de Matériel"
      size="lg"
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
                variant="primary"
                icon={<Search size={18} />}
                onClick={() => setShowScanner(true)}
                disabled={showScanner}
              >
                Scanner Badge
              </Button>
              <Button
                variant="outline"
                icon={<UserPlus size={18} />}
                onClick={() => setShowUserForm(true)}
              >
                Nouvel Utilisateur
              </Button>
            </div>

            {showScanner && (
              <div className="border rounded-lg p-4">
                <QRCodeScanner onScan={handleUserScan} />
                <Button
                  variant="outline"
                  onClick={() => setShowScanner(false)}
                  className="mt-2"
                >
                  Annuler
                </Button>
              </div>
            )}

            {!showScanner && !showUserForm && (
              <div>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                
                {userSearch && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedUser(user);
                          setStep('equipment');
                        }}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.phone} • {user.department}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showUserForm && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Nouvel Utilisateur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom et prénom *"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
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
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
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
                    onClick={() => setShowUserForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200">Utilisateur sélectionné</h3>
                <p className="text-green-700 dark:text-green-300">{selectedUser.name} - {selectedUser.phone}</p>
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
                variant="primary"
                icon={<Package size={18} />}
                onClick={() => setShowScanner(true)}
                disabled={showScanner}
              >
                Scanner QR Code
              </Button>
              <Button
                variant="outline"
                icon={<Plus size={18} />}
                onClick={() => setShowNewEquipmentForm(true)}
              >
                Ajouter Équipement
              </Button>
            </div>

            {showScanner && (
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
                        <span className="text-sm text-gray-500 ml-2">({item.equipment.serial_number})</span>
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
                Enregistrer et Imprimer
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
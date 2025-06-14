import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, CheckoutRecord, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckoutWithDetails extends CheckoutRecord {
  equipment: Equipment;
  user: User;
}

interface ReturnItem {
  checkout: CheckoutWithDetails;
  status: 'complete' | 'partial' | 'lost';
  newDueDate?: string;
  notes?: string;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'items' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userCheckouts, setUserCheckouts] = useState<CheckoutWithDetails[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states
  const [showScanner, setShowScanner] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsersWithCheckouts();
    }
  }, [isOpen]);

  const fetchUsersWithCheckouts = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          checkouts!inner(*)
        `)
        .eq('checkouts.status', 'active')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users with checkouts:', error);
    }
  };

  const fetchUserCheckouts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(*),
          users(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const checkoutsWithDetails = data?.map(checkout => ({
        ...checkout,
        equipment: checkout.equipment,
        user: checkout.users
      })) || [];
      
      setUserCheckouts(checkoutsWithDetails);
      setReturnItems(checkoutsWithDetails.map(checkout => ({
        checkout,
        status: 'complete' as const
      })));
    } catch (error) {
      console.error('Error fetching user checkouts:', error);
    }
  };

  const handleUserScan = (scannedId: string) => {
    const user = users.find(u => u.id === scannedId);
    if (user) {
      setSelectedUser(user);
      fetchUserCheckouts(user.id);
      setStep('items');
      toast.success(`Utilisateur sélectionné: ${user.name}`);
    } else {
      toast.error('Utilisateur non trouvé ou sans matériel emprunté');
    }
  };

  const handleEquipmentScan = (scannedId: string) => {
    // Find checkout by equipment ID
    const checkout = userCheckouts.find(c => c.equipment.id === scannedId);
    if (checkout) {
      const existingReturn = returnItems.find(item => item.checkout.id === checkout.id);
      if (existingReturn) {
        toast.info('Équipement déjà scanné');
      } else {
        setReturnItems(prev => [...prev, { checkout, status: 'complete' }]);
        toast.success(`${checkout.equipment.name} scanné pour retour`);
      }
    } else {
      toast.error('Équipement non trouvé dans les emprunts de cet utilisateur');
    }
  };

  const updateReturnStatus = (checkoutId: string, status: 'complete' | 'partial' | 'lost', newDueDate?: string, notes?: string) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.checkout.id === checkoutId 
          ? { ...item, status, newDueDate, notes }
          : item
      )
    );
  };

  const handleReturn = async () => {
    if (returnItems.length === 0) {
      toast.error('Aucun équipement sélectionné pour le retour');
      return;
    }

    try {
      setIsLoading(true);

      for (const item of returnItems) {
        const updateData: any = {
          return_date: new Date().toISOString(),
          notes: item.notes || null
        };

        switch (item.status) {
          case 'complete':
            updateData.status = 'returned';
            // Update equipment status to available
            await supabase
              .from('equipment')
              .update({ status: 'available' })
              .eq('id', item.checkout.equipment.id);
            break;
          
          case 'partial':
            updateData.status = 'returned';
            updateData.due_date = item.newDueDate;
            // Create new checkout for remaining period
            await supabase
              .from('checkouts')
              .insert([{
                equipment_id: item.checkout.equipment.id,
                user_id: item.checkout.user.id,
                due_date: item.newDueDate,
                status: 'active',
                notes: `Retour partiel - ${item.notes || ''}`
              }]);
            break;
          
          case 'lost':
            updateData.status = 'lost';
            // Update equipment status to lost/retired
            await supabase
              .from('equipment')
              .update({ status: 'retired' })
              .eq('id', item.checkout.equipment.id);
            break;
        }

        // Update checkout record
        await supabase
          .from('checkouts')
          .update(updateData)
          .eq('id', item.checkout.id);
      }

      toast.success('Retour de matériel enregistré');
      handlePrintReturn();
      handleClose();
    } catch (error: any) {
      console.error('Error during return:', error);
      toast.error(error.message || 'Erreur lors du retour');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReturn = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const completeItems = returnItems.filter(item => item.status === 'complete');
    const partialItems = returnItems.filter(item => item.status === 'partial');
    const lostItems = returnItems.filter(item => item.status === 'lost');

    printWindow.document.write(`
      <html>
        <head>
          <title>Quittance de Retour - GO-Mat</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .complete { background-color: #d4edda; }
            .partial { background-color: #fff3cd; }
            .lost { background-color: #f8d7da; }
            .signature { margin-top: 30px; }
            .signature-line { border-bottom: 1px solid #333; width: 200px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GO-Mat - Quittance de Retour</h1>
            <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="info">
            <p><strong>Utilisateur:</strong> ${selectedUser?.name}</p>
            <p><strong>Téléphone:</strong> ${selectedUser?.phone}</p>
            <p><strong>Département:</strong> ${selectedUser?.department}</p>
          </div>

          ${completeItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #155724;">✓ Matériel Retourné Complet</h3>
              <table class="items">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Numéro de série</th>
                    <th>Date d'emprunt</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${completeItems.map(item => `
                    <tr class="complete">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.equipment.serial_number}</td>
                      <td>${new Date(item.checkout.checkout_date).toLocaleDateString('fr-FR')}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${partialItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #856404;">⚠ Retour Partiel</h3>
              <table class="items">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Numéro de série</th>
                    <th>Nouvelle date de retour</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${partialItems.map(item => `
                    <tr class="partial">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.equipment.serial_number}</td>
                      <td>${item.newDueDate ? new Date(item.newDueDate).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${lostItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #721c24;">✗ Matériel Perdu</h3>
              <table class="items">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Numéro de série</th>
                    <th>Date d'emprunt</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${lostItems.map(item => `
                    <tr class="lost">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.equipment.serial_number}</td>
                      <td>${new Date(item.checkout.checkout_date).toLocaleDateString('fr-FR')}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="signature">
            <p>Je confirme le retour du matériel ci-dessus dans les conditions indiquées.</p>
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
    setUserCheckouts([]);
    setReturnItems([]);
    setShowScanner(false);
    setUserSearch('');
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
      title="Retour de Matériel"
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
          <div className={`flex items-center ${step === 'items' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'items' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="ml-2">Équipements</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'summary' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'summary' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="ml-2">Validation</span>
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

            {!showScanner && (
              <div>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur avec du matériel emprunté..."
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
                          fetchUserCheckouts(user.id);
                          setStep('items');
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

            {selectedUser && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200">Utilisateur sélectionné</h3>
                <p className="text-green-700 dark:text-green-300">{selectedUser.name} - {selectedUser.phone}</p>
                <Button
                  variant="primary"
                  onClick={() => setStep('items')}
                  className="mt-2"
                >
                  Voir les emprunts
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Equipment Return */}
        {step === 'items' && (
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

            {/* User's Checkouts */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Matériel emprunté par {selectedUser?.name}</h3>
              <div className="space-y-3">
                {userCheckouts.map((checkout) => {
                  const returnItem = returnItems.find(item => item.checkout.id === checkout.id);
                  const isOverdue = new Date(checkout.due_date) < new Date();
                  
                  return (
                    <div key={checkout.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{checkout.equipment.name}</h4>
                          <p className="text-sm text-gray-500">{checkout.equipment.serial_number}</p>
                          <p className="text-sm text-gray-500">
                            Emprunté le: {new Date(checkout.checkout_date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                            {isOverdue && <AlertTriangle size={14} className="inline mr-1" />}
                            Retour prévu: {new Date(checkout.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <select
                            value={returnItem?.status || 'complete'}
                            onChange={(e) => updateReturnStatus(checkout.id, e.target.value as any)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                          >
                            <option value="complete">Retour complet</option>
                            <option value="partial">Retour partiel</option>
                            <option value="lost">Matériel perdu</option>
                          </select>
                        </div>
                      </div>

                      {returnItem?.status === 'partial' && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="date"
                            value={returnItem.newDueDate || ''}
                            onChange={(e) => updateReturnStatus(checkout.id, 'partial', e.target.value, returnItem.notes)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                            placeholder="Nouvelle date de retour"
                          />
                        </div>
                      )}

                      <textarea
                        value={returnItem?.notes || ''}
                        onChange={(e) => updateReturnStatus(checkout.id, returnItem?.status || 'complete', returnItem?.newDueDate, e.target.value)}
                        placeholder="Notes sur le retour..."
                        className="w-full mt-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                        rows={2}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setStep('summary')}
              disabled={returnItems.length === 0}
            >
              Valider les retours
            </Button>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Résumé des retours</h3>
              
              {returnItems.filter(item => item.status === 'complete').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-green-600 font-medium">✓ Retours complets ({returnItems.filter(item => item.status === 'complete').length})</h4>
                  {returnItems.filter(item => item.status === 'complete').map(item => (
                    <p key={item.checkout.id} className="text-sm text-gray-600 ml-4">
                      • {item.checkout.equipment.name}
                    </p>
                  ))}
                </div>
              )}

              {returnItems.filter(item => item.status === 'partial').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-yellow-600 font-medium">⚠ Retours partiels ({returnItems.filter(item => item.status === 'partial').length})</h4>
                  {returnItems.filter(item => item.status === 'partial').map(item => (
                    <p key={item.checkout.id} className="text-sm text-gray-600 ml-4">
                      • {item.checkout.equipment.name} - Nouveau retour: {item.newDueDate ? new Date(item.newDueDate).toLocaleDateString('fr-FR') : 'Non défini'}
                    </p>
                  ))}
                </div>
              )}

              {returnItems.filter(item => item.status === 'lost').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-600 font-medium">✗ Matériel perdu ({returnItems.filter(item => item.status === 'lost').length})</h4>
                  {returnItems.filter(item => item.status === 'lost').map(item => (
                    <p key={item.checkout.id} className="text-sm text-gray-600 ml-4">
                      • {item.checkout.equipment.name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                icon={<Printer size={18} />}
                onClick={handleReturn}
                disabled={isLoading}
              >
                Valider et Imprimer Quittance
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('items')}
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

export default ReturnModal;
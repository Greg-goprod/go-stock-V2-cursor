import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, CheckoutRecord, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, AlertTriangle, List } from 'lucide-react';
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
  action: 'return' | 'extend' | 'lost';
  newDueDate?: string;
  notes?: string;
}

interface PendingReturn {
  id: string;
  equipment_name: string;
  user_name: string;
  due_date: string;
  checkout_date: string;
  is_overdue: boolean;
  checkout: CheckoutWithDetails;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'user' | 'items' | 'summary'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userCheckouts, setUserCheckouts] = useState<CheckoutWithDetails[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // User selection states
  const [selectionMode, setSelectionMode] = useState<'scan' | 'search' | 'list'>('scan');
  const [showScanner, setShowScanner] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsersWithCheckouts();
      fetchPendingReturns();
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
        .order('first_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users with checkouts:', error);
    }
  };

  const fetchPendingReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(*),
          users(*)
        `)
        .eq('status', 'active')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      const returns: PendingReturn[] = data?.map(checkout => ({
        id: checkout.id,
        equipment_name: checkout.equipment.name,
        user_name: `${checkout.users.first_name} ${checkout.users.last_name}`,
        due_date: checkout.due_date,
        checkout_date: checkout.checkout_date,
        is_overdue: new Date(checkout.due_date) < new Date(),
        checkout: {
          ...checkout,
          equipment: checkout.equipment,
          user: checkout.users
        }
      })) || [];
      
      setPendingReturns(returns);
    } catch (error) {
      console.error('Error fetching pending returns:', error);
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
        action: 'return' as const
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
      toast.success(`Utilisateur sélectionné: ${user.first_name} ${user.last_name}`);
    } else {
      toast.error('Utilisateur non trouvé ou sans matériel emprunté');
    }
  };

  const handleSelectFromList = (pendingReturn: PendingReturn) => {
    setSelectedUser(pendingReturn.checkout.user);
    setUserCheckouts([pendingReturn.checkout]);
    setReturnItems([{
      checkout: pendingReturn.checkout,
      action: 'return'
    }]);
    setStep('items');
    toast.success(`Retour sélectionné: ${pendingReturn.equipment_name}`);
  };

  const handleEquipmentScan = (scannedId: string) => {
    // Find checkout by equipment ID
    const checkout = userCheckouts.find(c => c.equipment.id === scannedId);
    if (checkout) {
      const existingReturn = returnItems.find(item => item.checkout.id === checkout.id);
      if (existingReturn) {
        toast.info('Équipement déjà scanné');
      } else {
        setReturnItems(prev => [...prev, { checkout, action: 'return' }]);
        toast.success(`${checkout.equipment.name} scanné pour retour`);
      }
    } else {
      toast.error('Équipement non trouvé dans les emprunts de cet utilisateur');
    }
  };

  const updateReturnAction = (checkoutId: string, action: 'return' | 'extend' | 'lost', newDueDate?: string, notes?: string) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.checkout.id === checkoutId 
          ? { ...item, action, newDueDate, notes }
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
          notes: item.notes || null
        };

        switch (item.action) {
          case 'return':
            // Retour complet - marquer comme retourné
            updateData.status = 'returned';
            updateData.return_date = new Date().toISOString();
            
            // Mettre à jour le statut de l'équipement
            const newAvailableQuantity = (item.checkout.equipment.availableQuantity || 0) + 1;
            const newStatus = newAvailableQuantity >= (item.checkout.equipment.totalQuantity || 1) ? 'available' : 'checked-out';
            
            await supabase
              .from('equipment')
              .update({ 
                status: newStatus,
                available_quantity: newAvailableQuantity
              })
              .eq('id', item.checkout.equipment.id);
            break;
          
          case 'extend':
            // Prolongation - mettre à jour la date de retour
            if (!item.newDueDate) {
              toast.error('Date de prolongation requise');
              continue;
            }
            updateData.due_date = item.newDueDate;
            updateData.notes = `${item.checkout.notes || ''}\nProlongation accordée jusqu'au ${new Date(item.newDueDate).toLocaleDateString('fr-FR')}${item.notes ? ` - ${item.notes}` : ''}`.trim();
            break;
          
          case 'lost':
            // Matériel perdu - marquer comme perdu
            updateData.status = 'lost';
            updateData.return_date = new Date().toISOString();
            
            // Mettre à jour le statut de l'équipement
            await supabase
              .from('equipment')
              .update({ status: 'retired' })
              .eq('id', item.checkout.equipment.id);
            break;
        }

        // Mettre à jour l'enregistrement d'emprunt
        await supabase
          .from('checkouts')
          .update(updateData)
          .eq('id', item.checkout.id);
      }

      toast.success('Opérations de retour enregistrées avec succès');
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

    const returnedItems = returnItems.filter(item => item.action === 'return');
    const extendedItems = returnItems.filter(item => item.action === 'extend');
    const lostItems = returnItems.filter(item => item.action === 'lost');

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
            .returned { background-color: #d4edda; }
            .extended { background-color: #fff3cd; }
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
            <p><strong>Utilisateur:</strong> ${selectedUser?.first_name} ${selectedUser?.last_name}</p>
            <p><strong>Téléphone:</strong> ${selectedUser?.phone}</p>
            <p><strong>Département:</strong> ${selectedUser?.department}</p>
          </div>

          ${returnedItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #155724;">✓ Matériel Retourné</h3>
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
                  ${returnedItems.map(item => `
                    <tr class="returned">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.equipment.serialNumber}</td>
                      <td>${new Date(item.checkout.checkout_date).toLocaleDateString('fr-FR')}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${extendedItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #856404;">📅 Prolongations Accordées</h3>
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
                  ${extendedItems.map(item => `
                    <tr class="extended">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.equipment.serialNumber}</td>
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
              <h3 style="color: #721c24;">✗ Matériel Déclaré Perdu</h3>
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
                      <td>${item.checkout.equipment.serialNumber}</td>
                      <td>${new Date(item.checkout.checkout_date).toLocaleDateString('fr-FR')}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="signature">
            <p>Je confirme les opérations ci-dessus concernant le matériel emprunté.</p>
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
    setSelectionMode('scan');
    setShowScanner(false);
    setUserSearch('');
    onClose();
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.phone || '').includes(userSearch)
  );

  const filteredPendingReturns = pendingReturns.filter(ret =>
    ret.equipment_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    ret.user_name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Retour de Matériel"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'user' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="ml-2">Sélection</span>
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

        {/* Step 1: User/Return Selection */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={selectionMode === 'scan' ? 'primary' : 'outline'}
                icon={<Search size={18} />}
                onClick={() => {
                  setSelectionMode('scan');
                  setShowScanner(true);
                }}
              >
                Scanner Badge
              </Button>
              <Button
                variant={selectionMode === 'search' ? 'primary' : 'outline'}
                icon={<Search size={18} />}
                onClick={() => {
                  setSelectionMode('search');
                  setShowScanner(false);
                }}
              >
                Rechercher Utilisateur
              </Button>
              <Button
                variant={selectionMode === 'list' ? 'primary' : 'outline'}
                icon={<List size={18} />}
                onClick={() => {
                  setSelectionMode('list');
                  setShowScanner(false);
                }}
              >
                Liste Retours
              </Button>
            </div>

            {selectionMode === 'scan' && showScanner && (
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

            {selectionMode === 'search' && (
              <div>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur avec du matériel emprunté..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3"
                />
                
                {userSearch && (
                  <div className="max-h-60 overflow-y-auto border rounded-md">
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
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.phone} • {user.department}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectionMode === 'list' && (
              <div>
                <input
                  type="text"
                  placeholder="Rechercher par équipement ou utilisateur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3"
                />
                
                <div className="max-h-80 overflow-y-auto border rounded-md">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 border-b font-medium text-sm">
                    Matériel à retourner ({filteredPendingReturns.length})
                  </div>
                  {filteredPendingReturns.map(ret => (
                    <div
                      key={ret.id}
                      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 ${ret.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                      onClick={() => handleSelectFromList(ret)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center">
                            {ret.equipment_name}
                            {ret.is_overdue && (
                              <AlertTriangle size={16} className="text-red-500 ml-2" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Emprunté par: {ret.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Emprunté le: {new Date(ret.checkout_date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${ret.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                            Retour prévu: {new Date(ret.due_date).toLocaleDateString('fr-FR')}
                          </div>
                          {ret.is_overdue && (
                            <div className="text-xs text-red-500">EN RETARD</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200">Utilisateur sélectionné</h3>
                <p className="text-green-700 dark:text-green-300">{selectedUser.first_name} {selectedUser.last_name} - {selectedUser.phone}</p>
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
              <h3 className="font-medium mb-3">Matériel emprunté par {selectedUser?.first_name} {selectedUser?.last_name}</h3>
              <div className="space-y-3">
                {userCheckouts.map((checkout) => {
                  const returnItem = returnItems.find(item => item.checkout.id === checkout.id);
                  const isOverdue = new Date(checkout.due_date) < new Date();
                  
                  return (
                    <div key={checkout.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{checkout.equipment.name}</h4>
                          <p className="text-sm text-gray-500">{checkout.equipment.serialNumber}</p>
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
                            value={returnItem?.action || 'return'}
                            onChange={(e) => updateReturnAction(checkout.id, e.target.value as any)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                          >
                            <option value="return">Retour complet</option>
                            <option value="extend">Prolonger l'emprunt</option>
                            <option value="lost">Matériel perdu</option>
                          </select>
                        </div>
                      </div>

                      {returnItem?.action === 'extend' && (
                        <div className="mt-2 space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nouvelle date de retour
                          </label>
                          <input
                            type="date"
                            value={returnItem.newDueDate || ''}
                            onChange={(e) => updateReturnAction(checkout.id, 'extend', e.target.value, returnItem.notes)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      )}

                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={returnItem?.notes || ''}
                          onChange={(e) => updateReturnAction(checkout.id, returnItem?.action || 'return', returnItem?.newDueDate, e.target.value)}
                          placeholder={
                            returnItem?.action === 'return' ? 'Notes sur le retour...' :
                            returnItem?.action === 'extend' ? 'Raison de la prolongation...' :
                            'Circonstances de la perte...'
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                          rows={2}
                        />
                      </div>
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
              Valider les opérations
            </Button>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Résumé des opérations</h3>
              
              {returnItems.filter(item => item.action === 'return').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-green-600 font-medium">✓ Retours complets ({returnItems.filter(item => item.action === 'return').length})</h4>
                  {returnItems.filter(item => item.action === 'return').map(item => (
                    <p key={item.checkout.id} className="text-sm text-gray-600 ml-4">
                      • {item.checkout.equipment.name}
                    </p>
                  ))}
                </div>
              )}

              {returnItems.filter(item => item.action === 'extend').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-blue-600 font-medium">📅 Prolongations ({returnItems.filter(item => item.action === 'extend').length})</h4>
                  {returnItems.filter(item => item.action === 'extend').map(item => (
                    <p key={item.checkout.id} className="text-sm text-gray-600 ml-4">
                      • {item.checkout.equipment.name} - Nouveau retour: {item.newDueDate ? new Date(item.newDueDate).toLocaleDateString('fr-FR') : 'Non défini'}
                    </p>
                  ))}
                </div>
              )}

              {returnItems.filter(item => item.action === 'lost').length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-600 font-medium">✗ Matériel perdu ({returnItems.filter(item => item.action === 'lost').length})</h4>
                  {returnItems.filter(item => item.action === 'lost').map(item => (
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
                {isLoading ? 'Traitement en cours...' : 'Valider et Imprimer Quittance'}
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
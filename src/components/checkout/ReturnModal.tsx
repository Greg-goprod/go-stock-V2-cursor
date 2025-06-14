import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, CheckoutRecord, Equipment } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, AlertTriangle, List, Filter } from 'lucide-react';
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
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<PendingReturn[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPendingReturns();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter returns based on search and overdue filter
    let filtered = pendingReturns;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(ret =>
        ret.equipment_name.toLowerCase().includes(search) ||
        ret.user_name.toLowerCase().includes(search)
      );
    }
    
    if (filterOverdue) {
      filtered = filtered.filter(ret => ret.is_overdue);
    }
    
    setFilteredReturns(filtered);
  }, [pendingReturns, searchTerm, filterOverdue]);

  const fetchPendingReturns = async () => {
    try {
      setIsLoading(true);
      
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
          equipment: {
            id: checkout.equipment.id,
            name: checkout.equipment.name,
            description: checkout.equipment.description || '',
            category: '',
            serialNumber: checkout.equipment.serial_number,
            status: checkout.equipment.status as Equipment['status'],
            addedDate: checkout.equipment.created_at,
            lastMaintenance: checkout.equipment.last_maintenance,
            imageUrl: checkout.equipment.image_url,
            supplier: '',
            location: checkout.equipment.location || '',
            articleNumber: checkout.equipment.article_number,
            qrType: checkout.equipment.qr_type || 'individual',
            totalQuantity: checkout.equipment.total_quantity || 1,
            availableQuantity: checkout.equipment.available_quantity || 1
          },
          user: {
            id: checkout.users.id,
            first_name: checkout.users.first_name,
            last_name: checkout.users.last_name,
            email: checkout.users.email,
            phone: checkout.users.phone,
            department: checkout.users.department,
            role: checkout.users.role,
            dateCreated: checkout.users.created_at
          }
        }
      })) || [];
      
      setPendingReturns(returns);
    } catch (error: any) {
      console.error('Error fetching pending returns:', error);
      toast.error('Erreur lors du chargement des emprunts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReturn = (pendingReturn: PendingReturn) => {
    // Check if already selected
    const existingReturn = returnItems.find(item => item.checkout.id === pendingReturn.checkout.id);
    if (existingReturn) {
      toast.info('Cet emprunt est déjà sélectionné');
      return;
    }

    setReturnItems(prev => [...prev, {
      checkout: pendingReturn.checkout,
      action: 'return'
    }]);
    
    toast.success(`${pendingReturn.equipment_name} ajouté aux retours`);
  };

  const handleEquipmentScan = (scannedId: string) => {
    // Find checkout by equipment ID
    const pendingReturn = pendingReturns.find(ret => ret.checkout.equipment.id === scannedId);
    if (pendingReturn) {
      handleSelectReturn(pendingReturn);
    } else {
      toast.error('Équipement non trouvé dans les emprunts actifs');
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

  const removeReturnItem = (checkoutId: string) => {
    setReturnItems(prev => prev.filter(item => item.checkout.id !== checkoutId));
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

          ${returnedItems.length > 0 ? `
            <div class="section">
              <h3 style="color: #155724;">✓ Matériel Retourné</h3>
              <table class="items">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Utilisateur</th>
                    <th>Date d'emprunt</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${returnedItems.map(item => `
                    <tr class="returned">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.user.first_name} ${item.checkout.user.last_name}</td>
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
                    <th>Utilisateur</th>
                    <th>Nouvelle date de retour</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${extendedItems.map(item => `
                    <tr class="extended">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.user.first_name} ${item.checkout.user.last_name}</td>
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
                    <th>Utilisateur</th>
                    <th>Date d'emprunt</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${lostItems.map(item => `
                    <tr class="lost">
                      <td>${item.checkout.equipment.name}</td>
                      <td>${item.checkout.user.first_name} ${item.checkout.user.last_name}</td>
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
    setReturnItems([]);
    setSearchTerm('');
    setFilterOverdue(false);
    setShowScanner(false);
    onClose();
  };

  const overdueCount = pendingReturns.filter(ret => ret.is_overdue).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Retour de Matériel"
      size="xl"
    >
      <div className="space-y-6">
        {/* Header avec statistiques */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                Emprunts en cours
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {pendingReturns.length} emprunt(s) actif(s)
                {overdueCount > 0 && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                    • {overdueCount} en retard
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Package size={16} />}
                onClick={() => setShowScanner(!showScanner)}
              >
                {showScanner ? 'Masquer Scanner' : 'Scanner QR'}
              </Button>
            </div>
          </div>
        </div>

        {/* Scanner QR (optionnel) */}
        {showScanner && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Scanner le QR code de l'équipement</h4>
            <QRCodeScanner onScan={handleEquipmentScan} />
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par équipement ou utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <Button
            variant={filterOverdue ? 'danger' : 'outline'}
            size="sm"
            icon={<AlertTriangle size={16} />}
            onClick={() => setFilterOverdue(!filterOverdue)}
          >
            En retard ({overdueCount})
          </Button>
        </div>

        {/* Liste des emprunts */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b font-medium text-sm">
            Emprunts disponibles pour retour ({filteredReturns.length})
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filteredReturns.map(ret => (
              <div
                key={ret.id}
                className={`p-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  ret.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''
                }`}
                onClick={() => handleSelectReturn(ret)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {ret.equipment_name}
                      </h4>
                      {ret.is_overdue && (
                        <AlertTriangle size={16} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Emprunté par: <span className="font-medium">{ret.user_name}</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Emprunté le: {new Date(ret.checkout_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      ret.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Retour prévu: {new Date(ret.due_date).toLocaleDateString('fr-FR')}
                    </div>
                    {ret.is_overdue && (
                      <div className="text-xs text-red-500 font-medium">
                        EN RETARD
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Équipements sélectionnés pour retour */}
        {returnItems.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Équipements sélectionnés ({returnItems.length})</h3>
            <div className="space-y-3">
              {returnItems.map((item) => {
                const isOverdue = new Date(item.checkout.due_date) < new Date();
                
                return (
                  <div key={item.checkout.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.checkout.equipment.name}</h4>
                        <p className="text-sm text-gray-500">
                          {item.checkout.user.first_name} {item.checkout.user.last_name}
                        </p>
                        <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {isOverdue && <AlertTriangle size={14} className="inline mr-1" />}
                          Retour prévu: {new Date(item.checkout.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={item.action}
                          onChange={(e) => updateReturnAction(item.checkout.id, e.target.value as any)}
                          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                        >
                          <option value="return">Retour complet</option>
                          <option value="extend">Prolonger l'emprunt</option>
                          <option value="lost">Matériel perdu</option>
                        </select>
                        
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeReturnItem(item.checkout.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>

                    {item.action === 'extend' && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nouvelle date de retour
                        </label>
                        <input
                          type="date"
                          value={item.newDueDate || ''}
                          onChange={(e) => updateReturnAction(item.checkout.id, 'extend', e.target.value, item.notes)}
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
                        value={item.notes || ''}
                        onChange={(e) => updateReturnAction(item.checkout.id, item.action, item.newDueDate, e.target.value)}
                        placeholder={
                          item.action === 'return' ? 'Notes sur le retour...' :
                          item.action === 'extend' ? 'Raison de la prolongation...' :
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
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Annuler
          </Button>
          
          {returnItems.length > 0 && (
            <Button
              variant="primary"
              icon={<Printer size={18} />}
              onClick={handleReturn}
              disabled={isLoading}
            >
              {isLoading ? 'Traitement en cours...' : 'Valider et Imprimer Quittance'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReturnModal;
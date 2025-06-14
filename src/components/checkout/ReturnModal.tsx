import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCodeScanner from '../QRCode/QRCodeScanner';
import { User, CheckoutRecord, Equipment, DeliveryNote } from '../../types';
import { supabase } from '../../lib/supabase';
import { Search, Package, Calendar, Printer, AlertTriangle, List, Filter, FileText, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeliveryNoteWithDetails extends DeliveryNote {
  user: User;
  checkouts: (CheckoutRecord & {
    equipment: Equipment;
  })[];
  equipmentCount: number;
  returnedCount: number;
}

interface ReturnItem {
  checkout: CheckoutRecord & { equipment: Equipment };
  action: 'return' | 'extend' | 'lost';
  newDueDate?: string;
  notes?: string;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose }) => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteWithDetails[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<DeliveryNoteWithDetails[]>([]);
  const [selectedNote, setSelectedNote] = useState<DeliveryNoteWithDetails | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryNotes();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter delivery notes based on search and overdue filter
    let filtered = deliveryNotes;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.noteNumber.toLowerCase().includes(search) ||
        `${note.user.first_name} ${note.user.last_name}`.toLowerCase().includes(search) ||
        note.checkouts.some(checkout => 
          checkout.equipment.name.toLowerCase().includes(search)
        )
      );
    }
    
    if (filterOverdue) {
      filtered = filtered.filter(note => note.status === 'overdue');
    }
    
    setFilteredNotes(filtered);
  }, [deliveryNotes, searchTerm, filterOverdue]);

  const fetchDeliveryNotes = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          users(*),
          checkouts(
            *,
            equipment(*)
          )
        `)
        .in('status', ['active', 'partial', 'overdue'])
        .order('issue_date', { ascending: false });
      
      if (error) throw error;
      
      const notesWithDetails: DeliveryNoteWithDetails[] = data?.map(note => {
        const checkouts = note.checkouts?.map(checkout => ({
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
          }
        })) || [];

        const equipmentCount = checkouts.length;
        const returnedCount = checkouts.filter(c => c.status === 'returned').length;

        return {
          id: note.id,
          noteNumber: note.note_number,
          userId: note.user_id,
          issueDate: note.issue_date,
          dueDate: note.due_date,
          status: note.status as DeliveryNote['status'],
          notes: note.notes,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          user: {
            id: note.users.id,
            first_name: note.users.first_name,
            last_name: note.users.last_name,
            email: note.users.email,
            phone: note.users.phone,
            department: note.users.department,
            role: note.users.role,
            dateCreated: note.users.created_at
          },
          checkouts,
          equipmentCount,
          returnedCount
        };
      }) || [];
      
      setDeliveryNotes(notesWithDetails);
    } catch (error: any) {
      console.error('Error fetching delivery notes:', error);
      toast.error('Erreur lors du chargement des bons de sortie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNote = (note: DeliveryNoteWithDetails) => {
    setSelectedNote(note);
    // Initialize return items with active checkouts
    const activeCheckouts = note.checkouts.filter(c => c.status === 'active');
    setReturnItems(activeCheckouts.map(checkout => ({
      checkout,
      action: 'return'
    })));
  };

  const handleEquipmentScan = (scannedId: string) => {
    // Find checkout by equipment ID in selected note
    if (!selectedNote) {
      toast.error('Veuillez d\'abord sélectionner un bon de sortie');
      return;
    }

    const checkout = selectedNote.checkouts.find(c => c.equipment.id === scannedId && c.status === 'active');
    if (checkout) {
      const existingReturn = returnItems.find(item => item.checkout.id === checkout.id);
      if (existingReturn) {
        toast.info('Cet équipement est déjà sélectionné');
      } else {
        setReturnItems(prev => [...prev, { checkout, action: 'return' }]);
        toast.success(`${checkout.equipment.name} ajouté aux retours`);
      }
    } else {
      toast.error('Équipement non trouvé dans ce bon de sortie ou déjà retourné');
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
            
            // Mettre à jour aussi la date du bon de sortie
            await supabase
              .from('delivery_notes')
              .update({ due_date: item.newDueDate })
              .eq('id', selectedNote?.id);
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
    if (!selectedNote) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const returnedItems = returnItems.filter(item => item.action === 'return');
    const extendedItems = returnItems.filter(item => item.action === 'extend');
    const lostItems = returnItems.filter(item => item.action === 'lost');

    printWindow.document.write(`
      <html>
        <head>
          <title>Quittance de Retour ${selectedNote.noteNumber} - GO-Mat</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .note-number { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .returned { background-color: #d4edda; }
            .extended { background-color: #fff3cd; }
            .lost { background-color: #f8d7da; }
            .signature { margin-top: 30px; }
            .signature-line { border-bottom: 1px solid #333; width: 200px; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GO-Mat - Quittance de Retour</h1>
            <div class="note-number">Bon N° ${selectedNote.noteNumber}</div>
            <p>Date de retour: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          <div class="section">
            <p><strong>Utilisateur:</strong> ${selectedNote.user.first_name} ${selectedNote.user.last_name}</p>
            <p><strong>Département:</strong> ${selectedNote.user.department}</p>
            <p><strong>Date d'émission du bon:</strong> ${new Date(selectedNote.issueDate).toLocaleDateString('fr-FR')}</p>
            <p><strong>Date de retour prévue:</strong> ${new Date(selectedNote.dueDate).toLocaleDateString('fr-FR')}</p>
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
            <p>Je confirme les opérations ci-dessus concernant le bon de sortie N° ${selectedNote.noteNumber}.</p>
            <p>Signature de l'utilisateur:</p>
            <div class="signature-line"></div>
            <p style="margin-top: 5px;">Date: _______________</p>
          </div>

          <div class="footer">
            <p>Cette quittance confirme les opérations de retour pour le bon N° ${selectedNote.noteNumber}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setSelectedNote(null);
    setReturnItems([]);
    setSearchTerm('');
    setFilterOverdue(false);
    setShowScanner(false);
    onClose();
  };

  const overdueCount = deliveryNotes.filter(note => note.status === 'overdue').length;

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Retour de Matériel" size="xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Chargement des bons de sortie...</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Retour de Matériel"
      size="xl"
    >
      <div className="space-y-6">
        {!selectedNote ? (
          <>
            {/* Header avec statistiques */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                    📋 Bons de sortie actifs
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {deliveryNotes.length} bon(s) de sortie en cours
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Scannez d'abord un équipement, puis sélectionnez le bon de sortie correspondant.
                </p>
                <QRCodeScanner onScan={handleEquipmentScan} />
              </div>
            )}

            {/* Filtres et recherche */}
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par numéro de bon, utilisateur ou équipement..."
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

            {/* Liste des bons de sortie */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b font-medium text-sm">
                Bons de sortie disponibles pour retour ({filteredNotes.length})
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredNotes.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucun bon de sortie
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || filterOverdue 
                        ? 'Aucun bon ne correspond aux critères de recherche.'
                        : 'Aucun bon de sortie actif pour le moment.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const isOverdue = note.status === 'overdue';
                    const isPartial = note.status === 'partial';
                    
                    return (
                      <div
                        key={note.id}
                        className={`p-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                          isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 
                          isPartial ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                        }`}
                        onClick={() => handleSelectNote(note)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                Bon N° {note.noteNumber}
                              </h4>
                              {isOverdue && (
                                <AlertTriangle size={16} className="text-red-500" />
                              )}
                              {isPartial && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                  Retour partiel
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <UserIcon size={14} />
                                <span>{note.user.first_name} {note.user.last_name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package size={14} />
                                <span>{note.equipmentCount} équipement(s)</span>
                              </div>
                              {note.returnedCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-green-600 dark:text-green-400">
                                    {note.returnedCount} retourné(s)
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              Émis le: {new Date(note.issueDate).toLocaleDateString('fr-FR')} • 
                              Département: {note.user.department}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Retour prévu: {new Date(note.dueDate).toLocaleDateString('fr-FR')}
                            </div>
                            {isOverdue && (
                              <div className="text-xs text-red-500 font-medium">
                                EN RETARD
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bon sélectionné - Gestion des retours */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                    📋 Bon N° {selectedNote.noteNumber}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {selectedNote.user.first_name} {selectedNote.user.last_name} • {selectedNote.user.department}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNote(null)}
                >
                  Changer de bon
                </Button>
              </div>
            </div>

            {/* Scanner QR pour ce bon */}
            {showScanner && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Scanner le QR code de l'équipement</h4>
                <QRCodeScanner onScan={handleEquipmentScan} />
              </div>
            )}

            {/* Équipements du bon sélectionné */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">
                Équipements du bon ({selectedNote.checkouts.filter(c => c.status === 'active').length} actifs)
              </h3>
              <div className="space-y-3">
                {selectedNote.checkouts.filter(c => c.status === 'active').map((checkout) => {
                  const returnItem = returnItems.find(item => item.checkout.id === checkout.id);
                  const isOverdue = new Date(checkout.due_date) < new Date();
                  
                  return (
                    <div key={checkout.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{checkout.equipment.name}</h4>
                          <p className="text-sm text-gray-500">{checkout.equipment.serialNumber}</p>
                          <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                            {isOverdue && <AlertTriangle size={14} className="inline mr-1" />}
                            Retour prévu: {new Date(checkout.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {returnItem ? (
                            <>
                              <select
                                value={returnItem.action}
                                onChange={(e) => updateReturnAction(checkout.id, e.target.value as any)}
                                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                              >
                                <option value="return">Retour complet</option>
                                <option value="extend">Prolonger l'emprunt</option>
                                <option value="lost">Matériel perdu</option>
                              </select>
                              
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => removeReturnItem(checkout.id)}
                              >
                                ✕
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setReturnItems(prev => [...prev, { checkout, action: 'return' }])}
                            >
                              Sélectionner
                            </Button>
                          )}
                        </div>
                      </div>

                      {returnItem?.action === 'extend' && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

                      {returnItem && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={returnItem.notes || ''}
                            onChange={(e) => updateReturnAction(checkout.id, returnItem.action, returnItem.newDueDate, e.target.value)}
                            placeholder={
                              returnItem.action === 'return' ? 'Notes sur le retour...' :
                              returnItem.action === 'extend' ? 'Raison de la prolongation...' :
                              'Circonstances de la perte...'
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedNote(null)}
              >
                Retour à la liste
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
          </>
        )}
      </div>
    </Modal>
  );
};

export default ReturnModal;
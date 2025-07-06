import React from 'react';
import Modal from '../common/Modal';
import QRCodeGenerator from '../QRCode/QRCodeGenerator';
import { Equipment, EquipmentInstance } from '../../types';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface QRCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
}

const QRCodesModal: React.FC<QRCodesModalProps> = ({ 
  isOpen, 
  onClose, 
  equipment
}) => {
  const [instances, setInstances] = useState<EquipmentInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && equipment) {
      fetchInstances();
    }
  }, [isOpen, equipment]);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('equipment_id', equipment.id)
        .order('instance_number');
      
      if (error) throw error;
      
      // Transform data to match our interface
      const transformedInstances: EquipmentInstance[] = data?.map(inst => ({
        id: inst.id,
        equipmentId: inst.equipment_id,
        instanceNumber: inst.instance_number,
        qrCode: inst.qr_code,
        status: inst.status as EquipmentInstance['status'],
        createdAt: inst.created_at
      })) || [];
      
      setInstances(transformedInstances);
    } catch (error) {
      console.error('Error fetching equipment instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [allInstances, setAllInstances] = useState<EquipmentInstance[]>(instances);
  
  if (!equipment) return null;

  // Fetch all instances when modal opens
  useEffect(() => {
    if (isOpen && equipment && equipment.qrType === 'individual') {
      fetchAllInstances();
    }
  }, [isOpen, equipment]);

  const fetchAllInstances = async () => {
    try {
      setLoading(true);
      
      // Fetch instances directly from the database
      const { data, error } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('equipment_id', equipment.id)
        .order('instance_number');
      
      if (error) throw error;
      
      // Transform data to match our interface
      const transformedInstances: EquipmentInstance[] = data?.map(inst => ({
        id: inst.id,
        equipmentId: inst.equipment_id,
        instanceNumber: inst.instance_number,
        qrCode: inst.qr_code,
        status: inst.status as EquipmentInstance['status'],
        createdAt: inst.created_at
      })) || [];
      
      setAllInstances(transformedInstances);
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQRCodeValue = (instance?: EquipmentInstance) => {
    if (instance) {
      return instance.qrCode;
    }
    return equipment.id;
  };

  const getQRCodeTitle = (instance?: EquipmentInstance) => {
    if (instance) {
      return `${equipment.name} #${instance.instanceNumber}`;
    }
    return equipment.name;
  };

  const getQRCodeSubtitle = (instance?: EquipmentInstance) => {
    if (instance) {
      return `${equipment.articleNumber} - Instance ${instance.instanceNumber}`;
    }
    return equipment.articleNumber || equipment.serialNumber;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`QR CODES - ${equipment.name.toUpperCase()}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Info header */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-lg font-black text-blue-800 dark:text-blue-200 mb-1 uppercase">
            {equipment.qrType === 'individual' ? 'QR CODES INDIVIDUELS' : 'QR CODE UNIQUE'}
          </h3>
          {loading ? (
            <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
              Chargement des QR codes...
            </p>
          ) : (
            <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
              {equipment.qrType === 'individual' 
                ? `${instances.length} QR codes individuels pour impression d'étiquettes`
                : 'Un seul QR code pour tout le lot'}
            </p>
          )}
          <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-1">
            Article: {equipment.articleNumber || equipment.serialNumber} • Quantité totale: {equipment.totalQuantity}
          </p>
          
          {loading && (
            <div className="flex items-center gap-2 mt-2">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-xs">Chargement des QR codes...</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : equipment.qrType === 'individual' && allInstances.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allInstances.map(instance => (
              <div key={instance.id} className="flex justify-center">
                <QRCodeGenerator
                  value={getQRCodeValue(instance)}
                  title={getQRCodeTitle(instance)}
                  subtitle={getQRCodeSubtitle(instance)}
                  size={150}
                  printable={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <QRCodeGenerator
              value={getQRCodeValue()}
              title={getQRCodeTitle()}
              subtitle={getQRCodeSubtitle()}
              size={200}
              printable={true}
            />
          </div>
        )}
        
        {equipment.qrType === 'individual' && instances.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune instance trouvée pour cet équipement. 
              Essayez de mettre à jour la quantité totale pour générer des instances.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRCodesModal;
import React from 'react';
import Modal from '../common/Modal';
import QRCodeGenerator from '../QRCode/QRCodeGenerator';
import { Equipment, EquipmentInstance } from '../../types';

interface QRCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
  instances: EquipmentInstance[];
}

const QRCodesModal: React.FC<QRCodesModalProps> = ({ 
  isOpen, 
  onClose, 
  equipment, 
  instances 
}) => {
  if (!equipment) return null;

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
          <h3 className="text-lg font-black text-blue-800 dark:text-blue-200 mb-2 uppercase">
            {equipment.qrType === 'individual' ? 'QR CODES INDIVIDUELS' : 'QR CODE UNIQUE'}
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
            {equipment.qrType === 'individual' 
              ? `${instances.length} QR codes individuels pour impression d'étiquettes`
              : 'Un seul QR code pour tout le lot'}
          </p>
          <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-1">
            Article: {equipment.articleNumber} • Quantité totale: {equipment.totalQuantity}
          </p>
        </div>

        {equipment.qrType === 'individual' && instances.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {instances.map(instance => (
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
      </div>
    </Modal>
  );
};

export default QRCodesModal;
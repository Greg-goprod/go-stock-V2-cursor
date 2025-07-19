import React from 'react';
import Modal from '../common/Modal';
import QRCodeGenerator from './QRCodeGenerator';
import { Equipment, EquipmentInstance } from '../../types';
import { Printer } from 'lucide-react';
import Button from '../common/Button';

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

  const handlePrintAll = () => {
    // Create a new window for printing all QR codes
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
      return;
    }
    
    // Generate HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - ${equipment.name}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
            }
            .print-title {
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .print-subtitle {
              font-size: 12pt;
              color: #666;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 5mm;
              justify-items: center;
              padding: 5mm;
            }
            .qr-item {
              width: 40mm;
              height: 40mm;
              border-radius: 50%;
              background-color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
              margin-bottom: 5mm;
              overflow: hidden;
              box-shadow: 0 0 3px rgba(0,0,0,0.2);
            }
            .qr-title {
              font-size: 6px;
              font-weight: bold;
              margin-top: 3mm;
              margin-bottom: 0;
              text-align: center;
              width: 90%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .qr-code {
              width: 25mm;
              height: 25mm;
              object-fit: contain;
              display: block;
              margin: auto;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
            }
            @media print {
              .print-button {
                display: none;
              }
              .print-header {
                display: none;
              }
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">Imprimer</button>
          
          <div class="print-header">
            <div class="print-title">QR Codes - ${equipment.name}</div>
            <div class="print-subtitle">${equipment.qrType === 'individual' ? `${instances.length} QR codes individuels` : 'QR code unique'}</div>
          </div>
          
          <div class="qr-grid">
            ${equipment.qrType === 'individual' && instances.length > 0 
              ? instances.map(instance => `
                <div class="qr-item">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(instance.qrCode)}" 
                    alt="QR Code ${instance.instanceNumber}"
                    class="qr-code"
                  />
                  <div class="qr-title">${equipment.name} #${instance.instanceNumber}</div>
                </div>
              `).join('')
              : `
                <div class="qr-item">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(equipment.id)}" 
                    alt="QR Code"
                    class="qr-code"
                  />
                  <div class="qr-title">${equipment.name}</div>
                </div>
              `
            }
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
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

        {/* Print all button */}
        <div className="flex justify-center mb-4">
          <Button
            variant="primary"
            icon={<Printer size={18} />}
            onClick={handlePrintAll}
          >
            IMPRIMER TOUS LES QR CODES
          </Button>
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
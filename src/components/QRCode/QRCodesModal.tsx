import React from 'react';
import Modal from '../common/Modal';
import QRCodeGenerator from '../QRCode/QRCodeGenerator';
import { Equipment, EquipmentInstance } from '../../types';
import { Download, Printer } from 'lucide-react';
import Button from '../common/Button';

interface QRCodesModalProps {
  equipment: Equipment | null;
  instances: EquipmentInstance[];
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodesModal: React.FC<QRCodesModalProps> = ({
  equipment,
  isOpen,
  onClose,
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
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
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
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              gap: 20px;
              justify-items: center;
            }
            .qr-item {
              text-align: center;
              page-break-inside: avoid;
              margin-bottom: 20px;
            }
            .qr-title {
              font-weight: bold;
              margin-top: 5px;
              font-size: 10pt;
            }
            .qr-subtitle {
              font-size: 8pt;
              color: #666;
            }
            .qr-code {
              margin-bottom: 5px;
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
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(instance.qrCode)}" 
                    alt="QR Code ${instance.instanceNumber}"
                    class="qr-code"
                  />
                  <div class="qr-title">${equipment.name} #${instance.instanceNumber}</div>
                  <div class="qr-subtitle">${equipment.articleNumber || equipment.serialNumber}-${String(instance.instanceNumber).padStart(3, '0')}</div>
                </div>
              `).join('')
              : `
                <div class="qr-item">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(equipment.id)}" 
                    alt="QR Code"
                    class="qr-code"
                  />
                  <div class="qr-title">${equipment.name}</div>
                  <div class="qr-subtitle">${equipment.articleNumber || equipment.serialNumber}</div>
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`QR Codes - ${equipment.name}`}
    >
      <div className="p-4">
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {equipment.qrType === 'individual' 
              ? `${instances.length} QR codes individuels pour impression d'étiquettes`
              : 'Un seul QR code pour tout le lot'}
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={16} />}
              onClick={handlePrintAll}
            >
              IMPRIMER TOUS LES QR CODES
            </Button>
          </div>
          <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-1">
            Article: {equipment.articleNumber} • Quantité totale: {equipment.totalQuantity}
          </p>
        </div>
      </div>
    </Modal>
  );
};
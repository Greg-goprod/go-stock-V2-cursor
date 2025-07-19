import React from 'react';
import { Printer } from 'lucide-react';
import Button from '../common/Button';

interface QRCodeGeneratorProps {
  value: string;
  title?: string;
  subtitle?: string;
  size?: number;
  printable?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  title,
  subtitle,
  size = 200,
  printable = false
}) => {
  // Fonction pour générer un QR code avec l'API QR Server
  const getQRCodeUrl = (data: string, size: number) => {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=10`;
  };

  // Fonction pour imprimer le QR code directement avec la boîte de dialogue système
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
          <title>Impression QR Code</title>
            <style>
              @page {
                size: 40mm 40mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                width: 40mm;
                height: 40mm;
                overflow: hidden;
              }
              .print-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 40mm;
                height: 40mm;
                box-sizing: border-box;
                padding: 0;
                overflow: hidden;
                position: relative;
              }
              .qr-title {
                font-size: 6px;
                font-weight: bold;
                margin-top: 3mm;
                margin-bottom: 1mm;
                text-align: center;
                width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: Arial, sans-serif;
              }
              .qr-image {
                width: 25mm;
                height: 25mm;
                object-fit: contain;
                display: block;
                margin: auto;
              }
              .circle-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 40mm;
                height: 40mm;
                border-radius: 50%;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: white;
              }
            </style>
          </head>
          <body onload="window.print(); window.setTimeout(function(){ window.close(); }, 500);">
            <div class="circle-container">
            <div class="print-container">
                <img class="qr-image" src="${getQRCodeUrl(value, 250)}" alt="QR Code" />
                ${title ? `<div class="qr-title">${title}</div>` : ''}
              </div>
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{subtitle}</p>}
      
      {/* Prévisualisation du QR code */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <img
          src={getQRCodeUrl(value, size)}
          alt="QR Code"
          className="w-full h-auto"
          style={{ maxWidth: `${size}px` }}
        />
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center max-w-full overflow-hidden text-ellipsis">
          {value}
      </div>
      </div>
      
      {printable && (
        <Button 
          variant="outline"
          size="sm" 
          onClick={handlePrint}
          className="mt-2"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      )}
    </div>
  );
};

export default QRCodeGenerator;
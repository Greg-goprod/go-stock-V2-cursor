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
  // Fonction pour générer un QR code avec l'API Google Charts
  const getQRCodeUrl = (data: string, size: number) => {
    return `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(data)}&chs=${size}x${size}&choe=UTF-8&chld=H|0`;
  };

  // Fonction pour imprimer le QR code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impression QR Code - ${title || value}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              margin: 20px auto;
              max-width: 300px;
            }
            .qr-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .qr-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            .qr-image {
              width: 100%;
              max-width: ${size}px;
              height: auto;
            }
            .qr-value {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
              word-break: break-all;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${title ? `<div class="qr-title">${title}</div>` : ''}
            ${subtitle ? `<div class="qr-subtitle">${subtitle}</div>` : ''}
            <img class="qr-image" src="${getQRCodeUrl(value, size)}" alt="QR Code" />
            <div class="qr-value">${value}</div>
          </div>
          <div class="no-print">
            <p>Appuyez sur Ctrl+P (ou Cmd+P) pour imprimer, ou utilisez le bouton ci-dessous.</p>
            <button onclick="window.print()">Imprimer</button>
          </div>
          <script>
            // Imprimer automatiquement
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
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
      
      <div className="bg-white p-2 rounded-lg shadow-sm">
        <img
          src={getQRCodeUrl(value, size)}
          alt="QR Code"
          className="w-full h-auto"
          style={{ maxWidth: `${size}px` }}
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center max-w-full overflow-hidden text-ellipsis">
        {value}
      </div>
      
      {printable && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="mt-4"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      )}
    </div>
  );
};

export default QRCodeGenerator; 
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../common/Button';
import { Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  title: string;
  subtitle?: string;
  size?: number;
  printable?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  title,
  subtitle,
  size = 128,
  printable = true,
}) => {
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) return;
    
    // Generate HTML content for printing
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .qr-container {
              border: 1px solid #ccc;
              padding: 20px;
              display: inline-block;
              margin-bottom: 20px;
            }
            h2 {
              margin-top: 10px;
              margin-bottom: 5px;
            }
            p {
              margin-top: 0;
              color: #666;
            }
            .info {
              font-size: 12px;
              margin-top: 5px;
              color: #999;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${new QRCodeSVG({ value, size: size * 2 }).outerHTML}
            <h2>${title}</h2>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            <p class="info">ID: ${value}</p>
          </div>
          <button onclick="window.print(); window.close();">Print</button>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
      <QRCodeSVG value={value} size={size} />
      <h3 className="mt-3 font-medium text-gray-800">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      
      {printable && (
        <Button 
          variant="outline" 
          size="sm" 
          icon={<Printer size={16} />}
          onClick={handlePrint}
          className="mt-3"
        >
          Print
        </Button>
      )}
    </div>
  );
};

export default QRCodeGenerator;
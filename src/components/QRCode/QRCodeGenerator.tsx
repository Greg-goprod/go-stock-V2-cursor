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
    // Créer le contenu HTML pour l'impression
    const qrCodeSvg = document.createElement('div');
    qrCodeSvg.innerHTML = `
      <svg width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size} ${size}">
        ${new QRCodeSVG({ value, size }).props.children}
      </svg>
    `;
    
    const svgElement = qrCodeSvg.querySelector('svg');
    const svgString = svgElement ? svgElement.outerHTML : '';
    
    const printContent = `
      <html>
        <head>
          <title>QR Code - ${title}</title>
          <style>
            body {
              font-family: 'Roboto', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
              background: white;
            }
            .qr-container {
              border: 2px solid #333;
              padding: 30px;
              display: inline-block;
              margin-bottom: 20px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .qr-code {
              margin-bottom: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .qr-code svg {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 10px;
              background: white;
            }
            h2 {
              margin: 15px 0 8px 0;
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            p {
              margin: 5px 0;
              color: #666;
              font-size: 16px;
              font-weight: 500;
            }
            .info {
              font-size: 14px;
              margin-top: 15px;
              color: #999;
              font-family: monospace;
              background: #f8f9fa;
              padding: 10px;
              border-radius: 6px;
              border: 1px solid #e9ecef;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body {
                margin: 0;
                padding: 10px;
              }
              .qr-container {
                box-shadow: none;
                border: 2px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${svgString}
            </div>
            <h2>${title}</h2>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            <div class="info">
              <strong>ID:</strong> ${value}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>GO-Mat - Système de Gestion de Matériel</strong></p>
            <p>QR Code généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    // Ouvrir dans une nouvelle FENÊTRE (pas un onglet)
    const printWindow = window.open('', 'printWindow', 'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
    
    if (!printWindow) {
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
      return;
    }
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Fermer la fenêtre après impression
    printWindow.onafterprint = function() {
      printWindow.close();
    };
  };

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="mb-4">
        <QRCodeSVG 
          value={value} 
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={true}
        />
      </div>
      <h3 className="mt-3 font-bold text-gray-800 dark:text-gray-100 text-center uppercase tracking-wide">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
          {subtitle}
        </p>
      )}
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
        {value}
      </div>
      
      {printable && (
        <Button 
          variant="primary" 
          size="sm" 
          icon={<Printer size={16} />}
          onClick={handlePrint}
          className="mt-4 font-bold"
        >
          IMPRIMER
        </Button>
      )}
    </div>
  );
};

export default QRCodeGenerator;
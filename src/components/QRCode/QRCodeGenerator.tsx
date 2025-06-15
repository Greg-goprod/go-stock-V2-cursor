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
    // Générer le QR code SVG directement
    const generateQRCodeSVG = (value: string, size: number) => {
      // Créer un élément temporaire pour générer le SVG
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Utiliser React pour créer le QR code
      const qrElement = document.createElement('div');
      tempDiv.appendChild(qrElement);
      
      // Créer le QR code manuellement avec les bonnes propriétés
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      
      // Utiliser QRCode.js pour générer le QR code
      import('qrcode').then(QRCode => {
        QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }, (error) => {
          if (error) {
            console.error('Erreur génération QR:', error);
            return;
          }
          
          const dataURL = canvas.toDataURL('image/png');
          createPrintWindow(dataURL);
        });
      }).catch(() => {
        // Fallback: utiliser une approche différente
        createPrintWindowWithSVG();
      });
      
      // Nettoyer
      document.body.removeChild(tempDiv);
    };

    const createPrintWindowWithSVG = () => {
      // Créer le SVG manuellement
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
            QR Code: ${value}
          </text>
        </svg>
      `;
      
      createPrintWindow(`data:image/svg+xml;base64,${btoa(svgContent)}`);
    };

    const createPrintWindow = (qrCodeDataURL: string) => {
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Étiquette QR Code - ${title}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                background: white;
                padding: 0;
                margin: 0;
              }
              
              /* Styles pour étiquettes 40x40mm */
              .label-40x40 {
                width: 40mm;
                height: 40mm;
                padding: 2mm;
                border: 1px solid #ccc;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                background: white;
              }
              
              /* Styles pour étiquettes 30x20mm */
              .label-30x20 {
                width: 30mm;
                height: 20mm;
                padding: 1mm;
                border: 1px solid #ccc;
                display: flex;
                align-items: center;
                justify-content: space-between;
                page-break-after: always;
                background: white;
              }
              
              .qr-code-40 {
                width: 30mm;
                height: 30mm;
                margin-bottom: 1mm;
              }
              
              .qr-code-30 {
                width: 16mm;
                height: 16mm;
              }
              
              .title-40 {
                font-size: 6pt;
                font-weight: bold;
                text-align: center;
                line-height: 1.1;
                color: #000;
                max-height: 6mm;
                overflow: hidden;
                word-wrap: break-word;
              }
              
              .title-30 {
                font-size: 5pt;
                font-weight: bold;
                line-height: 1;
                color: #000;
                flex: 1;
                margin-left: 1mm;
                word-wrap: break-word;
                overflow: hidden;
              }
              
              .subtitle {
                font-size: 4pt;
                color: #666;
                text-align: center;
                margin-top: 0.5mm;
              }
              
              .controls {
                margin: 10mm;
                text-align: center;
              }
              
              .btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 8px 16px;
                margin: 5px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
              }
              
              .btn:hover {
                background: #1d4ed8;
              }
              
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .controls {
                  display: none;
                }
                .label-40x40, .label-30x20 {
                  border: 1px solid #000;
                  margin: 0;
                }
              }
              
              @page {
                margin: 0;
                size: A4;
              }
            </style>
          </head>
          <body>
            <div class="controls">
              <h2>Choisissez le format d'étiquette :</h2>
              <button class="btn" onclick="showFormat('40x40')">Étiquette 40x40mm</button>
              <button class="btn" onclick="showFormat('30x20')">Étiquette 30x20mm</button>
              <button class="btn" onclick="window.print()">IMPRIMER</button>
              <button class="btn" onclick="window.close()" style="background: #dc2626;">FERMER</button>
            </div>
            
            <!-- Format 40x40mm -->
            <div id="format-40x40" class="label-40x40" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40" />
              <div class="title-40">${title}</div>
              ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
            </div>
            
            <!-- Format 30x20mm -->
            <div id="format-30x20" class="label-30x20" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-30" />
              <div class="title-30">${title}${subtitle ? `<br><span style="font-size: 4pt; color: #666;">${subtitle}</span>` : ''}</div>
            </div>
            
            <script>
              function showFormat(format) {
                // Masquer tous les formats
                document.getElementById('format-40x40').style.display = 'none';
                document.getElementById('format-30x20').style.display = 'none';
                
                // Afficher le format sélectionné
                document.getElementById('format-' + format).style.display = format === '40x40' ? 'flex' : 'flex';
                document.getElementById('format-' + format).style.flexDirection = format === '40x40' ? 'column' : 'row';
              }
              
              // Afficher le format 40x40 par défaut
              window.onload = function() {
                showFormat('40x40');
              };
            </script>
          </body>
        </html>
      `;

      // Ouvrir dans une nouvelle FENÊTRE
      const printWindow = window.open('', 'printQRLabel', 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
      
      if (!printWindow) {
        alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
    };

    // Utiliser canvas pour générer une image PNG du QR code
    const canvas = document.createElement('canvas');
    const size = 200; // Taille pour l'impression
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fond blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      
      // Créer un QR code temporaire pour obtenir les données
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Utiliser la librairie qrcode pour générer l'image
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }).then(url => {
          createPrintWindow(url);
          document.body.removeChild(tempContainer);
        }).catch(error => {
          console.error('Erreur génération QR code:', error);
          // Fallback avec SVG
          createPrintWindowWithSVG();
          document.body.removeChild(tempContainer);
        });
      }).catch(() => {
        // Si qrcode n'est pas disponible, utiliser le SVG existant
        const svgElement = document.querySelector(`[data-qr-value="${value}"]`);
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
          const url = URL.createObjectURL(svgBlob);
          createPrintWindow(url);
        } else {
          createPrintWindowWithSVG();
        }
        document.body.removeChild(tempContainer);
      });
    } else {
      createPrintWindowWithSVG();
    }
  };

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="mb-4" data-qr-value={value}>
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
          IMPRIMER ÉTIQUETTE
        </Button>
      )}
    </div>
  );
};

export default QRCodeGenerator;
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
              
              /* Styles pour étiquettes 40x40mm carrées */
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
              
              /* Styles pour étiquettes 40x40mm rondes */
              .label-40x40-round {
                width: 40mm;
                height: 40mm;
                padding: 3mm;
                border: 1px solid #ccc;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                background: white;
                overflow: hidden;
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
              
              .qr-code-40-round {
                width: 26mm;
                height: 26mm;
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
              
              .title-40-round {
                font-size: 5pt;
                font-weight: bold;
                text-align: center;
                line-height: 1;
                color: #000;
                max-height: 5mm;
                overflow: hidden;
                word-wrap: break-word;
                margin-top: 0.5mm;
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
              
              .subtitle-round {
                font-size: 3.5pt;
                color: #666;
                text-align: center;
                margin-top: 0.3mm;
                line-height: 1;
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
              
              .btn-round {
                background: #10b981;
              }
              
              .btn-round:hover {
                background: #059669;
              }
              
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .controls {
                  display: none;
                }
                .label-40x40, .label-40x40-round, .label-30x20 {
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
              <h2>🏷️ Choisissez le format d'étiquette :</h2>
              <div style="margin: 20px 0;">
                <button class="btn" onclick="showFormat('40x40')">📐 Étiquette 40x40mm (Carrée)</button>
                <button class="btn btn-round" onclick="showFormat('40x40-round')">⭕ Étiquette 40x40mm (Ronde)</button>
                <button class="btn" onclick="showFormat('30x20')">📏 Étiquette 30x20mm</button>
              </div>
              <div style="margin: 20px 0;">
                <button class="btn" onclick="window.print()" style="background: #059669; font-size: 16px; padding: 10px 20px;">🖨️ IMPRIMER</button>
                <button class="btn" onclick="window.close()" style="background: #dc2626; font-size: 16px; padding: 10px 20px;">❌ FERMER</button>
              </div>
            </div>
            
            <!-- Format 40x40mm carré -->
            <div id="format-40x40" class="label-40x40" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40" />
              <div class="title-40">${title}</div>
              ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
            </div>
            
            <!-- Format 40x40mm rond -->
            <div id="format-40x40-round" class="label-40x40-round" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40-round" />
              <div class="title-40-round">${title}</div>
              ${subtitle ? `<div class="subtitle-round">${subtitle}</div>` : ''}
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
                document.getElementById('format-40x40-round').style.display = 'none';
                document.getElementById('format-30x20').style.display = 'none';
                
                // Afficher le format sélectionné
                const selectedElement = document.getElementById('format-' + format);
                selectedElement.style.display = 'flex';
                
                if (format === '30x20') {
                  selectedElement.style.flexDirection = 'row';
                } else {
                  selectedElement.style.flexDirection = 'column';
                }
                
                // Mettre en évidence le bouton sélectionné
                const buttons = document.querySelectorAll('.btn');
                buttons.forEach(btn => {
                  btn.style.opacity = '0.7';
                  btn.style.transform = 'scale(1)';
                });
                
                // Trouver et mettre en évidence le bouton correspondant
                if (format === '40x40') {
                  buttons[0].style.opacity = '1';
                  buttons[0].style.transform = 'scale(1.05)';
                } else if (format === '40x40-round') {
                  buttons[1].style.opacity = '1';
                  buttons[1].style.transform = 'scale(1.05)';
                } else if (format === '30x20') {
                  buttons[2].style.opacity = '1';
                  buttons[2].style.transform = 'scale(1.05)';
                }
              }
              
              // Afficher le format rond par défaut
              window.onload = function() {
                showFormat('40x40-round');
              };
            </script>
          </body>
        </html>
      `;

      // Ouvrir dans une nouvelle FENÊTRE
      const printWindow = window.open('', 'printQRLabel', 'width=900,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
      
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
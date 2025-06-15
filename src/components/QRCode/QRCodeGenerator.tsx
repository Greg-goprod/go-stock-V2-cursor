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
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,0,1;wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Roboto', 'Arial', sans-serif;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                padding: 0;
                margin: 0;
                min-height: 100vh;
              }
              
              /* ✅ ÉTIQUETTE 40x30mm - QR CODE ALIGNÉ À GAUCHE AVEC RETRAIT DE 8MM */
              .label-40x30 {
                width: 40mm !important;
                height: 30mm !important;
                max-width: 40mm !important;
                max-height: 30mm !important;
                min-width: 40mm !important;
                min-height: 30mm !important;
                padding: 0.5mm !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                page-break-after: always;
                background: white;
                border: 1px solid #e5e7eb;
                gap: 0.5mm !important;
                overflow: hidden !important;
                position: relative;
              }
              
              /* Styles pour étiquettes 40x40mm avec texte en dessous */
              .label-40x40-text-below {
                width: 40mm;
                height: 40mm;
                padding: 2mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                page-break-after: always;
                background: white;
              }
              
              /* Styles pour étiquettes 40x40mm rondes avec QR 30x30mm et padding 5mm */
              .label-40x40-round {
                width: 50mm;
                height: 50mm;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                background: white;
                overflow: hidden;
                position: relative;
              }
              
              /* Styles pour étiquettes 30x20mm */
              .label-30x20 {
                width: 30mm;
                height: 20mm;
                padding: 1mm;
                display: flex;
                align-items: center;
                justify-content: space-between;
                page-break-after: always;
                background: white;
              }
              
              /* ✅ QR CODE 40x30mm - ALIGNÉ À GAUCHE AVEC RETRAIT DE 8MM */
              .qr-code-40x30 {
                width: 29mm !important;
                height: 29mm !important;
                max-width: 29mm !important;
                max-height: 29mm !important;
                min-width: 29mm !important;
                min-height: 29mm !important;
                flex-shrink: 0 !important;
                object-fit: contain !important;
                display: block !important;
                margin-left: 8mm !important;
                position: relative !important;
              }
              
              /* QR code pour étiquette 40x40mm avec texte en dessous */
              .qr-code-40x40-text-below {
                width: 30mm;
                height: 30mm;
                margin-bottom: 2mm;
                display: block;
                object-fit: contain;
              }
              
              /* QR code de 30x30mm exactement, parfaitement centré */
              .qr-code-40-round {
                width: 30mm;
                height: 30mm;
                display: block;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                object-fit: contain;
              }
              
              .qr-code-30 {
                width: 16mm;
                height: 16mm;
              }
              
              /* ✅ TEXTE 40x30mm - REPOSITIONNÉ POUR UTILISER L'ESPACE RESTANT APRÈS LE RETRAIT */
              .title-40x30 {
                width: 18mm !important;
                max-width: 18mm !important;
                min-width: 18mm !important;
                height: 29mm !important;
                max-height: 29mm !important;
                font-size: 6pt !important;
                font-weight: 900 !important;
                line-height: 1.0 !important;
                color: #000 !important;
                word-wrap: break-word !important;
                overflow: hidden !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: flex-start !important;
                text-align: left !important;
                padding: 0 !important;
                margin: 0 !important;
                flex-shrink: 0 !important;
                margin-left: -8mm !important;
              }
              
              /* Titre pour étiquette 40x40mm avec texte en dessous */
              .title-40x40-text-below {
                font-size: 7pt;
                font-weight: 900;
                text-align: center;
                line-height: 1.1;
                color: #000;
                max-height: 5mm;
                overflow: hidden;
                word-wrap: break-word;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                width: 100%;
              }
              
              /* Titre pour l'étiquette ronde - positionné en bas */
              .title-40-round {
                font-size: 4pt;
                font-weight: 900;
                text-align: center;
                line-height: 1;
                color: #000;
                max-height: 3mm;
                overflow: hidden;
                word-wrap: break-word;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                position: absolute;
                bottom: 2mm;
                left: 50%;
                transform: translateX(-50%);
                width: 36mm;
              }
              
              .title-30 {
                font-size: 5pt;
                font-weight: 900;
                line-height: 1;
                color: #000;
                flex: 1;
                margin-left: 1mm;
                word-wrap: break-word;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              
              /* ✅ SOUS-TITRE 40x30mm - OPTIMISÉ POUR L'ESPACE DISPONIBLE */
              .subtitle-40x30 {
                font-size: 4pt !important;
                color: #666 !important;
                margin-top: 0.5mm !important;
                font-weight: 500 !important;
                line-height: 1.0 !important;
                word-wrap: break-word !important;
                overflow: hidden !important;
                display: block !important;
              }
              
              /* Sous-titre pour étiquette 40x40mm avec texte en dessous */
              .subtitle-40x40-text-below {
                font-size: 5pt;
                color: #666;
                text-align: center;
                margin-top: 0.5mm;
                font-weight: 500;
                line-height: 1.1;
                width: 100%;
              }
              
              .subtitle-round {
                font-size: 3pt;
                color: #666;
                text-align: center;
                line-height: 1;
                font-weight: 500;
                position: absolute;
                bottom: 0.5mm;
                left: 50%;
                transform: translateX(-50%);
                width: 36mm;
              }
              
              .controls {
                margin: 20px;
                text-align: center;
                border: 2px solid #e2e8f0;
                padding: 30px;
                border-radius: 16px;
                background: white;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                max-width: 800px;
                margin: 20px auto;
              }
              
              .header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
              }
              
              .logo {
                width: 32px;
                height: 32px;
                background: #2563eb;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 14px;
              }
              
              .header-title {
                color: #2563eb;
                font-size: 28px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              
              .subtitle-header {
                color: #64748b;
                font-size: 14px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 5px;
              }
              
              .section-title {
                color: #2563eb;
                font-size: 20px;
                font-weight: 900;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                margin: 8px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
                font-family: 'Roboto', sans-serif;
              }
              
              .btn:hover {
                background: #1d4ed8;
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
              }
              
              .btn:active {
                transform: translateY(0);
              }
              
              .btn-round {
                background: #10b981;
                box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
              }
              
              .btn-round:hover {
                background: #059669;
                box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
              }
              
              .btn-40x30 {
                background: #8b5cf6;
                box-shadow: 0 4px 6px rgba(139, 92, 246, 0.2);
              }
              
              .btn-40x30:hover {
                background: #7c3aed;
                box-shadow: 0 6px 12px rgba(139, 92, 246, 0.3);
              }
              
              .btn-40x40-text {
                background: #f59e0b;
                box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);
              }
              
              .btn-40x40-text:hover {
                background: #d97706;
                box-shadow: 0 6px 12px rgba(245, 158, 11, 0.3);
              }
              
              .btn-print {
                background: #059669;
                font-size: 16px;
                padding: 16px 32px;
                margin: 15px 8px;
                box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);
              }
              
              .btn-print:hover {
                background: #047857;
                box-shadow: 0 6px 12px rgba(5, 150, 105, 0.3);
              }
              
              .btn-close {
                background: #dc2626;
                font-size: 16px;
                padding: 16px 32px;
                margin: 15px 8px;
                box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
              }
              
              .btn-close:hover {
                background: #b91c1c;
                box-shadow: 0 6px 12px rgba(220, 38, 38, 0.3);
              }
              
              .format-buttons {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
                margin: 25px 0;
              }
              
              .action-buttons {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 30px 0;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
              
              .tip {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 8px;
                padding: 15px;
                margin-top: 20px;
                color: #0369a1;
                font-size: 13px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .tip-icon {
                background: #0ea5e9;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 900;
                flex-shrink: 0;
              }
              
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                .controls {
                  display: none;
                }
                .label-40x30, .label-40x40-text-below, .label-40x40-round, .label-30x20 {
                  margin: 0;
                  border: none;
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
              <div class="header">
                <div class="logo">QR</div>
                <div>
                  <div class="header-title">GO-Mat</div>
                  <div class="subtitle-header">Gestion de Matériel</div>
                </div>
              </div>
              
              <div class="section-title">🏷️ Choisissez le format d'étiquette</div>
              
              <div class="format-buttons">
                <button class="btn btn-40x30" onclick="showFormat('40x30')">
                  📐 Étiquette 40x30mm (QR aligné gauche + 8mm retrait)
                </button>
                <button class="btn btn-40x40-text" onclick="showFormat('40x40-text-below')">
                  📄 Étiquette 40x40mm (texte en dessous)
                </button>
                <button class="btn btn-round" onclick="showFormat('40x40-round')">
                  ⭕ QR 30x30mm dans rond Ø40mm
                </button>
                <button class="btn" onclick="showFormat('30x20')">
                  📏 Étiquette 30x20mm (originale)
                </button>
              </div>
              
              <div class="action-buttons">
                <button class="btn btn-print" onclick="window.print()">
                  🖨️ IMPRIMER
                </button>
                <button class="btn btn-close" onclick="window.close()">
                  ❌ FERMER
                </button>
              </div>
              
              <div class="tip">
                <div class="tip-icon">⬅️</div>
                <div>
                  <strong>ALIGNEMENT GAUCHE :</strong> Le QR code est maintenant aligné à gauche avec un retrait de 8mm, créant plus d'espace pour le texte (18mm au lieu de 10mm) !
                </div>
              </div>
            </div>
            
            <!-- ✅ FORMAT 40x30mm - QR CODE ALIGNÉ À GAUCHE AVEC RETRAIT DE 8MM -->
            <div id="format-40x30" class="label-40x30" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40x30" />
              <div class="title-40x30">
                ${title}
                ${subtitle ? `<div class="subtitle-40x30">${subtitle}</div>` : ''}
              </div>
            </div>
            
            <!-- Format 40x40mm avec texte en dessous -->
            <div id="format-40x40-text-below" class="label-40x40-text-below" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40x40-text-below" />
              <div class="title-40x40-text-below">${title}</div>
              ${subtitle ? `<div class="subtitle-40x40-text-below">${subtitle}</div>` : ''}
            </div>
            
            <!-- Format 40x40mm rond avec QR 30x30mm parfaitement centré -->
            <div id="format-40x40-round" class="label-40x40-round" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-40-round" />
              <div class="title-40-round">${title}</div>
              ${subtitle ? `<div class="subtitle-round">${subtitle}</div>` : ''}
            </div>
            
            <!-- Format 30x20mm - ORIGINAL -->
            <div id="format-30x20" class="label-30x20" style="display: none;">
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code-30" />
              <div class="title-30">${title}${subtitle ? `<br><span style="font-size: 4pt; color: #666; font-weight: 500;">${subtitle}</span>` : ''}</div>
            </div>
            
            <script>
              function showFormat(format) {
                // Masquer tous les formats
                document.getElementById('format-40x30').style.display = 'none';
                document.getElementById('format-40x40-text-below').style.display = 'none';
                document.getElementById('format-40x40-round').style.display = 'none';
                document.getElementById('format-30x20').style.display = 'none';
                
                // Afficher le format sélectionné
                const selectedElement = document.getElementById('format-' + format);
                selectedElement.style.display = 'flex';
                
                if (format === '30x20' || format === '40x30') {
                  selectedElement.style.flexDirection = 'row';
                } else {
                  selectedElement.style.flexDirection = 'column';
                }
                
                // Mettre en évidence le bouton sélectionné
                const buttons = document.querySelectorAll('.btn:not(.btn-print):not(.btn-close)');
                buttons.forEach(btn => {
                  btn.style.opacity = '0.6';
                  btn.style.transform = 'scale(0.95)';
                  btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                });
                
                // Trouver et mettre en évidence le bouton correspondant
                let selectedButton;
                if (format === '40x30') {
                  selectedButton = buttons[0];
                } else if (format === '40x40-text-below') {
                  selectedButton = buttons[1];
                } else if (format === '40x40-round') {
                  selectedButton = buttons[2];
                } else if (format === '30x20') {
                  selectedButton = buttons[3];
                }
                
                if (selectedButton) {
                  selectedButton.style.opacity = '1';
                  selectedButton.style.transform = 'scale(1.05)';
                  if (format === '40x30') {
                    selectedButton.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.4)';
                  } else if (format === '40x40-text-below') {
                    selectedButton.style.boxShadow = '0 6px 12px rgba(245, 158, 11, 0.4)';
                  } else if (format === '40x40-round') {
                    selectedButton.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.4)';
                  } else {
                    selectedButton.style.boxShadow = '0 6px 12px rgba(37, 99, 235, 0.4)';
                  }
                }
              }
              
              // Afficher le format 40x30mm par défaut
              window.onload = function() {
                showFormat('40x30');
              };
            </script>
          </body>
        </html>
      `;

      // Ouvrir dans une nouvelle FENÊTRE avec des dimensions optimisées
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
      <h3 className="mt-3 font-black text-gray-800 dark:text-gray-100 text-center uppercase tracking-wide">
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
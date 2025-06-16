import React, { useEffect, useState, useRef } from 'react';
import { QrCode } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const [scannedValue, setScannedValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string>('');

  // Auto-focus sur le champ de saisie pour la douchette
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Fonction pour éviter les doubles scans
  const canProcessScan = (value: string): boolean => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    const isSameValue = value === lastScannedValueRef.current;
    
    // Empêcher les scans identiques dans les 2 secondes
    if (isSameValue && timeSinceLastScan < 2000) {
      console.log('🚫 Scan ignoré (doublon détecté):', value);
      return false;
    }
    
    lastScanTimeRef.current = now;
    lastScannedValueRef.current = value;
    return true;
  };

  // Gérer la saisie de la douchette
  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      const value = scannedValue.trim();
      if (value && canProcessScan(value)) {
        setIsProcessing(true);
        console.log('🔍 QR Code scanné par douchette:', value);
        
        // Nettoyer la valeur
        const cleanValue = value.replace(/[\r\n\t\s]/g, '').trim();
        console.log('🧹 Valeur nettoyée:', cleanValue);
        
        try {
          await onScan(cleanValue);
          setScannedValue(''); // Reset pour le prochain scan
        } catch (error) {
          console.error('Erreur lors du traitement du scan:', error);
          if (onError) {
            onError('Erreur lors du traitement du scan');
          }
        }
        
        // Reset du statut après 1 seconde
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
        
        // Re-focus pour le prochain scan
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isProcessing) {
      setScannedValue(e.target.value);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Mode Douchette Optimisé */}
      <div className="w-full max-w-sm">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode size={20} className="text-green-600 dark:text-green-400" />
            <h3 className="font-black text-green-800 dark:text-green-200 uppercase tracking-wide">
              ✅ SCAN MULTIPLE ACTIF
            </h3>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            Scannez vos QR codes en continu avec votre douchette
          </p>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={scannedValue}
            onChange={handleInputChange}
            onKeyDown={handleBarcodeInput}
            placeholder="🎯 Prêt pour le scan..."
            disabled={isProcessing}
            className={`w-full px-4 py-3 text-center border-2 border-dashed rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-lg focus:outline-none focus:ring-2 transition-all ${
              isProcessing
                ? 'opacity-50 cursor-not-allowed border-yellow-400 dark:border-yellow-500'
                : 'border-primary-300 dark:border-primary-600 focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-800'
            }`}
            autoComplete="off"
            autoFocus
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            ) : (
              <QrCode size={20} className="text-gray-400" />
            )}
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            🚀 Scan automatique • Protection anti-doublon • Historique intégré
          </p>
          {isProcessing && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
              ⚡ Traitement en cours...
            </p>
          )}
          {scannedValue && !isProcessing && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
              ⚡ Appuyez sur Entrée pour valider
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
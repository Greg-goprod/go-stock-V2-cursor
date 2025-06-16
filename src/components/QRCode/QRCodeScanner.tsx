import React, { useEffect, useState, useRef } from 'react';
import Button from '../common/Button';
import { QrCode, Camera, Keyboard, AlertCircle, CheckCircle } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const [scanMode, setScanMode] = useState<'barcode' | 'camera'>('barcode');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState('');
  const [lastScannedValue, setLastScannedValue] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scannerDivId = 'qr-reader';

  // Auto-focus sur le champ de saisie pour la douchette
  useEffect(() => {
    if (scanMode === 'barcode' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // Fonction pour éviter les doubles scans
  const canProcessScan = (value: string): boolean => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    const isSameValue = value === lastScannedValue;
    
    // Empêcher les scans identiques dans les 2 secondes
    if (isSameValue && timeSinceLastScan < 2000) {
      console.log('🚫 Scan ignoré (doublon détecté):', value);
      return false;
    }
    
    lastScanTimeRef.current = now;
    return true;
  };

  // Gérer la saisie de la douchette
  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      const value = scannedValue.trim();
      if (value && canProcessScan(value)) {
        setIsProcessing(true);
        console.log('🔍 QR Code scanné par douchette:', value);
        
        setLastScannedValue(value);
        setScanStatus('success');
        
        // Nettoyer la valeur
        const cleanValue = value.replace(/[\r\n\t\s]/g, '').trim();
        console.log('🧹 Valeur nettoyée:', cleanValue);
        
        try {
          await onScan(cleanValue);
          setScannedValue(''); // Reset pour le prochain scan
        } catch (error) {
          console.error('Erreur lors du traitement du scan:', error);
          setScanStatus('error');
        }
        
        // Reset du statut après 3 secondes
        setTimeout(() => {
          setScanStatus('idle');
          setIsProcessing(false);
        }, 3000);
        
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
      setScanStatus('idle');
    }
  };

  // Scanner caméra
  const startCameraScanning = async () => {
    setError(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          if (canProcessScan(decodedText)) {
            console.log('🔍 QR Code scanné par caméra:', decodedText);
            handleScanSuccess(decodedText);
          }
        },
        (errorMessage: string) => {
          console.log('Scanner caméra:', errorMessage);
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue du scanner caméra';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopCameraScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Erreur arrêt scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const cleanValue = decodedText.replace(/[\r\n\t\s]/g, '').trim();
    console.log('🧹 Valeur caméra nettoyée:', cleanValue);
    
    try {
      await onScan(cleanValue);
      await stopCameraScanning();
    } catch (error) {
      console.error('Erreur lors du traitement du scan caméra:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup à la fermeture
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((error: any) => {
          console.error('Erreur arrêt scanner:', error);
        });
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Mode Douchette */}
      {scanMode === 'barcode' && (
        <div className="w-full max-w-sm">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Keyboard size={20} className="text-green-600 dark:text-green-400" />
              <h3 className="font-black text-green-800 dark:text-green-200 uppercase tracking-wide">
                ✅ PRÊT POUR LE SCAN
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              Scannez directement avec votre douchette
            </p>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scannedValue}
              onChange={handleInputChange}
              onKeyDown={handleBarcodeInput}
              placeholder="Scannez un QR code..."
              disabled={isProcessing}
              className={`w-full px-4 py-3 text-center border-2 border-dashed rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-lg focus:outline-none focus:ring-2 transition-all ${
                isProcessing
                  ? 'opacity-50 cursor-not-allowed'
                  : scanStatus === 'success' 
                  ? 'border-green-400 dark:border-green-500 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
                  : scanStatus === 'error'
                  ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                  : 'border-primary-300 dark:border-primary-600 focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-800'
              }`}
              autoComplete="off"
              autoFocus
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              ) : scanStatus === 'success' ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : scanStatus === 'error' ? (
                <AlertCircle size={20} className="text-red-500" />
              ) : (
                <QrCode size={20} className="text-gray-400" />
              )}
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              🎯 Pointez votre douchette vers un QR code
            </p>
            {isProcessing && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                ⚡ Traitement en cours...
              </p>
            )}
            {scannedValue && !isProcessing && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                ⚡ Scan en cours...
              </p>
            )}
            {lastScannedValue && scanStatus === 'success' && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <p className="text-xs text-green-700 dark:text-green-300 font-black uppercase tracking-wide">
                  ✅ SCAN RÉUSSI
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="outline"
              size="sm"
              icon={<Camera size={16} />}
              onClick={() => setScanMode('camera')}
              className="font-medium text-xs"
              disabled={isProcessing}
            >
              Utiliser la caméra
            </Button>
          </div>
        </div>
      )}

      {/* Mode Caméra */}
      {scanMode === 'camera' && (
        <div className="w-full max-w-sm">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={20} className="text-orange-600 dark:text-orange-400" />
              <h3 className="font-black text-orange-800 dark:text-orange-200 uppercase tracking-wide">
                MODE CAMÉRA WEB
              </h3>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              📷 Utilisez votre caméra web pour scanner
            </p>
          </div>

          <div id={scannerDivId} className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
            {!isScanning && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <Camera size={48} strokeWidth={1.5} className="mb-2" />
                <p className="font-black uppercase tracking-wide">Scanner caméra web</p>
                <p className="text-sm font-medium">Cliquez sur "Démarrer" pour activer</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="flex justify-center gap-3">
            {isScanning ? (
              <Button 
                variant="danger" 
                onClick={stopCameraScanning}
                className="font-black"
                disabled={isProcessing}
              >
                ARRÊTER CAMÉRA
              </Button>
            ) : (
              <Button 
                variant="primary" 
                icon={<Camera size={18} />}
                onClick={startCameraScanning}
                className="font-black"
                disabled={isProcessing}
              >
                DÉMARRER CAMÉRA
              </Button>
            )}
            
            <Button
              variant="outline"
              icon={<Keyboard size={18} />}
              onClick={() => setScanMode('barcode')}
              className="font-black"
              disabled={isProcessing}
            >
              RETOUR DOUCHETTE
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;
import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Zap, Camera, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const [scannedValue, setScannedValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanStatus, setLastScanStatus] = useState<'success' | 'error' | 'duplicate' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string>('');

  // Initialiser le scanner de QR code
  useEffect(() => {
    if (!scannerRef.current && scannerDivRef.current) {
      try {
        // Créer une nouvelle instance du scanner
        scannerRef.current = new Html5Qrcode("qr-reader");
        
        // Démarrer le scanner avec la caméra
        startScanner();
      } catch (error) {
        console.error("Erreur d'initialisation du scanner:", error);
        setCameraError("Impossible d'initialiser le scanner de QR code");
        if (onError) {
          onError("Impossible d'initialiser le scanner de QR code");
        }
      }
    }

    // Nettoyage lors du démontage du composant
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(error => {
          console.error("Erreur lors de l'arrêt du scanner:", error);
        });
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current) return;
    
    try {
      // Vérifier d'abord les permissions de la caméra
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Arrêter le stream de test
      
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        const cameraId = cameras[0].id;
        
        await scannerRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            console.log("QR Code détecté:", decodedText);
            processScan(decodedText);
          },
          (errorMessage) => {
            // Ignorer les erreurs de scan en cours - ce sont des erreurs normales quand aucun QR n'est détecté
            if (!errorMessage.includes("No QR code found")) {
              console.error("Erreur de scan:", errorMessage);
            }
          }
        );
        
        setIsScanning(true);
        setCameraError(null);
        setPermissionDenied(false);
      } else {
        console.warn("Aucune caméra détectée");
        setCameraError("Aucune caméra n'a été détectée sur votre appareil");
        if (onError) {
          onError("Aucune caméra n'a été détectée sur votre appareil");
        }
      }
    } catch (error: any) {
      console.error("Erreur lors du démarrage du scanner:", error);
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        setPermissionDenied(true);
        setCameraError("Accès à la caméra refusé. Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.");
      } else if (error.name === 'NotFoundError') {
        setCameraError("Aucune caméra trouvée sur votre appareil.");
      } else if (error.name === 'NotReadableError') {
        setCameraError("La caméra est déjà utilisée par une autre application.");
      } else {
        setCameraError("Impossible de démarrer le scanner de QR code. Veuillez vérifier les permissions de votre navigateur.");
      }
      
      if (onError) {
        onError(cameraError || "Erreur de caméra");
      }
    }
  };

  const requestCameraPermission = async () => {
    try {
      setCameraError(null);
      setPermissionDenied(false);
      await startScanner();
    } catch (error) {
      console.error("Erreur lors de la demande de permission:", error);
    }
  };

  // Auto-focus permanent sur le champ
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !isProcessing) {
        inputRef.current.focus();
      }
    };

    focusInput();
    
    // Re-focus si l'utilisateur clique ailleurs
    const handleFocus = () => {
      setTimeout(focusInput, 100);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('click', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('click', handleFocus);
    };
  }, [isProcessing]);

  // Protection anti-doublon
  const canProcessScan = (value: string): boolean => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    const isSameValue = value === lastScannedValueRef.current;
    
    if (isSameValue && timeSinceLastScan < 2000) {
      setLastScanStatus('duplicate');
      return false;
    }
    
    lastScanTimeRef.current = now;
    lastScannedValueRef.current = value;
    return true;
  };

  // Traitement du scan
  const processScan = async (value: string) => {
    if (!value.trim() || isProcessing) return;

    const cleanValue = value.trim().replace(/[\r\n\t]/g, '');
    
    if (!canProcessScan(cleanValue)) {
      setScannedValue('');
      setTimeout(() => setLastScanStatus(null), 2000);
      return;
    }

    setIsProcessing(true);
    setLastScanStatus(null);
    setScannedValue(cleanValue);

    try {
      console.log("Traitement du QR code:", cleanValue);
      await onScan(cleanValue);
      setLastScanStatus('success');
      setScannedValue('');
    } catch (error) {
      console.error('Erreur scan:', error);
      setLastScanStatus('error');
      if (onError) {
        onError('Erreur lors du traitement du scan');
      }
    } finally {
      setIsProcessing(false);
      
      // Reset du statut après 3 secondes
      setTimeout(() => {
        setLastScanStatus(null);
      }, 3000);
      
      // Re-focus immédiat
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processScan(scannedValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isProcessing) {
      setScannedValue(e.target.value);
    }
  };

  const getStatusColor = () => {
    if (isProcessing) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (lastScanStatus === 'success') return 'border-green-400 bg-green-50 dark:bg-green-900/20';
    if (lastScanStatus === 'error') return 'border-red-400 bg-red-50 dark:bg-red-900/20';
    if (lastScanStatus === 'duplicate') return 'border-orange-400 bg-orange-50 dark:bg-orange-900/20';
    return 'border-primary-300 dark:border-primary-600 bg-white dark:bg-gray-800';
  };

  const getStatusMessage = () => {
    if (isProcessing) return '⚡ Traitement en cours...';
    if (lastScanStatus === 'success') return '✅ Scan réussi !';
    if (lastScanStatus === 'error') return '❌ Erreur de scan';
    if (lastScanStatus === 'duplicate') return '⚠️ Doublon ignoré';
    if (scannedValue) return '⚡ Appuyez sur Entrée pour valider';
    return '🎯 Prêt pour le scan...';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header informatif */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-black text-blue-800 dark:text-blue-200 uppercase tracking-wide">
            SCAN MULTIPLE ACTIF
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          Utilisez votre caméra ou saisissez manuellement un code
        </p>
      </div>

      {/* Affichage d'erreur de caméra */}
      {cameraError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                Problème de caméra
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {cameraError}
              </p>
              {permissionDenied && (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Pour autoriser l'accès à la caméra :
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-4">
                    <li>• Cliquez sur l'icône de caméra dans la barre d'adresse</li>
                    <li>• Ou allez dans les paramètres du site de votre navigateur</li>
                    <li>• Autorisez l'accès à la caméra pour ce site</li>
                  </ul>
                  <button
                    onClick={requestCameraPermission}
                    className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scanner HTML5 */}
      {!cameraError && (
        <div className="mb-4 border rounded-lg overflow-hidden">
          <div id="qr-reader" ref={scannerDivRef} className="w-full h-64"></div>
        </div>
      )}

      {/* Fallback si pas de caméra */}
      {cameraError && (
        <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <Camera size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Scanner de caméra indisponible
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Utilisez la saisie manuelle ci-dessous
          </p>
        </div>
      )}

      {/* Champ de saisie manuelle */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={scannedValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Scannez un QR code ou saisissez un code..."
          disabled={isProcessing}
          className={`w-full px-4 py-4 text-center border-2 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${getStatusColor()}`}
          autoComplete="off"
          autoFocus
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          ) : (
            <QrCode size={20} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Message de statut */}
      <div className="mt-3 text-center">
        <p className={`text-sm font-bold transition-colors ${
          lastScanStatus === 'success' ? 'text-green-600 dark:text-green-400' :
          lastScanStatus === 'error' ? 'text-red-600 dark:text-red-400' :
          lastScanStatus === 'duplicate' ? 'text-orange-600 dark:text-orange-400' :
          isProcessing ? 'text-yellow-600 dark:text-yellow-400' :
          'text-blue-600 dark:text-blue-400'
        }`}>
          {getStatusMessage()}
        </p>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
          Protection anti-doublon • Auto-focus permanent
        </p>
      </div>
    </div>
  );
};

export default QRCodeScanner;
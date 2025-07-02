import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Zap } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const [scannedValue, setScannedValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanStatus, setLastScanStatus] = useState<'success' | 'error' | 'duplicate' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string>('');

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
  const handleScan = async (value: string) => {
    if (!value.trim() || isProcessing) return;

    const cleanValue = value.trim().replace(/[\r\n\t]/g, '');
    
    if (!canProcessScan(cleanValue)) {
      setScannedValue('');
      setTimeout(() => setLastScanStatus(null), 2000);
      return;
    }

    setIsProcessing(true);
    setLastScanStatus(null);

    try {
      await onScan(cleanValue);
      setLastScanStatus('success');
      setScannedValue('');
    } catch (error: any) {
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
      handleScan(scannedValue);
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
            SCAN DOUCHETTE ACTIF
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          Utilisez votre douchette pour scanner en continu ou saisissez manuellement
        </p>
      </div>

      {/* Champ de saisie optimisé */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={scannedValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Scannez un code ou saisissez-le manuellement..."
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
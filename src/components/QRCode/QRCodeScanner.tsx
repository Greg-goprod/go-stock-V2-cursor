import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import Button from '../common/Button';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  autoStart?: boolean;
  disableAutoFocus?: boolean;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScan, 
  autoStart = true,
  disableAutoFocus = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(autoStart);
  const [scanError, setScanError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus l'input au chargement du composant
  useEffect(() => {
    if (!disableAutoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disableAutoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
      
      // Re-focus l'input après soumission
      if (inputRef.current && !disableAutoFocus) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
    setScanError(null);
    
    if (!isScanning && inputRef.current && !disableAutoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      {scanError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
          {scanError}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isScanning ? "primary" : "outline"}
          onClick={toggleScanning}
          className="flex-shrink-0"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scanner actif
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Scanner
            </>
          )}
        </Button>
        
        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Scanner ou saisir un code..."
            className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="primary"
            className="rounded-l-none"
          >
            Valider
          </Button>
        </form>
      </div>
      
      {isScanning && (
        <div className="text-sm text-gray-500">
          Scanner actif. Scannez un code QR ou saisissez-le manuellement.
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner; 
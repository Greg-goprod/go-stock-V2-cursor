import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '../common/Button';
import { QrCode, Camera } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    // Cleanup function to stop scanning on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(error => {
          console.error('Error stopping scanner:', error);
        });
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setIsScanning(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use environment camera on mobile devices
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Don't set errors during normal scanning operations
          // This is just for when the camera can't find a QR code
          console.log(errorMessage);
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error starting scanner';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    onScan(decodedText);
    await stopScanning(); // Stop scanning after successful scan
  };

  return (
    <div className="flex flex-col items-center">
      <div id={scannerDivId} className="w-full max-w-sm h-64 bg-gray-100 rounded-lg mb-4 overflow-hidden">
        {!isScanning && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <QrCode size={48} strokeWidth={1.5} className="mb-2" />
            <p>QR code scanner</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-danger-100 text-danger-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {isScanning ? (
        <Button 
          variant="danger" 
          onClick={stopScanning}
        >
          Stop Scanning
        </Button>
      ) : (
        <Button 
          variant="primary" 
          icon={<Camera size={18} />}
          onClick={startScanning}
        >
          Start Scanning
        </Button>
      )}
    </div>
  );
};

export default QRCodeScanner;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import QRCodeScanner from '../components/QRCode/QRCodeScanner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { ArrowLeft, Search, Package, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const { getEquipmentById, getUserById, getCheckoutById, returnEquipment } = useApp();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'equipment' | 'user' | 'checkout' | null>(null);
  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (decodedText: string) => {
    setScannedId(decodedText);
    identifyQRCode(decodedText);
  };

  const identifyQRCode = (id: string) => {
    setError(null);

    // Try to identify what kind of item this is
    const equipment = getEquipmentById(id);
    if (equipment) {
      setItemType('equipment');
      setItem(equipment);
      return;
    }

    const user = getUserById(id);
    if (user) {
      setItemType('user');
      setItem(user);
      return;
    }

    const checkout = getCheckoutById(id);
    if (checkout) {
      setItemType('checkout');
      setItem(checkout);
      return;
    }

    // If we get here, we couldn't identify the QR code
    setItemType(null);
    setItem(null);
    setError('Could not identify the scanned QR code. Please try again.');
  };

  const handleNavigateToItem = () => {
    if (!itemType || !item) return;

    switch (itemType) {
      case 'equipment':
        navigate(`/equipment/${item.id}`);
        break;
      case 'user':
        navigate(`/users/${item.id}`);
        break;
      case 'checkout':
        navigate(`/checkouts/${item.id}`);
        break;
    }
  };

  const handleReturnEquipment = () => {
    if (itemType === 'checkout' && item) {
      returnEquipment(item.id);
      toast.success('Equipment returned successfully');
      setItem({...item, status: 'returned'});
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6 flex items-center">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <h2 className="text-xl font-bold ml-4 text-gray-800">Scan QR Code</h2>
      </div>

      <Card>
        <QRCodeScanner onScan={handleScan} onError={setError} />

        {error && (
          <div className="mt-4 p-3 bg-danger-100 text-danger-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {item && (
          <div className="mt-6 p-4 border rounded-lg animate-fade-in">
            <div className="flex items-center mb-4">
              {itemType === 'equipment' && <Package size={24} className="text-primary-600 mr-2" />}
              {itemType === 'user' && <User size={24} className="text-primary-600 mr-2" />}
              {itemType === 'checkout' && <Package size={24} className="text-primary-600 mr-2" />}
              
              <h3 className="text-lg font-medium">
                {itemType === 'equipment' && 'Equipment Identified'}
                {itemType === 'user' && 'User Identified'}
                {itemType === 'checkout' && 'Checkout Record Identified'}
              </h3>
            </div>

            {itemType === 'equipment' && (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {item.name}</p>
                <p><span className="font-medium">Serial:</span> {item.serialNumber}</p>
                <p><span className="font-medium">Status:</span> {item.status}</p>
              </div>
            )}

            {itemType === 'user' && (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {item.name}</p>
                <p><span className="font-medium">Department:</span> {item.department}</p>
                <p><span className="font-medium">Email:</span> {item.email}</p>
              </div>
            )}

            {itemType === 'checkout' && (
              <div className="space-y-2">
                <p><span className="font-medium">Equipment:</span> {getEquipmentById(item.equipmentId)?.name}</p>
                <p><span className="font-medium">User:</span> {getUserById(item.userId)?.name}</p>
                <p><span className="font-medium">Status:</span> {item.status}</p>
                <p><span className="font-medium">Due Date:</span> {new Date(item.dueDate).toLocaleDateString()}</p>
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-3">
              <Button
                variant="primary"
                icon={<Search size={18} />}
                onClick={handleNavigateToItem}
              >
                View Details
              </Button>

              {itemType === 'checkout' && item.status !== 'returned' && (
                <Button
                  variant="success"
                  onClick={handleReturnEquipment}
                >
                  Return Equipment
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Scan;
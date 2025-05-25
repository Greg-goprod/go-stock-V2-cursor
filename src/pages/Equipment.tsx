import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { Plus, Filter, Import, QrCode, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import QRCodeGenerator from '../components/QRCode/QRCodeGenerator';
import Modal from '../components/common/Modal';
import FilterPanel, { FilterOption } from '../components/common/FilterPanel';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import { useLanguage } from '../contexts/LanguageContext';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'status' | 'serialNumber' | 'category';
type SortDirection = 'asc' | 'desc';

const Equipment: React.FC = () => {
  const { equipment, categories } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const filterOptions: FilterOption[] = [
    {
      id: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'available', label: 'Disponible' },
        { value: 'checked-out', label: 'Emprunté' },
        { value: 'maintenance', label: 'En maintenance' },
        { value: 'retired', label: 'Retiré' },
      ],
    },
    {
      id: 'category',
      label: 'Catégorie',
      type: 'select',
      options: categories.map(cat => ({
        value: cat.id,
        label: cat.name,
      })),
    },
    {
      id: 'search',
      label: 'Rechercher',
      type: 'text',
    },
  ];

  const handleShowQR = (id: string) => {
    setSelectedEquipment(id);
    setShowQRModal(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEquipment = [...equipment].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * direction;
      case 'status':
        return a.status.localeCompare(b.status) * direction;
      case 'serialNumber':
        return a.serialNumber.localeCompare(b.serialNumber) * direction;
      case 'category':
        return a.category.localeCompare(b.category) * direction;
      default:
        return 0;
    }
  });

  const filteredEquipment = sortedEquipment.filter(item => {
    return Object.entries(activeFilters).every(([key, value]) => {
      if (!value) return true;
      
      switch (key) {
        case 'search':
          const searchTerm = value.toLowerCase();
          return (
            item.name.toLowerCase().includes(searchTerm) ||
            item.serialNumber.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
          );
        case 'status':
          return item.status === value;
        case 'category':
          return item.category === value;
        default:
          return true;
      }
    });
  });

  const renderListView = () => (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('serialNumber')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Serial Number
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEquipment.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover mr-3"
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.serialNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {categories.find(c => c.id === item.category)?.name || item.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      item.status === 'available' ? 'success' :
                      item.status === 'checked-out' ? 'warning' :
                      item.status === 'maintenance' ? 'info' : 'neutral'
                    }
                  >
                    {item.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<QrCode size={16} />}
                    onClick={() => handleShowQR(item.id)}
                  >
                    QR Code
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {filteredEquipment.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          )}
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{item.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.serialNumber}</p>
              </div>
              <Badge
                variant={
                  item.status === 'available' ? 'success' :
                  item.status === 'checked-out' ? 'warning' :
                  item.status === 'maintenance' ? 'info' : 'neutral'
                }
              >
                {item.status}
              </Badge>
            </div>
            
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                icon={<QrCode size={16} />}
                onClick={() => handleShowQR(item.id)}
              >
                QR Code
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Equipment</h1>
        
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              icon={<LayoutGrid size={18} />}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={<List size={18} />}
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              List
            </Button>
          </div>
          <Button 
            variant="outline" 
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(true)}
          >
            Filtres
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded-full">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </Button>
          <Button variant="outline" icon={<Import size={18} />}>
            Import
          </Button>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => setShowAddModal(true)}
          >
            Add Equipment
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? renderListView() : renderGridView()}

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Equipment QR Code"
        size="sm"
      >
        {selectedEquipment && (
          <div className="flex justify-center">
            <QRCodeGenerator
              value={selectedEquipment}
              title={equipment.find(e => e.id === selectedEquipment)?.name || ''}
              subtitle={equipment.find(e => e.id === selectedEquipment)?.serialNumber}
              size={200}
            />
          </div>
        )}
      </Modal>

      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        options={filterOptions}
        onApplyFilters={setActiveFilters}
      />

      <AddEquipmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default Equipment;
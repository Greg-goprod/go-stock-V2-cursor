import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Plus, QrCode, Mail, Building2, LayoutGrid, List, ArrowUpDown, Filter } from 'lucide-react';
import QRCodeGenerator from '../components/QRCode/QRCodeGenerator';
import Modal from '../components/common/Modal';
import FilterPanel, { FilterOption } from '../components/common/FilterPanel';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'email' | 'department' | 'role';
type SortDirection = 'asc' | 'desc';

const Users: React.FC = () => {
  const { users } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleShowQR = (id: string) => {
    setSelectedUser(id);
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

  const filterOptions: FilterOption[] = [
    {
      id: 'role',
      label: 'Rôle',
      type: 'select',
      options: [
        { value: 'admin', label: 'Administrateur' },
        { value: 'user', label: 'Utilisateur' },
      ],
    },
    {
      id: 'department',
      label: 'Département',
      type: 'select',
      options: Array.from(new Set(users.map(u => u.department))).map(dept => ({
        value: dept,
        label: dept,
      })),
    },
    {
      id: 'search',
      label: 'Rechercher',
      type: 'text',
    },
  ];

  const sortedUsers = [...users].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * direction;
      case 'email':
        return a.email.localeCompare(b.email) * direction;
      case 'department':
        return a.department.localeCompare(b.department) * direction;
      case 'role':
        return a.role.localeCompare(b.role) * direction;
      default:
        return 0;
    }
  });

  const filteredUsers = sortedUsers.filter(user => {
    return Object.entries(activeFilters).every(([key, value]) => {
      if (!value) return true;
      
      switch (key) {
        case 'search':
          const searchTerm = value.toLowerCase();
          return (
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
          );
        case 'role':
          return user.role === value;
        case 'department':
          return user.department === value;
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
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('department')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                  <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                      <span className="font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<QrCode size={16} />}
                    onClick={() => handleShowQR(user.id)}
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
      {filteredUsers.map((user) => (
        <Card key={user.id} className="hover:shadow-lg transition-shadow">
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                <span className="text-lg font-medium">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{user.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.role}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail size={16} />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building2 size={16} />
                <span className="text-sm">{user.department}</span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                icon={<QrCode size={16} />}
                onClick={() => handleShowQR(user.id)}
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Users</h1>
        
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
          <Button variant="primary" icon={<Plus size={18} />}>
            Ajouter un utilisateur
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? renderListView() : renderGridView()}

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="User QR Code"
        size="sm"
      >
        {selectedUser && (
          <div className="flex justify-center">
            <QRCodeGenerator
              value={selectedUser}
              title={users.find(u => u.id === selectedUser)?.name || ''}
              subtitle={users.find(u => u.id === selectedUser)?.department}
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
    </div>
  );
};

export default Users;
import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Calendar,
  User,
  Package,
  FileText,
  Eye,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutWithDetails {
  id: string;
  checkout_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  notes?: string;
  delivery_note_id?: string;
  equipment: {
    id: string;
    name: string;
    serial_number: string;
    article_number?: string;
  };
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    department: string;
  };
  delivery_notes?: {
    id: string;
    note_number: string;
    issue_date: string;
    due_date: string;
    status: string;
  };
}

interface DeliveryNoteGroup {
  noteNumber: string;
  noteId: string;
  user: {
    id: string;
    name: string;
    department: string;
    email: string;
    phone?: string;
  };
  issueDate: string;
  dueDate: string;
  status: string;
  checkouts: CheckoutWithDetails[];
  totalItems: number;
  returnedItems: number;
}

type ViewMode = 'material' | 'delivery_note';
type SortField = 'checkout_date' | 'due_date' | 'equipment_name' | 'user_name' | 'status' | 'note_number';
type SortDirection = 'asc' | 'desc';

const Checkouts: React.FC = () => {
  const { t } = useLanguage();
  const [checkouts, setCheckouts] = useState<CheckoutWithDetails[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('delivery_note');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('checkout_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const { data, error } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(id, name, serial_number, article_number),
          users(id, first_name, last_name, email, phone, department),
          delivery_notes(id, note_number, issue_date, due_date, status)
        `)
        .order('checkout_date', { ascending: false });

      if (error) throw error;
      
      const transformedCheckouts: CheckoutWithDetails[] = (data || []).map(checkout => ({
        id: checkout.id,
        checkout_date: checkout.checkout_date,
        due_date: checkout.due_date,
        return_date: checkout.return_date,
        status: checkout.status,
        notes: checkout.notes,
        delivery_note_id: checkout.delivery_note_id,
        equipment: {
          id: checkout.equipment?.id || '',
          name: checkout.equipment?.name || 'Matériel inconnu',
          serial_number: checkout.equipment?.serial_number || '',
          article_number: checkout.equipment?.article_number || ''
        },
        users: {
          id: checkout.users?.id || '',
          first_name: checkout.users?.first_name || '',
          last_name: checkout.users?.last_name || '',
          email: checkout.users?.email || '',
          phone: checkout.users?.phone || '',
          department: checkout.users?.department || ''
        },
        delivery_notes: checkout.delivery_notes ? {
          id: checkout.delivery_notes.id,
          note_number: checkout.delivery_notes.note_number,
          issue_date: checkout.delivery_notes.issue_date,
          due_date: checkout.delivery_notes.due_date,
          status: checkout.delivery_notes.status
        } : undefined
      }));

      setCheckouts(transformedCheckouts);
      
      // Group by delivery notes
      const noteGroups = groupByDeliveryNotes(transformedCheckouts);
      setDeliveryNotes(noteGroups);
      
    } catch (error: any) {
      console.error('Error fetching checkouts:', error);
      toast.error('Erreur lors du chargement des sorties de matériel');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupByDeliveryNotes = (checkouts: CheckoutWithDetails[]): DeliveryNoteGroup[] => {
    const groups: Record<string, DeliveryNoteGroup> = {};

    checkouts.forEach(checkout => {
      const noteNumber = checkout.delivery_notes?.note_number || 'Sans bon';
      const noteId = checkout.delivery_notes?.id || 'no-note';
      
      if (!groups[noteNumber]) {
        groups[noteNumber] = {
          noteNumber,
          noteId,
          user: {
            id: checkout.users.id,
            name: `${checkout.users.first_name} ${checkout.users.last_name}`,
            department: checkout.users.department,
            email: checkout.users.email,
            phone: checkout.users.phone
          },
          issueDate: checkout.delivery_notes?.issue_date || checkout.checkout_date,
          dueDate: checkout.delivery_notes?.due_date || checkout.due_date,
          status: checkout.delivery_notes?.status || 'active',
          checkouts: [],
          totalItems: 0,
          returnedItems: 0
        };
      }

      groups[noteNumber].checkouts.push(checkout);
      groups[noteNumber].totalItems++;
      if (checkout.status === 'returned') {
        groups[noteNumber].returnedItems++;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRefresh = () => {
    fetchCheckouts();
  };

  const getFilteredAndSortedCheckouts = () => {
    let filtered = checkouts;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(checkout =>
        checkout.equipment.name.toLowerCase().includes(search) ||
        checkout.equipment.serial_number.toLowerCase().includes(search) ||
        checkout.equipment.article_number?.toLowerCase().includes(search) ||
        `${checkout.users.first_name} ${checkout.users.last_name}`.toLowerCase().includes(search) ||
        checkout.users.department.toLowerCase().includes(search) ||
        checkout.delivery_notes?.note_number.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(checkout => checkout.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'checkout_date':
          return (new Date(a.checkout_date).getTime() - new Date(b.checkout_date).getTime()) * direction;
        case 'due_date':
          return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * direction;
        case 'equipment_name':
          return a.equipment.name.localeCompare(b.equipment.name) * direction;
        case 'user_name':
          return `${a.users.first_name} ${a.users.last_name}`.localeCompare(`${b.users.first_name} ${b.users.last_name}`) * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        case 'note_number':
          return (a.delivery_notes?.note_number || '').localeCompare(b.delivery_notes?.note_number || '') * direction;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getFilteredDeliveryNotes = () => {
    let filtered = deliveryNotes;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.noteNumber.toLowerCase().includes(search) ||
        note.user.name.toLowerCase().includes(search) ||
        note.user.department.toLowerCase().includes(search) ||
        note.checkouts.some(checkout =>
          checkout.equipment.name.toLowerCase().includes(search) ||
          checkout.equipment.serial_number.toLowerCase().includes(search)
        )
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(note => note.status === statusFilter);
    }

    return filtered;
  };

  const getStatusBadgeVariant = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'danger';
    
    switch (status) {
      case 'returned':
        return 'neutral';
      case 'active':
        return 'success';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'En retard';
    
    switch (status) {
      case 'returned':
        return 'Retourné';
      case 'active':
        return 'Actif';
      case 'partial':
        return 'Retour partiel';
      case 'overdue':
        return 'En retard';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  const filteredCheckouts = getFilteredAndSortedCheckouts();
  const filteredDeliveryNotes = getFilteredDeliveryNotes();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SORTIE MATÉRIEL</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des sorties et suivi du matériel emprunté
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par matériel, utilisateur, bon de sortie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="returned">Retourné</option>
                <option value="partial">Retour partiel</option>
                <option value="overdue">En retard</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
              <Button
                variant={viewMode === 'delivery_note' ? 'primary' : 'outline'}
                size="sm"
                icon={<FileText size={18} />}
                onClick={() => setViewMode('delivery_note')}
                className="rounded-r-none"
              >
                Par Bon
              </Button>
              <Button
                variant={viewMode === 'material' ? 'primary' : 'outline'}
                size="sm"
                icon={<Package size={18} />}
                onClick={() => setViewMode('material')}
                className="rounded-l-none"
              >
                Par Matériel
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {checkouts.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total sorties
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {checkouts.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                En cours
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {checkouts.filter(c => c.status === 'active' && new Date(c.due_date) < new Date()).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                En retard
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {checkouts.filter(c => c.status === 'returned').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Retournés
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'delivery_note' ? (
        /* Vue par bon de sortie */
        <div className="space-y-4">
          {filteredDeliveryNotes.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucun bon de sortie
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter 
                    ? 'Aucun bon ne correspond aux critères de recherche.'
                    : 'Aucun bon de sortie pour le moment.'
                  }
                </p>
              </div>
            </Card>
          ) : (
            filteredDeliveryNotes.map((note) => {
              const isOverdue = note.status === 'overdue' || (note.status === 'active' && new Date(note.dueDate) < new Date());
              const progress = note.totalItems > 0 ? (note.returnedItems / note.totalItems) * 100 : 0;
              
              return (
                <Card key={note.noteId} className={`transition-all hover:shadow-md ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Bon N° {note.noteNumber}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Émis le {format(new Date(note.issueDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        {isOverdue && (
                          <AlertTriangle size={20} className="text-red-500" />
                        )}
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(note.status, isOverdue)}>
                          {getStatusLabel(note.status, isOverdue)}
                        </Badge>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Retour prévu: {format(new Date(note.dueDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <User size={20} className="text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {note.user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {note.user.department} • {note.user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progression du retour
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {note.returnedItems}/{note.totalItems} matériel(s)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            progress === 100 ? 'bg-green-500' : 
                            progress > 0 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Material List */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Matériel ({note.totalItems})
                      </h4>
                      <div className="grid gap-2">
                        {note.checkouts.map((checkout) => {
                          const itemOverdue = checkout.status === 'active' && new Date(checkout.due_date) < new Date();
                          
                          return (
                            <div 
                              key={checkout.id}
                              className={`flex justify-between items-center p-3 rounded-lg border ${
                                checkout.status === 'returned' 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                  : itemOverdue
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Package size={16} className="text-gray-500" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {checkout.equipment.name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {checkout.equipment.serial_number}
                                    {checkout.equipment.article_number && ` • ${checkout.equipment.article_number}`}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <Badge variant={getStatusBadgeVariant(checkout.status, itemOverdue)}>
                                  {getStatusLabel(checkout.status, itemOverdue)}
                                </Badge>
                                {checkout.return_date && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Retourné le {format(new Date(checkout.return_date), 'dd/MM/yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Vue par matériel */
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('equipment_name')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Matériel
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('note_number')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bon de sortie
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('user_name')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Utilisateur
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('checkout_date')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date de sortie
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date de retour prévue
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date de retour effective
                  </th>
                  <th 
                    className="px-6 py-3 text-left cursor-pointer group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                      <ArrowUpDown size={14} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCheckouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package size={48} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Aucune sortie de matériel
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchTerm || statusFilter 
                          ? 'Aucune sortie ne correspond aux critères de recherche.'
                          : 'Aucune sortie de matériel pour le moment.'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCheckouts.map((checkout) => {
                    const isOverdue = checkout.status === 'active' && new Date(checkout.due_date) < new Date();
                    
                    return (
                      <tr key={checkout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {checkout.equipment.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {checkout.equipment.serial_number}
                              {checkout.equipment.article_number && ` • ${checkout.equipment.article_number}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {checkout.delivery_notes?.note_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {checkout.users.first_name} {checkout.users.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {checkout.users.department}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(checkout.checkout_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {format(new Date(checkout.due_date), 'dd/MM/yyyy')}
                            {isOverdue && (
                              <AlertTriangle size={14} className="inline ml-1" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {checkout.return_date
                            ? format(new Date(checkout.return_date), 'dd/MM/yyyy')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeVariant(checkout.status, isOverdue)}>
                            {getStatusLabel(checkout.status, isOverdue)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Checkouts;
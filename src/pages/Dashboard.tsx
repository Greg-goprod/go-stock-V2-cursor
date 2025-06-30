import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import CheckoutModal from '../components/checkout/CheckoutModal';
import ReturnModal from '../components/checkout/ReturnModal';
import MaintenanceModal from '../components/maintenance/MaintenanceModal';
import { 
  AlertTriangle, 
  Package, 
  Users, 
  CheckSquare, 
  Bell, 
  ArrowUpRight,
  LogOut,
  LogIn,
  RefreshCw,
  AlertCircle,
  Wrench,
  Calendar,
  Clock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Equipment, User, CheckoutRecord, EquipmentMaintenance } from '../types';
import Button from '../components/common/Button';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [stats, setStats] = useState({
    availableEquipment: 0,
    checkedOutEquipment: 0,
    overdueEquipment: 0,
    maintenanceEquipment: 0,
    unreadNotifications: 0
  });
  const [recentCheckouts, setRecentCheckouts] = useState<any[]>([]);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Écouter les changements dans localStorage pour les notifications
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'checkout_notifications' || e.key === 'return_notifications') {
        // Rafraîchir les données quand il y a de nouvelles notifications
        fetchDashboardData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDashboardData(true); // true = silent refresh
    }, 30000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Écouter les changements de focus de la fenêtre pour rafraîchir
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('equipment')
        .select('id')
        .limit(1);

      if (testError) {
        throw new Error(`Connection failed: ${testError.message}`);
      }

      // Fetch equipment avec les quantités réelles
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, status, total_quantity, available_quantity')
        .throwOnError();

      if (equipmentError) {
        throw new Error(`Equipment fetch failed: ${equipmentError.message}`);
      }

      // Fetch active checkouts pour calculer les emprunts réels
      const { data: activeCheckouts, error: checkoutsError } = await supabase
        .from('checkouts')
        .select('equipment_id')
        .eq('status', 'active')
        .throwOnError();

      if (checkoutsError) {
        throw new Error(`Checkouts fetch failed: ${checkoutsError.message}`);
      }

      // Calculer les statistiques réelles
      let totalAvailable = 0;
      let totalCheckedOut = 0;
      let maintenanceCount = 0;

      if (equipment) {
        equipment.forEach(eq => {
          const total = eq.total_quantity || 1;
          const available = eq.available_quantity || 0;
          const borrowed = activeCheckouts?.filter(c => c.equipment_id === eq.id).length || 0;
          
          totalAvailable += available;
          totalCheckedOut += borrowed;
          
          if (eq.status === 'maintenance') {
            maintenanceCount += 1;
          }
        });
      }

      // Fetch overdue checkouts
      const { data: overdueCheckouts, error: overdueError } = await supabase
        .from('checkouts')
        .select('id')
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString())
        .throwOnError();

      if (overdueError) {
        throw new Error(`Overdue checkouts fetch failed: ${overdueError.message}`);
      }

      // Fetch recent checkouts with user and equipment info
      const { data: checkouts, error: recentCheckoutsError } = await supabase
        .from('checkouts')
        .select(`
          id,
          checkout_date,
          due_date,
          status,
          equipment!inner(name),
          users!inner(first_name, last_name)
        `)
        .in('status', ['active', 'overdue'])
        .order('checkout_date', { ascending: false })
        .limit(5)
        .throwOnError();

      if (recentCheckoutsError) {
        throw new Error(`Recent checkouts fetch failed: ${recentCheckoutsError.message}`);
      }

      // Fetch equipment in maintenance with maintenance details
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          serial_number,
          article_number,
          last_maintenance,
          equipment_maintenance!inner(
            id,
            title,
            start_date,
            status,
            maintenance_types(name, color)
          )
        `)
        .eq('status', 'maintenance')
        .eq('equipment_maintenance.status', 'in_progress')
        .order('equipment_maintenance.start_date', { ascending: false })
        .limit(10);

      if (maintenanceError) {
        console.error('Maintenance fetch error:', maintenanceError);
        // Ne pas faire échouer le dashboard si les maintenances ne se chargent pas
      }

      // Compter les notifications non lues
      let unreadNotificationsCount = 0;
      try {
        const checkoutNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
        unreadNotificationsCount = checkoutNotifications.filter((n: any) => !n.read).length;
      } catch (e) {
        console.warn('Error reading notifications from localStorage:', e);
      }

      setStats({
        availableEquipment: totalAvailable,
        checkedOutEquipment: totalCheckedOut,
        overdueEquipment: overdueCheckouts?.length || 0,
        maintenanceEquipment: maintenanceCount,
        unreadNotifications: unreadNotificationsCount
      });

      setRecentCheckouts(checkouts || []);
      setMaintenanceEquipment(maintenanceData || []);
      setError(null);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Une erreur est survenue lors du chargement des données');
      
      // Set default values on error
      setStats({
        availableEquipment: 0,
        checkedOutEquipment: 0,
        overdueEquipment: 0,
        maintenanceEquipment: 0,
        unreadNotifications: 0
      });
      setRecentCheckouts([]);
      setMaintenanceEquipment([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  const handleCheckoutModalClose = () => {
    setShowCheckoutModal(false);
    // Rafraîchir les données après fermeture du modal de sortie
    setTimeout(() => {
      fetchDashboardData();
    }, 500);
  };

  const handleReturnModalClose = () => {
    setShowReturnModal(false);
    // Rafraîchir les données après fermeture du modal de retour
    setTimeout(() => {
      fetchDashboardData();
    }, 500);
  };

  const handleMaintenanceClick = (equipment: any) => {
    setSelectedEquipment({
      id: equipment.id,
      name: equipment.name,
      serialNumber: equipment.serial_number,
      articleNumber: equipment.article_number,
      status: 'maintenance',
      description: '',
      category: '',
      addedDate: '',
      location: '',
      qrType: 'individual',
      totalQuantity: 1,
      availableQuantity: 0
    });
    setShowMaintenanceModal(true);
  };

  const handleMaintenanceModalClose = () => {
    setShowMaintenanceModal(false);
    setSelectedEquipment(null);
    // Rafraîchir les données après fermeture du modal de maintenance
    setTimeout(() => {
      fetchDashboardData();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400 font-medium">{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight uppercase">TABLEAU DE BORD</h2>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Réessayer'}
          </Button>
        </div>
        
        <Card className="p-8">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Erreur de connexion
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <Button
              variant="primary"
              onClick={handleManualRefresh}
              disabled={refreshing}
              icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            >
              {refreshing ? 'Reconnexion...' : 'Réessayer'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight uppercase">TABLEAU DE BORD</h2>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="success"
            size="lg"
            icon={<LogOut size={20} />}
            className="flex-1 font-bold text-lg tracking-wide"
            onClick={() => setShowCheckoutModal(true)}
          >
            SORTIE MATÉRIEL
          </Button>
          <Button
            variant="warning"
            size="lg"
            icon={<LogIn size={20} />}
            className="flex-1 font-bold text-lg tracking-wide"
            onClick={() => setShowReturnModal(true)}
          >
            RETOUR MATÉRIEL
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-primary-100 dark:bg-primary-900/50 p-3 mr-4">
            <Package size={24} className="text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Disponible</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.availableEquipment}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-success-100 dark:bg-success-900/50 p-3 mr-4">
            <CheckSquare size={24} className="text-success-600 dark:text-success-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Emprunté</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.checkedOutEquipment}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-warning-100 dark:bg-warning-900/50 p-3 mr-4">
            <AlertTriangle size={24} className="text-warning-600 dark:text-warning-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">En retard</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.overdueEquipment}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>

        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3 mr-4">
            <Wrench size={24} className="text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Maintenance</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.maintenanceEquipment}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-danger-100 dark:bg-danger-900/50 p-3 mr-4">
            <Bell size={24} className="text-danger-600 dark:text-danger-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Notifications</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.unreadNotifications}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emprunts récents */}
        <Card title="EMPRUNTS RÉCENTS">
          {recentCheckouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      MATÉRIEL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      UTILISATEUR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      DATE SORTIE
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      DATE RETOUR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      STATUT
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentCheckouts.map(checkout => {
                    const isOverdue = new Date(checkout.due_date) < new Date();
                    
                    return (
                      <tr key={checkout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {checkout.equipment?.name || 'Matériel inconnu'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {checkout.users ? `${checkout.users.first_name} ${checkout.users.last_name}` : 'Utilisateur inconnu'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {new Date(checkout.checkout_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {new Date(checkout.due_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Badge
                            variant={isOverdue ? 'danger' : 'success'}
                          >
                            {isOverdue ? 'EN RETARD' : 'ACTIF'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun emprunt actif</p>
            </div>
          )}
        </Card>

        {/* Matériel en maintenance */}
        <Card title="MATÉRIEL EN MAINTENANCE">
          {maintenanceEquipment.length > 0 ? (
            <div className="space-y-3">
              {maintenanceEquipment.map(equipment => {
                const maintenance = equipment.equipment_maintenance[0];
                const daysSinceMaintenance = Math.floor(
                  (new Date().getTime() - new Date(maintenance.start_date).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div 
                    key={equipment.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => handleMaintenanceClick(equipment)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench size={16} className="text-blue-600 dark:text-blue-400" />
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {equipment.name}
                          </h4>
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: maintenance.maintenance_types?.color || '#3b82f6' }}
                          >
                            {maintenance.maintenance_types?.name || 'Maintenance'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {maintenance.title}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>Début: {new Date(maintenance.start_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span className={daysSinceMaintenance > 7 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                              {daysSinceMaintenance} jour{daysSinceMaintenance > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {equipment.serial_number}
                        </p>
                        {daysSinceMaintenance > 7 && (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium mt-1">
                            <AlertTriangle size={12} />
                            <span>Maintenance prolongée</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun matériel en maintenance</p>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={handleCheckoutModalClose}
      />

      <ReturnModal
        isOpen={showReturnModal}
        onClose={handleReturnModalClose}
      />

      {selectedEquipment && (
        <MaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={handleMaintenanceModalClose}
          equipment={selectedEquipment}
        />
      )}
    </div>
  );
};

export default Dashboard;
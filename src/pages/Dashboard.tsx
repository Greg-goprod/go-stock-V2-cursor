import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CheckoutModal from '../components/checkout/CheckoutModal';
import ReturnModal from '../components/checkout/ReturnModal';
import { 
  AlertTriangle, 
  Package, 
  Users, 
  CheckSquare, 
  Bell, 
  ArrowUpRight,
  LogOut,
  LogIn,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Equipment, User, CheckoutRecord } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [stats, setStats] = useState({
    availableEquipment: 0,
    checkedOutEquipment: 0,
    overdueEquipment: 0,
    unreadNotifications: 0
  });
  const [recentCheckouts, setRecentCheckouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      } else {
        setRefreshing(true);
      }

      // Fetch equipment avec les quantités réelles
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, status, total_quantity, available_quantity');

      if (equipmentError) throw equipmentError;

      // Fetch active checkouts pour calculer les emprunts réels
      const { data: activeCheckouts, error: checkoutsError } = await supabase
        .from('checkouts')
        .select('equipment_id')
        .eq('status', 'active');

      if (checkoutsError) throw checkoutsError;

      // Calculer les statistiques réelles
      let totalAvailable = 0;
      let totalCheckedOut = 0;
      let maintenanceCount = 0;

      equipment?.forEach(eq => {
        const total = eq.total_quantity || 1;
        const available = eq.available_quantity || 0;
        const borrowed = activeCheckouts?.filter(c => c.equipment_id === eq.id).length || 0;
        
        totalAvailable += available;
        totalCheckedOut += borrowed;
        
        if (eq.status === 'maintenance') {
          maintenanceCount += 1;
        }
      });

      // Fetch overdue checkouts
      const { data: overdueCheckouts, error: overdueError } = await supabase
        .from('checkouts')
        .select('id')
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString());

      if (overdueError) throw overdueError;

      // Fetch recent checkouts with user and equipment info
      const { data: checkouts, error: recentCheckoutsError } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(name),
          users(first_name, last_name)
        `)
        .in('status', ['active', 'overdue'])
        .order('checkout_date', { ascending: false })
        .limit(5);

      if (recentCheckoutsError) throw recentCheckoutsError;

      // Compter les notifications non lues
      const checkoutNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      const unreadNotificationsCount = checkoutNotifications.filter((n: any) => !n.read).length;

      setStats({
        availableEquipment: totalAvailable,
        checkedOutEquipment: totalCheckedOut,
        overdueEquipment: overdueCheckouts?.length || 0,
        unreadNotifications: unreadNotificationsCount
      });

      setRecentCheckouts(checkouts || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard')}</h2>
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
            className="flex-1"
            onClick={() => setShowCheckoutModal(true)}
          >
            SORTIE MATERIEL
          </Button>
          <Button
            variant="warning"
            size="lg"
            icon={<LogIn size={20} />}
            className="flex-1"
            onClick={() => setShowReturnModal(true)}
          >
            RETOUR MATERIEL
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-primary-100 dark:bg-primary-900/50 p-3 mr-4">
            <Package size={24} className="text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('available')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
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
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('checkedOut')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
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
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('overdue')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
              {stats.overdueEquipment}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
          <div className="rounded-full bg-danger-100 dark:bg-danger-900/50 p-3 mr-4">
            <Bell size={24} className="text-danger-600 dark:text-danger-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('notifications')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
              {stats.unreadNotifications}
              {refreshing && <RefreshCw size={16} className="inline ml-2 animate-spin text-gray-400" />}
            </p>
          </div>
        </Card>
      </div>
      
      <Card title={t('recentCheckouts')}>
        {recentCheckouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('equipment')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('user')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('checkoutDate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('dueDate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {recentCheckouts.map(checkout => {
                  const isOverdue = new Date(checkout.due_date) < new Date();
                  
                  return (
                    <tr key={checkout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {checkout.equipment?.name || 'Équipement inconnu'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {checkout.users ? `${checkout.users.first_name} ${checkout.users.last_name}` : 'Utilisateur inconnu'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(checkout.checkout_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(checkout.due_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Badge
                          variant={isOverdue ? 'danger' : 'success'}
                        >
                          {isOverdue ? 'En retard' : 'Actif'}
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
            <p className="text-gray-500 dark:text-gray-400">Aucun emprunt actif</p>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={handleCheckoutModalClose}
      />

      <ReturnModal
        isOpen={showReturnModal}
        onClose={handleReturnModalClose}
      />
    </div>
  );
};

export default Dashboard;
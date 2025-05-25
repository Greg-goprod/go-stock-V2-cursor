import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  AlertTriangle, 
  Package, 
  Users, 
  CheckSquare, 
  Bell, 
  ArrowUpRight,
  QrCode,
  LogOut,
  LogIn
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { equipment, users, checkouts, notifications, getOverdueCheckouts } = useApp();
  const { t } = useLanguage();
  
  const availableEquipment = equipment.filter(item => item.status === 'available').length;
  const checkedOutEquipment = equipment.filter(item => item.status === 'checked-out').length;
  const overdueEquipment = getOverdueCheckouts().length;
  const unreadNotifications = notifications.filter(notif => !notif.read).length;
  
  const recentCheckouts = checkouts
    .filter(checkout => checkout.status === 'active' || checkout.status === 'overdue')
    .sort((a, b) => new Date(b.checkoutDate).getTime() - new Date(a.checkoutDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard')}</h2>
          
          <div className="flex gap-3">
            <Link to="/scan">
              <Button variant="primary" icon={<QrCode size={18} />}>
                {t('scan')}
              </Button>
            </Link>
            
            <Link to="/equipment/add">
              <Button variant="outline" icon={<Package size={18} />}>
                {t('addEquipment')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="success"
            size="lg"
            icon={<LogOut size={20} />}
            className="flex-1"
          >
            SORTIE MATERIEL
          </Button>
          <Button
            variant="warning"
            size="lg"
            icon={<LogIn size={20} />}
            className="flex-1"
          >
            RETOUR MATERIEL
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center p-4">
          <div className="rounded-full bg-primary-100 dark:bg-primary-900/50 p-3 mr-4">
            <Package size={24} className="text-primary-600 dark:text-primary-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('available')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">{availableEquipment}</p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4">
          <div className="rounded-full bg-success-100 dark:bg-success-900/50 p-3 mr-4">
            <CheckSquare size={24} className="text-success-600 dark:text-success-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('checkedOut')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">{checkedOutEquipment}</p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4">
          <div className="rounded-full bg-warning-100 dark:bg-warning-900/50 p-3 mr-4">
            <AlertTriangle size={24} className="text-warning-600 dark:text-warning-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('overdue')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">{overdueEquipment}</p>
          </div>
        </Card>
        
        <Card className="flex items-center p-4">
          <div className="rounded-full bg-danger-100 dark:bg-danger-900/50 p-3 mr-4">
            <Bell size={24} className="text-danger-600 dark:text-danger-300" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('notifications')}</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">{unreadNotifications}</p>
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
                  const equipmentItem = equipment.find(e => e.id === checkout.equipmentId);
                  const user = users.find(u => u.id === checkout.userId);
                  
                  return (
                    <tr key={checkout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {equipmentItem?.name || t('unknownEquipment')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {user?.name || t('unknownUser')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(checkout.checkoutDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(checkout.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Badge
                          variant={checkout.status === 'active' ? 'success' : 'danger'}
                        >
                          {t(checkout.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noActiveCheckouts')}</p>
        )}
        
        {recentCheckouts.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Link to="/checkouts">
              <Button 
                variant="outline" 
                size="sm"
                icon={<ArrowUpRight size={16} />}
              >
                {t('viewAllCheckouts')}
              </Button>
            </Link>
          </div>
        )}
      </Card>
      
      <Card title={t('recentNotifications')}>
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notification => (
              <div 
                key={notification.id} 
                className={`p-3 rounded-md ${
                  notification.read 
                    ? 'bg-gray-50 dark:bg-gray-800' 
                    : 'bg-primary-50 dark:bg-primary-900/50 border-l-4 border-primary-500'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    {notification.type === 'overdue' && (
                      <AlertTriangle size={18} className="text-warning-500 dark:text-warning-400" />
                    )}
                    {notification.type === 'maintenance' && (
                      <Package size={18} className="text-primary-500 dark:text-primary-400" />
                    )}
                    {notification.type === 'system' && (
                      <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(notification.date).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noNotifications')}</p>
        )}
        
        {notifications.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Link to="/notifications">
              <Button 
                variant="outline" 
                size="sm"
                icon={<ArrowUpRight size={16} />}
              >
                {t('viewAllNotifications')}
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
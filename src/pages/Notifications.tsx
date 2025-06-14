import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Clock, CheckCircle, Bell, Calendar, Package, User, Trash2, BookMarked as MarkAsRead } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  type: 'overdue' | 'due_soon' | 'maintenance' | 'system';
  title: string;
  message: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  relatedData?: {
    equipmentId?: string;
    equipmentName?: string;
    userId?: string;
    userName?: string;
    checkoutId?: string;
    dueDate?: string;
    daysOverdue?: number;
  };
}

const Notifications: React.FC = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'overdue' | 'maintenance'>('all');

  useEffect(() => {
    generateNotifications();
  }, []);

  const generateNotifications = async () => {
    try {
      setLoading(true);
      const generatedNotifications: NotificationItem[] = [];

      // 1. Récupérer les emprunts en retard
      const { data: overdueCheckouts, error: overdueError } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(name, serial_number),
          users(first_name, last_name)
        `)
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString());

      if (overdueError) throw overdueError;

      // Créer des notifications pour les retards
      overdueCheckouts?.forEach(checkout => {
        const daysOverdue = differenceInDays(new Date(), new Date(checkout.due_date));
        generatedNotifications.push({
          id: `overdue-${checkout.id}`,
          type: 'overdue',
          title: 'Matériel en retard',
          message: `${checkout.equipment?.name || 'Équipement inconnu'} emprunté par ${checkout.users?.first_name} ${checkout.users?.last_name} est en retard de ${daysOverdue} jour(s)`,
          date: new Date().toISOString(),
          priority: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
          read: false,
          relatedData: {
            equipmentId: checkout.equipment_id,
            equipmentName: checkout.equipment?.name,
            userId: checkout.user_id,
            userName: `${checkout.users?.first_name} ${checkout.users?.last_name}`,
            checkoutId: checkout.id,
            dueDate: checkout.due_date,
            daysOverdue
          }
        });
      });

      // 2. Récupérer les emprunts qui arrivent à échéance dans les 3 prochains jours
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: dueSoonCheckouts, error: dueSoonError } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(name, serial_number),
          users(first_name, last_name)
        `)
        .eq('status', 'active')
        .gte('due_date', new Date().toISOString())
        .lte('due_date', threeDaysFromNow.toISOString());

      if (dueSoonError) throw dueSoonError;

      // Créer des notifications pour les échéances proches
      dueSoonCheckouts?.forEach(checkout => {
        const daysUntilDue = differenceInDays(new Date(checkout.due_date), new Date());
        generatedNotifications.push({
          id: `due-soon-${checkout.id}`,
          type: 'due_soon',
          title: 'Retour prévu bientôt',
          message: `${checkout.equipment?.name || 'Équipement inconnu'} emprunté par ${checkout.users?.first_name} ${checkout.users?.last_name} doit être retourné dans ${daysUntilDue} jour(s)`,
          date: new Date().toISOString(),
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          read: false,
          relatedData: {
            equipmentId: checkout.equipment_id,
            equipmentName: checkout.equipment?.name,
            userId: checkout.user_id,
            userName: `${checkout.users?.first_name} ${checkout.users?.last_name}`,
            checkoutId: checkout.id,
            dueDate: checkout.due_date
          }
        });
      });

      // 3. Récupérer les équipements en maintenance depuis plus de 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: maintenanceEquipment, error: maintenanceError } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'maintenance')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (maintenanceError) throw maintenanceError;

      // Créer des notifications pour les maintenances prolongées
      maintenanceEquipment?.forEach(equipment => {
        const daysInMaintenance = differenceInDays(new Date(), new Date(equipment.created_at));
        generatedNotifications.push({
          id: `maintenance-${equipment.id}`,
          type: 'maintenance',
          title: 'Maintenance prolongée',
          message: `${equipment.name} est en maintenance depuis ${daysInMaintenance} jours`,
          date: new Date().toISOString(),
          priority: daysInMaintenance > 60 ? 'high' : 'medium',
          read: false,
          relatedData: {
            equipmentId: equipment.id,
            equipmentName: equipment.name
          }
        });
      });

      // 4. Ajouter quelques notifications système d'exemple
      if (generatedNotifications.length === 0) {
        generatedNotifications.push({
          id: 'system-welcome',
          type: 'system',
          title: 'Système de notifications actif',
          message: 'Le système de notifications surveille automatiquement les retards et les maintenances prolongées.',
          date: new Date().toISOString(),
          priority: 'low',
          read: false
        });
      }

      // Trier par priorité et date
      generatedNotifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setNotifications(generatedNotifications);
    } catch (error: any) {
      console.error('Error generating notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
    toast.success('Notification supprimée');
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'overdue':
        return notifications.filter(n => n.type === 'overdue');
      case 'maintenance':
        return notifications.filter(n => n.type === 'maintenance');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'due_soon':
        return <Clock size={20} className="text-yellow-500" />;
      case 'maintenance':
        return <Package size={20} className="text-blue-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Chargement des notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Événements spéciaux et rappels de retard de matériel
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={<CheckCircle size={18} />}
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Tout marquer comme lu
          </Button>
          <Button
            variant="primary"
            icon={<Bell size={18} />}
            onClick={generateNotifications}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Non lues ({unreadCount})
          </Button>
          <Button
            variant={filter === 'overdue' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
          >
            En retard ({notifications.filter(n => n.type === 'overdue').length})
          </Button>
          <Button
            variant={filter === 'maintenance' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('maintenance')}
          >
            Maintenance ({notifications.filter(n => n.type === 'maintenance').length})
          </Button>
        </div>
      </Card>

      {/* Liste des notifications */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune notification
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'all' 
                  ? 'Aucune notification pour le moment.'
                  : `Aucune notification ${filter === 'unread' ? 'non lue' : filter === 'overdue' ? 'de retard' : 'de maintenance'}.`
                }
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                getPriorityColor(notification.priority)
              } ${
                notification.read 
                  ? 'opacity-75' 
                  : 'shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${
                        notification.read 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {notification.title}
                      </h3>
                      
                      <Badge
                        variant={
                          notification.priority === 'high' ? 'danger' :
                          notification.priority === 'medium' ? 'warning' : 'info'
                        }
                      >
                        {notification.priority === 'high' ? 'Urgent' :
                         notification.priority === 'medium' ? 'Important' : 'Info'}
                      </Badge>
                      
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm ${
                      notification.read 
                        ? 'text-gray-500 dark:text-gray-500' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {format(new Date(notification.date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                      
                      {notification.relatedData?.equipmentName && (
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span>{notification.relatedData.equipmentName}</span>
                        </div>
                      )}
                      
                      {notification.relatedData?.userName && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span>{notification.relatedData.userName}</span>
                        </div>
                      )}
                      
                      {notification.relatedData?.daysOverdue && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {notification.relatedData.daysOverdue} jour(s) de retard
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {!notification.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs"
                    >
                      Marquer comme lu
                    </Button>
                  )}
                  
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => deleteNotification(notification.id)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistiques */}
      {notifications.length > 0 && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {notifications.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total notifications
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {notifications.filter(n => n.type === 'overdue').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Retards
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {notifications.filter(n => n.type === 'due_soon').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Échéances proches
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {notifications.filter(n => n.type === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Maintenances
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
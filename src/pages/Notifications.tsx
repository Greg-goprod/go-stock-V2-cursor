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
  type: 'overdue' | 'due_soon' | 'maintenance' | 'system' | 'checkout';
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
    delivery_note_id?: string;
    note_number?: string;
    user_department?: string;
    equipment_count?: number;
  };
}

const Notifications: React.FC = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'overdue' | 'maintenance' | 'checkout'>('all');

  useEffect(() => {
    // Nettoyer les notifications stockées dans localStorage
    localStorage.removeItem('checkout_notifications');
    localStorage.removeItem('return_notifications');
    
    generateNotifications();
    
    // Écouter les nouvelles notifications de sortie
    const checkForNewCheckoutNotifications = () => {
      const checkoutNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      if (checkoutNotifications.length > 0) {
        // Intégrer les notifications de sortie
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = checkoutNotifications.filter((n: any) => !existingIds.has(n.id));
          return [...newNotifications, ...prev];
        });
      }
    };

    // Vérifier périodiquement les nouvelles notifications
    const interval = setInterval(checkForNewCheckoutNotifications, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const generateNotifications = async () => {
    try {
      setLoading(true);
      const generatedNotifications: NotificationItem[] = [];

      // 1. Récupérer les emprunts en retard (à partir du jour suivant la date prévue)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: overdueCheckouts, error: overdueError } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(name, serial_number),
          users(first_name, last_name)
        `)
        .eq('status', 'active')
        .lt('due_date', today.toISOString());

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

      // 4. Récupérer les notifications de sortie depuis localStorage
      const checkoutNotifications = JSON.parse(localStorage.getItem('checkout_notifications') ||'[]');
      generatedNotifications.push(...checkoutNotifications);

      // 5. Ajouter notification système si aucune notification
      if (generatedNotifications.length === 0) {
        generatedNotifications.push({
          id: 'system-welcome',
          type: 'system',
          title: 'Système de notifications actif',
          message: 'Le système de notifications surveille automatiquement les retards, les maintenances prolongées et les mouvements de sortie.',
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
    toast.success('Notification marquée comme lue');
  };

  const markAsUnread = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: false } : notif
      )
    );
    toast.success('Notification marquée comme non lue');
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
    
    // Si c'est une notification de sortie, la supprimer aussi du localStorage
    if (notificationId.startsWith('checkout-')) {
      const checkoutNotifications = JSON.parse(localStorage.getItem('checkout_notifications') || '[]');
      const updatedNotifications = checkoutNotifications.filter((n: any) => n.id !== notificationId);
      localStorage.setItem('checkout_notifications', JSON.stringify(updatedNotifications));
    }
    
    toast.success('Notification supprimée');
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'read':
        return notifications.filter(n => n.read);
      case 'overdue':
        return notifications.filter(n => n.type === 'overdue');
      case 'maintenance':
        return notifications.filter(n => n.type === 'maintenance');
      case 'checkout':
        return notifications.filter(n => n.type === 'checkout');
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
      case 'checkout':
        return <Package size={20} className="text-green-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string, isRead: boolean) => {
    const opacity = isRead ? 'opacity-60' : '';
    switch (priority) {
      case 'high':
        return `border-l-red-500 bg-red-50 dark:bg-red-900/10 ${opacity}`;
      case 'medium':
        return `border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 ${opacity}`;
      default:
        return `border-l-blue-500 bg-blue-50 dark:bg-blue-900/10 ${opacity}`;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400 font-medium">Chargement des notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight uppercase">NOTIFICATIONS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Événements spéciaux, rappels de retard et mouvements de matériel
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={<CheckCircle size={18} />}
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="font-bold"
          >
            TOUT MARQUER COMME LU
          </Button>
          <Button
            variant="primary"
            icon={<Bell size={18} />}
            onClick={generateNotifications}
            className="font-bold"
          >
            ACTUALISER
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
            className="font-bold"
          >
            TOUTES ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="font-bold"
          >
            NON LUES ({unreadCount})
          </Button>
          <Button
            variant={filter === 'read' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
            className="font-bold"
          >
            LUES ({readCount})
          </Button>
          <Button
            variant={filter === 'checkout' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('checkout')}
            className="font-bold"
          >
            SORTIES ({notifications.filter(n => n.type === 'checkout').length})
          </Button>
          <Button
            variant={filter === 'overdue' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
            className="font-bold"
          >
            EN RETARD ({notifications.filter(n => n.type === 'overdue').length})
          </Button>
          <Button
            variant={filter === 'maintenance' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('maintenance')}
            className="font-bold"
          >
            MAINTENANCES ({notifications.filter(n => n.type === 'maintenance').length})
          </Button>
        </div>
      </Card>

      {/* Liste des notifications */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 uppercase">
                AUCUNE NOTIFICATION
              </h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {filter === 'all' 
                  ? 'Aucune notification pour le moment.'
                  : filter === 'unread' 
                  ? 'Aucune notification non lue.'
                  : filter === 'read'
                  ? 'Aucune notification lue.'
                  : filter === 'checkout'
                  ? 'Aucune notification de sortie.'
                  : filter === 'overdue' 
                  ? 'Aucune notification de retard.' 
                  : 'Aucune notification de maintenance.'
                }
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                getPriorityColor(notification.priority, notification.read)
              } ${
                notification.read 
                  ? 'bg-opacity-50 dark:bg-opacity-30' 
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
                      <h3 className={`font-black ${
                        notification.read 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      } uppercase tracking-wide`}>
                        {notification.title}
                      </h3>
                      
                      <Badge
                        variant={
                          notification.priority === 'high' ? 'danger' :
                          notification.priority === 'medium' ? 'warning' : 'info'
                        }
                      >
                        {notification.priority === 'high' ? 'URGENT' :
                         notification.priority === 'medium' ? 'IMPORTANT' : 'INFO'}
                      </Badge>
                      
                      {notification.read ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={16} className="text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-black uppercase">LUE</span>
                        </div>
                      ) : (
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm font-medium ${
                      notification.read 
                        ? 'text-gray-500 dark:text-gray-500' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span className="font-medium">
                          {format(new Date(notification.date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                      
                      {notification.relatedData?.equipmentName && (
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span className="font-medium">{notification.relatedData.equipmentName}</span>
                        </div>
                      )}
                      
                      {notification.relatedData?.userName && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span className="font-medium">{notification.relatedData.userName}</span>
                        </div>
                      )}
                      
                      {notification.relatedData?.note_number && (
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span className="font-mono font-bold">{notification.relatedData.note_number}</span>
                        </div>
                      )}
                      
                      {notification.relatedData?.equipment_count && (
                        <div className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400 font-black">
                            {notification.relatedData.equipment_count} équipement{notification.relatedData.equipment_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {notification.relatedData?.daysOverdue && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span className="text-red-600 dark:text-red-400 font-black">
                            {notification.relatedData.daysOverdue} jour(s) de retard
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {notification.read ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<MarkAsRead size={14} />}
                      onClick={() => markAsUnread(notification.id)}
                      className="text-xs font-bold"
                    >
                      MARQUER NON LUE
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs font-bold"
                    >
                      MARQUER COMME LUE
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {notifications.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Total notifications
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {unreadCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Non lues
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black text-green-600 dark:text-green-400">
                {readCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Lues
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black text-green-600 dark:text-green-400">
                {notifications.filter(n => n.type === 'checkout').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Sorties
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                {notifications.filter(n => n.type === 'overdue').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Retards
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                {notifications.filter(n => n.type === 'due_soon').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase">
                Échéances
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
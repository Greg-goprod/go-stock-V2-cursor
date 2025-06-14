import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface CheckoutWithDetails {
  id: string;
  checkout_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  notes?: string;
  equipment: {
    name: string;
    serial_number: string;
  };
  users: {
    first_name: string;
    last_name: string;
  };
}

const Checkouts: React.FC = () => {
  const { t } = useLanguage();
  const [checkouts, setCheckouts] = useState<CheckoutWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checkouts')
        .select(`
          *,
          equipment(name, serial_number),
          users(first_name, last_name)
        `)
        .order('checkout_date', { ascending: false });

      if (error) throw error;
      setCheckouts(data || []);
    } catch (error: any) {
      console.error('Error fetching checkouts:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('checkouts')}</h1>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('equipment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('checkoutDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dueDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returnDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {checkouts.map((checkout) => {
                const isOverdue = checkout.status === 'active' && new Date(checkout.due_date) < new Date();
                
                return (
                  <tr key={checkout.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {checkout.equipment?.name || 'Équipement inconnu'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {checkout.users ? `${checkout.users.first_name} ${checkout.users.last_name}` : 'Utilisateur inconnu'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(checkout.checkout_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(checkout.due_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {checkout.return_date
                        ? format(new Date(checkout.return_date), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          checkout.status === 'returned' ? 'neutral' :
                          isOverdue ? 'danger' :
                          checkout.status === 'active' ? 'success' :
                          'warning'
                        }
                      >
                        {checkout.status === 'returned' ? 'Retourné' :
                         isOverdue ? 'En retard' :
                         checkout.status === 'active' ? 'Actif' :
                         checkout.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Checkouts;
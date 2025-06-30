import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StatusConfig } from '../types';

interface UseStatusColorsReturn {
  statusConfigs: StatusConfig[];
  loading: boolean;
  getStatusColor: (status: string) => string;
  getStatusBadgeVariant: (status: string) => 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  refreshStatusConfigs: () => Promise<void>;
}

export const useStatusColors = (): UseStatusColorsReturn => {
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatusConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('status_configs')
        .select('*')
        .order('name');

      if (error) throw error;

      // Si aucun statut configuré, utiliser les valeurs par défaut
      if (!data || data.length === 0) {
        const defaultStatuses: StatusConfig[] = [
          { id: 'available', name: 'Disponible', color: '#10b981' },
          { id: 'checked-out', name: 'Emprunté', color: '#f59e0b' },
          { id: 'maintenance', name: 'En maintenance', color: '#3b82f6' },
          { id: 'retired', name: 'Retiré', color: '#ef4444' }
        ];
        setStatusConfigs(defaultStatuses);
      } else {
        setStatusConfigs(data);
      }
    } catch (error) {
      console.error('Error fetching status configs:', error);
      // Fallback vers les couleurs par défaut
      const defaultStatuses: StatusConfig[] = [
        { id: 'available', name: 'Disponible', color: '#10b981' },
        { id: 'checked-out', name: 'Emprunté', color: '#f59e0b' },
        { id: 'maintenance', name: 'En maintenance', color: '#3b82f6' },
        { id: 'retired', name: 'Retiré', color: '#ef4444' }
      ];
      setStatusConfigs(defaultStatuses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusConfigs();
  }, []);

  const getStatusColor = (status: string): string => {
    const config = statusConfigs.find(s => s.id === status);
    if (config) return config.color;

    // Fallback colors
    switch (status) {
      case 'available':
        return '#10b981';
      case 'checked-out':
        return '#f59e0b';
      case 'maintenance':
        return '#3b82f6';
      case 'retired':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const color = getStatusColor(status);
    
    // Convertir la couleur hex en variant de badge
    if (color.includes('#10b981') || color.includes('#059669')) return 'success';
    if (color.includes('#f59e0b') || color.includes('#d97706')) return 'warning';
    if (color.includes('#ef4444') || color.includes('#dc2626')) return 'danger';
    if (color.includes('#3b82f6') || color.includes('#2563eb')) return 'info';
    
    return 'neutral';
  };

  const refreshStatusConfigs = async () => {
    await fetchStatusConfigs();
  };

  return {
    statusConfigs,
    loading,
    getStatusColor,
    getStatusBadgeVariant,
    refreshStatusConfigs
  };
};
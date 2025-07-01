import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StatusConfig } from '../types';

interface UseStatusColorsReturn {
  statusConfigs: StatusConfig[];
  loading: boolean;
  error: string | null;
  getStatusColor: (status: string) => string;
  getStatusBadgeVariant: (status: string) => 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  refreshStatusConfigs: () => Promise<void>;
}

export const useStatusColors = (): UseStatusColorsReturn => {
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDefaultStatuses = (): StatusConfig[] => [
    { id: 'available', name: 'Disponible', color: '#10b981' },
    { id: 'checked-out', name: 'Emprunté', color: '#f59e0b' },
    { id: 'maintenance', name: 'En maintenance', color: '#3b82f6' },
    { id: 'retired', name: 'Retiré', color: '#ef4444' },
    { id: 'lost', name: 'Perdu', color: '#6b7280' }
  ];

  const fetchStatusConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('status_configs')
        .select('*')
        .order('name');

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Si aucun statut configuré, utiliser les valeurs par défaut
      if (!data || data.length === 0) {
        console.log('No status configs found, using defaults');
        setStatusConfigs(getDefaultStatuses());
      } else {
        setStatusConfigs(data);
      }
    } catch (error: any) {
      console.error('Error fetching status configs:', error);
      setError(error.message || 'Failed to fetch status configurations');
      
      // Fallback vers les couleurs par défaut en cas d'erreur
      setStatusConfigs(getDefaultStatuses());
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
      case 'lost':
        return '#6b7280';
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
    error,
    getStatusColor,
    getStatusBadgeVariant,
    refreshStatusConfigs
  };
};
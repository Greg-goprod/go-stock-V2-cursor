import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Equipment, Category, Supplier, EquipmentGroup, EquipmentSubgroup, EquipmentInstance } from '../types';

// Define notification type
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
}

interface AppContextType {
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  // Equipment data
  equipment: Equipment[];
  categories: Category[];
  suppliers: Supplier[];
  equipmentGroups: EquipmentGroup[];
  equipmentSubgroups: EquipmentSubgroup[];
  equipmentInstances: EquipmentInstance[];
  
  // Loading states
  loadingAppData: boolean;
  
  // Equipment operations
  addEquipment: (equipment: Omit<Equipment, 'id' | 'createdAt'>) => Promise<void>;
  updateEquipment: (id: string, equipment: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [equipmentGroups, setEquipmentGroups] = useState<EquipmentGroup[]>([]);
  const [equipmentSubgroups, setEquipmentSubgroups] = useState<EquipmentSubgroup[]>([]);
  const [equipmentInstances, setEquipmentInstances] = useState<EquipmentInstance[]>([]);
  const [loadingAppData, setLoadingAppData] = useState(true);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const fetchAppData = async () => {
    try {
      setLoadingAppData(true);
      
      // Fetch all data in parallel
      const [
        equipmentResult,
        categoriesResult,
        suppliersResult,
        groupsResult,
        subgroupsResult,
        instancesResult
      ] = await Promise.all([
        supabase.from('equipment').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('equipment_groups').select('*').order('name'),
        supabase.from('equipment_subgroups').select('*').order('name'),
        supabase.from('equipment_instances').select('*').order('instance_number')
      ]);

      if (equipmentResult.error) throw equipmentResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (suppliersResult.error) throw suppliersResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (subgroupsResult.error) throw subgroupsResult.error;
      if (instancesResult.error) throw instancesResult.error;

      setEquipment(equipmentResult.data || []);
      setCategories(categoriesResult.data || []);
      setSuppliers(suppliersResult.data || []);
      setEquipmentGroups(groupsResult.data || []);
      setEquipmentSubgroups(subgroupsResult.data || []);
      setEquipmentInstances(instancesResult.data || []);
    } catch (error) {
      console.error('Error fetching app data:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du chargement des données'
      });
    } finally {
      setLoadingAppData(false);
    }
  };

  const refreshData = async () => {
    await fetchAppData();
  };

  const addEquipment = async (equipmentData: Omit<Equipment, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert([equipmentData])
        .select()
        .single();

      if (error) throw error;

      setEquipment(prev => [data, ...prev]);
      addNotification({
        type: 'success',
        message: 'Équipement ajouté avec succès'
      });
    } catch (error) {
      console.error('Error adding equipment:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de l\'ajout de l\'équipement'
      });
      throw error;
    }
  };

  const updateEquipment = async (id: string, equipmentData: Partial<Equipment>) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .update(equipmentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEquipment(prev => prev.map(eq => eq.id === id ? data : eq));
      addNotification({
        type: 'success',
        message: 'Équipement mis à jour avec succès'
      });
    } catch (error) {
      console.error('Error updating equipment:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour de l\'équipement'
      });
      throw error;
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEquipment(prev => prev.filter(eq => eq.id !== id));
      addNotification({
        type: 'success',
        message: 'Équipement supprimé avec succès'
      });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la suppression de l\'équipement'
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAppData();
  }, []);

  return (
    <AppContext.Provider value={{
      // Notifications
      notifications,
      addNotification,
      removeNotification,
      
      // Equipment data
      equipment,
      categories,
      suppliers,
      equipmentGroups,
      equipmentSubgroups,
      equipmentInstances,
      
      // Loading states
      loadingAppData,
      
      // Equipment operations
      addEquipment,
      updateEquipment,
      deleteEquipment,
      refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
};